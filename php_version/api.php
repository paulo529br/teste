<?php
// api.php - API simples para processar requisições da interface
include 'config.php';
header('Content-Type: application/json');

// Habilitar CORS se necessário
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$action = $_GET['action'] ?? '';

// Rota para buscar produtos
if ($action == 'products') {
    try {
        $stmt = $pdo->query("SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id");
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// Rota para realizar pedido
if ($action == 'place_order' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("INSERT INTO orders (type, total_price, address, payment_method, status) VALUES (?, ?, ?, ?, 'received')");
        $stmt->execute([
            $data['type'] ?? 'delivery', 
            $data['total_price'], 
            $data['address'] ?? '', 
            $data['payment_method'] ?? 'Dinheiro'
        ]);
        $orderId = $pdo->lastInsertId();
        
        $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
        foreach ($data['items'] as $item) {
            $stmtItem->execute([$orderId, $item['id'], $item['quantity'], $item['price']]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'orderId' => $orderId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// Rota para buscar pedidos (Cozinha/Admin)
if ($action == 'orders') {
    try {
        $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// Rota para atualizar status do pedido
if ($action == 'update_status' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $stmt->execute([$data['status'], $data['id']]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
