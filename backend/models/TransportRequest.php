<?php
namespace Models;

use Core\Database;
use PDO;

class TransportRequest {
    private PDO $db;

    private const DXC_LAT = 36.8985;
    private const DXC_LNG = 10.1892;
    private const AVG_SPEED_KMH = 32;
    private const TAXI_CAPACITY = 4;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public static function distanceKm(?float $lat, ?float $lng): ?float {
        if ($lat === null || $lng === null) return null;
        $earthRadius = 6371;
        $dLat = deg2rad(self::DXC_LAT - $lat);
        $dLng = deg2rad(self::DXC_LNG - $lng);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat)) * cos(deg2rad(self::DXC_LAT)) * sin($dLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return round($earthRadius * $c, 2);
    }

    public static function durationMinutes(?float $distanceKm): ?int {
        if ($distanceKm === null) return null;
        return (int) round(($distanceKm / self::AVG_SPEED_KMH) * 60);
    }

    public function createDraft(int $supervisorId): int {
        $stmt = $this->db->prepare(
            "INSERT INTO transport_requests (supervisor_id, status) VALUES (?, 'draft')"
        );
        $stmt->execute([$supervisorId]);
        return (int) $this->db->lastInsertId();
    }

    public function find(int $id): array|false {
        $stmt = $this->db->prepare("SELECT * FROM transport_requests WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function addItem(int $requestId, int $agentId, string $vehicleType, string $direction, ?string $pickupTime, ?string $returnTime, array $days, ?float $lat, ?float $lng): int {
        $distance = self::distanceKm($lat, $lng);
        $duration = self::durationMinutes($distance);

        $stmt = $this->db->prepare(
            "INSERT INTO transport_request_items
                (request_id, agent_id, vehicle_type, direction, pickup_time, return_time, days, distance_km, duration_min)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $requestId, $agentId, $vehicleType, $direction, $pickupTime ?: null, $returnTime ?: null,
            implode(',', $days), $distance, $duration,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function updateItem(int $itemId, array $data): bool {
        $fields = ['vehicle_type', 'direction', 'pickup_time', 'return_time', 'days'];
        $set = [];
        $values = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $set[] = "$field = ?";
                $values[] = $field === 'days' ? implode(',', $data['days']) : ($data[$field] ?: null);
            }
        }
        if (!$set) return true;
        $values[] = $itemId;
        $stmt = $this->db->prepare("UPDATE transport_request_items SET " . implode(', ', $set) . " WHERE id = ?");
        return $stmt->execute($values);
    }

    public function deleteItem(int $itemId): bool {
        $stmt = $this->db->prepare("DELETE FROM transport_request_items WHERE id = ?");
        return $stmt->execute([$itemId]);
    }

    public function applyToAll(int $requestId, array $data): bool {
        $fields = ['vehicle_type', 'direction', 'pickup_time', 'return_time', 'days'];
        $set = [];
        $values = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $set[] = "$field = ?";
                $values[] = $field === 'days' ? implode(',', $data['days']) : ($data[$field] ?: null);
            }
        }
        if (!$set) return true;
        $values[] = $requestId;
        $stmt = $this->db->prepare("UPDATE transport_request_items SET " . implode(', ', $set) . " WHERE request_id = ?");
        return $stmt->execute($values);
    }

    public function itemBelongsToRequest(int $itemId, int $requestId): bool {
        $stmt = $this->db->prepare("SELECT id FROM transport_request_items WHERE id = ? AND request_id = ?");
        $stmt->execute([$itemId, $requestId]);
        return (bool) $stmt->fetch();
    }

    public function getItems(int $requestId): array {
        $stmt = $this->db->prepare(
            "SELECT ti.*, u.name AS agent_name, u.address AS agent_address, u.governorate AS agent_governorate,
                    u.latitude AS agent_lat, u.longitude AS agent_lng
             FROM transport_request_items ti
             JOIN users u ON u.id = ti.agent_id
             WHERE ti.request_id = ?
             ORDER BY ti.id ASC"
        );
        $stmt->execute([$requestId]);
        return $stmt->fetchAll();
    }

    public function send(int $requestId): bool {
        $stmt = $this->db->prepare(
            "UPDATE transport_requests SET status = 'pending', sent_at = NOW() WHERE id = ? AND status = 'draft'"
        );
        return $stmt->execute([$requestId]);
    }

    public function myDrafts(int $supervisorId): array {
        $stmt = $this->db->prepare(
            "SELECT r.*, (SELECT COUNT(*) FROM transport_request_items i WHERE i.request_id = r.id) AS agent_count
             FROM transport_requests r
             WHERE r.supervisor_id = ? AND r.status = 'draft'
             ORDER BY r.created_at DESC"
        );
        $stmt->execute([$supervisorId]);
        return $stmt->fetchAll();
    }

    public function myHistory(int $supervisorId): array {
        $stmt = $this->db->prepare(
            "SELECT r.*, (SELECT COUNT(*) FROM transport_request_items i WHERE i.request_id = r.id) AS agent_count
             FROM transport_requests r
             WHERE r.supervisor_id = ? AND r.status != 'draft'
             ORDER BY r.created_at DESC"
        );
        $stmt->execute([$supervisorId]);
        return $stmt->fetchAll();
    }

    public function pendingForAdmin(): array {
        $stmt = $this->db->query(
            "SELECT r.*, s.name AS supervisor_name,
                    (SELECT COUNT(*) FROM transport_request_items i WHERE i.request_id = r.id) AS agent_count
             FROM transport_requests r
             JOIN users s ON s.id = r.supervisor_id
             WHERE r.status = 'pending'
             ORDER BY r.sent_at ASC"
        );
        return $stmt->fetchAll();
    }

    public function allForAdmin(): array {
        $stmt = $this->db->query(
            "SELECT r.*, s.name AS supervisor_name,
                    (SELECT COUNT(*) FROM transport_request_items i WHERE i.request_id = r.id) AS agent_count
             FROM transport_requests r
             JOIN users s ON s.id = r.supervisor_id
             WHERE r.status != 'draft'
             ORDER BY (r.status = 'pending') DESC, r.sent_at DESC"
        );
        return $stmt->fetchAll();
    }

    public function decide(int $requestId, int $adminId, string $status, ?string $note): bool {
        $stmt = $this->db->prepare(
            "UPDATE transport_requests SET status = ?, admin_note = ?, decided_at = NOW(), decided_by = ? WHERE id = ?"
        );
        return $stmt->execute([$status, $note, $adminId, $requestId]);
    }

    public function buildCsv(int $requestId, ?string $vehicleType = null): string {
        $items = $this->getItems($requestId);

        $rows = [];
        foreach ($items as $item) {
            if ($vehicleType !== null && $item['vehicle_type'] !== $vehicleType) continue;
            $days = array_filter(explode(',', (string) $item['days']));
            foreach ($days as $day) {
                $rows[] = [
                    'date' => $day,
                    'time' => $item['pickup_time'] ?? '',
                    'agent_name' => $item['agent_name'],
                    'address' => $item['agent_address'],
                    'governorate' => $item['agent_governorate'],
                    'direction' => $item['direction'],
                    'vehicle_type' => $item['vehicle_type'],
                    'distance_km' => $item['distance_km'],
                    'duration_min' => $item['duration_min'],
                ];
            }
        }

        usort($rows, fn($a, $b) => [$a['date'], $a['direction'], $a['time']] <=> [$b['date'], $b['direction'], $b['time']]);

        $groups = [];
        foreach ($rows as $row) {
            $groups[$row['date'] . '|' . $row['direction'] . '|' . $row['time'] . '|' . $row['vehicle_type']][] = $row;
        }

        $out = fopen('php://temp', 'r+');
        fputcsv($out, ['Date', 'Direction', 'Pickup Time', 'Agent', 'Address', 'Governorate', 'Vehicle', 'Vehicle N°', 'Distance (km)', 'Duration (min)']);

        foreach ($groups as $groupRows) {
            $capacity = $groupRows[0]['vehicle_type'] === 'bus' ? PHP_INT_MAX : self::TAXI_CAPACITY;
            $chunks = array_chunk($groupRows, $capacity);
            foreach ($chunks as $chunkIndex => $chunk) {
                $vehicleLabel = $chunkIndex + 1;
                foreach ($chunk as $row) {
                    fputcsv($out, [
                        $row['date'], $row['direction'], $row['time'], $row['agent_name'],
                        $row['address'], $row['governorate'], $row['vehicle_type'], $vehicleLabel,
                        $row['distance_km'], $row['duration_min'],
                    ]);
                }
            }
        }

        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);
        return $csv;
    }

    private static function directionLabel(string $direction): string {
        return match ($direction) {
            'aller' => 'Aller (Maison → DXC)',
            'retour' => 'Retour (DXC → Maison)',
            'aller_retour' => 'Aller-Retour',
            default => $direction,
        };
    }

    private static function daysLabel(string $days): string {
        $labels = [
            'mon' => 'Lun', 'tue' => 'Mar', 'wed' => 'Mer', 'thu' => 'Jeu',
            'fri' => 'Ven', 'sat' => 'Sam', 'sun' => 'Dim',
        ];
        $parts = array_filter(explode(',', $days));
        return implode(', ', array_map(fn($d) => $labels[$d] ?? $d, $parts));
    }

    public function buildEmailHtml(int $requestId, string $vehicleType): string {
        $items = array_values(array_filter(
            $this->getItems($requestId),
            fn($item) => $item['vehicle_type'] === $vehicleType
        ));

        $agentCount = count(array_unique(array_map(fn($i) => $i['agent_id'], $items)));

        $rows = '';
        foreach ($items as $item) {
            $mapsLink = ($item['agent_lat'] !== null && $item['agent_lng'] !== null)
                ? "https://www.google.com/maps/search/?api=1&query={$item['agent_lat']},{$item['agent_lng']}"
                : null;

            $addressCell = htmlspecialchars((string) $item['agent_address'], ENT_QUOTES) . '<br><small>' . htmlspecialchars((string) $item['agent_governorate'], ENT_QUOTES) . '</small>';
            if ($mapsLink) {
                $addressCell .= ' &nbsp;<a href="' . htmlspecialchars($mapsLink, ENT_QUOTES) . '" target="_blank">📍 Voir sur Maps</a>';
            }

            $times = [];
            if ($item['pickup_time']) $times[] = 'Départ: ' . substr($item['pickup_time'], 0, 5);
            if ($item['return_time']) $times[] = 'Retour: ' . substr($item['return_time'], 0, 5);
            $timesCell = implode('<br>', $times) ?: '-';

            $rows .= '<tr>'
                . '<td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars((string) $item['agent_name'], ENT_QUOTES) . '</td>'
                . '<td style="padding:8px;border:1px solid #ddd;">' . $addressCell . '</td>'
                . '<td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars(self::directionLabel((string) $item['direction']), ENT_QUOTES) . '</td>'
                . '<td style="padding:8px;border:1px solid #ddd;">' . $timesCell . '</td>'
                . '<td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars(self::daysLabel((string) $item['days']), ENT_QUOTES) . '</td>'
                . '<td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars((string) ($item['distance_km'] ?? '-'), ENT_QUOTES) . ' km</td>'
                . '<td style="padding:8px;border:1px solid #ddd;">' . htmlspecialchars((string) ($item['duration_min'] ?? '-'), ENT_QUOTES) . ' min</td>'
                . '</tr>';
        }

        $vehicleLabel = ucfirst($vehicleType);

        return <<<HTML
        <div style="font-family:Arial,sans-serif;color:#222;">
            <h2 style="color:#004b8d;">DXC Tunisie — Planning Transport {$vehicleLabel} #{$requestId}</h2>
            <p><strong>Nombre d'agents concernés :</strong> {$agentCount}</p>
            <p>Veuillez trouver ci-dessous le détail complet du planning de transport approuvé. Le fichier CSV en pièce jointe reprend les mêmes données pour votre organisation interne.</p>
            <table style="border-collapse:collapse;width:100%;font-size:14px;">
                <thead>
                    <tr style="background:#004b8d;color:#fff;">
                        <th style="padding:8px;border:1px solid #ddd;">Agent</th>
                        <th style="padding:8px;border:1px solid #ddd;">Adresse / GPS</th>
                        <th style="padding:8px;border:1px solid #ddd;">Direction</th>
                        <th style="padding:8px;border:1px solid #ddd;">Horaires</th>
                        <th style="padding:8px;border:1px solid #ddd;">Jours</th>
                        <th style="padding:8px;border:1px solid #ddd;">Distance</th>
                        <th style="padding:8px;border:1px solid #ddd;">Durée</th>
                    </tr>
                </thead>
                <tbody>
                    {$rows}
                </tbody>
            </table>
            <p style="margin-top:16px;font-size:12px;color:#777;">Email généré automatiquement par la plateforme DXC Tunisie Transport.</p>
        </div>
        HTML;
    }

    public function hasVehicleType(int $requestId, string $vehicleType): bool {
        $stmt = $this->db->prepare(
            "SELECT id FROM transport_request_items WHERE request_id = ? AND vehicle_type = ? LIMIT 1"
        );
        $stmt->execute([$requestId, $vehicleType]);
        return (bool) $stmt->fetch();
    }
}
