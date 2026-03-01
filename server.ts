import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("pizzaria.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-pizzaria";

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    role TEXT DEFAULT 'client', -- 'admin', 'cashier', 'kitchen', 'delivery', 'client'
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
    FOREIGN KEY (courier_id) REFERENCES couriers(id),
    FOREIGN KEY (client_id) REFERENCES users(id)
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
  const adminPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)").run("Admin", "admin", "admin@pizzaria.com", adminPassword);
  
  // Staff accounts
  db.prepare("INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)").run("Caixa", "cashier", "caixa@pizzaria.com", adminPassword);
  db.prepare("INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)").run("Cozinha", "kitchen", "cozinha@pizzaria.com", adminPassword);
  db.prepare("INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)").run("Entregador", "delivery", "entrega@pizzaria.com", adminPassword);

  db.prepare("INSERT INTO categories (name) VALUES (?)").run("Pizzas");
  db.prepare("INSERT INTO categories (name) VALUES (?)").run("Bebidas");
  db.prepare("INSERT INTO categories (name) VALUES (?)").run("Bordas");
  
  db.prepare("INSERT INTO products (category_id, name, price, description) VALUES (?, ?, ?, ?)").run(1, "Margherita", 45.0, "Molho, mussarela e manjericão");
  db.prepare("INSERT INTO products (category_id, name, price, description) VALUES (?, ?, ?, ?)").run(1, "Calabresa", 42.0, "Molho, mussarela e calabresa");
  db.prepare("INSERT INTO products (category_id, name, price, description) VALUES (?, ?, ?, ?)").run(2, "Coca-Cola 2L", 12.0, "Refrigerante");
  
  db.prepare("INSERT INTO couriers (name) VALUES (?)").run("João Silva");
  db.prepare("INSERT INTO couriers (name) VALUES (?)").run("Maria Santos");
}

// Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
};

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const info = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'client')").run(name, email, hashedPassword);
      const user = { id: info.lastInsertRowid, name, email, role: 'client' };
      const token = jwt.sign(user, JWT_SECRET);
      res.json({ user, token });
    } catch (e) {
      res.status(400).json({ error: "Email já cadastrado" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (user && bcrypt.compareSync(password, user.password)) {
      const { password: _, ...userWithoutPassword } = user;
      const token = jwt.sign(userWithoutPassword, JWT_SECRET);
      res.json({ user: userWithoutPassword, token });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    res.json(req.user);
  });

  // API Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
    `).all();
    res.json(products);
  });

  app.post("/api/orders", authenticateToken, (req: any, res) => {
    const { type, table_number, items, total_price, address, payment_method } = req.body;
    const clientId = req.user.role === 'client' ? req.user.id : null;

    const info = db.prepare(`
      INSERT INTO orders (client_id, type, table_number, total_price, address, payment_method)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(clientId, type, table_number, total_price, address, payment_method);
    
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

  app.get("/api/orders", authenticateToken, authorizeRoles('admin', 'cashier', 'kitchen', 'delivery'), (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, c.name as courier_name, u.name as client_name
      FROM orders o
      LEFT JOIN couriers c ON o.courier_id = c.id
      LEFT JOIN users u ON o.client_id = u.id
      ORDER BY created_at DESC
    `).all();
    res.json(orders);
  });

  app.get("/api/my-orders", authenticateToken, (req: any, res) => {
    const orders = db.prepare(`
      SELECT o.*, c.name as courier_name 
      FROM orders o
      LEFT JOIN couriers c ON o.courier_id = c.id
      WHERE o.client_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);
    res.json(orders);
  });

  app.get("/api/orders/:id", authenticateToken, (req: any, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as any;
    
    // Security: Only staff or the client who placed the order can see details
    if (req.user.role === 'client' && order.client_id !== req.user.id) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const items = db.prepare(`
      SELECT oi.*, p.name as product_name 
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(req.params.id);
    res.json({ ...order, items });
  });

  app.patch("/api/orders/:id/status", authenticateToken, authorizeRoles('admin', 'cashier', 'kitchen', 'delivery'), (req, res) => {
    const { status, courier_id } = req.body;
    if (courier_id) {
      db.prepare("UPDATE orders SET status = ?, courier_id = ? WHERE id = ?").run(status, courier_id, req.params.id);
    } else {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    }
    broadcast({ type: "STATUS_UPDATE", orderId: req.params.id, status });
    res.json({ success: true });
  });

  app.get("/api/couriers", authenticateToken, authorizeRoles('admin', 'delivery'), (req, res) => {
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
