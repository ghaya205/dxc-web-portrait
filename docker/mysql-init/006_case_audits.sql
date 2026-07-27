-- ============================================================
-- Case Assessment / QA Audit: one row per completed assessment
-- (an auditor scoring one agent's call/case/chat against the
-- desk's question set defined in desks.call_questions /
-- case_questions / chat_questions).
-- ============================================================

CREATE TABLE IF NOT EXISTS case_audits (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    agent_id        INT NOT NULL,
    desk_id         INT NOT NULL,
    auditor_id      INT NULL,
    ticket_ref      VARCHAR(100) NULL,
    channel         VARCHAR(50)  NULL,
    assessment_type ENUM('call','case','chat') NOT NULL,
    answers         JSON NOT NULL,          -- {"q1": 2, "q2": 4, ...}
    feedback        JSON NULL,              -- {"f1": "...", "f2": "...", ...}
    score           DECIMAL(5,2) NOT NULL,  -- percentage, e.g. 92.00
    wfe_result      DECIMAL(5,2) NULL,
    assessed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_case_audits_agent   FOREIGN KEY (agent_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_case_audits_desk    FOREIGN KEY (desk_id)    REFERENCES desks(id) ON DELETE CASCADE,
    CONSTRAINT fk_case_audits_auditor FOREIGN KEY (auditor_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_case_audits_agent (agent_id),
    INDEX idx_case_audits_desk (desk_id),
    INDEX idx_case_audits_date (assessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
