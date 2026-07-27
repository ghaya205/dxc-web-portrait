-- ============================================================
-- SLA Dashboard: companies, SLA targets, and raw interval data
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Let existing "desks" (already used for HR/profile purposes) optionally
-- belong to a company, so a supervisor's desk resolves to one company.
ALTER TABLE desks
  ADD COLUMN IF NOT EXISTS company_id INT NULL AFTER acronym,
  ADD CONSTRAINT fk_desks_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- One row per Queue: which desk/company it belongs to, its SLA thresholds
-- and its contractual targets. Populated from the "SLA" reference file.
CREATE TABLE IF NOT EXISTS sla_targets (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    queue_name        VARCHAR(150) NOT NULL UNIQUE,
    desk_name         VARCHAR(150) NULL,
    company_id        INT NULL,
    timeframe_bh      INT NULL,          -- SLA threshold, business hours (seconds)
    timeframe_ooh     INT NULL,          -- SLA threshold, out of hours (seconds)
    sla_type          VARCHAR(50)  NULL, -- e.g. SLA1, SLA2, SLA1(30sec)...
    abd_type          VARCHAR(50)  NULL,
    other_type        VARCHAR(50)  NULL,
    target_ans_rate   DECIMAL(6,3) NULL, -- stored as fraction, e.g. 0.90
    target_abd_rate   DECIMAL(6,3) NULL,
    target_other      DECIMAL(6,3) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sla_targets_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- Raw interval export (one row per queue per 30-min interval).
-- Matches the columns of the reporting export the user already has.
CREATE TABLE IF NOT EXISTS sla_data (
    id                          BIGINT AUTO_INCREMENT PRIMARY KEY,
    queue_name                  VARCHAR(150) NOT NULL,
    start_date                  DATE NULL,
    start_time                  TIME NULL,
    end_date                    DATE NULL,
    end_time                    TIME NULL,

    contacts_abandoned_in_20    INT NULL,
    contacts_abandoned_in_30    INT NULL,
    contacts_abandoned_in_40    INT NULL,
    contacts_abandoned_in_45    INT NULL,
    contacts_abandoned_in_60    INT NULL,
    contacts_abandoned_in_90    INT NULL,
    contacts_abandoned_in_180   INT NULL,

    contacts_answered_in_20     INT NULL,
    contacts_answered_in_30     INT NULL,
    contacts_answered_in_40     INT NULL,
    contacts_answered_in_45     INT NULL,
    contacts_answered_in_60     INT NULL,
    contacts_answered_in_90     INT NULL,
    contacts_answered_in_180    INT NULL,

    service_level_60            DECIMAL(6,3) NULL,
    service_level_120           DECIMAL(6,3) NULL,

    agent_interaction_time      INT NULL, -- seconds
    api_contacts                 INT NULL,
    api_contacts_handled         INT NULL,

    avg_agent_interaction_time  INT NULL, -- seconds
    avg_customer_hold_time      INT NULL,
    avg_handle_time             INT NULL,
    avg_queue_abandon_time      INT NULL,
    avg_queue_answer_time       INT NULL,

    callback_contacts            INT NULL,
    callback_contacts_handled    INT NULL,

    contacts_abandoned          INT NULL,
    contacts_handled_incoming   INT NULL,
    contacts_handled_outbound   INT NULL,
    contacts_put_on_hold        INT NULL,
    contacts_queued             INT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_sla_data_queue (queue_name),
    INDEX idx_sla_data_date (start_date)
);
