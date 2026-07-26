<?php
namespace Models;

use Core\Database;
use PDO;

class Company {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function all(): array {
        return $this->db->query("SELECT * FROM companies ORDER BY name ASC")->fetchAll();
    }

    public function find(int $id): array|false {
        $stmt = $this->db->prepare("SELECT * FROM companies WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function findByName(string $name): array|false {
        $stmt = $this->db->prepare("SELECT * FROM companies WHERE name = ?");
        $stmt->execute([$name]);
        return $stmt->fetch();
    }

    public function firstOrCreate(string $name): int {
        $existing = $this->findByName($name);
        if ($existing) return (int) $existing['id'];

        $stmt = $this->db->prepare("INSERT INTO companies (name) VALUES (?)");
        $stmt->execute([$name]);
        return (int) $this->db->lastInsertId();
    }
}
