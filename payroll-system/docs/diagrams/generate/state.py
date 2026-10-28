from dg import Canvas, tw


def build():
    W, H = 1700, 1330
    c = Canvas(W, H, "6", "State Diagram - Payroll Lifecycle")

    def mid(b, side):
        x, y, w, h = b
        return {"l": (x, y + h / 2), "r": (x + w, y + h / 2), "t": (x + w / 2, y), "b": (x + w / 2, y + h)}[side]

    # ---------------- lifecycle ----------------
    y0 = 175
    c.circle(55, y0 + 43, 15)
    val = c.state_box(120, y0, 250, "Validating", "checkNotProcessed()", "checkBasicSalary()")
    gen = c.state_box(480, y0, 250, "Generated", "insertPayroll()", 'addAudit("GENERATED")')
    ver = c.state_box(840, y0, 250, "Verified", "updateStatus(VERIFIED)", 'addAudit("VERIFIED")')
    paid = c.state_box(1200, y0, 250, "Paid", "updateStatus(PAID)", 'addAudit("PAID")')
    c.circle(1580, y0 + 43, 17, fill="#fff")
    c.circle(1580, y0 + 43, 10)
    c.text(1580, y0 + 82, "End", 13, bold=True, anchor="middle")
    c.text(55, y0 + 82, "Start", 13, bold=True, anchor="middle")

    def arrow(p1, p2, label, lx=None, ly=None, dash=None, pts=None):
        pts = pts or [p1, p2]
        c.line(pts, sw=1.7, end="arrow" if not dash else "open", dash=dash)
        if label:
            c.label(lx if lx is not None else (p1[0] + p2[0]) / 2, ly if ly is not None else p1[1] - 8, label, 12)

    arrow((70, y0 + 43), (120, y0 + 43), "runPayroll()", ly=y0 - 8, lx=80)
    arrow(mid(val, "r"), mid(gen, "l"), "calculate()")
    arrow(mid(gen, "r"), mid(ver, "l"), "verify()")
    arrow(mid(ver, "r"), mid(paid, "l"), "markPaid()")
    arrow(mid(paid, "r"), (1563, y0 + 43), None)

    # Recalculated (transient) below Generated
    ry = y0 + 205
    rec = c.state_box(480, ry, 250, "Recalculated", "rebuildFigures()", 'addAudit("RECALCULATED")')
    arrow((520, y0 + 86), (520, ry), None)
    c.label(514, y0 + 150, "recalculate()", 12, anchor="end")
    arrow((690, ry), (690, y0 + 86), None)
    c.label(605, y0 + 170, "updatePayroll()", 12)
    # Cancelled below Verified
    can = c.state_box(840, ry, 250, "Cancelled", "updateStatus(CANCELLED)", 'addAudit("CANCELLED")')
    arrow((965, y0 + 86), (965, ry), "cancel()", lx=1015, ly=y0 + 150)
    # Generated -> Cancelled
    c.line([(715, y0 + 86), (715, y0 + 125), (790, y0 + 125), (790, ry + 43), (840, ry + 43)], sw=1.7, end="arrow")
    c.label(752, y0 + 118, "cancel()", 12)
    # Cancelled -> Generated (reprocess)
    c.line([(1015, ry + 86), (1015, ry + 128), (400, ry + 128), (400, y0 + 70), (480, y0 + 70)], sw=1.7, end="arrow")
    c.label(730, ry + 122, "reprocess()", 12)
    # skip note
    c.note(60, y0 + 135, 330, ["Employees that already have a payroll", "for the month, joined after it ended, or", "have no basic salary are skipped and", "reported as problems (no row is stored)."], size=11.5)
    # Paid is final
    c.note(1200, ry, 330, ["PAID is final: no further changes.", "Payslips are visible to the employee", "only in VERIFIED and PAID."], size=11.5)

    # ---------------- internal flow ----------------
    fy = 590
    c.rect(40, fy, W - 80, 490, rx=0, sw=1.6, fill="none")
    c.text(W / 2, fy + 30, "Payroll Run (Internal Flow, one transaction)", 20, bold=True, anchor="middle")
    sy = fy + 70
    xs = [70, 400, 730, 1060, 1390]
    names = [("Employees Loaded", "getEmployees()", "beginLoop()"), ("Absences Counted", "countByStatus()", "loadStructure()"),
             ("Salary Calculated", "calculate()", "computeNet()"), ("Payroll Row Inserted", "insertPayroll()", "addAudit()"),
             ("Run Committed", "commit()", "buildRunSummary()")]
    bx = [c.state_box(x, sy, 245, n, e, ex) for x, (n, e, ex) in zip(xs, names)]
    for i, lab in enumerate(["validate()", "calculate()", "insert()", "commit()"]):
        arrow(mid(bx[i], "r"), mid(bx[i + 1], "l"), lab)
    # loop back for next employee
    lb = bx[3]
    c.line([(lb[0] + 100, sy + 86), (lb[0] + 100, sy + 128), (bx[0][0] + 120, sy + 128), (bx[0][0] + 120, sy + 86)], sw=1.5, dash="6 4", end="open")
    c.label((bx[0][0] + lb[0]) / 2 + 110, sy + 122, "[more employees] next employee", 12)

    # audit sub state machine
    ay = sy + 175
    c.rect(330, ay - 10, 940, 215, rx=0, sw=1.6, fill="none")
    c.text(800, ay + 20, "Audit Trail (Sub State)", 17, bold=True, anchor="middle")
    s1 = c.state_box(360, ay + 50, 255, "Audit Pending", "prepareDetails()", "checkAction()")
    s2 = c.state_box(700, ay + 50, 255, "Audit Logged", "insertAuditRow()", "closeStatement()")
    s3 = c.state_box(1010, ay + 50, 235, "Audit Committed", "commitWithRun()", "showInAuditLog()")
    arrow(mid(s1, "r"), mid(s2, "l"), "insert()")
    arrow(mid(s2, "r"), mid(s3, "l"), "commit()")
    # auditComplete -> Run Committed (dashed, internal)
    rc = bx[4]
    c.line([(s3[0] + s3[2], s3[1] + 43), (rc[0] + rc[2] / 2, s3[1] + 43), (rc[0] + rc[2] / 2, rc[1] + rc[3])], sw=1.5, dash="7 5", end="open")
    c.label(rc[0] + rc[2] / 2 + 12, s3[1] + 35, "auditComplete()", 12, anchor="start")
    # entry into sub machine from Payroll Row Inserted
    c.line([(lb[0] + 180, sy + 86), (lb[0] + 180, ay - 10)], sw=1.5, dash="7 5", end="open")
    c.label(lb[0] + 190, sy + 150, "writeAudit()", 12, anchor="start")

    # ---------------- legend ----------------
    ly = fy + 490 + 30
    c.rect(40, ly, 330, 240, rx=0, sw=1.6)
    c.text(52, ly + 24, "Legend:", 13, bold=True)
    c.circle(78, ly + 48, 9)
    c.text(110, ly + 53, "= Initial State", 12)
    c.circle(78, ly + 78, 10, fill="#fff")
    c.circle(78, ly + 78, 6)
    c.text(110, ly + 83, "= Final State", 12)
    c.rect(60, ly + 96, 36, 20, rx=8, sw=1.5)
    c.text(110, ly + 112, "= State (entry / exit actions)", 12)
    c.line([(58, ly + 142), (98, ly + 142)], sw=1.6, end="arrow")
    c.text(110, ly + 146, "= Transition", 12)
    c.line([(58, ly + 170), (98, ly + 170)], sw=1.5, dash="7 5", end="open")
    c.text(110, ly + 174, "= Transition (internal)", 12)
    c.rect(60, ly + 188, 36, 20, rx=0, sw=1.5)
    c.text(110, ly + 204, "= Sub State Machine", 12)
    c.h = ly + 240 + 40
    return c


if __name__ == "__main__":
    build().save("../06-state-payroll-lifecycle.svg")
