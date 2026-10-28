from dg import Canvas, tw


def action(c, cx, cy, w, lines, h=None, size=12.5, bold_first=False, rx=14):
    h = h or (16 + 17 * len(lines))
    c.rect(cx - w / 2, cy - h / 2, w, h, rx=rx, sw=1.8)
    y0 = cy - (len(lines) - 1) * 8.5 + 4.5
    for i, l in enumerate(lines):
        c.text(cx, y0 + i * 17, l, size, anchor="middle", bold=(bold_first and i == 0))
    return dict(cx=cx, cy=cy, w=w, h=h)


def decision(c, cx, cy, w, h, lines, size=12):
    c.polygon([(cx, cy - h / 2), (cx + w / 2, cy), (cx, cy + h / 2), (cx - w / 2, cy)], sw=1.8)
    y0 = cy - (len(lines) - 1) * 7.5 + 4.5
    for i, l in enumerate(lines):
        c.text(cx, y0 + i * 15, l, size, anchor="middle")
    return dict(cx=cx, cy=cy, w=w, h=h)


def top(b): return (b["cx"], b["cy"] - b["h"] / 2)
def bot(b): return (b["cx"], b["cy"] + b["h"] / 2)
def lft(b): return (b["cx"] - b["w"] / 2, b["cy"])
def rgt(b): return (b["cx"] + b["w"] / 2, b["cy"])


