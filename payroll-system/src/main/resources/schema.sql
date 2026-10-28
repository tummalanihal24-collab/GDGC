-- Payroll Management System schema (MySQL 8; also runs on H2 in MySQL mode for tests)

CREATE TABLE IF NOT EXISTS department (
  dept_id    INT AUTO_INCREMENT PRIMARY KEY,
  dept_name  VARCHAR(100) NOT NULL UNIQUE,
  location   VARCHAR(100)
);

-- Person: both Admin and Employee accounts live here (generalization in the class diagram)
CREATE TABLE IF NOT EXISTS users (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(150) NOT NULL UNIQUE,
  username         VARCHAR(50)  NOT NULL UNIQUE,
  password_hash    VARCHAR(100) NOT NULL,
  role             VARCHAR(10)  NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE')),
  failed_attempts  INT NOT NULL DEFAULT 0,
  locked_until     DATETIME NULL
);

-- Employee-specific data, shares its key with users.id
CREATE TABLE IF NOT EXISTS employee (
  emp_id        INT PRIMARY KEY,
  designation   VARCHAR(100),
  joining_date  DATE NOT NULL,
  basic_salary  DECIMAL(12,2) NOT NULL CHECK (basic_salary >= 0),
  dept_id       INT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (emp_id)  REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (dept_id) REFERENCES department(dept_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS salary_structure (
  struct_id   INT AUTO_INCREMENT PRIMARY KEY,
  emp_id      INT NOT NULL UNIQUE,
  hra_percent DECIMAL(5,2) NOT NULL CHECK (hra_percent BETWEEN 0 AND 100),
  da_percent  DECIMAL(5,2) NOT NULL CHECK (da_percent  BETWEEN 0 AND 100),
  pf_percent  DECIMAL(5,2) NOT NULL CHECK (pf_percent  BETWEEN 0 AND 100),
  tax_percent DECIMAL(5,2) NOT NULL CHECK (tax_percent BETWEEN 0 AND 100),
  FOREIGN KEY (emp_id) REFERENCES employee(emp_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  emp_id        INT NOT NULL,
  att_date      DATE NOT NULL,
  status        VARCHAR(10) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE')),
  UNIQUE (emp_id, att_date),
  FOREIGN KEY (emp_id) REFERENCES employee(emp_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payroll (
  payroll_id    INT AUTO_INCREMENT PRIMARY KEY,
  emp_id        INT NOT NULL,
  pay_month     CHAR(7) NOT NULL,                 -- 'YYYY-MM'
  working_days  INT NOT NULL,
  absent_days   INT NOT NULL,
  basic         DECIMAL(12,2) NOT NULL,           -- pro-rated for absences
  hra           DECIMAL(12,2) NOT NULL,
  da            DECIMAL(12,2) NOT NULL,
  gross_salary  DECIMAL(12,2) NOT NULL,
  pf            DECIMAL(12,2) NOT NULL,
  tax           DECIMAL(12,2) NOT NULL,
  deductions    DECIMAL(12,2) NOT NULL,
  net_salary    DECIMAL(12,2) NOT NULL,
  status        VARCHAR(10) NOT NULL CHECK (status IN ('GENERATED', 'VERIFIED', 'PAID', 'CANCELLED')),
  mode          VARCHAR(10) NOT NULL,             -- MANUAL | AUTO
  generated_by  VARCHAR(50) NOT NULL,
  generated_on  DATETIME NOT NULL,
  UNIQUE (emp_id, pay_month),                     -- a payroll run is idempotent
  FOREIGN KEY (emp_id) REFERENCES employee(emp_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payroll_audit (
  audit_id     INT AUTO_INCREMENT PRIMARY KEY,
  payroll_id   INT NOT NULL,
  action       VARCHAR(20) NOT NULL,
  action_by    VARCHAR(50) NOT NULL,
  action_time  DATETIME NOT NULL,
  details      VARCHAR(255),
  FOREIGN KEY (payroll_id) REFERENCES payroll(payroll_id) ON DELETE CASCADE
)
