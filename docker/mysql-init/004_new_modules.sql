CREATE TABLE IF NOT EXISTS requests (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    type        ENUM('work_certificate','salary_certificate','leave_entitlement') NOT NULL,
    subject     VARCHAR(190) NOT NULL,
    content     VARCHAR(300) NULL,
    status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    admin_note  VARCHAR(255) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    replied_at  DATETIME NULL,
    replied_by  INT NULL,
    CONSTRAINT fk_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qualifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    type        ENUM('diploma','certification') NOT NULL,
    name        VARCHAR(190) NOT NULL,
    institution VARCHAR(190) NULL,
    proof_path  VARCHAR(255) NULL,
    status      ENUM('pending','approved') NOT NULL DEFAULT 'pending',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qualifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    category      ENUM('cv','video','other') NOT NULL DEFAULT 'other',
    original_name VARCHAR(255) NOT NULL,
    path          VARCHAR(255) NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS opportunities (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(190) NOT NULL,
    category    VARCHAR(100) NOT NULL,
    location    VARCHAR(150) NULL,
    description VARCHAR(600) NULL,
    created_by  INT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_opportunities_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS care_bulletins (
    id                        INT AUTO_INCREMENT PRIMARY KEY,
    user_id                   INT NOT NULL,
    matricule                 VARCHAR(50) NOT NULL,
    ref_bs                    VARCHAR(100) NULL,
    date_soins                DATE NULL,
    adherent_name             VARCHAR(190) NOT NULL,
    patient_first_name        VARCHAR(150) NULL,
    honoraires                DECIMAL(10,3) NOT NULL DEFAULT 0,
    pharmacie                 DECIMAL(10,3) NOT NULL DEFAULT 0,
    analyse                   DECIMAL(10,3) NOT NULL DEFAULT 0,
    radio_echo_scanner        DECIMAL(10,3) NOT NULL DEFAULT 0,
    maternite_frais_clinique  DECIMAL(10,3) NOT NULL DEFAULT 0,
    chirurgie                 DECIMAL(10,3) NOT NULL DEFAULT 0,
    injection                 DECIMAL(10,3) NOT NULL DEFAULT 0,
    dentaire                  DECIMAL(10,3) NOT NULL DEFAULT 0,
    monture                   DECIMAL(10,3) NOT NULL DEFAULT 0,
    verres                    DECIMAL(10,3) NOT NULL DEFAULT 0,
    total_soins               DECIMAL(10,3) NOT NULL DEFAULT 0,
    comment                   VARCHAR(500) NULL,
    attachment_path           VARCHAR(255) NULL,
    status                    ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_care_bulletins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
