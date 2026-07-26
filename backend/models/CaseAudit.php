<?php
namespace Models;

use Core\Database;
use PDO;

class CaseAudit {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function create(array $data): int {
        $stmt = $this->db->prepare(
            "INSERT INTO case_audits
                (agent_id, desk_id, auditor_id, ticket_ref, channel, assessment_type, answers, feedback, score, wfe_result)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['agent_id'],
            $data['desk_id'],
            $data['auditor_id'],
            $data['ticket_ref'] ?: null,
            $data['channel'] ?: null,
            $data['assessment_type'],
            json_encode($data['answers'] ?? []),
            json_encode($data['feedback'] ?? []),
            $data['score'],
            $data['wfe_result'] ?? null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function forAgent(int $agentId): array {
        $stmt = $this->db->prepare(
            "SELECT ca.*, u.name AS agent_name, u.email AS agent_email,
                    au.name AS auditor_name, au.email AS auditor_email,
                    d.name AS desk_name,
                    d.call_questions AS desk_call_questions,
                    d.case_questions AS desk_case_questions,
                    d.chat_questions AS desk_chat_questions
             FROM case_audits ca
             JOIN users u       ON u.id = ca.agent_id
             LEFT JOIN users au ON au.id = ca.auditor_id
             JOIN desks d       ON d.id = ca.desk_id
             WHERE ca.agent_id = ?
             ORDER BY ca.assessed_at DESC"
        );
        $stmt->execute([$agentId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row = $this->decode($row);
        }
        return $rows;
    }

    public function statsForAgent(int $agentId): array {
        $stmt = $this->db->prepare(
            "SELECT AVG(score) AS avg_score,
                    (SELECT score FROM case_audits WHERE agent_id = ? ORDER BY assessed_at DESC LIMIT 1) AS last_score
             FROM case_audits WHERE agent_id = ?"
        );
        $stmt->execute([$agentId, $agentId]);
        $row = $stmt->fetch();
        return [
            'avg_score'  => $row && $row['avg_score']  !== null ? round((float) $row['avg_score'], 2)  : null,
            'last_score' => $row && $row['last_score'] !== null ? round((float) $row['last_score'], 2) : null,
        ];
    }

    private function decode(array $row): array {
        $row['answers']  = json_decode($row['answers'] ?? '[]', true) ?? [];
        $row['feedback'] = json_decode($row['feedback'] ?? '[]', true) ?? [];

        $questionField = [
            'call' => 'desk_call_questions',
            'case' => 'desk_case_questions',
            'chat' => 'desk_chat_questions',
        ][$row['assessment_type']] ?? null;

        $questions = $questionField ? (json_decode($row[$questionField] ?? '[]', true) ?? []) : [];
        unset($row['desk_call_questions'], $row['desk_case_questions'], $row['desk_chat_questions']);

        $breakdown = [];
        foreach ($row['answers'] as $qKey => $value) {
            $index = (int) str_replace('q', '', $qKey);
            $breakdown[] = [
                'key'      => $qKey,
                'question' => $questions[$index]['question'] ?? $qKey,
                'category' => $questions[$index]['category'] ?? null,
                'answer'   => (int) $value === 1 ? 'yes' : 'no',
                'comment'  => $row['feedback'][$qKey] ?? null,
            ];
        }
        $row['breakdown'] = $breakdown;

        return $row;
    }
}
