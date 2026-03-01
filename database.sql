-- Script SQL para criação do banco de dados Pizzaria Master (MySQL)
-- Compatível com phpMyAdmin / InfinityFree

-- 1. Criação das Tabelas

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'cashier', 'kitchen', 'delivery', 'client') DEFAULT 'client',
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS additions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS couriers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'available'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    courier_id INT,
    type ENUM('table', 'counter', 'delivery') NOT NULL,
    table_number INT,
    status ENUM('received', 'preparing', 'ready', 'delivering', 'completed', 'cancelled') DEFAULT 'received',
    total_price DECIMAL(10,2) NOT NULL,
    address TEXT,
    payment_method VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (courier_id) REFERENCES couriers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Inserção de Dados Iniciais (Seed)

-- Senha padrão 'admin123' (hash bcrypt: $2a$10$7R.x.N.m.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S)
-- Nota: No MySQL você deve usar o hash gerado pelo sistema para garantir compatibilidade.
-- Abaixo estão os comandos de inserção básica.

INSERT INTO categories (name) VALUES ('Pizzas'), ('Bebidas'), ('Bordas');

-- Usuário Admin Inicial (Senha: admin123)
-- Importante: O hash abaixo é um exemplo. O sistema gera o hash correto ao cadastrar.
INSERT INTO users (name, role, email, password) VALUES 
('Admin', 'admin', 'admin@pizzaria.com', '$2a$10$7R.x.N.m.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S'),
('Caixa', 'cashier', 'caixa@pizzaria.com', '$2a$10$7R.x.N.m.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S'),
('Cozinha', 'kitchen', 'cozinha@pizzaria.com', '$2a$10$7R.x.N.m.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S'),
('Entregador', 'delivery', 'entrega@pizzaria.com', '$2a$10$7R.x.N.m.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S.S');

INSERT INTO products (category_id, name, price, description) VALUES 
(1, 'Margherita', 45.00, 'Molho, mussarela e manjericão'),
(1, 'Calabresa', 42.00, 'Molho, mussarela e calabresa'),
(2, 'Coca-Cola 2L', 12.00, 'Refrigerante');

INSERT INTO couriers (name) VALUES ('João Silva'), ('Maria Santos');
