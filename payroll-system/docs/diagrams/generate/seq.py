from dg import Canvas, tw


class Seq:
    """Sequence-diagram helper: lifelines, numbered messages, activation bars, combined fragments."""

    def __init__(self, c, parts, x_first, x_last, top=135, step=34):
        self.c, self.parts, self.step = c, parts, step
        n = len(parts)
        self.x = {p[0]: x_first + i * (x_last - x_first) / (n - 1) for i, p in enumerate(parts)}
        self.n = 0
        self.ys = {}
        self.acts = []
        self.start_idx = len(c.p)
        self.last_bar = {}
        self.top = top
        self.bw = 150
        self._header()
        self.y = top + 125

    def _header(self):
        c = self.c
        for key, sub, kind in self.parts:
            x = self.x[key]
            if kind == "actor":
                c.actor(x, self.top - 10, key.replace("\\n", " "), sub)
            else:
                c.rect(x - self.bw / 2, self.top, self.bw, 56, rx=2, sw=1.8)
                c.text(x, self.top + 24, key, 13.5, bold=True, anchor="middle")
                c.text(x, self.top + 43, sub, 12, anchor="middle")

    def lifelines_and_acts(self):
        c = self.c
        out = []
        for key, sub, kind in self.parts:
            x = self.x[key]
            y0 = self.top + (112 if kind == "actor" else 56)
            out.append(f'<line x1="{x:.1f}" y1="{y0}" x2="{x:.1f}" y2="{self.y + 10:.1f}" stroke="#555" stroke-width="1.2" stroke-dasharray="5 5"/>')
        for key, ya, yb in [tuple(a) for a in self.acts]:
            x = self.x[key]
            out.append(f'<rect x="{x - 6:.1f}" y="{ya:.1f}" width="12" height="{yb - ya:.1f}" fill="#fff" stroke="#111" stroke-width="1.5"/>')
        c.p[self.start_idx:self.start_idx] = out

    def skip(self, h=None):
        self.y += h if h is not None else self.step

    def msg(self, frm, to, label, dashed=False, num=True, dy=None):
        c = self.c
        self.n += 1 if num else 0
        x1, x2 = self.x[frm], self.x[to]
        d = 1 if x2 > x1 else -1
        a, b = x1 + 6 * d, x2 - 6 * d
        c.line([(a, self.y), (b, self.y)], sw=1.5, dash="6 4" if dashed else None, end="open" if dashed else "arrow")
        text = f"{self.n}. {label}" if num else label
        w = tw(text, 12)
        span = abs(b - a)
        if w + 10 <= span:
            c.label((a + b) / 2, self.y - 6, text, 12)
        else:
            c.label(min(a, b) + 2, self.y - 6, text, 12, anchor="start")
        if num:
            self.ys[self.n] = self.y
        y = self.y
        if not dashed:
            self.acts.append([to, y - 6, y + 9])
            self.last_bar[to] = self.acts[-1]
        elif frm in self.last_bar:
            self.last_bar[frm][2] = max(self.last_bar[frm][2], y + 6)
        self.y += dy if dy is not None else self.step
        return y

    def self_msg(self, p, label, w=60):
        c = self.c
        self.n += 1
        x = self.x[p] + 6
        c.line([(x, self.y), (x + w, self.y), (x + w, self.y + 16), (x, self.y + 16)], sw=1.5, end="arrow")
        c.label(x + w + 4, self.y + 10, f"{self.n}. {label}", 12, anchor="start")
        self.ys[self.n] = self.y
        y = self.y
        self.y += self.step + 6
        return y

    def act(self, p, ya, yb):
        self.acts.append((p, ya, yb))

    def fragment(self, kind, guard, y0, y1, p_from, p_to, dividers=(), pad=60):
        c = self.c
        x0 = self.x[p_from] - pad
        x1 = self.x[p_to] + pad
        c.rect(x0, y0, x1 - x0, y1 - y0, rx=0, sw=1.5, fill="none")
        tag = tw(kind, 13, True) + 22
        c.polygon([(x0, y0), (x0 + tag, y0), (x0 + tag, y0 + 14), (x0 + tag - 10, y0 + 24), (x0, y0 + 24)], sw=1.4)
        c.text(x0 + 10, y0 + 17, kind, 13, bold=True)
        c.text(x0 + tag + 10, y0 + 18, f"[{guard}]", 12.5, bold=True)
        for dy, g in dividers:
            c.line([(x0, dy), (x1, dy)], sw=1.3, dash="9 5")
            c.text(x0 + 10, dy + 18, f"[{g}]", 12.5, bold=True)
        return x0, x1

    def finish(self, extra_bottom=40):
        self.lifelines_and_acts()
        self.c.h = int(self.y + extra_bottom)
