<?php

$projectRoot = dirname(__DIR__, 2);
$envFile = $projectRoot . '/.env';

if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v);
    }
}

$cfg = require __DIR__ . '/../config/database.php';

try {
    $pdo = new PDO(
        "mysql:host={$cfg['host']};dbname={$cfg['dbname']};charset=utf8",
        $cfg['user'], $cfg['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (Exception $e) {
    die("DB connection failed: " . $e->getMessage() . "\n");
}

$sql = file_get_contents(__DIR__ . '/007_transport.sql');
foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
    try {
        $pdo->exec($statement);
    } catch (Exception $e) {
        echo "Skipped: " . $e->getMessage() . "\n";
    }
}

$sql2 = file_get_contents(__DIR__ . '/008_transport_vehicle_type.sql');
foreach (array_filter(array_map('trim', explode(';', $sql2))) as $statement) {
    try {
        $pdo->exec($statement);
    } catch (Exception $e) {
        echo "Skipped: " . $e->getMessage() . "\n";
    }
}

echo "users.latitude / users.longitude ready.\n";
echo "transport_requests table ready.\n";
echo "transport_request_items table ready.\n";
echo "transport_request_items.vehicle_type ready.\n";
echo "Setup complete.\n";
