<?php
namespace Controllers;

use Core\Controller;
use Models\Desk;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class DeskController extends Controller {

    public function list(): void {
        $this->requireAuth();
        $deskModel = new Desk();
        $this->json(['desks' => $deskModel->all()]);
    }

    public function create(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 3) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $data    = $this->input();
        $name    = trim($data['name']    ?? '');
        $acronym = trim($data['acronym'] ?? '');

        if (!$name || !$acronym) {
            $this->json(['error' => 'Desk name and acronym are required'], 400);
        }

        $deskModel = new Desk();
        if ($deskModel->nameExists($name)) {
            $this->json(['error' => 'A desk with this name already exists'], 409);
        }

        $id = $deskModel->create([
            'name'           => $name,
            'acronym'        => $acronym,
            'company_id'     => !empty($data['company_id']) ? (int) $data['company_id'] : null,
            'languages'      => $data['languages']      ?? [],
            'call_questions' => $data['call_questions'] ?? [],
            'case_questions' => $data['case_questions'] ?? [],
            'chat_questions' => $data['chat_questions'] ?? [],
        ]);

        $this->json(['message' => 'Desk created successfully', 'id' => $id], 201);
    }

    public function update(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 3) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $data = $this->input();
        $id   = (int) ($data['id'] ?? 0);
        if (!$id) {
            $this->json(['error' => 'Desk id is required'], 400);
        }

        $name    = trim($data['name']    ?? '');
        $acronym = trim($data['acronym'] ?? '');
        if (!$name || !$acronym) {
            $this->json(['error' => 'Desk name and acronym are required'], 400);
        }

        $deskModel = new Desk();
        if (!$deskModel->find($id)) {
            $this->json(['error' => 'Desk not found'], 404);
        }
        if ($deskModel->nameExists($name, $id)) {
            $this->json(['error' => 'A desk with this name already exists'], 409);
        }

        $updateData = [
            'name'           => $name,
            'acronym'        => $acronym,
            'languages'      => $data['languages']      ?? [],
            'call_questions' => $data['call_questions'] ?? [],
            'case_questions' => $data['case_questions'] ?? [],
            'chat_questions' => $data['chat_questions'] ?? [],
        ];

        if (array_key_exists('company_id', $data)) {
            $updateData['company_id'] = !empty($data['company_id']) ? (int) $data['company_id'] : null;
        }

        $deskModel->update($id, $updateData);

        $this->json(['message' => 'Desk updated successfully']);
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
