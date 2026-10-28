# Payroll Management System

Java 17 desktop application: **Swing UI (FlatLaf)** → **services** → **DAOs (JDBC + HikariCP)** → **MySQL**.
Built from the UML set in the project (use case, class, 2 sequence, activity and state diagrams).

## Quick start

1. Install JDK 17+ and MySQL 8 (MariaDB 10.5+ also works). Make sure the server is running.
2. Tell the app how to connect. Either edit `src/main/resources/db.properties`, or (better) create
   `config/db.properties` next to where you run the jar:

   ```properties
   db.url=jdbc:mysql://localhost:3306/payroll_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
   db.user=root
   db.password=your-password
   ```
   Other options: `-Dpayroll.config=/path/file.properties`, or env vars `PAYROLL_DB_URL`, `PAYROLL_DB_USER`, `PAYROLL_DB_PASSWORD`.
3. Build and run:

   ```bash
   mvn package
   java -jar target/payroll-system-1.0.0.jar
   ```
   (or `mvn compile exec:java -Dexec.mainClass=com.payroll.ui.PayrollApp`, or run `PayrollApp` from your IDE)

On first start the app creates the database tables from `src/main/resources/schema.sql` and inserts demo data:

| Role | Username | Password |
|---|---|---|
| Admin / HR | `admin` | `admin123` |
| Employees | `asha`, `rohan`, `priya`, `karan`, `neha` | `emp123` |

Change these passwords for anything beyond a demo (Change Password button, or Employees → Reset Password).

## Features

**Admin / HR**
- **Overview**: headcount, departments, last month's net payroll, records awaiting verification.
- **Employees**: add, edit, search, filter by department, deactivate/reactivate (soft delete keeps payroll history), reset password.
- **Departments**: add, edit, delete (blocked while employees belong to it).
- **Salary Structure**: HRA / DA / PF / tax percentages per employee, reset to defaults.
- **Attendance**: mark Present / Absent / Leave per day, or mark everyone present.
- **Run Payroll**: run a month, then Verify → Mark Paid, or Cancel → Reprocess, or Recalculate; bulk actions; month totals.
- **Reports**: payroll, attendance and employee reports, CSV export, net-salary-by-department chart.
- **Audit Log**: every payroll action (generated, recalculated, verified, paid, cancelled, reprocessed) with who and when.

**Employee**
- View/edit own name and email, view own attendance by month, view payslips (once HR has verified the month), download payslip as PDF, change password.

**System**
- Scheduler: while the app is running, on the 1st of each month it generates the previous month's payroll (`AUTO` mode, user `SYSTEM`).
- Login lockout after 5 wrong passwords (15 minutes). Passwords are BCrypt hashes.

## How salary is calculated (`PayrollCalculator`)

```
working days = Monday-Friday days in the month
basic  = basicSalary x (workingDays - absentDays) / workingDays     (days with no attendance record count as present; LEAVE is paid)
hra    = basic x HRA%        da = basic x DA%
gross  = basic + hra + da
pf     = basic x PF%         tax = gross x tax%
net    = gross - (pf + tax)
```
Defaults for a new employee: HRA 20, DA 10, PF 12, tax 5. Money is `BigDecimal` / `DECIMAL(12,2)`, rounded half-up to 2 places.

**Payroll status flow** (state diagram): `GENERATED → VERIFIED → PAID`; `GENERATED/VERIFIED → CANCELLED → (reprocess) → GENERATED`. PAID is final.
A run is idempotent: `UNIQUE(emp_id, pay_month)` plus skip-if-exists means running twice never duplicates, and the whole run is one DB transaction.

## UML diagrams

Use case, class, two sequence, activity and state diagrams of the implemented system are in [`docs/diagrams`](docs/diagrams) (PNG + SVG).

## Project layout

```
src/main/java/com/payroll
  model/    Person (abstract), Employee, Admin, Department, SalaryStructure, Attendance, Payroll, PayrollAudit, Payslip
  dao/      UserDAO, EmployeeDAO, DepartmentDAO, SalaryStructureDAO, AttendanceDAO, PayrollDAO, AuditDAO  (PreparedStatements only)
  service/  AuthService, EmployeeService, DepartmentService, AttendanceService, PayrollService,
            PayrollCalculator, ReportService, PayslipService, PayrollScheduler
  db/       DBConnection (pool + transactions), DatabaseInitializer (schema + demo data)
  ui/       PayrollApp, LoginFrame, AdminDashboard, EmployeePortal and one panel per tab
  util/     Money, Validators, CsvExporter
src/main/resources/schema.sql, db.properties
src/test/java/com/payroll  unit + workflow + UI smoke tests
```

## Tests

```bash
mvn test                         # 19 tests on in-memory H2 (MySQL mode): salary maths + full workflow
xvfb-run -a mvn test             # on Linux without a screen: also runs a UI smoke test that builds every window and saves screenshots to target/screenshots
# against a real MySQL (its tables in that database are dropped first!):
PAYROLL_TEST_URL="jdbc:mysql://localhost:3306/payroll_test?useSSL=false&allowPublicKeyRetrieval=true" \
PAYROLL_TEST_PASSWORD=secret mvn test -Dtest=PayrollWorkflowTest
```

## Differences from the UML diagrams (deliberate)

| Diagram | Implementation | Why |
|---|---|---|
| Salary computed by Java **and** by a MySQL trigger / stored procedure | Java only (`PayrollCalculator`); audit rows written by `PayrollService` in the same transaction | One source of truth; manual and scheduled runs cannot disagree; testable |
| MySQL Event Scheduler at 00:00 on the 1st | In-app `PayrollScheduler` (hourly check, runs on the 1st) | Works without DB privileges / `event_scheduler=ON`. Payroll is only auto-generated if the app is running that day; HR can always run it manually |
| String IDs, `UUID` on Person | Integer auto-increment IDs | Simpler joins; `users.id` is shared by `employee.emp_id` |
| DAOs extend `DBConnection` | DAOs *use* `DBConnection` | Dependency, not inheritance |
| "Created" / "Validated" states | Validation happens inside a run, before a row is stored | Only meaningful states are persisted |
