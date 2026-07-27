<?php
return [
    'host'   => $_ENV['DB_HOST'] ?? 'localhost',
    'dbname' => $_ENV['DB_NAME'] ?? 'dxcdb',
    'user'   => $_ENV['DB_USER'] ?? 'root',
    'pass'   => $_ENV['DB_PASS'] ?? '',
];
