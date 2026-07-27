CREATE TABLE IF NOT EXISTS desks (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    acronym        VARCHAR(20)  NOT NULL,
    languages      JSON NULL,
    call_questions JSON NULL,
    case_questions JSON NULL,
    chat_questions JSON NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS national_id      VARCHAR(50)  NULL AFTER approved_by,
  ADD COLUMN IF NOT EXISTS phone            VARCHAR(30)  NULL AFTER national_id,
  ADD COLUMN IF NOT EXISTS address          VARCHAR(255) NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS governorate      VARCHAR(100) NULL AFTER address,
  ADD COLUMN IF NOT EXISTS marital_status   VARCHAR(30)  NULL AFTER governorate,
  ADD COLUMN IF NOT EXISTS child_number     INT          NULL AFTER marital_status,
  ADD COLUMN IF NOT EXISTS title            VARCHAR(150) NULL AFTER child_number,
  ADD COLUMN IF NOT EXISTS desk_id          INT          NULL AFTER title,
  ADD COLUMN IF NOT EXISTS technical_skills TEXT         NULL AFTER desk_id,
  ADD COLUMN IF NOT EXISTS diplomas         TEXT         NULL AFTER technical_skills,
  ADD COLUMN IF NOT EXISTS certifications   TEXT         NULL AFTER diplomas,
  ADD COLUMN IF NOT EXISTS skills           TEXT         NULL AFTER certifications,
  ADD COLUMN IF NOT EXISTS manager_name     VARCHAR(150) NULL AFTER skills,
  ADD COLUMN IF NOT EXISTS hr_manager_name  VARCHAR(150) NULL AFTER manager_name,
  ADD COLUMN IF NOT EXISTS language         VARCHAR(100) NULL AFTER hr_manager_name,
  ADD COLUMN IF NOT EXISTS profile_picture  VARCHAR(255) NULL AFTER language;

ALTER TABLE users
  ADD CONSTRAINT fk_users_desk FOREIGN KEY (desk_id) REFERENCES desks(id) ON DELETE SET NULL;
