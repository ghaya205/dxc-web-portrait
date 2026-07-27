-- Adds a work "shift" to users (Matin / Nuit) and a daily presence check-in table.
--
-- Shift reference used for this project:
--   matin -> 09:00 - 17:00
--   nuit  -> 21:00 - 06:00

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shift ENUM('matin', 'nuit') NULL AFTER language;

CREATE TABLE IF NOT EXISTS presence (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    presence_date DATE NOT NULL,
    marked_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_date (user_id, presence_date),
    CONSTRAINT fk_presence_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
