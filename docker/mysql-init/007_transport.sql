ALTER TABLE users ADD COLUMN latitude DECIMAL(10,7) NULL AFTER governorate;
ALTER TABLE users ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude;

CREATE TABLE IF NOT EXISTS transport_requests (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    supervisor_id INT NOT NULL,
    status        ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
    admin_note    VARCHAR(255) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at       DATETIME NULL,
    decided_at    DATETIME NULL,
    decided_by    INT NULL,
    CONSTRAINT fk_transport_requests_supervisor FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transport_requests_decided_by FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transport_request_items (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    request_id   INT NOT NULL,
    agent_id     INT NOT NULL,
    vehicle_type ENUM('taxi','bus') NOT NULL DEFAULT 'taxi',
    direction    ENUM('aller','retour','aller_retour') NOT NULL DEFAULT 'aller_retour',
    pickup_time  TIME NULL,
    return_time  TIME NULL,
    days         VARCHAR(400) NULL,
    distance_km  DECIMAL(6,2) NULL,
    duration_min INT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transport_items_request FOREIGN KEY (request_id) REFERENCES transport_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_transport_items_agent   FOREIGN KEY (agent_id)   REFERENCES users(id) ON DELETE CASCADE
);
