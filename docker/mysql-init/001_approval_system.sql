ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_approved TINYINT(1) NOT NULL DEFAULT 0 AFTER role_id,
  ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL AFTER is_approved,
  ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER approved_at;

UPDATE users SET is_approved = 1 WHERE is_approved = 0;

CREATE TABLE IF NOT EXISTS enterprise_codes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(255) NOT NULL,          
    label       VARCHAR(100) NOT NULL DEFAULT 'Enterprise Code',
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO enterprise_codes (code, label, is_active)
VALUES (
    '$2y$10$YOUR_BCRYPT_HASH_HERE',
    'Default Enterprise Code',
    1
);
