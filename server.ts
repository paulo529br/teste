import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("pizzaria.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    role TEXT, -- 'admin', 'cashier', 'kitchen', 'delivery', 'client'
    email TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT,
    description TEXT,
    price REAL,
    image_url TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS additions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL
  );

  CREATE TABLE IF NOT EXISTS couriers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    status TEXT DEFAULT 'available'
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    courier_id INTEGER,
    type TEXT, -- 'table', 'counter', 'delivery'
    table_number INTEGER,
    status TEXT DEFAULT 'received', -- 'received', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'
    total_price REAL,
    address TEXT,
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (courier_id) REFERENCES couriers(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)").run("Admin", "admin", "admin@pizzaria.com", "admin123");
  db.prepare("INSERT INTO categories (name) VALUES (?)").run("Pizzas");
  db.prepare("INSERT INTO categories (name) VALUES (?)").run("Bebidas");
  db.prepare("INSERT INTO categories (name) VALUES (?)").run("Bordas");
  
  db.prepare("INSERT INTO products (category_id, name, price, description) VALUES (?, ?, ?, ?)").run(1, "Margherita", 45.0, "Molho, mussarela e manjericão");
  db.prepare("INSERT INTO products (category_id, name, price, description) VALUES (?, ?, ?, ?)").run(1, "Calabresa", 42.0, "Molho, mussarela e calabresa");
  db.prepare("INSERT INTO products (category_id, name, price, description) VALUES (?, ?, ?, ?)").run(2, "Coca-Cola 2L", 12.0, "Refrigerante");
  
  db.prepare("INSERT INTO couriers (name) VALUES (?)").run("João Silva");
  db.prepare("INSERT INTO couriers (name) VALUES (?)").run("Maria Santos");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
    `).all();
    res.json(products);
  });

  app.post("/api/orders", (req, res) => {
    const { type, table_number, items, total_price, address, payment_method } = req.body;
    
    const info = db.prepare(`
      INSERT INTO orders (type, table_number, total_price, address, payment_method)
      VALUES (?, ?, ?, ?, ?)
    `).run(type, table_number, total_price, address, payment_method);
    
    const orderId = info.lastInsertRowid;
    
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, price, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      insertItem.run(orderId, item.id, item.quantity, item.price, item.notes || "");
    }
    
    broadcast({ type: "NEW_ORDER", orderId });
    res.json({ success: true, orderId });
  });

  app.get("/api/orders", (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, c.name as courier_name 
      FROM orders o
      LEFT JOIN couriers c ON o.courier_id = c.id
      ORDER BY created_at DESC
    `).all();
    res.json(orders);
  });

  app.get("/api/orders/:id", (req, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
    const items = db.prepare(`
      SELECT oi.*, p.name as product_name 
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(req.params.id);
    res.json({ ...order, items });
  });

  app.patch("/api/orders/:id/status", (req, res) => {
    const { status, courier_id } = req.body;
    if (courier_id) {
      db.prepare("UPDATE orders SET status = ?, courier_id = ? WHERE id = ?").run(status, courier_id, req.params.id);
    } else {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    }
    broadcast({ type: "STATUS_UPDATE", orderId: req.params.id, status });
    res.json({ success: true });
  });

  app.get("/api/couriers", (req, res) => {
    const couriers = db.prepare("SELECT * FROM couriers").all();
    res.json(couriers);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Setup
  const wss = new WebSocketServer({ server });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

startServer();
