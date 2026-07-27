<?php
namespace Core;

class SmtpMailer {
    private string $host;
    private int $port;
    private string $user;
    private string $pass;
    private string $fromEmail;
    private string $fromName;
    private bool $useTls;

    public function __construct() {
        $this->host      = $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com';
        $this->port      = (int) ($_ENV['SMTP_PORT'] ?? 587);
        $this->user      = $_ENV['SMTP_USER'] ?? '';
        $this->pass      = $_ENV['SMTP_PASS'] ?? '';
        $this->fromEmail = $_ENV['SMTP_FROM'] ?? $this->user;
        $this->fromName  = $_ENV['SMTP_FROM_NAME'] ?? 'DXC Tunisie Transport';
        $this->useTls    = $this->port !== 465;
    }

    public function isConfigured(): bool {
        return $this->user !== '' && $this->pass !== '';
    }

    public function sendWithAttachment(string $to, string $subject, string $textBody, string $attachmentName, string $attachmentContent, string $attachmentMime = 'text/csv'): array {
        if (!$this->isConfigured()) {
            return ['ok' => false, 'error' => 'SMTP_USER / SMTP_PASS are not set in .env'];
        }

        $transport = $this->port === 465 ? 'ssl://' . $this->host : $this->host;
        $socket = @stream_socket_client($transport . ':' . $this->port, $errno, $errstr, 15);
        if (!$socket) {
            return ['ok' => false, 'error' => "Could not connect to {$this->host}:{$this->port} ($errstr)"];
        }

        try {
            $this->expect($socket, '220');
            $this->command($socket, "EHLO {$this->host}", '250');

            if ($this->useTls) {
                $this->command($socket, 'STARTTLS', '220');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    return ['ok' => false, 'error' => 'STARTTLS negotiation failed'];
                }
                $this->command($socket, "EHLO {$this->host}", '250');
            }

            $this->command($socket, 'AUTH LOGIN', '334');
            $this->command($socket, base64_encode($this->user), '334');
            $this->command($socket, base64_encode($this->pass), '235');

            $this->command($socket, "MAIL FROM:<{$this->fromEmail}>", '250');
            $this->command($socket, "RCPT TO:<{$to}>", ['250', '251']);
            $this->command($socket, 'DATA', '354');

            $boundary = md5(uniqid('', true));
            $headers  = "From: {$this->fromName} <{$this->fromEmail}>\r\n";
            $headers .= "To: <{$to}>\r\n";
            $headers .= 'Subject: ' . $subject . "\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";

            $body  = "--{$boundary}\r\n";
            $body .= "Content-Type: text/plain; charset=utf-8\r\n\r\n";
            $body .= $textBody . "\r\n";
            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: {$attachmentMime}; name=\"{$attachmentName}\"\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n";
            $body .= "Content-Disposition: attachment; filename=\"{$attachmentName}\"\r\n\r\n";
            $body .= chunk_split(base64_encode($attachmentContent));
            $body .= "--{$boundary}--\r\n";

            $message = $headers . "\r\n" . $body . "\r\n.";
            $this->command($socket, $message, '250');
            $this->command($socket, 'QUIT', '221');
        } catch (\Exception $e) {
            fclose($socket);
            return ['ok' => false, 'error' => $e->getMessage()];
        }

        fclose($socket);
        return ['ok' => true];
    }

    private function command($socket, string $line, string|array $expectedCode): string {
        fwrite($socket, $line . "\r\n");
        return $this->expect($socket, $expectedCode);
    }

    private function expect($socket, string|array $expectedCodes): string {
        $expectedCodes = (array) $expectedCodes;
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (strlen($line) >= 4 && $line[3] === ' ') break;
        }
        $code = substr($response, 0, 3);
        if (!in_array($code, $expectedCodes, true)) {
            throw new \Exception("Unexpected SMTP response: {$response}");
        }
        return $response;
    }
}
