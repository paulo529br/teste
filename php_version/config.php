<?php
// config.php - Conexão com o banco de dados MySQL
// Configurações para InfinityFree

$host = 'sql100.infinityfree.com';
$db   = 'if0_41116401_pizzaria';
$user = 'if0_41116401';
$pass = '9KOZik5nnn31t';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     // Em produção, não exiba o erro detalhado
     die("Erro de conexão: " . $e->getMessage());
}
?>
