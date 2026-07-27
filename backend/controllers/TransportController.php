<?php
namespace Controllers;

use Core\Controller;
use Core\BrevoMailer;
use Models\TransportRequest;
use Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class TransportController extends Controller {

    public function agents(): void {
        $this->requireRole([2, 3]);
        $userModel = new User();
        $this->json(['agents' => $userModel->getAllAgentsForTransport()]);
    }

    public function createDraft(): void {
        $decoded = $this->requireRole([2]);
        $model = new TransportRequest();
        $id = $model->createDraft((int) $decoded->sub);
        $this->json(['message' => 'Draft created', 'id' => $id], 201);
    }

    public function myDrafts(): void {
        $decoded = $this->requireRole([2]);
        $model = new TransportRequest();
        $this->json(['requests' => $model->myDrafts((int) $decoded->sub)]);
    }

    public function myHistory(): void {
        $decoded = $this->requireRole([2]);
        $model = new TransportRequest();
        $this->json(['requests' => $model->myHistory((int) $decoded->sub)]);
    }

    public function detail(): void {
        $decoded = $this->requireRole([2, 3]);
        $id = (int) ($_GET['id'] ?? 0);
        $model = new TransportRequest();
        $request = $model->find($id);
        if (!$request) {
            $this->json(['error' => 'Request not found'], 404);
        }
        if ((int) $decoded->role_id === 2 && (int) $request['supervisor_id'] !== (int) $decoded->sub) {
            $this->json(['error' => 'Forbidden'], 403);
        }
        $request['items'] = $model->getItems($id);
        $this->json(['request' => $request]);
    }

    public function addItems(): void {
        $decoded = $this->requireRole([2]);
        $data = $this->input();

        $requestId = (int) ($data['request_id'] ?? 0);
        $agentIds  = $data['agent_ids'] ?? [];
        $vehicleType = in_array($data['vehicle_type'] ?? '', ['taxi', 'bus'], true) ? $data['vehicle_type'] : 'taxi';
        $direction = $data['direction'] ?? 'aller_retour';
        $days      = $data['days'] ?? [];

        if (!$requestId || !$agentIds || !$days) {
            $this->json(['error' => 'request_id, agent_ids and days are required'], 400);
        }

        $requestModel = new TransportRequest();
        $request = $requestModel->find($requestId);
        if (!$request || (int) $request['supervisor_id'] !== (int) $decoded->sub || $request['status'] !== 'draft') {
            $this->json(['error' => 'Draft not found'], 404);
        }

        $userModel = new User();
        $createdIds = [];
        foreach ($agentIds as $agentId) {
            $agent = $userModel->findById((int) $agentId);
            if (!$agent) continue;
            $lat = $agent['latitude'] !== null ? (float) $agent['latitude'] : null;
            $lng = $agent['longitude'] !== null ? (float) $agent['longitude'] : null;
            $createdIds[] = $requestModel->addItem(
                $requestId, (int) $agentId, $vehicleType, $direction,
                $data['pickup_time'] ?? null, $data['return_time'] ?? null, $days, $lat, $lng
            );
        }

        $this->json(['message' => 'Agents added', 'item_ids' => $createdIds], 201);
    }

    public function updateItem(): void {
        $decoded = $this->requireRole([2, 3]);
        $data = $this->input();
        $itemId = (int) ($data['item_id'] ?? 0);
        if (!$itemId) {
            $this->json(['error' => 'item_id is required'], 400);
        }
        $model = new TransportRequest();
        $model->updateItem($itemId, $data);
        $this->json(['message' => 'Item updated']);
    }

    public function deleteItem(): void {
        $decoded = $this->requireRole([2, 3]);
        $data = $this->input();
        $itemId = (int) ($data['item_id'] ?? 0);
        if (!$itemId) {
            $this->json(['error' => 'item_id is required'], 400);
        }
        $model = new TransportRequest();
        $model->deleteItem($itemId);
        $this->json(['message' => 'Agent removed from planning']);
    }

    public function applyAll(): void {
        $decoded = $this->requireRole([2, 3]);
        $data = $this->input();
        $requestId = (int) ($data['request_id'] ?? 0);
        if (!$requestId) {
            $this->json(['error' => 'request_id is required'], 400);
        }
        $model = new TransportRequest();
        $model->applyToAll($requestId, $data);
        $this->json(['message' => 'Changes applied to all agents']);
    }

    public function send(): void {
        $decoded = $this->requireRole([2]);
        $data = $this->input();
        $requestId = (int) ($data['request_id'] ?? 0);
        $model = new TransportRequest();
        $request = $model->find($requestId);
        if (!$request || (int) $request['supervisor_id'] !== (int) $decoded->sub) {
            $this->json(['error' => 'Request not found'], 404);
        }
        if (!$model->getItems($requestId)) {
            $this->json(['error' => 'Add at least one agent before sending'], 400);
        }
        $model->send($requestId);
        $this->json(['message' => 'Transport plan sent to HR']);
    }

    public function pendingForAdmin(): void {
        $this->requireRole([3]);
        $model = new TransportRequest();
        $this->json(['requests' => $model->pendingForAdmin()]);
    }

    public function allForAdmin(): void {
        $this->requireRole([3]);
        $model = new TransportRequest();
        $this->json(['requests' => $model->allForAdmin()]);
    }

    public function decide(): void {
        $decoded = $this->requireRole([3]);
        $data = $this->input();
        $requestId = (int) ($data['request_id'] ?? 0);
        $status = $data['status'] ?? '';

        if (!$requestId || !in_array($status, ['approved', 'rejected'], true)) {
            $this->json(['error' => 'request_id and a valid status are required'], 400);
        }

        $model = new TransportRequest();
        $request = $model->find($requestId);
        if (!$request) {
            $this->json(['error' => 'Request not found'], 404);
        }

        $model->decide($requestId, (int) $decoded->sub, $status, $data['admin_note'] ?? null);

        $mailWarnings = [];
        if ($status === 'approved') {
            if ($model->hasVehicleType($requestId, 'taxi')) {
                $csv = $model->buildCsv($requestId, 'taxi');
                $result = $this->sendPlanningEmail($model, $csv, $requestId, 'taxi', $_ENV['TAXI_COMPANY_EMAIL'] ?? 'contact@societe-taxi.tn');
                if (!$result['ok']) $mailWarnings[] = "Taxi email: {$result['error']}";
            }
            if ($model->hasVehicleType($requestId, 'bus')) {
                $csv = $model->buildCsv($requestId, 'bus');
                $result = $this->sendPlanningEmail($model, $csv, $requestId, 'bus', $_ENV['BUS_COMPANY_EMAIL'] ?? 'contact@societe-bus.tn');
                if (!$result['ok']) $mailWarnings[] = "Bus email: {$result['error']}";
            }
        }

        $this->json(['message' => 'Request ' . $status, 'mail_warnings' => $mailWarnings]);
    }

    public function exportCsv(): void {
        $this->requireRole([3]);
        $id = (int) ($_GET['id'] ?? 0);
        $vehicleType = in_array($_GET['vehicle_type'] ?? '', ['taxi', 'bus'], true) ? $_GET['vehicle_type'] : null;
        if (!$id) {
            $this->json(['error' => 'id is required'], 400);
        }
        $model = new TransportRequest();
        $csv = $model->buildCsv($id, $vehicleType);

        $suffix = $vehicleType ? "_$vehicleType" : '';
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="transport_plan_' . $id . $suffix . '.csv"');
        echo $csv;
        exit;
    }

    private function sendPlanningEmail(TransportRequest $model, string $csv, int $requestId, string $vehicleType, string $to): array {
        $mailer = new BrevoMailer();
        $subject = 'DXC Tunisie - ' . ucfirst($vehicleType) . ' Transport Planning #' . $requestId;
        $text = "Please find attached the approved $vehicleType transport planning for DXC Tunisie.";
        $html = $model->buildEmailHtml($requestId, $vehicleType);
        $filename = "transport_plan_{$requestId}_{$vehicleType}.csv";
        return $mailer->sendWithAttachment($to, $subject, $text, $filename, $csv, 'text/csv', $html);
    }

    private function requireRole(array $roleIds): object {
        $decoded = $this->requireAuth();
        if (!in_array((int) $decoded->role_id, $roleIds, true)) {
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
