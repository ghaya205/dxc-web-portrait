<?php
namespace Models;

use Core\Database;
use PDO;

class User {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function findByEmail(string $email): array|false {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch();
    }

    public function findById(int $id): array|false {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function emailExists(string $email): bool {
        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return (bool) $stmt->fetch();
    }

    public function getRoleId(string $roleName): int|false {
        $stmt = $this->db->prepare("SELECT id FROM roles WHERE LOWER(name) = ?");
        $stmt->execute([strtolower($roleName)]);
        $row = $stmt->fetch();
        return $row ? (int) $row['id'] : false;
    }

    public function create(string $name, string $email, string $passwordHash, int $roleId, bool $preApproved = false): bool {
        $approved = $preApproved ? 1 : 0;
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO users (name, email, password, role_id, is_approved) VALUES (?, ?, ?, ?, ?)"
            );
            return $stmt->execute([$name, $email, $passwordHash, $roleId, $approved]);
        } catch (\Exception $e) {
            $stmt = $this->db->prepare(
                "INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)"
            );
            return $stmt->execute([$name, $email, $passwordHash, $roleId]);
        }
    }

    public function updateName(int $id, string $name): bool {
        $stmt = $this->db->prepare("UPDATE users SET name = ? WHERE id = ?");
        return $stmt->execute([$name, $id]);
    }

    public function updatePassword(int $id, string $passwordHash): bool {
        $stmt = $this->db->prepare("UPDATE users SET password = ? WHERE id = ?");
        return $stmt->execute([$passwordHash, $id]);
    }

    public function getFullProfile(int $id): array|false {
        $stmt = $this->db->prepare(
            "SELECT u.*, r.name AS role_name, d.name AS desk_name, d.acronym AS desk_acronym
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN desks d ON d.id = u.desk_id
             WHERE u.id = ?"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) unset($row['password']);
        return $row;
    }

    public function updateFullProfile(int $id, array $data): bool {
        $fields = [
            'name', 'national_id', 'phone', 'address', 'governorate',
            'latitude', 'longitude',
            'marital_status', 'child_number', 'title', 'desk_id',
            'technical_skills', 'diplomas', 'certifications', 'skills',
            'manager_name', 'hr_manager_name', 'language', 'shift',
        ];

        $set    = [];
        $values = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $set[]    = "$field = ?";
                $values[] = $data[$field] === '' ? null : $data[$field];
            }
        }

        if (!$set) return true;

        $values[] = $id;
        $stmt = $this->db->prepare("UPDATE users SET " . implode(', ', $set) . " WHERE id = ?");
        return $stmt->execute($values);
    }

    public function updateProfilePicture(int $id, string $path): bool {
        $stmt = $this->db->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
        return $stmt->execute([$path, $id]);
    }

    public function createByAdmin(array $data, string $passwordHash): int {
        $deskId      = (!empty($data['desk_id'])) ? $data['desk_id'] : null;
        $childNumber = (isset($data['child_number']) && $data['child_number'] !== '') ? $data['child_number'] : null;

        $stmt = $this->db->prepare(
            "INSERT INTO users
                (name, email, password, role_id, is_approved, national_id, phone, address,
                 governorate, marital_status, child_number, title, desk_id, technical_skills,
                 diplomas, certifications, skills, manager_name, hr_manager_name, language, shift)
             VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['name'],
            $data['email'],
            $passwordHash,
            $data['role_id'],
            $data['national_id']      ?? null,
            $data['phone']            ?? null,
            $data['address']          ?? null,
            $data['governorate']      ?? null,
            $data['marital_status']   ?? null,
            $childNumber,
            $data['title']            ?? null,
            $deskId,
            $data['technical_skills'] ?? null,
            $data['diplomas']         ?? null,
            $data['certifications']   ?? null,
            $data['skills']           ?? null,
            $data['manager_name']     ?? null,
            $data['hr_manager_name']  ?? null,
            $data['language']         ?? null,
            $data['shift']            ?? null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function getAllUsers(): array {
        $stmt = $this->db->prepare(
            "SELECT u.id,
                    u.name,
                    u.email,
                    u.role_id,
                    u.is_approved,

                    r.name AS role_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.role_id != 3
             ORDER BY u.is_approved ASC, u.id DESC"
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getAllForPresence(): array {
        $stmt = $this->db->prepare(
            "SELECT u.id,
                    u.name,
                    u.email,
                    u.role_id,
                    u.shift,
                    u.desk_id,
                    r.name AS role_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.is_approved = 1
             ORDER BY u.role_id ASC, u.name ASC"
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getDeskAgentsForPresence(int $deskId): array {
        $stmt = $this->db->prepare(
            "SELECT u.id,
                    u.name,
                    u.email,
                    u.role_id,
                    u.shift,
                    u.desk_id,
                    r.name AS role_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.is_approved = 1 AND u.role_id = 1 AND u.desk_id = ?
             ORDER BY u.name ASC"
        );
        $stmt->execute([$deskId]);
        return $stmt->fetchAll();
    }

    public function getAllAgentsForTransport(): array {
        $stmt = $this->db->query(
            "SELECT u.id, u.name, u.email, u.address, u.governorate, u.latitude, u.longitude, d.name AS desk_name
             FROM users u
             LEFT JOIN desks d ON d.id = u.desk_id
             WHERE u.is_approved = 1 AND u.role_id = 1
             ORDER BY u.name ASC"
        );
        return $stmt->fetchAll();
    }

    public function getDeskAgentsForTransport(int $deskId): array {
        $stmt = $this->db->prepare(
            "SELECT id, name, email, address, governorate, latitude, longitude
             FROM users
             WHERE is_approved = 1 AND role_id = 1 AND desk_id = ?
             ORDER BY name ASC"
        );
        $stmt->execute([$deskId]);
        return $stmt->fetchAll();
    }

    public function approveUser(int $userId, int $adminId): bool {
        $stmt = $this->db->prepare(
            "UPDATE users SET is_approved = 1, approved_at = NOW(), approved_by = ? WHERE id = ?"
        );
        return $stmt->execute([$adminId, $userId]);
    }

    public function rejectUser(int $userId): bool {
        $stmt = $this->db->prepare("UPDATE users SET is_approved = 2 WHERE id = ?");
        return $stmt->execute([$userId]);
    }

    public function verifyEnterpriseCode(string $code): bool {
        $stmt = $this->db->prepare("SELECT code FROM enterprise_codes WHERE is_active = 1");
        $stmt->execute();
        $rows = $stmt->fetchAll();
        foreach ($rows as $row) {
            if (password_verify($code, $row['code'])) {
                return true;
            }
        }
        return false;
    }
}
