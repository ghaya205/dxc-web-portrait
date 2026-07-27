<?php
namespace Models;

use Core\Database;
use PDO;

class SlaData {
    private PDO $db;

    private const COLUMN_MAP = [
        'queue'                                   => 'Queue',
        'queue name'                              => 'Queue',
        'startdate'                               => 'StartDate',
        'start date'                              => 'StartDate',
        'starttime'                               => 'StartTime',
        'start time'                              => 'StartTime',
        'enddate'                                 => 'EndDate',
        'end date'                                => 'EndDate',
        'endtime'                                 => 'EndTime',
        'end time'                                => 'EndTime',
        'contacts abandoned in 20 seconds'        => 'Contacts abandoned in 20 seconds',
        'contacts abandoned in 30 seconds'        => 'Contacts abandoned in 30 seconds',
        'contacts abandoned in 40 seconds'        => 'Contacts abandoned in 40 seconds',
        'contacts abandoned in 45 seconds'        => 'Contacts abandoned in 45 seconds',
        'contacts abandoned in 60 seconds'        => 'Contacts abandoned in 60 seconds',
        'contacts abandoned in 90 seconds'        => 'Contacts abandoned in 90 seconds',
        'contacts abandoned in 180 seconds'       => 'Contacts abandoned in 180 seconds',
        'contacts answered in 20 seconds'         => 'Contacts answered in 20 seconds',
        'contacts answered in 30 seconds'         => 'Contacts answered in 30 seconds',
        'contacts answered in 40 seconds'         => 'Contacts answered in 40 seconds',
        'contacts answered in 45 seconds'         => 'Contacts answered in 45 seconds',
        'contacts answered in 60 seconds'         => 'Contacts answered in 60 seconds',
        'contacts answered in 90 seconds'         => 'Contacts answered in 90 seconds',
        'contacts answered in 180 seconds'        => 'Contacts answered in 180 seconds',
        'service level 60 seconds'                => 'Service level 60 seconds',
        'service level 120 seconds'               => 'Service level 120 seconds',
        'agent interaction time'                  => 'Agent interaction time',
        'api contacts'                            => 'API contacts',
        'api contacts handled'                    => 'API contacts handled',
        'average agent interaction time'          => 'Average agent interaction time',
        'average customer hold time'              => 'Average customer hold time',
        'average handle time'                     => 'Average handle time',
        'average queue abandon time'              => 'Average queue abandon time',
        'average queue answer time'               => 'Average queue answer time',
        'callback contacts'                       => 'Callback contacts',
        'callback contacts handled'               => 'Callback contacts handled',
        'contacts abandoned'                      => 'Contacts abandoned',
        'contacts handled incoming'               => 'Contacts handled incoming',
        'contacts handled outbound'               => 'Contacts handled outbound',
        'contacts put on hold'                    => 'Contacts put on hold',
        'contacts queued'                         => 'Contacts queued',
    ];

    private const COUNT_COLUMNS = [
        'Contacts abandoned in 20 seconds','Contacts abandoned in 30 seconds','Contacts abandoned in 40 seconds',
        'Contacts abandoned in 45 seconds','Contacts abandoned in 60 seconds','Contacts abandoned in 90 seconds',
        'Contacts abandoned in 180 seconds',
        'Contacts answered in 20 seconds','Contacts answered in 30 seconds','Contacts answered in 40 seconds',
        'Contacts answered in 45 seconds','Contacts answered in 60 seconds','Contacts answered in 90 seconds',
        'Contacts answered in 180 seconds',
        'API contacts','API contacts handled','Callback contacts','Callback contacts handled',
        'Contacts abandoned','Contacts handled incoming','Contacts handled outbound','Contacts put on hold','Contacts queued',
    ];

    private const DURATION_COLUMNS = [
        'Agent interaction time','Average agent interaction time','Average customer hold time',
        'Average handle time','Average queue abandon time','Average queue answer time',
    ];

    public function __construct() {
        $this->db = Database::getInstance();
    }

    private static function col(string $name): string {
        return '`' . str_replace('`', '``', $name) . '`';
    }

    private static function sumCount(string $alias, string $column): string {
        return "SUM(CAST(NULLIF($alias." . self::col($column) . ", '') AS UNSIGNED))";
    }

