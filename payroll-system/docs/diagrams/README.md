# UML diagrams

> **Note:** these were drawn when the front end was a Swing desktop UI. The use cases, the service / DAO / database parts of the class diagram, the payroll sequence, the activity flow and the state diagram still apply unchanged. Only the user-interface layer differs: `LoginFrame`, `AdminDashboard`, `EmployeePortal` and the panels are now the browser pages under `src/main/resources/public` plus the `web` package (`WebApp`, `Api`, `AdminApi`, `Dto`) that serves them.

Drawn from the implemented code (not from the original draft). Each diagram is provided as PNG (2x) and SVG.

| # | File | Shows |
|---|---|---|
| 1 | `01-use-case-diagram` | Actors (Employee, Admin / HR, Payroll Scheduler) and the use cases the app really offers |
| 2 | `02-class-diagram` | `model`, `service`, `dao` + `db` and `ui` packages with real class and method names |
| 3 | `03-sequence-manual-payroll-run` | Admin clicks Run Payroll: one DB transaction, per-employee loop, audit rows, commit / rollback |
| 4 | `04-sequence-employee-login-view-payslip` | BCrypt login with lockout, released payslips only, PDF download |
| 5 | `05-activity-monthly-payroll-processing` | Scheduler / Admin / Service / DAO / DB swim lanes for a payroll run and review |
| 6 | `06-state-payroll-lifecycle` | `GENERATED -> VERIFIED -> PAID`, `CANCELLED -> reprocess`, `Recalculated`, internal run flow and audit sub state |

## Regenerating

The diagrams are produced by small Python scripts (`generate/`) that write SVG, rendered to PNG with headless Chromium.

```bash
cd docs/diagrams/generate
python3 uc.py && python3 cls.py && python3 seq_run.py && python3 seq_login.py && python3 act.py && python3 state.py
node render.js .. ../*.svg      # needs: pip install pillow, npm i playwright (Chromium)
```
