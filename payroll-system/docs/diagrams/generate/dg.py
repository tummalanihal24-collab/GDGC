"""Tiny SVG drawing kit that reproduces the project's UML diagram style
(serif font, grid paper, rounded boxes, 'Payroll Management System' title block)."""
from html import escape
from PIL import ImageFont

FONT = "'DejaVu Serif', 'Noto Serif', Georgia, serif"
_R = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
_B = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
_cache = {}


def tw(s, size=13, bold=False):
    key = (size, bold)
    if key not in _cache:
        _cache[key] = ImageFont.truetype(_B if bold else _R, size)
    return _cache[key].getlength(s)


class Canvas:
    def __init__(self, w, h, num, name):
        self.w, self.h = w, h
        self.p = []
        self.num, self.name = num, name

    # ---------- primitives ----------
    def add(self, s):
        self.p.append(s)

    def text(self, x, y, s, size=13, bold=False, italic=False, anchor="start", fill="#111", underline=False):
        st = f'font-size="{size}"' + (' font-weight="bold"' if bold else "") + (' font-style="italic"' if italic else "")
        st += f' text-anchor="{anchor}" fill="{fill}"' + (' text-decoration="underline"' if underline else "")
        self.add(f'<text x="{x:.1f}" y="{y:.1f}" {st}>{escape(s)}</text>')

    def label(self, x, y, s, size=12, anchor="middle", italic=False, bg=True):
        """Text with a faint white backing so it stays readable over lines/grid."""
        w = tw(s, size) + 6
        bx = x - w / 2 if anchor == "middle" else (x - 3 if anchor == "start" else x - w + 3)
        if bg:
            self.add(f'<rect x="{bx:.1f}" y="{y - size:.1f}" width="{w:.1f}" height="{size + 5}" fill="#fdfdfd" fill-opacity="0.9"/>')
        self.text(x, y, s, size=size, anchor=anchor, italic=italic)

    def rect(self, x, y, w, h, rx=9, sw=2, dash=None, fill="#fff", stroke="#111"):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>')
        return (x, y, w, h)

    def line(self, pts, sw=1.6, dash=None, end=None, start=None, stroke="#111"):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        m = ""
        if end:
            m += f' marker-end="url(#{end})"'
        if start:
            m += f' marker-start="url(#{start})"'
        pts_s = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        self.add(f'<polyline points="{pts_s}" fill="none" stroke="{stroke}" stroke-width="{sw}"{d}{m} stroke-linejoin="round"/>')

    def circle(self, cx, cy, r, fill="#111", stroke="#111", sw=2):
        self.add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

    def ellipse(self, cx, cy, rx, ry, sw=1.8, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="#fff" stroke="#111" stroke-width="{sw}"{d}/>')

    def polygon(self, pts, fill="#fff", sw=1.8):
        s = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        self.add(f'<polygon points="{s}" fill="{fill}" stroke="#111" stroke-width="{sw}"/>')

    # ---------- composite shapes ----------
    def actor(self, cx, top, name, sub=None):
        self.circle(cx, top + 10, 10, fill="#fff", sw=1.8)
        self.line([(cx, top + 20), (cx, top + 48)], sw=1.8)
        self.line([(cx - 20, top + 30), (cx + 20, top + 30)], sw=1.8)
        self.line([(cx, top + 48), (cx - 16, top + 70)], sw=1.8)
        self.line([(cx, top + 48), (cx + 16, top + 70)], sw=1.8)
        self.text(cx, top + 90, name, 14, bold=True, anchor="middle")
        if sub:
            self.text(cx, top + 107, sub, 12, anchor="middle")

    def usecase(self, cx, cy, s, size=12.5, minw=0, h=None):
        lines = s.split("\n")
        w = max(max(tw(l, size) for l in lines) + 30, minw)
        hh = h or (22 + 15 * len(lines))
        self.ellipse(cx, cy, w / 2, hh / 2)
        y0 = cy - (len(lines) - 1) * 7.5 + 4.5
        for i, l in enumerate(lines):
            self.text(cx, y0 + i * 15, l, size, anchor="middle")
        return (cx, cy, w / 2, hh / 2)

    def note(self, x, y, w, lines, size=12):
        h = 16 + 17 * len(lines)
        self.polygon([(x, y), (x + w - 14, y), (x + w, y + 14), (x + w, y + h), (x, y + h)], sw=1.4)
        self.line([(x + w - 14, y), (x + w - 14, y + 14), (x + w, y + 14)], sw=1.2)
        for i, l in enumerate(lines):
            self.text(x + 8, y + 22 + i * 17, l, size)
        return (x, y, w, h)

    def class_box(self, x, y, w, name, attrs, methods, stereotype=None, size=12, abstract=False):
        lh = 16
        head = 26 + (15 if stereotype else 0)
        ah = max(lh * len(attrs) + 10, 14)
        mh = max(lh * len(methods) + 10, 14)
        h = head + ah + mh
        self.rect(x, y, w, h, rx=3, sw=1.8)
        yy = y + 18
        if stereotype:
            self.text(x + w / 2, yy, f"<<{stereotype}>>", 11.5, anchor="middle")
            yy += 15
        self.text(x + w / 2, yy + 1, name, 14, bold=True, anchor="middle", italic=abstract)
        self.line([(x, y + head), (x + w, y + head)], sw=1.4)
        for i, a in enumerate(attrs):
            self.text(x + 8, y + head + 17 + i * lh, a, size)
        self.line([(x, y + head + ah), (x + w, y + head + ah)], sw=1.4)
        for i, m in enumerate(methods):
            self.text(x + 8, y + head + ah + 17 + i * lh, m, size)
        return (x, y, w, h)

    def state_box(self, x, y, w, name, entry=None, exit_=None, size=12.5, dash=None):
        rows = [r for r in (entry, exit_) if r]
        lines = []
        for lab, r in (("entry", entry), ("exit", exit_)):
            if r:
                lines.append(f"{lab} / {r}")
        h = 30 + (14 + 21 * len(lines) if lines else 0)
        self.rect(x, y, w, h, rx=10, sw=2, dash=dash)
        self.text(x + w / 2, y + 21, name, 14, bold=True, anchor="middle")
        if lines:
            self.line([(x, y + 30), (x + w, y + 30)], sw=1.4)
            for i, l in enumerate(lines):
                self.text(x + 18, y + 51 + i * 21, l, size)
        return (x, y, w, h)

    def cylinder(self, x, y, w, h, label):
        ry = 11
        self.add(f'<path d="M{x},{y + ry} A{w / 2},{ry} 0 0 1 {x + w},{y + ry} L{x + w},{y + h - ry} A{w / 2},{ry} 0 0 1 {x},{y + h - ry} Z" fill="#fff" stroke="#111" stroke-width="1.8"/>')
        self.add(f'<path d="M{x},{y + ry} A{w / 2},{ry} 0 0 0 {x + w},{y + ry}" fill="none" stroke="#111" stroke-width="1.8"/>')
        self.text(x + w / 2, y + h / 2 + 8, label, 13, bold=True, anchor="middle")

    # ---------- output ----------
    def svg(self):
        defs = f'''<defs>
<pattern id="grid" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0V14" fill="none" stroke="#dfe6ee" stroke-width="0.8"/></pattern>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#111"/></marker>
<marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0.5 L9.5,5 L0,9.5" fill="none" stroke="#111" stroke-width="1.5"/></marker>
<marker id="tri" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="13" markerHeight="13" orient="auto-start-reverse"><path d="M0.5,0.8 L11,6 L0.5,11.2 Z" fill="#fff" stroke="#111" stroke-width="1.3"/></marker>
<marker id="diamond" viewBox="0 0 16 10" refX="1" refY="5" markerWidth="17" markerHeight="11" orient="auto-start-reverse"><path d="M0,5 L8,0.5 L16,5 L8,9.5 Z" fill="#111"/></marker>
<marker id="diamondw" viewBox="0 0 16 10" refX="1" refY="5" markerWidth="17" markerHeight="11" orient="auto-start-reverse"><path d="M0.5,5 L8,0.8 L15.5,5 L8,9.2 Z" fill="#fff" stroke="#111" stroke-width="1.2"/></marker>
</defs>'''
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}" font-family="{FONT}">'
                f'{defs}<rect width="100%" height="100%" fill="#fdfdfd"/><rect width="100%" height="100%" fill="url(#grid)"/>'
                f'<rect x="8" y="8" width="{self.w - 16}" height="{self.h - 16}" fill="none" stroke="#8a8a8a" stroke-width="1.4"/>')
        title = (f'<text x="{self.w / 2}" y="52" font-size="38" font-weight="bold" text-anchor="middle" fill="#111">Payroll Management System</text>'
                 f'<text x="{self.w / 2}" y="94" font-size="30" font-weight="bold" text-anchor="middle" fill="#111">{escape(self.num)}. {escape(self.name)}</text>')
        return head + title + "".join(self.p) + "</svg>"

    def save(self, path):
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.svg())
