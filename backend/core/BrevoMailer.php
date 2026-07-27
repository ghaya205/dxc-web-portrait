<?php
namespace Core;

class BrevoMailer {
    private const API_URL = 'https://api.brevo.com/v3/smtp/email';

    private string $apiKey;
    private string $fromEmail;
    private string $fromName;

    public function __construct() {
        $this->apiKey    = $_ENV['BREVO_API_KEY'] ?? '';
        $this->fromEmail = $_ENV['BREVO_FROM_EMAIL'] ?? '';
        $this->fromName  = $_ENV['BREVO_FROM_NAME'] ?? 'DXC Tunisie Transport';
    }

    public function isConfigured(): bool {
        return $this->apiKey !== '' && $this->fromEmail !== '';
    }

    public function send(string $to, string $subject, string $textBody, ?string $htmlBody = null): array {
        if (!$this->isConfigured()) {
            return ['ok' => false, 'error' => 'BREVO_API_KEY / BREVO_FROM_EMAIL are not set in .env'];
        }

        $payload = [
            'sender'      => [
                'name'  => $this->fromName,
                'email' => $this->fromEmail,
            ],
            'to'          => [
                ['email' => $to],
            ],
            'subject'     => $subject,
            'textContent' => $textBody,
        ];

        if ($htmlBody !== null) {
            $payload['htmlContent'] = $htmlBody;
        }

        $ch = curl_init(self::API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'accept: application/json',
                'content-type: application/json',
                'api-key: ' . $this->apiKey,
            ],
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_TIMEOUT        => 20,
        ]);

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            return ['ok' => false, 'error' => "Brevo request failed: {$curlError}"];
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['ok' => true];
        }

        $decoded = json_decode($response, true);
        $message = $decoded['message'] ?? $response;
        return ['ok' => false, 'error' => "Brevo API error ({$httpCode}): {$message}"];
    }

    public function sendWithAttachment(string $to, string $subject, string $textBody, string $attachmentName, string $attachmentContent, string $attachmentMime = 'text/csv', ?string $htmlBody = null): array {
        if (!$this->isConfigured()) {
            return ['ok' => false, 'error' => 'BREVO_API_KEY / BREVO_FROM_EMAIL are not set in .env'];
        }

        $payload = [
            'sender'      => [
                'name'  => $this->fromName,
                'email' => $this->fromEmail,
            ],
            'to'          => [
                ['email' => $to],
            ],
            'subject'     => $subject,
            'textContent' => $textBody,
            'attachment'  => [
                [
                    'name'    => $attachmentName,
                    'content' => base64_encode($attachmentContent),
                ],
            ],
        ];

        if ($htmlBody !== null) {
            $payload['htmlContent'] = $htmlBody;
        }

        $ch = curl_init(self::API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'accept: application/json',
                'content-type: application/json',
                'api-key: ' . $this->apiKey,
            ],
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_TIMEOUT        => 20,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            return ['ok' => false, 'error' => "Brevo request failed: {$curlError}"];
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['ok' => true];
        }

        $decoded = json_decode($response, true);
        $message = $decoded['message'] ?? $response;
        return ['ok' => false, 'error' => "Brevo API error ({$httpCode}): {$message}"];
    }
}