def build():
    W, H = 1880, 1420
    c = Canvas(W, H, "5", "Activity Diagram - Monthly Payroll Processing")
    lanes = [("System (Scheduler)", 30, 270), ("Admin / HR", 270, 640), ("Payroll Service", 640, 1290),
             ("DAO Layer", 1290, 1570), ("Database (MySQL)", 1570, 1850)]
    ty, by = 130, H - 30
    for name, x0, x1 in lanes:
        c.rect(x0, ty, x1 - x0, by - ty, rx=0, sw=1.6, fill="none")
        c.line([(x0, ty + 36), (x1, ty + 36)], sw=1.6)
        c.text((x0 + x1) / 2, ty + 25, name, 15, bold=True, anchor="middle")

    A = {}
    # ---- System lane
    c.circle(150, 205, 13)
    A["tick"] = action(c, 150, 270, 200, ["Scheduler tick", "(every hour)"])
    A["d1st"] = decision(c, 150, 360, 180, 70, ["Is it the", "1st of month?"])
    A["sysrun"] = action(c, 150, 470, 210, ["Call runPayroll(", "previous month,", "AUTO, SYSTEM)"])
    A["idle"] = action(c, 150, 590, 200, ["Wait for next tick", "(nothing to do)"])
    c.line([(150, 218), top(A["tick"])], end="arrow")
    c.line([bot(A["tick"]), top(A["d1st"])], end="arrow")
    c.line([bot(A["d1st"]), top(A["sysrun"])], end="arrow")
    c.label(166, 410, "Yes", 12, anchor="start")
    c.line([(240, 360), (258, 360), (258, 560), (150, 560), (150, 590 - 21)], end="arrow") if False else None
    c.line([(60, 360), (44, 360), (44, 590), (50, 590)], end="arrow")
    c.line([(250, 590), (262, 590), (262, 270), (250, 270)], end="arrow")
    c.label(36, 352, "No", 12, anchor="start")

    # ---- Admin lane
    A["login"] = action(c, 360, 205, 190, ["Login to System"])
    A["tab"] = action(c, 360, 265, 190, ['Open "Run Payroll" tab'])
    A["month"] = action(c, 360, 325, 190, ["Select month"])
    A["click"] = action(c, 360, 395, 200, ['Click "Run Payroll"', "and confirm"])
    for a, b in (("login", "tab"), ("tab", "month"), ("month", "click")):
        c.line([bot(A[a]), top(A[b])], end="arrow")
    A["err"] = action(c, 400, 580, 200, ["Show error message", "(future month)"])
    A["summary"] = action(c, 360, 822, 210, ["Show run summary", "and refresh table"])
    A["review"] = action(c, 360, 955, 200, ["Review payroll records"])
    A["ok"] = decision(c, 360, 1045, 190, 76, ["Figures", "correct?"])
    A["fix"] = action(c, 555, 1045, 130, ["Recalculate,", "or Cancel", "and Reprocess"])
    A["verify"] = action(c, 360, 1135, 200, ["Verify records"])
    A["paid"] = action(c, 360, 1195, 200, ["Mark Paid"])
    A["slips"] = action(c, 360, 1255, 220, ["Payslips visible to", "employees"])
    c.line([bot(A["summary"]), top(A["review"])], end="arrow")
    c.line([bot(A["review"]), top(A["ok"])], end="arrow")
    c.line([bot(A["ok"]), top(A["verify"])], end="arrow")
    c.label(375, 1100, "Yes", 12, anchor="start")
    c.line([rgt(A["ok"]), lft(A["fix"])], end="arrow")
    c.label(470, 1037, "No", 12, anchor="middle")
    c.line([top(A["fix"]), (555, 955), rgt(A["review"])], end="arrow")
    c.line([bot(A["verify"]), top(A["paid"])], end="arrow")
    c.line([bot(A["paid"]), top(A["slips"])], end="arrow")

    # ---- Service lane
    MX, RX = 830, 1130
    A["run"] = action(c, MX, 470, 260, ["runPayroll(month, mode, by)"])
    A["chk"] = action(c, MX, 535, 260, ["Check month is not", "in the future"])
    A["dvalid"] = decision(c, MX, 625, 200, 66, ["Month valid?"])
    A["begin"] = action(c, MX, 715, 260, ["Begin transaction", "(DBConnection.inTransaction)"])
    A["emps"] = action(c, MX, 790, 260, ["Get all active employees"])
    A["more"] = decision(c, MX, 870, 190, 64, ["More employees?"])
    A["skip"] = decision(c, MX, 965, 290, 84, ["Payroll already exists or", "joined after month end?"])
    A["val"] = action(c, MX, 1060, 280, ["Validate employee", "(basic salary > 0)"])
    A["load"] = action(c, MX, 1130, 280, ["Load salary structure", "and count absent days"])
    A["calc"] = action(c, MX, 1195, 280, ["Calculate salary", "(PayrollCalculator)"])
    A["ins"] = action(c, MX, 1260, 280, ["Insert payroll record", "(status GENERATED)"])
    A["aud"] = action(c, MX, 1320, 280, ["Write audit log row"], h=36)
    A["commit"] = action(c, RX, 870, 200, ["Commit transaction"])
    A["ret"] = action(c, RX, 925, 200, ["Return RunSummary"])
    A["done"] = action(c, RX, 1355, 230, ["Payroll Process Completed"])

    c.line([(150 + 105, 470), lft(A["run"])], end="arrow")
    c.line([rgt(A["click"]), (MX, 395), top(A["run"])], end="arrow")
    c.line([bot(A["run"]), top(A["chk"])], end="arrow")
    c.line([bot(A["chk"]), top(A["dvalid"])], end="arrow")
    c.line([bot(A["dvalid"]), top(A["begin"])], end="arrow")
    c.label(MX + 8, 668, "Yes", 12, anchor="start")
    c.line([lft(A["dvalid"]), lft(A["err"])[:1] + (625,)], end="arrow") if False else None
    c.line([lft(A["dvalid"]), (500, 625), (500, 580), rgt(A["err"])], end="arrow")
    c.label(715, 617, "No", 12, anchor="middle")
    c.line([bot(A["begin"]), top(A["emps"])], end="arrow")
    c.line([bot(A["emps"]), top(A["more"])], end="arrow")
    c.line([bot(A["more"]), top(A["skip"])], end="arrow")
    c.label(MX + 8, 913, "Yes", 12, anchor="start")
    c.line([rgt(A["more"]), lft(A["commit"])], end="arrow")
    c.label(1000, 862, "No", 12, anchor="middle")
    c.line([bot(A["skip"]), top(A["val"])], end="arrow")
    c.label(MX + 8, 1013, "No", 12, anchor="start")
    # skip -> back to loop
    c.line([lft(A["skip"]), (668, 965), (668, 870), lft(A["more"])], end="arrow")
    c.label(700, 957, "Yes (skip)", 12, anchor="middle")
    c.line([bot(A["val"]), top(A["load"])], end="arrow")
    c.line([bot(A["load"]), top(A["calc"])], end="arrow")
    c.line([bot(A["calc"]), top(A["ins"])], end="arrow")
    c.line([bot(A["ins"]), top(A["aud"])], end="arrow")
    c.line([lft(A["aud"]), (668, 1320), (668, 965)], end=None)
    c.line([bot(A["commit"]), top(A["ret"])], end="arrow")
    c.line([bot(A["ret"]), top(A["done"])], end="arrow")
    c.line([lft(A["ret"]), (1000, 925), (1000, 822), rgt(A["summary"])], end="arrow")
    # done -> final node on system lane
    c.circle(150, 1355, 14, fill="#fff")
    c.circle(150, 1355, 8)
    c.line([lft(A["done"]), (150 + 15, 1355)], end="arrow")
    A["evt"] = action(c, 150, 1290, 200, ["Event completed", "(automatic run)"])
    c.line([bot(A["evt"]), (150, 1341)], end=None)
    c.note(655, 1380, 0, []) if False else None

    # transaction note
    c.note(985, 640, 290, ["Any exception in the run", "rolls the whole run back:", "nothing is saved."])

    # ---- DAO lane boxes (class . method)
    def dao(cy, name, meth):
        b = action(c, 1430, cy, 250, [name, meth], h=46, rx=4, size=12, bold_first=True)
        return b
    D = {}
    D["emp"] = dao(790, "EmployeeDAO", "getEmployees()")
    D["exists"] = dao(965, "PayrollDAO", "exists()")
    D["sal"] = dao(1100, "SalaryStructureDAO", "getStructure()")
    D["att"] = dao(1160, "AttendanceDAO", "countByStatus()")
    D["pins"] = dao(1260, "PayrollDAO", "insertPayroll()")
    D["audit"] = dao(1320, "AuditDAO", "addAudit()")
    # ---- DB lane
    c.cylinder(1650, 180, 120, 70, "MySQL")
    def db(cy, lines, h=None):
        return action(c, 1710, cy, 250, lines, h=h or (14 + 16 * len(lines)), rx=4, size=11.5)
    B = {}
    B["tx"] = db(715, ["setAutoCommit(false)"], 30)
    B["emp"] = db(790, ["SELECT users, employee,", "department"])
    B["commit"] = db(870, ["COMMIT (or ROLLBACK", "on any error)"])
    B["exists"] = db(965, ["SELECT COUNT(*)", "FROM payroll"])
    B["sal"] = db(1100, ["SELECT salary_structure"], 30)
    B["att"] = db(1160, ["SELECT COUNT(*) FROM attendance"], 30)
    B["pins"] = db(1260, ["INSERT INTO payroll"], 30)
    B["audit"] = db(1320, ["INSERT INTO payroll_audit"], 30)
    # service -> dao (dashed), dao -> db (dashed)
    c.line([rgt(A["begin"]), (1290 + 125, 715)][:1] + [(1290 + 12, 715), lft(B["tx"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(A["emps"]), lft(D["emp"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(D["emp"]), lft(B["emp"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(A["commit"]), (1290 + 12, 870), lft(B["commit"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(A["skip"]), lft(D["exists"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(D["exists"]), lft(B["exists"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(A["load"]), (1272, 1130), (1272, 1100), lft(D["sal"])], sw=1.4, dash="6 4", end="open")
    c.line([(1272, 1130), (1272, 1160), lft(D["att"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(D["sal"]), lft(B["sal"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(D["att"]), lft(B["att"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(A["ins"]), (1290 - 20, 1260), lft(D["pins"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(D["pins"]), lft(B["pins"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(A["aud"]), (1290 - 20, 1320), lft(D["audit"])], sw=1.4, dash="6 4", end="open")
    c.line([rgt(D["audit"]), lft(B["audit"])], sw=1.4, dash="6 4", end="open")
    return c


if __name__ == "__main__":
    build().save("../05-activity-monthly-payroll-processing.svg")