    private static function avgDuration(string $alias, string $column): string {
        $c = "$alias." . self::col($column);
        $threePartSeconds = "TIME_TO_SEC($c)"; 
        $twoPartSeconds   = "(SUBSTRING_INDEX($c, ':', 1) * 60 + SUBSTRING_INDEX($c, ':', -1))"; 
        $barSeconds       = "CAST(NULLIF($c, '') AS UNSIGNED)"; 

        return "AVG(CASE
            WHEN $c IS NULL OR $c = '' THEN NULL
            WHEN $c LIKE '%:%:%' THEN $threePartSeconds
            WHEN $c LIKE '%:%'   THEN $twoPartSeconds
            ELSE $barSeconds
        END)";
    }

    private static function toDbDate(?string $raw): ?string {
        if (!$raw) return null;
        $ts = strtotime(trim($raw));
        return $ts ? date('n/j/Y', $ts) : null; 
    }

    public function importCsv(string $filePath): array {
        $handle = fopen($filePath, 'r');
        if (!$handle) throw new \RuntimeException('Could not open uploaded file');

        $header = fgetcsv($handle);
        if (!$header) throw new \RuntimeException('Empty CSV file');

        $realColumns = [];
        foreach ($header as $h) {
            $key = strtolower(trim($h));
            $realColumns[] = self::COLUMN_MAP[$key] ?? null;
        }

        if (!in_array('Queue', $realColumns, true)) {
            throw new \RuntimeException('CSV is missing a recognizable Queue column');
        }

        $imported = 0;
        $skipped  = 0;
        $batch    = [];
        $batchSize = 500;

        $this->db->beginTransaction();
        try {
            while (($cols = fgetcsv($handle)) !== false) {
                $row = [];
                foreach ($realColumns as $i => $col) {
                    if ($col === null) continue;
                    $row[$col] = $cols[$i] ?? null;
                }
                if (empty($row['Queue'])) { $skipped++; continue; }

                foreach (['StartDate', 'EndDate'] as $dcol) {
                    if (isset($row[$dcol])) $row[$dcol] = self::toDbDate($row[$dcol]);
                }
                foreach (['StartTime', 'EndTime'] as $tcol) {
                    if (isset($row[$tcol])) $row[$tcol] = trim($row[$tcol]) ?: null;
                }

                $batch[] = $row;
                $imported++;

                if (count($batch) >= $batchSize) {
                    $this->insertBatch($batch);
                    $batch = [];
                }
            }
            if ($batch) $this->insertBatch($batch);
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            fclose($handle);
            throw $e;
        }

        fclose($handle);
        return ['imported' => $imported, 'skipped' => $skipped];
    }

    private function insertBatch(array $rows): void {
        $allCols = array_values(array_unique(array_merge(
            ['Queue', 'StartDate', 'StartTime', 'EndDate', 'EndTime'],
            self::COUNT_COLUMNS,
            self::DURATION_COLUMNS,
            ['Service level 60 seconds', 'Service level 120 seconds']
        )));

        $placeholders = [];
        $values = [];
        foreach ($rows as $row) {
            $ph = [];
            foreach ($allCols as $c) {
                $ph[] = '?';
                $values[] = $row[$c] ?? null;
            }
            $placeholders[] = '(' . implode(',', $ph) . ')';
        }
        $colList = implode(',', array_map([self::class, 'col'], $allCols));
        $sql = "INSERT INTO sla_data ($colList) VALUES " . implode(',', $placeholders);
        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);
    }

    public function getQueueAggregates(?string $dateFrom, ?string $dateTo, ?int $companyId = null, ?string $deskName = null): array {
        $where  = [];
        $params = [];

        if ($dateFrom) { $where[] = "STR_TO_DATE(d.StartDate, '%c/%e/%Y') >= ?"; $params[] = $dateFrom; }
        if ($dateTo)   { $where[] = "STR_TO_DATE(d.StartDate, '%c/%e/%Y') <= ?"; $params[] = $dateTo; }
        if ($companyId) { $where[] = 't.company_id = ?'; $params[] = $companyId; }
        if ($deskName)  { $where[] = 't.desk_name = ?';  $params[] = $deskName; }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $answeredCase = "CASE t.timeframe_bh
            WHEN 20 THEN " . self::col('Contacts answered in 20 seconds') . "
            WHEN 30 THEN " . self::col('Contacts answered in 30 seconds') . "
            WHEN 40 THEN " . self::col('Contacts answered in 40 seconds') . "
            WHEN 45 THEN " . self::col('Contacts answered in 45 seconds') . "
            WHEN 60 THEN " . self::col('Contacts answered in 60 seconds') . "
            WHEN 90 THEN " . self::col('Contacts answered in 90 seconds') . "
            WHEN 180 THEN " . self::col('Contacts answered in 180 seconds') . "
            ELSE 0 END";

        $abandonedInSlaCase = "CASE t.timeframe_bh
            WHEN 20 THEN " . self::col('Contacts abandoned in 20 seconds') . "
            WHEN 30 THEN " . self::col('Contacts abandoned in 30 seconds') . "
            WHEN 40 THEN " . self::col('Contacts abandoned in 40 seconds') . "
            WHEN 45 THEN " . self::col('Contacts abandoned in 45 seconds') . "
            WHEN 60 THEN " . self::col('Contacts abandoned in 60 seconds') . "
            WHEN 90 THEN " . self::col('Contacts abandoned in 90 seconds') . "
            WHEN 180 THEN " . self::col('Contacts abandoned in 180 seconds') . "
            ELSE 0 END";

        $answeredSum  = "SUM(CAST(NULLIF($answeredCase, '') AS UNSIGNED))";
        $abandonedSum = "SUM(CAST(NULLIF($abandonedInSlaCase, '') AS UNSIGNED))";

        $sql = "SELECT
                    d.Queue AS queue_name,
                    t.desk_name,
                    t.company_id,
                    c.name AS company_name,
                    t.timeframe_bh,
                    t.timeframe_ooh,
                    t.target_ans_rate,
                    t.target_abd_rate,
                    COALESCE(
                        " . self::sumCount('d', 'Contacts queued') . ",
                        " . self::sumCount('d', 'Contacts handled incoming') . " + " . self::sumCount('d', 'Contacts abandoned') . "
                    ) AS offered,
                    " . self::sumCount('d', 'Contacts handled incoming') . " AS handled,
                    " . self::sumCount('d', 'Contacts abandoned') . " AS abandoned,
                    $answeredSum AS answered_in_sla,
                    $abandonedSum AS abandoned_in_sla,
                    " . self::avgDuration('d', 'Average queue answer time') . " AS avg_asa,
                    " . self::avgDuration('d', 'Average handle time') . " AS avg_aht,
                    " . self::avgDuration('d', 'Average customer hold time') . " AS avg_hold
                FROM sla_data d
                JOIN sla_targets t ON t.queue_name = d.Queue
                LEFT JOIN companies c ON c.id = t.company_id
                $whereSql
                GROUP BY d.Queue, t.desk_name, t.company_id, c.name, t.timeframe_bh, t.timeframe_ooh,
                         t.target_ans_rate, t.target_abd_rate";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getMaxId(): int {
        $stmt = $this->db->query("SELECT COALESCE(MAX(id), 0) FROM sla_data");
        return (int) $stmt->fetchColumn();
    }

    public function getDailySeries(?string $dateFrom, ?string $dateTo, ?int $companyId = null, ?string $deskName = null): array {
        $where  = [];
        $params = [];

        if ($dateFrom) { $where[] = "STR_TO_DATE(d.StartDate, '%c/%e/%Y') >= ?"; $params[] = $dateFrom; }
        if ($dateTo)   { $where[] = "STR_TO_DATE(d.StartDate, '%c/%e/%Y') <= ?"; $params[] = $dateTo; }
        if ($companyId) { $where[] = 't.company_id = ?'; $params[] = $companyId; }
        if ($deskName)  { $where[] = 't.desk_name = ?';  $params[] = $deskName; }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "SELECT
                    STR_TO_DATE(d.StartDate, '%c/%e/%Y') AS the_date,
                    " . self::sumCount('d', 'Contacts handled incoming') . " AS handled,
                    " . self::sumCount('d', 'Contacts abandoned') . " AS abandoned,
                    COALESCE(
                        " . self::sumCount('d', 'Contacts queued') . ",
                        " . self::sumCount('d', 'Contacts handled incoming') . " + " . self::sumCount('d', 'Contacts abandoned') . "
                    ) AS offered
                FROM sla_data d
                JOIN sla_targets t ON t.queue_name = d.Queue
                LEFT JOIN companies c ON c.id = t.company_id
                $whereSql
                GROUP BY the_date
                ORDER BY the_date ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getHourlySeries(string $date, ?int $companyId = null, ?string $deskName = null): array {
        $where  = ["STR_TO_DATE(d.StartDate, '%c/%e/%Y') = ?"];
        $params = [$date];
        if ($companyId) { $where[] = 't.company_id = ?'; $params[] = $companyId; }
        if ($deskName)  { $where[] = 't.desk_name = ?';  $params[] = $deskName; }
        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $sql = "SELECT
                    CAST(SUBSTRING_INDEX(d.StartTime, ':', 1) AS UNSIGNED) AS hour,
                    " . self::sumCount('d', 'Contacts handled incoming') . " AS handled,
                    " . self::sumCount('d', 'Contacts abandoned') . " AS abandoned,
                    " . self::sumCount('d', 'Contacts answered in 40 seconds') . " AS answered_lt40,
                    COALESCE(
                        " . self::sumCount('d', 'Contacts queued') . ",
                        " . self::sumCount('d', 'Contacts handled incoming') . " + " . self::sumCount('d', 'Contacts abandoned') . "
                    ) AS offered
                FROM sla_data d
                JOIN sla_targets t ON t.queue_name = d.Queue
                $whereSql
                GROUP BY hour
                ORDER BY hour ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
