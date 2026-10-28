import math
from dg import Canvas, tw


def edge(uc, tx, ty):
    """Point on ellipse uc=(cx,cy,rx,ry) in the direction of (tx,ty)."""
    cx, cy, rx, ry = uc
    a = math.atan2((ty - cy) / ry, (tx - cx) / rx)
    return (cx + rx * math.cos(a), cy + ry * math.sin(a))


def build():
    W, H = 1480, 1400
    c = Canvas(W, H, "1", "Use Case Diagram")
    bx0, bx1, by0, by1 = 250, 1240, 125, 1370
    c.rect(bx0, by0, bx1 - bx0, by1 - by0, rx=0, sw=2)
    c.text((bx0 + bx1) / 2, by0 + 36, "Payroll Management System", 24, bold=True, anchor="middle")

    # --- use case centres ---
    X1 = 440
    emp_rows = {"Login": 215, "View / Edit Profile": 295, "View Attendance": 375, "View Payslip": 455,
                "Download Payslip (PDF)": 535, "Change Password": 615}
    adm_rows = {"Manage Employees": 730, "Manage Departments": 802, "Manage Salary Structure": 874,
                "Mark Attendance": 946, "Run Payroll\n(Manual / Monthly Auto)": 1018, "Verify / Pay / Cancel\nPayroll": 1090,
                "Generate Reports": 1162, "View Audit Log": 1234, "View Overview Dashboard": 1306}
    ucs = {}

    def size(label):
        ls = label.split("\n")
        return max(tw(l, 12.5) for l in ls) + 30, 22 + 15 * len(ls)

    for d in (emp_rows, adm_rows):
        for k, y in d.items():
            w, h = size(k)
            ucs[k] = (X1, y, w / 2, h / 2)
    extra = {
        "Authenticate User": (880, 215), "Add / Edit Employee": (800, 688), "Deactivate / Reactivate": (800, 732),
        "Reset Password": (800, 776), "Calculate Net Salary": (800, 982), "Log Payroll Audit": (800, 1054),
        "Payroll Report": (800, 1126), "Attendance Report": (800, 1170), "Employee Report": (800, 1214), "Export CSV": (800, 1258),
    }
    for k, (x, y) in extra.items():
        w, h = size(k)
        ucs[k] = (x, y, w / 2, h / 2)
    RUN = "Run Payroll\n(Manual / Monthly Auto)"

    # --- actors ---
    emp_top, adm_top, sch_top = 250, 960, 988
    emp_c = (95, emp_top + 48)
    adm_c = (95, adm_top + 48)
    sch_c = (1370, sch_top + 48)

    # --- associations (drawn first, shapes sit on top) ---
    for k in emp_rows:
        if k == "Login":
            continue
        p = edge(ucs[k], 115, emp_top + 30)
        c.line([(115, emp_top + 30), p], sw=1.5)
    p = edge(ucs["Login"], 115, emp_top + 30)
    c.line([(115, emp_top + 30), p], sw=1.5)

    ax, ay = 115, adm_top + 30
    for k in adm_rows:
        c.line([(ax, ay), edge(ucs[k], ax, ay)], sw=1.5)
    # admin trunk up the left gutter to Login and Change Password
    c.line([(ax, ay), (215, ay), (215, 224), edge(ucs["Login"], 215, 224)], sw=1.5)
    c.line([(215, 615), edge(ucs["Change Password"], 215, 615)], sw=1.5)
    c.circle(215, 615, 3.5)
    sx, sy = 1330, sch_top + 30
    runu = ucs[RUN]
    c.line([(sx, sy), (runu[0] + runu[2], runu[1])], sw=1.5)
    c.text(1100, 1008, "automatic run, 1st of month", 11.5, italic=True, anchor="middle")

    # --- include / extend relationships ---
    def rel(src, dst, kind):
        a, b = ucs[src], ucs[dst]
        p1, p2 = edge(a, b[0], b[1]), edge(b, a[0], a[1])
        c.line([p1, p2], sw=1.4, dash="6 4", end="open")
        mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
        return mx, my

    rel("Login", "Authenticate User", "include")
    c.label(662, 207, "«include»", 11.5)
    rel("Download Payslip (PDF)", "View Payslip", "extend")
    c.label(520, 500, "«extend»", 11.5, anchor="start")
    for k, dy in (("Add / Edit Employee", 0), ("Deactivate / Reactivate", 0), ("Reset Password", 0)):
        mx, my = rel("Manage Employees", k, "include")
        c.label(mx + 10, my - 3, "«include»", 11, anchor="middle")
    for k in ("Calculate Net Salary", "Log Payroll Audit"):
        mx, my = rel(RUN, k, "include")
        c.label(mx + 12, my + (-4 if "Calc" in k else 12), "«include»", 11, anchor="middle")
    for k in ("Payroll Report", "Attendance Report", "Employee Report", "Export CSV"):
        mx, my = rel(k, "Generate Reports", "extend")
        c.label(mx + 4, my - 3, "«extend»", 11, anchor="middle")

    # --- shapes on top ---
    for k, (cx, cy, rx, ry) in ucs.items():
        w, h = rx * 2, ry * 2
        c.usecase(cx, cy, k, minw=w, h=h)
    c.actor(emp_c[0], emp_top, "Employee", "(Employee Role)")
    c.actor(adm_c[0], adm_top, "Admin / HR", "(Admin Role)")
    c.actor(sch_c[0], sch_top, "Payroll Scheduler", "(System Actor)")

    # --- legend ---
    lx, ly = 28, 1120
    c.rect(lx, ly, 200, 235, rx=0, sw=1.6)
    c.text(lx + 10, ly + 24, "Legend:", 13, bold=True)
    c.circle(lx + 28, ly + 44, 5, fill="#fff", sw=1.5)
    c.line([(lx + 28, ly + 49), (lx + 28, ly + 62)], sw=1.5)
    c.line([(lx + 20, ly + 54), (lx + 36, ly + 54)], sw=1.5)
    c.line([(lx + 28, ly + 62), (lx + 21, ly + 72)], sw=1.5)
    c.line([(lx + 28, ly + 62), (lx + 35, ly + 72)], sw=1.5)
    c.text(lx + 60, ly + 62, "= Actor", 12)
    c.ellipse(lx + 28, ly + 98, 20, 10, sw=1.5)
    c.text(lx + 60, ly + 102, "= Use Case", 12)
    c.line([(lx + 8, ly + 132), (lx + 50, ly + 132)], sw=1.5)
    c.text(lx + 60, ly + 136, "= Association", 12)
    c.line([(lx + 8, ly + 164), (lx + 50, ly + 164)], sw=1.4, dash="6 4", end="open")
    c.text(lx + 60, ly + 168, "= «include»", 12)
    c.line([(lx + 8, ly + 196), (lx + 50, ly + 196)], sw=1.4, dash="6 4", end="open")
    c.text(lx + 60, ly + 200, "= «extend» (points", 12)
    c.text(lx + 60, ly + 216, "   to base use case)", 12)
    return c


if __name__ == "__main__":
    build().save("../01-use-case-diagram.svg")
