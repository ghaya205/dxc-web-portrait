<?php
namespace Controllers;

use Core\Controller;
use Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthController extends Controller {

    public function ping(): void {
        $dbOk  = false;
        $dbMsg = '';
        try {
            \Core\Database::getInstance();
            $dbOk  = true;
            $dbMsg = 'Connected';
        } catch (\Throwable $e) {
            $dbMsg = $e->getMessage();
        }

        $this->json([
            'status'       => 'ok',
            'php'          => PHP_VERSION,
            'project_root' => PROJECT_ROOT,
            'db'           => $dbOk ? 'ok' : 'error',
            'db_message'   => $dbMsg,
            'jwt_secret' => defined('JWT_SECRET') ? 'set' : 'missing',
        ]);
    }

    public function login(): void {
        $data  = $this->input();
        $email = trim($data['email']    ?? '');
        $pass  =      $data['password'] ?? '';

        if (!$email || !$pass) {
            $this->json(['error' => 'Email and password are required'], 400);
        }

        $userModel = new User();
        $user      = $userModel->findByEmail($email);

        if (!$user || !password_verify($pass, $user['password'])) {
            $this->json(['error' => 'Invalid email or password'], 401);
        }

        if (in_array((int) $user['role_id'], [1, 2])) {
            $approved = (int) ($user['is_approved'] ?? 0);
            if ($approved === 0) {
                $this->json(['error' => 'pending_approval', 'message' => 'Your account is pending admin approval. You will be notified once approved.'], 403);
            }
            if ($approved === 2) {
                $this->json(['error' => 'account_rejected', 'message' => 'Your account registration was declined. Please contact your administrator.'], 403);
            }
        }

        $payload = [
            'iss'     => 'dxc-app',
            'iat'     => time(),
            'exp'     => time() + 3600,
            'sub'     => $user['id'],
            'name'    => $user['name'],
            'email'   => $user['email'],
            'role_id' => (int) $user['role_id'],
        ];

        $this->json(['token' => JWT::encode($payload, JWT_SECRET, 'HS256')]);
    }

    public function register(): void {
        $data           = $this->input();
        $name           = trim($data['name']            ?? '');
        $email          = trim($data['email']           ?? '');
        $password       =      $data['password']        ?? '';
        $roleName       = strtolower(trim($data['role'] ?? ''));
        $enterpriseCode =      $data['enterprise_code'] ?? '';

        if (!$name || !$email || !$password || !$roleName) {
            $this->json(['error' => 'Name, email, password and role are required'], 400);
        }

        if ($roleName === 'admin') {
            if (!$enterpriseCode) {
                $this->json(['error' => 'An enterprise code is required to register as an admin.'], 400);
            }
            $userModel = new User();
            if (!$userModel->verifyEnterpriseCode($enterpriseCode)) {
                $this->json(['error' => 'Invalid enterprise code. Please contact your IT department.'], 403);
            }
        }

        $userModel = new User();

        $roleId = $userModel->getRoleId($roleName);
        if ($roleId === false) {
            $this->json(['error' => 'Invalid role selected'], 400);
        }

        if ($userModel->emailExists($email)) {
            $this->json(['error' => 'An account with this email already exists'], 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);

        $preApproved = ($roleName === 'admin');
        $userModel->create($name, $email, $hash, $roleId, $preApproved);

        if ($preApproved) {
            $this->json(['message' => 'Admin account created successfully. You can now log in.'], 201);
        } else {
            $this->json([
                'message' => 'Account created! Your account is pending approval by an administrator. You will be able to log in once approved.',
                'status'  => 'pending_approval',
            ], 201);
        }
    }

    public function me(): void {
        $decoded = $this->requireAuth();
        $this->json(['message' => 'Access granted!', 'user' => (array) $decoded]);
    }

    public function updateProfile(): void {
        $decoded = $this->requireAuth();
        $data    = $this->input();
        $name    = trim($data['name'] ?? '');

        if (!$name) {
            $this->json(['error' => 'Name cannot be empty'], 400);
        }

        $userModel = new User();
        $userModel->updateName((int) $decoded->sub, $name);

        $this->json(['message' => 'Profile updated successfully']);
    }

    public function updatePassword(): void {
        $decoded    = $this->requireAuth();
        $data       = $this->input();
        $currentPwd = $data['current_password'] ?? '';
        $newPwd     = $data['new_password']     ?? '';

        if (!$currentPwd || !$newPwd) {
            $this->json(['error' => 'Current and new password are required'], 400);
        }

        if (strlen($newPwd) < 8) {
            $this->json(['error' => 'New password must be at least 8 characters'], 400);
        }

        $userModel = new User();
        $user      = $userModel->findById((int) $decoded->sub);

        if (!$user || !password_verify($currentPwd, $user['password'])) {
            $this->json(['error' => 'Current password is incorrect'], 401);
        }

        $userModel->updatePassword((int) $decoded->sub, password_hash($newPwd, PASSWORD_BCRYPT));

        $this->json(['message' => 'Password updated successfully']);
    }

    public function fullProfile(): void {
        $decoded = $this->requireAuth();
        $userModel = new User();
        $profile   = $userModel->getFullProfile((int) $decoded->sub);
        if (!$profile) {
            $this->json(['error' => 'User not found'], 404);
        }
        $this->json(['profile' => $profile]);
    }

    public function updateFullProfile(): void {
        $decoded = $this->requireAuth();
        $data    = $this->input();

        if (isset($data['name']) && trim($data['name']) === '') {
            $this->json(['error' => 'Name cannot be empty'], 400);
        }

        $userModel = new User();
        $userModel->updateFullProfile((int) $decoded->sub, $data);

        $this->json(['message' => 'Profile updated successfully']);
    }

    public function uploadProfilePicture(): void {
        $decoded = $this->requireAuth();

        if (empty($_FILES['picture']) || $_FILES['picture']['error'] !== UPLOAD_ERR_OK) {
            $this->json(['error' => 'No valid picture uploaded'], 400);
        }

        $file      = $_FILES['picture'];
        $allowed   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $finfo     = finfo_open(FILEINFO_MIME_TYPE);
        $mime      = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!isset($allowed[$mime])) {
            $this->json(['error' => 'Only JPG, PNG or WEBP images are allowed'], 400);
        }

        if ($file['size'] > 4 * 1024 * 1024) {
            $this->json(['error' => 'Image must be smaller than 4MB'], 400);
        }

        $dir = PROJECT_ROOT . '/backend/public/uploads/avatars';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $filename = 'user_' . $decoded->sub . '_' . time() . '.' . $allowed[$mime];
        move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

        $publicPath = 'uploads/avatars/' . $filename;

        $userModel = new User();
        $userModel->updateProfilePicture((int) $decoded->sub, $publicPath);

        $this->json(['message' => 'Profile picture updated', 'path' => $publicPath]);
    }

    public function adminCreateUser(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 3) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $data     = $this->input();
        $name     = trim($data['name']     ?? '');
        $email    = trim($data['email']    ?? '');
        $password =      $data['password'] ?? '';
        $roleName = strtolower(trim($data['role'] ?? ''));

        if (!$name || !$email || !$password || !$roleName) {
            $this->json(['error' => 'Name, email, password and role are required'], 400);
        }

        $userModel = new User();

        $roleId = $userModel->getRoleId($roleName);
        if ($roleId === false || (int) $roleId === 3) {
            $this->json(['error' => 'Invalid role selected'], 400);
        }

        if ($userModel->emailExists($email)) {
            $this->json(['error' => 'An account with this email already exists'], 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $data['role_id'] = $roleId;

        $id = $userModel->createByAdmin($data, $hash);

        $this->json(['message' => 'User created successfully', 'id' => $id], 201);
    }

    public function listUsers(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 3) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $userModel = new User();
        $this->json(['users' => $userModel->getAllUsers()]);
    }

    public function approveUser(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 3) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $data   = $this->input();
        $userId = (int) ($data['user_id'] ?? 0);
        if (!$userId) {
            $this->json(['error' => 'user_id is required'], 400);
        }

        $userModel = new User();
        $userModel->approveUser($userId, (int) $decoded->sub);
        $this->json(['message' => 'User approved successfully']);
    }

    public function rejectUser(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 3) {
            $this->json(['error' => 'Forbidden'], 403);
        }

        $data   = $this->input();
        $userId = (int) ($data['user_id'] ?? 0);
        if (!$userId) {
            $this->json(['error' => 'user_id is required'], 400);
        }

        $userModel = new User();
        $userModel->rejectUser($userId);
        $this->json(['message' => 'User rejected']);
    }

    public function generateCodeHash(): void {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        if (!in_array($ip, ['127.0.0.1', '::1'])) {
            $this->json(['error' => 'Forbidden'], 403);
        }
        $data = $this->input();
        $code = $data['code'] ?? '';
        if (!$code) {
            $this->json(['error' => 'code is required'], 400);
        }
        $this->json(['hash' => password_hash($code, PASSWORD_BCRYPT)]);
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

    public function debugUsers(): void {
        $decoded = $this->requireAuth();
        if ((int) $decoded->role_id !== 3) {
            $this->json(["error" => "Forbidden"], 403);
        }
        $db = \Core\Database::getInstance();
        $roles = $db->query("SELECT * FROM roles")->fetchAll();
        $users = $db->query("SELECT id, name, email, role_id, is_approved FROM users")->fetchAll();
        $this->json(["roles" => $roles, "users" => $users]);
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
