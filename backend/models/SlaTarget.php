<?php
namespace Models;

use Core\Database;
use PDO;

class SlaTarget {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function all(): array {
        return $this->db->query(
            "SELECT t.*, c.name AS company_name
             FROM sla_targets t
             LEFT JOIN companies c ON c.id = t.company_id
             ORDER BY c.name, t.queue_name"
        )->fetchAll();
    }

    public function findByQueue(string $queueName): array|false {
        $stmt = $this->db->prepare("SELECT * FROM sla_targets WHERE queue_name = ?");
        $stmt->execute([$queueName]);
        return $stmt->fetch();
    }

    public static function parsePercent(?string $raw): ?float {
        if ($raw === null) return null;
        $raw = trim($raw);
        if ($raw === '' || strtoupper($raw) === 'NA') return null;
        $raw = str_replace('%', '', $raw);
        if (!is_numeric($raw)) return null;
        return round(((float) $raw) / 100, 4);
    }

    public static function parseInt(?string $raw): ?int {
        if ($raw === null) return null;
        $raw = trim($raw);
        return ($raw === '' || !is_numeric($raw)) ? null : (int) $raw;
    }

    public function upsert(array $row): void {
        $queueName = trim($row['queue_name'] ?? '');
        if ($queueName === '') return;

        $companyId = null;
        if (!empty($row['account'])) {
            $companyId = (new Company())->firstOrCreate(trim($row['account']));
        }

        $existing = $this->findByQueue($queueName);

        if ($existing) {
            $stmt = $this->db->prepare(
                "UPDATE sla_targets SET
                    desk_name = ?, company_id = ?, timeframe_bh = ?, timeframe_ooh = ?,
                    sla_type = ?, abd_type = ?, other_type = ?,
                    target_ans_rate = ?, target_abd_rate = ?, target_other = ?
                 WHERE queue_name = ?"
            );
            $stmt->execute([
                $row['desk_name']       ?? null,
                $companyId,
                $row['timeframe_bh']    ?? null,
                $row['timeframe_ooh']   ?? null,
                $row['sla_type']        ?? null,
                $row['abd_type']        ?? null,
                $row['other_type']      ?? null,
                $row['target_ans_rate'] ?? null,
                $row['target_abd_rate'] ?? null,
                $row['target_other']    ?? null,
                $queueName,
            ]);
        } else {
            $stmt = $this->db->prepare(
                "INSERT INTO sla_targets
                    (queue_name, desk_name, company_id, timeframe_bh, timeframe_ooh,
                     sla_type, abd_type, other_type, target_ans_rate, target_abd_rate, target_other)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $queueName,
                $row['desk_name']       ?? null,
                $companyId,
                $row['timeframe_bh']    ?? null,
                $row['timeframe_ooh']   ?? null,
                $row['sla_type']        ?? null,
                $row['abd_type']        ?? null,
                $row['other_type']      ?? null,
                $row['target_ans_rate'] ?? null,
                $row['target_abd_rate'] ?? null,
                $row['target_other']    ?? null,
            ]);
        }
    }

    public function delete(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM sla_targets WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function createOrUpdateManual(array $data): void {
        $pct = function ($v) {
            if ($v === null || $v === '') return null;
            return round(((float) $v) / 100, 4);
        };

        $this->upsert([
            'queue_name'      => $data['queue_name']    ?? '',
            'desk_name'       => $data['desk_name']     ?? '',
            'account'         => $data['company_name']  ?? '',
            'timeframe_bh'    => self::parseInt((string) ($data['timeframe_bh']  ?? '')),
            'timeframe_ooh'   => self::parseInt((string) ($data['timeframe_ooh'] ?? '')),
            'sla_type'        => $data['sla_type']       ?: null,
            'abd_type'        => $data['abd_type']       ?: null,
            'other_type'      => $data['other_type']     ?: null,
            'target_ans_rate' => $pct($data['target_ans_rate'] ?? null),
            'target_abd_rate' => $pct($data['target_abd_rate'] ?? null),
            'target_other'    => $pct($data['target_other']    ?? null),
        ]);
    }

    public function importSheet1Csv(string $filePath): array {
        $handle = fopen($filePath, 'r');
        if (!$handle) throw new \RuntimeException('Could not open uploaded file');

        $header = fgetcsv($handle);
        if (!$header) throw new \RuntimeException('Empty CSV file');
        $header = array_map(fn($h) => strtolower(trim($h)), $header);

        $imported = 0;
        $skipped  = 0;

        while (($cols = fgetcsv($handle)) !== false) {
            $r = array_combine(array_slice($header, 0, count($cols)), $cols);
            $queueName = trim($r['queue name'] ?? '');
            if ($queueName === '') { $skipped++; continue; }

            $this->upsert([
                'queue_name'      => $queueName,
                'desk_name'       => trim($r['desk'] ?? ''),
                'account'         => trim($r['account'] ?? ''),
                'timeframe_bh'    => self::parseInt($r['timeframe bh'] ?? null),
                'timeframe_ooh'   => self::parseInt($r['timeframe ooh'] ?? null),
                'sla_type'        => trim($r['sla answered'] ?? '') ?: null,
                'abd_type'        => trim($r['abd rate'] ?? '') ?: null,
                'other_type'      => trim($r['autre sla'] ?? '') ?: null,
                'target_ans_rate' => self::parsePercent($r['target ans rate'] ?? null),
                'target_abd_rate' => self::parsePercent($r['target abd rate'] ?? null),
                'target_other'    => self::parsePercent($r['target autre sla'] ?? null),
            ]);
            $imported++;
        }

        fclose($handle);
        return ['imported' => $imported, 'skipped' => $skipped];
    }
}
