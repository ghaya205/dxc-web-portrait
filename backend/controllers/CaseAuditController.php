<?php
namespace Controllers;

use Core\Controller;
use Models\CaseAudit;
use Models\Desk;
use Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class CaseAuditController extends Controller {

    private const COACHING_THRESHOLD = 70.0;

   
    public function lookupAgent(): void {
        $decoded = $this->requireAuth();
        if (!in_array((int) $decoded->role_id, [2, 3], true)) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $email = trim($_GET['email'] ?? '');
        if (!$email) {
            $this->json(['error' => 'email is required'], 400);
        }

        $userModel = new User();
        $agent = $userModel->findByEmail($email);
        if (!$agent || (int) $agent['role_id'] !== 1) {
            $this->json(['error' => 'No agent found with this email'], 404);
        }

        $desk = null;
        if (!empty($agent['desk_id'])) {
            $deskModel = new Desk();
            $found = $deskModel->find((int) $agent['desk_id']);
            $desk = $found ?: null;
        }

        $auditModel = new CaseAudit();
        $stats = $auditModel->statsForAgent((int) $agent['id']);

        $this->json([
            'agent' => [
                'id'    => (int) $agent['id'],
                'name'  => $agent['name'],
                'email' => $agent['email'],
            ],
            'desk'  => $desk ? [
                'id'             => (int) $desk['id'],
                'name'           => $desk['name'],
                'acronym'        => $desk['acronym'],
                'call_questions' => $desk['call_questions'],
                'case_questions' => $desk['case_questions'],
                'chat_questions' => $desk['chat_questions'],
            ] : null,
            'stats' => $stats,
        ]);
    }

    public function create(): void {
        $decoded = $this->requireAuth();
        if (!in_array((int) $decoded->role_id, [2, 3], true)) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $data = $this->input();

        $agentId        = (int) ($data['agent_id'] ?? 0);
        $deskId         = (int) ($data['desk_id'] ?? 0);
        $assessmentType = $data['assessment_type'] ?? '';
        $answers        = $data['answers'] ?? [];

        if (!$agentId || !$deskId || !in_array($assessmentType, ['call', 'case', 'chat'], true) || !$answers) {
            $this->json(['error' => 'agent_id, desk_id, assessment_type and answers are required'], 400);
        }

        $userModel  = new User();
        $agent      = $userModel->findById($agentId);
        if (!$agent) {
            $this->json(['error' => 'Agent not found'], 404);
        }

       
        $eliminatorFailed = !empty($data['eliminator_failed']);
        $score = $eliminatorFailed ? 0.0 : $this->computeScore($answers, $data['weights'] ?? []);

        $feedback = $data['feedback'] ?? [];
        if ($score < self::COACHING_THRESHOLD) {
            $feedback['coaching_note'] = 'A coaching session will be automatically scheduled to discuss areas for improvement.';
        }

        $auditModel = new CaseAudit();
        $id = $auditModel->create([
            'agent_id'        => $agentId,
            'desk_id'         => $deskId,
            'auditor_id'      => (int) $decoded->sub,
            'ticket_ref'      => $data['ticket_ref']      ?? null,
            'channel'         => $data['channel']         ?? null,
            'assessment_type' => $assessmentType,
            'answers'         => $answers,
            'feedback'        => $feedback,
            'score'           => $score,
            'wfe_result'      => $data['wfe_result']      ?? null,
        ]);

        $this->json([
            'message'        => 'Case confirmed',
            'id'             => $id,
            'score'          => $score,
            'needs_coaching' => $score < self::COACHING_THRESHOLD,
        ], 201);
    }

    public function mine(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 1) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $auditModel = new CaseAudit();
        $this->json([
            'audits' => $auditModel->forAgent((int) $decoded->sub),
            'stats'  => $auditModel->statsForAgent((int) $decoded->sub),
        ]);
    }

    public function forAgent(): void {
        $this->requireAuth();

        $agentId = (int) ($_GET['agent_id'] ?? 0);
        if (!$agentId) {
            $this->json(['error' => 'agent_id is required'], 400);
        }

        $auditModel = new CaseAudit();
        $this->json([
            'audits' => $auditModel->forAgent($agentId),
            'stats'  => $auditModel->statsForAgent($agentId),
        ]);
    }

    public function exportForAgent(): void {
        $this->requireAuth();

        $agentId = (int) ($_GET['agent_id'] ?? 0);
        if (!$agentId) {
            $this->json(['error' => 'agent_id is required'], 400);
        }

        $auditModel = new CaseAudit();
        $audits = $auditModel->forAgent($agentId);

        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="case_audits_agent_' . $agentId . '.csv"');

        $out = fopen('php://output', 'w');
        fputcsv($out, ['Audit Date', 'Agent Name', 'Ticket Ref', 'Channel', 'Auditor', 'Score', 'WFE', 'Answers', 'Feedback']);
        foreach ($audits as $row) {
            fputcsv($out, [
                $row['assessed_at'],
                $row['agent_name'],
                $row['ticket_ref'],
                $row['channel'],
                $row['auditor_name'],
                $row['score'],
                $row['wfe_result'],
                json_encode($row['answers']),
                json_encode($row['feedback']),
            ]);
        }
        fclose($out);
        exit;
    }

    private function computeScore(array $answers, array $weights): float {
        $total = 0;
        $max   = 0;
        foreach ($answers as $qKey => $value) {
            $weight = (float) ($weights[$qKey] ?? 1);
            $total += ((float) $value) * $weight;
            $max   += 1 * $weight; 
        }
        return $max > 0 ? round(($total / $max) * 100, 2) : 0.0;
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
