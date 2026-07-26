<?php
namespace Controllers;

use Core\Controller;
use Models\Company;
use Models\Desk;
use Models\SlaData;
use Models\SlaTarget;
use Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class SlaController extends Controller {

   
    public function importTargets(): void {
        $this->requireAdmin();

        if (empty($_FILES['file']['tmp_name'])) {
            $this->json(['error' => 'No file uploaded'], 400);
        }

        try {
            $result = (new SlaTarget())->importSheet1Csv($_FILES['file']['tmp_name']);
            $this->json(array_merge(['message' => 'SLA targets imported'], $result));
        } catch (\Throwable $e) {
            $this->json(['error' => 'Import failed: ' . $e->getMessage()], 500);
        }
    }

    
    public function importData(): void {
        $this->requireAdmin();

        if (empty($_FILES['file']['tmp_name'])) {
            $this->json(['error' => 'No file uploaded'], 400);
        }

        try {
            $result = (new SlaData())->importCsv($_FILES['file']['tmp_name']);
            $this->json(array_merge(['message' => 'SLA data imported'], $result));
        } catch (\Throwable $e) {
            $this->json(['error' => 'Import failed: ' . $e->getMessage()], 500);
        }
    }

    
    public function companies(): void {
        $this->requireAuth();
        $this->json(['companies' => (new Company())->all()]);
    }

    
    public function targets(): void {
        $this->requireAdmin();
        $this->json(['targets' => (new SlaTarget())->all()]);
    }

  
    public function saveTarget(): void {
        $this->requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty(trim($data['queue_name'] ?? ''))) {
            $this->json(['error' => 'Queue name is required.'], 400);
        }

        try {
            (new SlaTarget())->createOrUpdateManual($data);
            $this->json(['message' => 'Queue saved']);
        } catch (\Throwable $e) {
            $this->json(['error' => 'Could not save this queue: ' . $e->getMessage()], 500);
        }
    }

    public function deleteTarget(): void {
        $this->requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int) ($data['id'] ?? 0);
        if (!$id) {
            $this->json(['error' => 'Missing id'], 400);
        }
        (new SlaTarget())->delete($id);
        $this->json(['message' => 'Queue deleted']);
    }

    public function linkDeskCompany(): void {
        $this->requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $deskId = (int) ($data['desk_id'] ?? 0);
        if (!$deskId) {
            $this->json(['error' => 'Missing desk_id'], 400);
        }
        $companyId = !empty($data['company_id']) ? (int) $data['company_id'] : null;
        (new Desk())->linkCompany($deskId, $companyId);
        $this->json(['message' => 'Desk linked']);
    }

   
    public function adminDashboard(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 3) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $companyId = isset($_GET['company_id']) && $_GET['company_id'] !== '' ? (int) $_GET['company_id'] : null;
        $dateFrom  = $_GET['date_from'] ?? null;
        $dateTo    = $_GET['date_to']   ?? null;
        $deskName  = isset($_GET['desk_name']) && $_GET['desk_name'] !== '' ? $_GET['desk_name'] : null;

        $rows = (new SlaData())->getQueueAggregates($dateFrom, $dateTo, $companyId, $deskName);
        $series = (new SlaData())->getDailySeries($dateFrom, $dateTo, $companyId, $deskName);
        $dashboard = array_merge($this->buildDashboard($rows), ['series' => $series]);
        if ($dateFrom && $dateFrom === $dateTo) {
            $dashboard['hourly'] = (new SlaData())->getHourlySeries($dateFrom, $companyId, $deskName);
        }
        $this->json($dashboard);
    }

    public function supervisorDashboard(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 2) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $user = (new User())->findById((int) $decoded->sub);
        if (!$user || empty($user['desk_id'])) {
            $this->json(['error' => 'No desk assigned to your profile yet. Ask an admin to set your desk in your profile.'], 400);
        }

        $desk = (new Desk())->find((int) $user['desk_id']);
        if (!$desk || empty($desk['company_id'])) {
            $this->json(['error' => 'Your desk is not linked to a company yet. Ask an admin to link it.'], 400);
        }

        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo   = $_GET['date_to']   ?? null;
        $deskName = isset($_GET['desk_name']) && $_GET['desk_name'] !== '' ? $_GET['desk_name'] : null;

        $rows = (new SlaData())->getQueueAggregates($dateFrom, $dateTo, (int) $desk['company_id'], $deskName);
        $series = (new SlaData())->getDailySeries($dateFrom, $dateTo, (int) $desk['company_id'], $deskName);
        $dashboard = array_merge($this->buildDashboard($rows), ['series' => $series]);
        if ($dateFrom && $dateFrom === $dateTo) {
            $dashboard['hourly'] = (new SlaData())->getHourlySeries($dateFrom, (int) $desk['company_id'], $deskName);
        }
        $this->json($dashboard);
    }

 
    public function stream(): void {
        
        set_time_limit(0);
        ignore_user_abort(true);

        $decoded = $this->requireAuthFromQuery();

        
        @ini_set('implicit_flush', '1');
        ob_implicit_flush(true);
        if (function_exists('apache_setenv')) {
            @apache_setenv('no-gzip', '1');
        }

        $companyId = isset($_GET['company_id']) && $_GET['company_id'] !== '' ? (int) $_GET['company_id'] : null;
        $dateFrom  = $_GET['date_from'] ?? null;
        $dateTo    = $_GET['date_to']   ?? null;
        $deskName  = isset($_GET['desk_name']) && $_GET['desk_name'] !== '' ? $_GET['desk_name'] : null;

        $role = (int) $decoded->role_id;
        if ($role === 2) {
            $user = (new User())->findById((int) $decoded->sub);
            $desk = $user && !empty($user['desk_id']) ? (new Desk())->find((int) $user['desk_id']) : null;
            if (!$desk || empty($desk['company_id'])) {
                $this->json(['error' => 'Your desk is not linked to a company yet. Ask an admin to link it.'], 400);
            }
            $companyId = (int) $desk['company_id'];
        } elseif ($role !== 3) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('X-Accel-Buffering: no'); 
        header('Connection: keep-alive');
        while (ob_get_level() > 0) { ob_end_flush(); }

        $slaModel = new SlaData();
        $lastMaxId = -1; 
        $started = time();

        while (true) {
            if (connection_aborted()) {
                break;
            }
         
            if (time() - $started > 3600) {
                echo "event: reconnect\ndata: {}\n\n";
                @ob_flush(); @flush();
                break;
            }

            $maxId = $slaModel->getMaxId();
            if ($maxId !== $lastMaxId) {
                $lastMaxId = $maxId;

                $rows      = $slaModel->getQueueAggregates($dateFrom, $dateTo, $companyId, $deskName);
                $series    = $slaModel->getDailySeries($dateFrom, $dateTo, $companyId, $deskName);
                $dashboard = array_merge($this->buildDashboard($rows), ['series' => $series]);
                $dashboard['breaches'] = $this->detectBreaches($rows);

                echo "event: sla_update\n";
                echo 'data: ' . json_encode($dashboard) . "\n\n";
            } else {
                echo ": keep-alive\n\n";
            }

            @ob_flush();
            @flush();
            sleep(3);
        }
    }

   
    private function detectBreaches(array $rows): array {
        $breaches = [];
        foreach ($rows as $row) {
            $offered = (int) ($row['offered'] ?? 0);
            if ($offered <= 0) continue;

            $ansRate = ((int) $row['answered_in_sla']) / $offered;
            $abdRate = ((int) $row['abandoned']) > 0
                ? ((int) $row['abandoned_in_sla']) / max(1, (int) $row['abandoned'])
                : 0;

            $target = $row['target_ans_rate'] !== null ? (float) $row['target_ans_rate'] : null;
            if ($target !== null && $ansRate < $target) {
                $breaches[] = [
                    'queue_name'   => $row['queue_name'],
                    'desk_name'    => $row['desk_name'],
                    'metric'       => 'answer_rate',
                    'actual'       => round($ansRate, 3),
                    'target'       => $target,
                ];
            }
        }
        return $breaches;
    }

    private function requireAuthFromQuery(): object {
        $token = $_GET['token'] ?? '';
        if (!$token) {
            $this->json(['error' => 'No token provided'], 401);
        }
        try {
            return JWT::decode($token, new Key(JWT_SECRET, 'HS256'));
        } catch (\Exception $e) {
            $this->json(['error' => 'Invalid or expired token'], 401);
        }
    }

    private function buildDashboard(array $rows): array {
        $companies = [];
        $overall   = $this->emptyBucket();

        foreach ($rows as $row) {
            $companyName = $row['company_name'] ?: 'Unclassified';
            $deskName    = $row['desk_name'] ?: $row['queue_name'];

            $companies[$companyName] ??= [
                'name'   => $companyName,
                'bucket' => $this->emptyBucket(),
                'desks'  => [],
            ];
            $companies[$companyName]['desks'][$deskName] ??= [
                'name'    => $deskName,
                'bucket'  => $this->emptyBucket(),
                'queues'  => [],
            ];

            $this->accumulate($companies[$companyName]['bucket'], $row);
            $this->accumulate($companies[$companyName]['desks'][$deskName]['bucket'], $row);
            $this->accumulate($overall, $row);

            $queueBucket = $this->emptyBucket();
            $this->accumulate($queueBucket, $row);
            $companies[$companyName]['desks'][$deskName]['queues'][] = $this->rateSummary($queueBucket, $row['queue_name']);
        }

        $companyList = [];
        foreach ($companies as $company) {
            $deskList = [];
            foreach ($company['desks'] as $desk) {
                $deskList[] = $this->rateSummary($desk['bucket'], $desk['name'], $desk['queues']);
            }
            usort($deskList, fn($a, $b) => $b['offered'] <=> $a['offered']);
            $companyList[] = $this->rateSummary($company['bucket'], $company['name'], $deskList);
        }
        usort($companyList, fn($a, $b) => $b['offered'] <=> $a['offered']);

        $overallSummary = $this->rateSummary($overall, 'Overall');

        return [
            'overview'   => $overallSummary,
            'highlights' => $this->highlights($companyList),
            'companies'  => $companyList,
        ];
    }

    private function emptyBucket(): array {
        return [
            'offered' => 0, 'handled' => 0, 'abandoned' => 0,
            'answered_in_sla' => 0, 'abandoned_in_sla' => 0,
            'asa_sum' => 0, 'asa_n' => 0, 'aht_sum' => 0, 'aht_n' => 0, 'hold_sum' => 0, 'hold_n' => 0,
            'target_ans_sum' => 0, 'target_abd_sum' => 0, 'target_n' => 0,
        ];
    }

    private function accumulate(array &$bucket, array $row): void {
        $bucket['offered']          += (int) ($row['offered'] ?? 0);
        $bucket['handled']          += (int) ($row['handled'] ?? 0);
        $bucket['abandoned']        += (int) ($row['abandoned'] ?? 0);
        $bucket['answered_in_sla']  += (int) ($row['answered_in_sla'] ?? 0);
        $bucket['abandoned_in_sla'] += (int) ($row['abandoned_in_sla'] ?? 0);

        if ($row['avg_asa'] !== null)  { $bucket['asa_sum']  += (float) $row['avg_asa'];  $bucket['asa_n']++; }
        if ($row['avg_aht'] !== null)  { $bucket['aht_sum']  += (float) $row['avg_aht'];  $bucket['aht_n']++; }
        if ($row['avg_hold'] !== null) { $bucket['hold_sum'] += (float) $row['avg_hold']; $bucket['hold_n']++; }

        if ($row['target_ans_rate'] !== null) { $bucket['target_ans_sum'] += (float) $row['target_ans_rate']; $bucket['target_n']++; }
        if ($row['target_abd_rate'] !== null) { $bucket['target_abd_sum'] += (float) $row['target_abd_rate']; }
    }

  
    private function rateSummary(array $bucket, string $name, array $children = []): array {
        $offered  = $bucket['offered'];
        $ansDenom = $offered - $bucket['abandoned_in_sla'];
        $ansRate  = $ansDenom > 0 ? $bucket['answered_in_sla'] / $ansDenom : null;

        $abandonedOutSla = $bucket['abandoned'] - $bucket['abandoned_in_sla'];
        $abdRate = $offered > 0 ? 1 - ($abandonedOutSla / $offered) : null;

        $targetAns = $bucket['target_n'] > 0 ? $bucket['target_ans_sum'] / $bucket['target_n'] : null;
        $targetAbd = $bucket['target_n'] > 0 ? $bucket['target_abd_sum'] / $bucket['target_n'] : null;

        return [
            'name'             => $name,
            'offered'          => $offered,
            'handled'          => $bucket['handled'],
            'abandoned'        => $bucket['abandoned'],
            'answer_rate'      => $ansRate,
            'abandon_rate'     => $abdRate,
            'target_answer_rate'  => $targetAns,
            'target_abandon_rate' => $targetAbd,
            'meets_answer_target'  => ($ansRate !== null && $targetAns !== null) ? $ansRate >= $targetAns : null,
            'meets_abandon_target' => ($abdRate !== null && $targetAbd !== null) ? $abdRate >= $targetAbd : null,
            'avg_asa'  => $bucket['asa_n']  > 0 ? round($bucket['asa_sum']  / $bucket['asa_n'])  : null,
            'avg_aht'  => $bucket['aht_n']  > 0 ? round($bucket['aht_sum']  / $bucket['aht_n'])  : null,
            'avg_hold' => $bucket['hold_n'] > 0 ? round($bucket['hold_sum'] / $bucket['hold_n']) : null,
            'children' => $children,
        ];
    }

    private function highlights(array $companyList): array {
        $flat = [];
        foreach ($companyList as $c) {
            $flat[] = $c;
            foreach ($c['children'] as $d) $flat[] = $d;
        }

        $pick = function (array $list, string $field, bool $lowestIsBest) {
            $best = null;
            foreach ($list as $item) {
                if ($item[$field] === null) continue;
                if ($best === null) { $best = $item; continue; }
                if ($lowestIsBest ? $item[$field] < $best[$field] : $item[$field] > $best[$field]) {
                    $best = $item;
                }
            }
            return $best ? ['name' => $best['name'], 'value' => $best[$field]] : null;
        };

        return [
            'best_answer_rate' => $pick($flat, 'answer_rate', false),
            'highest_volume'   => $pick($flat, 'offered', false),
            'fastest_response' => $pick($flat, 'avg_asa', true),
            'best_efficiency'  => $pick($flat, 'avg_aht', true),
            'shortest_hold'    => $pick($flat, 'avg_hold', true),
        ];
    }


    private function requireAdmin(): object {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 3) {
            $this->json(['error' => 'Forbidden'], 403);
        }
        return $decoded;
    }

    private function requireAuth(): object {
        $token = $this->bearerToken();
        if (!$token) {
            $this->json(['error' => 'No token provided'], 401);
        }
        try {
            return JWT::decode($token, new Key(JWT_SECRET, 'HS256'));
        } catch (\Exception $e) {
            $this->json(['error' => 'Invalid or expired token'], 401);
        }
    }

    private function bearerToken(): string {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!$header && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $header  = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        return str_replace('Bearer ', '', $header);
    }
}
