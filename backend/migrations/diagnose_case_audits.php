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

echo "--- users.id ---\n";
print_r($pdo->query("SHOW COLUMNS FROM users WHERE Field = 'id'")->fetch());
echo "--- desks.id ---\n";
print_r($pdo->query("SHOW COLUMNS FROM desks WHERE Field = 'id'")->fetch());
echo "--- engines ---\n";
print_r($pdo->query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users','desks')")->fetchAll());

$pdo->exec("DROP TABLE IF EXISTS case_audits");

$pdo->exec("CREATE TABLE case_audits (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    agent_id        INT NOT NULL,
    desk_id         INT NOT NULL,
    auditor_id      INT NULL,
    ticket_ref      VARCHAR(100) NULL,
    channel         VARCHAR(50)  NULL,
    assessment_type ENUM('call','case','chat') NOT NULL,
    answers         JSON NOT NULL,
    feedback        JSON NULL,
    score           DECIMAL(5,2) NOT NULL,
    wfe_result      DECIMAL(5,2) NULL,
    assessed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_case_audits_agent (agent_id),
    INDEX idx_case_audits_desk (desk_id),
    INDEX idx_case_audits_date (assessed_at)
) ENGINE=InnoDB");
echo "\ncase_audits created WITHOUT foreign keys.\n";

$fks = [
    'fk_case_audits_agent'   => "ALTER TABLE case_audits ADD CONSTRAINT fk_case_audits_agent   FOREIGN KEY (agent_id)   REFERENCES users(id) ON DELETE CASCADE",
    'fk_case_audits_desk'    => "ALTER TABLE case_audits ADD CONSTRAINT fk_case_audits_desk    FOREIGN KEY (desk_id)    REFERENCES desks(id) ON DELETE CASCADE",
    'fk_case_audits_auditor' => "ALTER TABLE case_audits ADD CONSTRAINT fk_case_audits_auditor FOREIGN KEY (auditor_id) REFERENCES users(id) ON DELETE SET NULL",
];

foreach ($fks as $name => $sql) {
    try {
        $pdo->exec($sql);
        echo "$name: OK\n";
    } catch (Exception $e) {
        echo "$name: FAILED -> " . $e->getMessage() . "\n";
    }
}

echo "\nDone. Whichever line says FAILED above is the mismatched column.\n";
