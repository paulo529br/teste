import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-pizzaria";
const IS_PROD = process.env.NODE_ENV === "production";

// Database Connection
let db: any;
let isMysql = false;

async function initDb() {
  if (process.env.MYSQL_HOST) {
    try {
      db = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || "3306"),
      });
      isMysql = true;
      console.log("Connected to MySQL Database");
    } catch (e) {
      console.error("Failed to connect to MySQL, falling back to SQLite:", e);
      db = new Database("pizzaria.db");
    }
  } else {
    db = new Database("pizzaria.db");
    console.log("Using SQLite Database");
  }

  // Initialize Schema (SQLite style, for MySQL you'd use the script I provided)
  if (!isMysql) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        role TEXT DEFAULT 'client',
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
      CREATE TABLE IF NOT EXISTS couriers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        status TEXT DEFAULT 'available'
      );
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        courier_id INTEGER,
        type TEXT,
        table_number INTEGER,
        status TEXT DEFAULT 'received',
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
      db.prepare("INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)").run("Caixa", "cashier", "caixa@pizzaria.com", adminPassword);
      db.prepare("INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)").run("Cozinha", "kitchen", "cozinha@pizzaria.com", adminPassword);
      db.prepare("INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)").run("Entregador", "delivery", "entrega@pizzaria.com", adminPassword);
      db.prepare("INSERT INTO categories (name) VALUES (?)").run("Pizzas");
      db.prepare("INSERT INTO categories (name) VALUES (?)").run("Bebidas");
      db.prepare("INSERT INTO products (category_id, name, price, description) VALUES (?, ?, ?, ?)").run(1, "Margherita", 45.0, "Molho, mussarela e manjericão");
      db.prepare("INSERT INTO products (category_id, name, price, description) VALUES (?, ?, ?, ?)").run(1, "Calabresa", 42.0, "Molho, mussarela e calabresa");
      db.prepare("INSERT INTO products (category_id, name, price, description) VALUES (?, ?, ?, ?)").run(2, "Coca-Cola 2L", 12.0, "Refrigerante");
      db.prepare("INSERT INTO couriers (name) VALUES (?)").run("João Silva");
      db.prepare("INSERT INTO couriers (name) VALUES (?)").run("Maria Santos");
    }
  }
}

// Helper for DB queries (abstracts SQLite vs MySQL)
async function query(sql: string, params: any[] = []) {
  if (isMysql) {
    const [rows] = await db.execute(sql, params);
    return rows;
  } else {
    return db.prepare(sql).all(...params);
  }
}

async function getOne(sql: string, params: any[] = []) {
  if (isMysql) {
    const [rows] = await db.execute(sql, params);
    return (rows as any[])[0];
  } else {
    return db.prepare(sql).get(...params);
  }
}

async function run(sql: string, params: any[] = []) {
  if (isMysql) {
    const [result] = await db.execute(sql, params);
    return { lastInsertRowid: (result as any).insertId };
  } else {
    const info = db.prepare(sql).run(...params);
    return { lastInsertRowid: info.lastInsertRowid };
  }
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
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Acesso negado" });
    next();
  };
};

async function startServer() {
  await initDb();
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT || 3000;

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const info = await run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'client')", [name, email, hashedPassword]);
      const user = { id: info.lastInsertRowid, name, email, role: 'client' };
      const token = jwt.sign(user, JWT_SECRET);
      res.json({ user, token });
    } catch (e) {
      res.status(400).json({ error: "Email já cadastrado" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await getOne("SELECT * FROM users WHERE email = ?", [email]);
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
  app.get("/api/products", async (req, res) => {
    const products = await query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
    `);
    res.json(products);
  });

  app.post("/api/orders", authenticateToken, async (req: any, res) => {
    const { type, table_number, items, total_price, address, payment_method } = req.body;
    const clientId = req.user.role === 'client' ? req.user.id : null;
    const info = await run(`
      INSERT INTO orders (client_id, type, table_number, total_price, address, payment_method)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [clientId, type, table_number, total_price, address, payment_method]);
    const orderId = info.lastInsertRowid;
    for (const item of items) {
      await run(`
        INSERT INTO order_items (order_id, product_id, quantity, price, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, item.id, item.quantity, item.price, item.notes || ""]);
    }
    broadcast({ type: "NEW_ORDER", orderId });
    res.json({ success: true, orderId });
  });

  app.get("/api/orders", authenticateToken, authorizeRoles('admin', 'cashier', 'kitchen', 'delivery'), async (req, res) => {
    const orders = await query(`
      SELECT o.*, c.name as courier_name, u.name as client_name
      FROM orders o
      LEFT JOIN couriers c ON o.courier_id = c.id
      LEFT JOIN users u ON o.client_id = u.id
      ORDER BY created_at DESC
    `);
    res.json(orders);
  });

  app.get("/api/my-orders", authenticateToken, async (req: any, res) => {
    const orders = await query(`
      SELECT o.*, c.name as courier_name 
      FROM orders o
      LEFT JOIN couriers c ON o.courier_id = c.id
      WHERE o.client_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);
    res.json(orders);
  });

  app.get("/api/orders/:id", authenticateToken, async (req: any, res) => {
    const order = await getOne("SELECT * FROM orders WHERE id = ?", [req.params.id]);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    if (req.user.role === 'client' && order.client_id !== req.user.id) return res.status(403).json({ error: "Acesso negado" });
    const items = await query(`
      SELECT oi.*, p.name as product_name 
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id]);
    res.json({ ...order, items });
  });

  app.patch("/api/orders/:id/status", authenticateToken, authorizeRoles('admin', 'cashier', 'kitchen', 'delivery'), async (req, res) => {
    const { status, courier_id } = req.body;
    if (courier_id) {
      await run("UPDATE orders SET status = ?, courier_id = ? WHERE id = ?", [status, courier_id, req.params.id]);
    } else {
      await run("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);
    }
    broadcast({ type: "STATUS_UPDATE", orderId: req.params.id, status });
    res.json({ success: true });
  });

  app.get("/api/couriers", authenticateToken, authorizeRoles('admin', 'delivery'), async (req, res) => {
    const couriers = await query("SELECT * FROM couriers");
    res.json(couriers);
  });

  // Vite middleware for development
  if (!IS_PROD) {
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
    console.log(`Server running on port ${PORT}`);
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
      if (client.readyState === WebSocket.OPEN) client.send(message);
    });
  }
}

startServer();
