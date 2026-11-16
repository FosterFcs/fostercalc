// Foster Calc · Planta IA — núcleo geométrico (modelo → planta, cortes, fachada, prancha, DXF/SVG)
import {
  DxfWriter, point3d, point2d, Units, HatchBoundaryPaths, HatchPolylineBoundary, vertex,
  pattern, HatchPredefinedPatterns, TextHorizontalAlignment, TextVerticalAlignment, LWPolylineFlags
} from "@tarikjabiri/dxf";

/* ------------------------------------------------------------------ */
/* Parâmetros padrão                                                   */
/* ------------------------------------------------------------------ */
export function defaults() {
  const d = new Date();
  return {
    nq: 2, qw: [3.0, 2.8, 2.8], bw: 1.6, serv: false, sw: 1.6,
    ds: 3.8, db: 3.0, t: 0.15, H: 2.8, laje: 0.10,
    telha: "ceramica", beiral: 0.6,
    corteA: "auto", corteB: "auto",
    titulo: "", proprietario: "", endereco: "", resp: "", registro: "",
    data: d.toLocaleDateString("pt-BR"), folha: "01/01", formato: "auto",
  };
}

export const TELHAS = {
  ceramica: { nome: "TELHA CERÂMICA", i: 0.30 },
  fibrocimento: { nome: "TELHA DE FIBROCIMENTO", i: 0.15 },
  concreto: { nome: "TELHA DE CONCRETO", i: 0.30 },
};

export const LAYERS = {
  "ARQ-PAREDE":        { aci: 7, lt: "Continuous", svg: "#111", w: 0.40 },
  "ARQ-HACH-ALVEN":    { aci: 8, lt: "Continuous", svg: "#666", w: 0.10 },
  "ARQ-HACH-CONCR":    { aci: 8, lt: "Continuous", svg: "#666", w: 0.10 },
  "ARQ-ESQUADRIA":     { aci: 4, lt: "Continuous", svg: "#0a6f96", w: 0.20 },
  "ARQ-MOBILIARIO":    { aci: 8, lt: "Continuous", svg: "#8a8a8a", w: 0.13 },
  "ARQ-VISTA":         { aci: 8, lt: "Continuous", svg: "#777", w: 0.15 },
  "ARQ-COBERTURA":     { aci: 6, lt: "Continuous", svg: "#8a2a8a", w: 0.25 },
  "ARQ-COBERTURA-PROJ":{ aci: 6, lt: "TRACEJADA", svg: "#8a2a8a", w: 0.15 },
  "ARQ-PISO":          { aci: 8, lt: "Continuous", svg: "#666", w: 0.25 },
  "ARQ-TERRENO":       { aci: 3, lt: "Continuous", svg: "#3b6e2a", w: 0.30 },
  "ARQ-TEXTO":         { aci: 2, lt: "Continuous", svg: "#111", w: 0.18 },
  "ARQ-COTA":          { aci: 3, lt: "Continuous", svg: "#2c6e2c", w: 0.13 },
  "ARQ-NIVEL":         { aci: 3, lt: "Continuous", svg: "#2c6e2c", w: 0.13 },
  "ARQ-CORTE":         { aci: 1, lt: "TRACOPONTO", svg: "#c0161b", w: 0.20 },
  "ARQ-CORTE-SIMB":    { aci: 1, lt: "Continuous", svg: "#c0161b", w: 0.35 },
  "PRANCHA":           { aci: 7, lt: "Continuous", svg: "#111", w: 0.50 },
  "PRANCHA-CARIMBO":   { aci: 7, lt: "Continuous", svg: "#111", w: 0.25 },
  "PRANCHA-TEXTO":     { aci: 7, lt: "Continuous", svg: "#111", w: 0.18 },
  "MARCA":             { aci: 1, lt: "Continuous", svg: "#c4161c", w: 0.18 },
};

const FORMATOS = { A3: [420, 297, 7], A2: [594, 420, 10], A1: [841, 594, 10] };

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const r2 = (v) => Math.round(v * 1000) / 1000;
export const fmt = (v, n = 2) => v.toFixed(n).replace(".", ",");
const fmtNivel = (v) => (Math.abs(v) < 1e-6 ? "±0,00" : (v > 0 ? "+" : "") + fmt(v));

class Draw {
  constructor() { this.E = []; }
  line(a, b, layer) { this.E.push({ t: "line", a, b, layer }); }
  poly(pts, closed, layer) { this.E.push({ t: "poly", pts, closed: !!closed, layer }); }
  rect(x0, y0, x1, y1, layer) { this.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, layer); }
  arc(c, r, a0, a1, layer) { this.E.push({ t: "arc", c, r, a0, a1, layer }); }
  circle(c, r, layer) { this.E.push({ t: "circle", c, r, layer }); }
  text(p, h, s, o = {}) { this.E.push({ t: "text", p, h, s: String(s), al: o.al || "l", va: o.va || "b", rot: o.rot || 0, layer: o.layer || "ARQ-TEXTO", bold: !!o.bold }); }
  hatch(loops, pat, layer, sc = 1) { this.E.push({ t: "hatch", loops, pat, layer, sc }); }
  hrect(x0, y0, x1, y1, pat, layer, outlineLayer, sc) {
    if (x1 - x0 < 1e-6 || y1 - y0 < 1e-6) return;
    this.hatch([[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]], pat, layer, sc);
    if (outlineLayer) this.rect(x0, y0, x1, y1, outlineLayer);
  }
}

export function bbox(E) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; };
  for (const e of E) {
    if (e.t === "line") { add(...e.a); add(...e.b); }
    else if (e.t === "poly") e.pts.forEach((p) => add(...p));
    else if (e.t === "hatch") e.loops.forEach((l) => l.forEach((p) => add(...p)));
    else if (e.t === "arc" || e.t === "circle") { add(e.c[0] - e.r, e.c[1] - e.r); add(e.c[0] + e.r, e.c[1] + e.r); }
    else if (e.t === "text") {
      const w = e.h * 0.62 * e.s.length, h = e.h;
      let dx0 = e.al === "c" ? -w / 2 : e.al === "r" ? -w : 0;
      let dy0 = e.va === "m" ? -h / 2 : e.va === "t" ? -h : 0;
      const pts = [[dx0, dy0], [dx0 + w, dy0], [dx0 + w, dy0 + h], [dx0, dy0 + h]];
      const a = (e.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      pts.forEach(([x, y]) => add(e.p[0] + x * c - y * s, e.p[1] + x * s + y * c));
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

function translate(E, dx, dy) {
  const T = (p) => [p[0] + dx, p[1] + dy];
  return E.map((e) => {
    const n = { ...e };
    if (e.a) n.a = T(e.a);
    if (e.b) n.b = T(e.b);
    if (e.c) n.c = T(e.c);
    if (e.p) n.p = T(e.p);
    if (e.pts) n.pts = e.pts.map(T);
    if (e.loops) n.loops = e.loops.map((l) => l.map(T));
    return n;
  });
}

/* ------------------------------------------------------------------ */
/* 1. Modelo paramétrico                                               */
/* ------------------------------------------------------------------ */
export function buildModel(S) {
  const t = S.t, nq = Math.max(1, Math.min(3, S.nq | 0));
  const back = [];
  for (let i = 0; i < nq; i++) back.push({ name: nq === 1 ? "QUARTO" : `QUARTO ${i + 1}`, w: +S.qw[i] || 2.8, kind: "q" });
  back.push({ name: "BANHEIRO", w: +S.bw, kind: "b" });
  if (S.serv) back.push({ name: "A. SERVIÇO", w: +S.sw, kind: "s" });

  const W = r2(t + back.reduce((a, r) => a + r.w, 0) + (back.length - 1) * t + t);
  const D = r2(3 * t + S.ds + S.db);
  const yi0 = r2(t + S.ds), yi1 = r2(2 * t + S.ds), ytop = r2(yi1 + S.db);

  const rooms = [{ name: "SALA/COZINHA", kind: "sc", x0: t, y0: t, x1: r2(W - t), y1: yi0 }];
  let x = t;
  for (const r of back) { rooms.push({ name: r.name, kind: r.kind, x0: r2(x), y0: yi1, x1: r2(x + r.w), y1: ytop }); x += r.w + t; }

  const O = []; // aberturas
  const add = (o) => O.push(o);
  // Fachada frontal: janela da sala + porta de entrada
  const jw = Math.min(1.5, Math.max(1.0, (W - 2 * t) / 4));
  let jp0 = t + 0.6;
  add({ type: "J", code: "J1", orient: "H", p0: r2(jp0), p1: r2(jp0 + jw), q0: 0, q1: t, sill: 0.9, head: 2.1, desc: "Correr 2 folhas" });
  let dp0 = jp0 + jw + 0.6;
  if (dp0 + 0.9 > W - t - 0.8) dp0 = Math.max(t + 0.1, W - t - 0.8 - 0.9);
  add({ type: "P", code: "P1", orient: "H", p0: r2(dp0), p1: r2(dp0 + 0.9), q0: 0, q1: t, sill: 0, head: 2.1, desc: "Abrir 1 folha",
        swing: { h: [r2(dp0), t], a0: 0, a1: 90 } });
  // Cozinha: janela na parede lateral direita
  const yc = t + S.ds / 2, kw = Math.min(1.2, S.ds - 0.8);
  add({ type: "J", code: "J2", orient: "V", p0: r2(yc - kw / 2), p1: r2(yc + kw / 2), q0: r2(W - t), q1: W, sill: 1.1, head: 2.1, desc: "Correr 2 folhas" });
  // Fundos
  for (const r of rooms.slice(1)) {
    const w = r.x1 - r.x0;
    const dw = r.kind === "b" ? 0.7 : 0.8;
    const hp1 = r2(r.x1 - 0.10), hp0 = r2(hp1 - dw);
    add({ type: "P", code: r.kind === "b" ? "P3" : "P2", orient: "H", p0: hp0, p1: hp1, q0: yi0, q1: yi1, sill: 0, head: 2.1, desc: "Abrir 1 folha",
          swing: { h: [hp1, yi1], a0: 90, a1: 180 }, room: r.name });
    const cx = (r.x0 + r.x1) / 2;
    if (r.kind === "q") {
      const ww = Math.min(1.5, w - 0.6);
      add({ type: "J", code: "J1", orient: "H", p0: r2(cx - ww / 2), p1: r2(cx + ww / 2), q0: ytop, q1: r2(ytop + t), sill: 0.9, head: 2.1, desc: "Correr 2 folhas" });
    } else if (r.kind === "b") {
      add({ type: "J", code: "J3", orient: "H", p0: r2(cx - 0.3), p1: r2(cx + 0.3), q0: ytop, q1: r2(ytop + t), sill: 1.5, head: 2.1, desc: "Basculante" });
    } else if (r.kind === "s") {
      add({ type: "P", code: "P2", orient: "H", p0: hp0, p1: hp1, q0: ytop, q1: r2(ytop + t), sill: 0, head: 2.1, desc: "Abrir 1 folha",
            swing: { h: [hp1, ytop], a0: 180, a1: 270 } });
    }
  }
  // Ajusta larguras reais dos códigos (J1 pode variar)
  for (const o of O) o.w = r2(o.p1 - o.p0), o.hgt = r2(o.head - o.sill);

  const tel = TELHAS[S.telha] || TELHAS.ceramica;
  const zb = r2(S.H + S.laje);          // topo da laje
  const zw = r2(zb + 0.15);              // apoio do telhado na face da parede
  const i = tel.i, b = +S.beiral;
  const zr = r2(zw + i * D / 2);         // cumeeira
  const roofZ = (y) => (y <= D / 2 ? zw + i * y : zw + i * (D - y));

  const bwc = rooms.find((r) => r.kind === "b");
  const xA = S.corteA === "auto" ? r2((bwc.x0 + bwc.x1) / 2 + 0.12) : +S.corteA;
  const yB = S.corteB === "auto" ? r2(yi1 + S.db * 0.55) : +S.corteB;

  return { S, t, W, D, yi0, yi1, ytop, rooms, O, H: S.H, laje: S.laje, zb, zw, zr, i, b, tel, roofZ, xA, yB };
}

/* Grade de células (paredes / ambientes / aberturas) */
function grid(M) {
  const xs = new Set([0, M.W]), ys = new Set([0, M.D]);
  for (const r of M.rooms) { xs.add(r.x0); xs.add(r.x1); ys.add(r.y0); ys.add(r.y1); }
  for (const o of M.O) {
    if (o.orient === "H") { xs.add(o.p0); xs.add(o.p1); ys.add(o.q0); ys.add(o.q1); }
    else { ys.add(o.p0); ys.add(o.p1); xs.add(o.q0); xs.add(o.q1); }
  }
  const X = [...xs].sort((a, b) => a - b), Y = [...ys].sort((a, b) => a - b);
  const cls = (mx, my) => {
    if (mx < 0 || my < 0 || mx > M.W || my > M.D) return { c: 0 };
    for (const r of M.rooms) if (mx > r.x0 && mx < r.x1 && my > r.y0 && my < r.y1) return { c: 0, room: r };
    for (const o of M.O) {
      const [x0, x1, y0, y1] = o.orient === "H" ? [o.p0, o.p1, o.q0, o.q1] : [o.q0, o.q1, o.p0, o.p1];
      if (mx > x0 && mx < x1 && my > y0 && my < y1) return { c: 2, o };
    }
    return { c: 1 };
  };
  const C = [];
  for (let i = 0; i < X.length - 1; i++) {
    C.push([]);
    for (let j = 0; j < Y.length - 1; j++) C[i].push(cls((X[i] + X[i + 1]) / 2, (Y[j] + Y[j + 1]) / 2));
  }
  return { X, Y, C, cls };
}

function mergeSegs(segs) { // segmentos colineares contíguos
  const key = (s) => (s.v ? "v" + s.k : "h" + s.k);
  const groups = {};
  for (const s of segs) (groups[key(s)] ||= []).push(s);
  const out = [];
  for (const g of Object.values(groups)) {
    g.sort((a, b) => a.a - b.a);
    let cur = { ...g[0] };
    for (let n = 1; n < g.length; n++) {
      if (Math.abs(g[n].a - cur.b) < 1e-6) cur.b = g[n].b; else { out.push(cur); cur = { ...g[n] }; }
    }
    out.push(cur);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Cotas                                                               */
/* ------------------------------------------------------------------ */
function dimChain(d, pts, k, o) {
  // o: {dir:'h'|'v', at: coordenada da linha de cota, from: coordenada do objeto}
  const L = "ARQ-COTA", th = 2.0 * k, tick = 1.2 * k, gap = 1.0 * k, ext = 1.5 * k;
  const sgn = Math.sign(o.at - o.from) || 1;
  pts = [...new Set(pts.map(r2))].sort((a, b) => a - b);
  const P = (a, c) => (o.dir === "h" ? [a, c] : [c, a]);
  d.line(P(pts[0], o.at), P(pts[pts.length - 1], o.at), L);
  pts.forEach((a) => {
    d.line(P(a, o.from + sgn * gap), P(a, o.at + sgn * ext), L);
    const [cx, cy] = P(a, o.at);
    d.line([cx - tick, cy - tick], [cx + tick, cy + tick], L);
  });
  for (let n = 0; n < pts.length - 1; n++) {
    const len = pts[n + 1] - pts[n], s = fmt(len), mid = (pts[n] + pts[n + 1]) / 2;
    const narrow = len < th * 0.62 * s.length + 0.6 * k;
    const off = (narrow ? 3.4 : 0.8) * k;
    if (o.dir === "h") d.text([mid, o.at + (sgn > 0 ? off : -off - th)], th, s, { al: "c", va: "b", layer: L });
    else d.text([o.at + (sgn > 0 ? off + th : -off), mid], th, s, { al: "c", va: "b", rot: 90, layer: L });
  }
}

function nivel(d, x, z, k, label, side = 1) {
  const s = 1.6 * k;
  d.hatch([[[x, z], [x - s * 0.6, z + s], [x + s * 0.6, z + s]]], "SOLID", "ARQ-NIVEL");
  d.line([x - s * 0.6 * side - (side < 0 ? 0 : 0), z], [x + side * 9 * k, z], "ARQ-NIVEL");
  d.text([x + side * 1.2 * k, z + s + 0.6 * k], 2.0 * k, label, { al: side > 0 ? "l" : "r", va: "b", layer: "ARQ-NIVEL" });
}

function titulo(d, x, y, k, nome, esc) {
  d.text([x, y], 4.0 * k, nome, { al: "c", va: "b", layer: "ARQ-TEXTO", bold: true });
  const w = 4.0 * k * 0.62 * nome.length;
  d.line([x - w / 2, y - 1.2 * k], [x + w / 2, y - 1.2 * k], "ARQ-TEXTO");
  d.text([x, y - 2.4 * k], 2.5 * k, esc, { al: "c", va: "t", layer: "ARQ-TEXTO" });
}

function marcaCorte(d, p, k, letra, dirVec) {
  const R = 3.2 * k;
  d.circle(p, R, "ARQ-CORTE-SIMB");
  d.text(p, 3.0 * k, letra, { al: "c", va: "m", layer: "ARQ-CORTE-SIMB", bold: true });
  // seta (triângulo) apontando para o lado de visada
  const [ux, uy] = dirVec, nx = -uy, ny = ux;
  const bx = p[0] + ux * R, by = p[1] + uy * R;
  const tip = [bx + ux * 3.2 * k, by + uy * 3.2 * k];
  d.hatch([[[bx + nx * 1.6 * k, by + ny * 1.6 * k], tip, [bx - nx * 1.6 * k, by - ny * 1.6 * k]]], "SOLID", "ARQ-CORTE-SIMB");
}

/* ------------------------------------------------------------------ */
/* 2. Planta baixa                                                     */
/* ------------------------------------------------------------------ */
function drawPlan(M, k) {
  const d = new Draw(), G = grid(M), { X, Y, C } = G, t = M.t;
  const isW = (i, j) => i >= 0 && j >= 0 && i < C.length && j < C[0].length && C[i][j].c === 1;
  const segs = [];
  for (let i = 0; i <= C.length; i++) for (let j = 0; j < Y.length - 1; j++)
    if (isW(i - 1, j) !== isW(i, j)) segs.push({ v: true, k: X[i], a: Y[j], b: Y[j + 1] });
  for (let j = 0; j <= Y.length - 1; j++) for (let i = 0; i < X.length - 1; i++)
    if (isW(i, j - 1) !== isW(i, j)) segs.push({ v: false, k: Y[j], a: X[i], b: X[i + 1] });
  for (const s of mergeSegs(segs)) d.line(s.v ? [s.k, s.a] : [s.a, s.k], s.v ? [s.k, s.b] : [s.b, s.k], "ARQ-PAREDE");
  const hs = 0.9 * k;
  for (let j = 0; j < Y.length - 1; j++) {
    let i = 0;
    while (i < X.length - 1) {
      if (isW(i, j)) { let e = i; while (isW(e + 1, j)) e++; d.hrect(X[i], Y[j], X[e + 1], Y[j + 1], "ANSI31", "ARQ-HACH-ALVEN", null, hs); i = e + 1; }
      else i++;
    }
  }
  // Esquadrias
  for (const o of M.O) {
    const E = "ARQ-ESQUADRIA";
    if (o.orient === "H") {
      if (o.type === "J") {
        const m = (o.q0 + o.q1) / 2;
        d.line([o.p0, o.q0], [o.p1, o.q0], E); d.line([o.p0, o.q1], [o.p1, o.q1], E);
        d.line([o.p0, m - 0.02], [o.p1, m - 0.02], E); d.line([o.p0, m + 0.02], [o.p1, m + 0.02], E);
        const out = o.q0 < 0.01 ? -1 : (o.q1 >= M.D - 0.001 ? 1 : 1);
        const ly = out < 0 ? o.q0 - 1.0 * k - 2 * k : o.q1 + 1.0 * k;
        d.text([(o.p0 + o.p1) / 2, ly], 2.0 * k, o.code, { al: "c", va: "b", layer: "ARQ-TEXTO" });
      } else if (o.swing) {
        const { h, a0, a1 } = o.swing, r = o.w;
        const ang = (a1 % 360 === 90 || a1 === 90) ? 90 : a1; // ângulo da folha aberta
        const la = ((o.swing.h[0] === o.p0) ? a1 : a1) * Math.PI / 180;
        const leafEnd = [h[0] + r * Math.cos(la), h[1] + r * Math.sin(la)];
        d.line(h, leafEnd, E);
        d.arc(h, r, a0, a1, E);
        const ly = (o.q0 + o.q1) / 2;
        const inside = Math.sin(la) > 0 ? 1 : -1;
        d.text([(o.p0 + o.p1) / 2, ly + inside * (o.w * 0.45)], 2.0 * k, o.code, { al: "c", va: "m", layer: "ARQ-TEXTO" });
        void ang;
      }
    } else { // V
      const m = (o.q0 + o.q1) / 2;
      d.line([o.q0, o.p0], [o.q0, o.p1], E); d.line([o.q1, o.p0], [o.q1, o.p1], E);
      d.line([m - 0.02, o.p0], [m - 0.02, o.p1], E); d.line([m + 0.02, o.p0], [m + 0.02, o.p1], E);
      d.text([o.q1 + 1.0 * k + 2 * k, (o.p0 + o.p1) / 2], 2.0 * k, o.code, { al: "c", va: "b", rot: 90, layer: "ARQ-TEXTO" });
    }
  }
  // Mobiliário
  const F = "ARQ-MOBILIARIO";
  for (const r of M.rooms) {
    const w = r.x1 - r.x0;
    if (r.kind === "q") {
      const bw = (r.name.endsWith("1") || r.name === "QUARTO") && w >= 2.7 ? 1.38 : 0.88;
      const cx = (r.x0 + r.x1) / 2 - (w > 2.6 ? 0.25 : 0), y1 = r.y1, y0 = y1 - 1.88;
      d.rect(cx - bw / 2, y0, cx + bw / 2, y1, F);
      d.rect(cx - bw / 2 + 0.05, y1 - 0.45, cx + bw / 2 - 0.05, y1 - 0.08, F);
      // guarda-roupa encostado na parede lateral esquerda
      if (r.y1 - r.y0 >= 2.8 && w >= 2.4) d.rect(r.x0, r.y0 + 0.15, r.x0 + 0.55, r.y0 + 0.15 + Math.min(1.6, r.y1 - r.y0 - 2.1), F);
    } else if (r.kind === "b") {
      const top = r.y1;
      d.rect(r.x0, top - 0.9, r.x1, top, F);                              // box
      d.line([r.x0, top - 0.9], [r.x1, top], F);
      d.circle([(r.x0 + r.x1) / 2, top - 0.45], 0.05, F);                 // ralo
      const vy = r.y0 + Math.min(1.45, (r.y1 - r.y0) - 1.3);
      d.rect(r.x0, vy - 0.19, r.x0 + 0.18, vy + 0.19, F);                 // vaso
      d.circle([r.x0 + 0.40, vy], 0.21, F);
      d.rect(r.x0, r.y0 + 0.12, r.x0 + 0.45, r.y0 + 0.62, F);            // lavatório
      d.circle([r.x0 + 0.24, r.y0 + 0.37], 0.14, F);
    } else if (r.kind === "s") {
      d.rect(r.x0, r.y1 - 0.55, r.x0 + 0.55, r.y1, F);                   // tanque
      d.rect(r.x0 + 0.65, r.y1 - 0.6, r.x0 + 1.25 > r.x1 - 0.95 ? r.x0 + 0.65 : r.x0 + 1.25, r.y1, F);
    } else if (r.kind === "sc") {
      const pl = 1.5, pc = (r.y0 + r.y1) / 2;
      d.rect(r.x1 - 0.6, pc - pl / 2, r.x1, pc + pl / 2, F);              // pia
      d.rect(r.x1 - 0.48, pc - 0.25, r.x1 - 0.08, pc + 0.05, F);          // cuba
      d.rect(r.x1 - 0.6, pc - pl / 2 - 0.6, r.x1, pc - pl / 2, F);        // fogão
      [[0.15, 0.15], [0.45, 0.15], [0.15, 0.45], [0.45, 0.45]].forEach(([a, b]) => d.circle([r.x1 - 0.6 + a, pc - pl / 2 - 0.6 + b], 0.08, F));
      if (pc + pl / 2 + 0.75 <= r.y1) d.rect(r.x1 - 0.7, pc + pl / 2 + 0.05, r.x1, pc + pl / 2 + 0.75, F); // geladeira
      const sl = Math.min(2.1, r.y1 - r.y0 - 0.6);                        // sofá
      d.rect(r.x0, (r.y0 + r.y1) / 2 - sl / 2, r.x0 + 0.85, (r.y0 + r.y1) / 2 + sl / 2, F);
      d.rect(r.x0 + 0.2, (r.y0 + r.y1) / 2 - sl / 2 + 0.2, r.x0 + 0.85, (r.y0 + r.y1) / 2 + sl / 2 - 0.2, F);
    }
  }
  // Textos dos ambientes
  for (const r of M.rooms) {
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2 + (r.kind === "q" ? -0.35 : r.kind === "b" ? -0.05 : 0);
    const w = r2(r.x1 - r.x0), h = r2(r.y1 - r.y0), A = w * h;
    const small = w < 1.9;
    const hn = (small ? 2.0 : 2.5) * k;
    d.text([cx + (r.kind === "b" ? 0.2 : 0), cy + 1.6 * k], hn, r.name, { al: "c", va: "b", layer: "ARQ-TEXTO", bold: true });
    d.text([cx + (r.kind === "b" ? 0.2 : 0), cy + 0.6 * k], 1.8 * k, `${fmt(w)} x ${fmt(h)}`, { al: "c", va: "t", layer: "ARQ-TEXTO" });
    d.text([cx + (r.kind === "b" ? 0.2 : 0), cy - 2.0 * k], 1.8 * k, `A = ${fmt(A)} m²`, { al: "c", va: "t", layer: "ARQ-TEXTO" });
  }
  // Projeção do beiral
  const b = M.b;
  d.rect(-b, -b, M.W + b, M.D + b, "ARQ-COBERTURA-PROJ");
  d.line([-b, M.D / 2], [M.W + b, M.D / 2], "ARQ-COBERTURA-PROJ");
  // Cotas
  const o1 = b + 7 * k, o2 = o1 + 7 * k;
  const backPts = [0, M.W]; M.rooms.slice(1).forEach((r) => backPts.push(r.x0, r.x1));
  dimChain(d, backPts, k, { dir: "h", at: M.D + o1, from: M.D });
  dimChain(d, [0, M.W], k, { dir: "h", at: M.D + o2, from: M.D });
  const frontPts = [0, M.W]; M.O.filter((o) => o.orient === "H" && o.q0 === 0).forEach((o) => frontPts.push(o.p0, o.p1));
  dimChain(d, frontPts, k, { dir: "h", at: -o1, from: 0 });
  dimChain(d, [0, t, M.yi0, M.yi1, M.ytop, M.D], k, { dir: "v", at: -o1, from: 0 });
  dimChain(d, [0, M.D], k, { dir: "v", at: -o2, from: 0 });
  // Linhas de corte
  const ext = o2 + 6 * k;
  d.line([M.xA, -o1 - 4 * k], [M.xA, M.D + ext], "ARQ-CORTE");
  d.line([-ext, M.yB], [M.W + b + 6 * k, M.yB], "ARQ-CORTE");
  marcaCorte(d, [M.xA, M.D + ext + 3.2 * k], k, "A", [-1, 0]);
  marcaCorte(d, [M.xA, -o1 - 4 * k - 3.2 * k], k, "A", [-1, 0]);
  marcaCorte(d, [-ext - 3.2 * k, M.yB], k, "B", [0, 1]);
  marcaCorte(d, [M.W + b + 6 * k + 3.2 * k, M.yB], k, "B", [0, 1]);
  const bb = bbox(d.E);
  titulo(d, M.W / 2, bb.y0 - 6 * k, k, "PLANTA BAIXA", `ESC. 1:${Math.round(k * 1000)}`);
  return d.E;
}

/* ------------------------------------------------------------------ */
/* 3. Cortes                                                           */
/* ------------------------------------------------------------------ */
function cutLine(M, axis, pos) {
  // axis 'x' => plano x=pos, percorre y ; axis 'y' => plano y=pos, percorre x
  const G = grid(M), { X, Y, C } = G, out = [];
  const onGrid = (A) => A.some((v) => Math.abs(v - pos) < 1e-4);
  if (onGrid(axis === "x" ? X : Y)) pos += 0.02;
  if (axis === "x") {
    const i = X.findIndex((v, n) => n < X.length - 1 && pos > v && pos < X[n + 1]);
    for (let j = 0; j < Y.length - 1; j++) out.push({ s0: Y[j], s1: Y[j + 1], ...C[i][j] });
  } else {
    const j = Y.findIndex((v, n) => n < Y.length - 1 && pos > v && pos < Y[n + 1]);
    for (let i = 0; i < X.length - 1; i++) out.push({ s0: X[i], s1: X[i + 1], ...C[i][j] });
  }
  // agrupa contíguos de mesma classe/objeto
  const m = [];
  for (const s of out) {
    const l = m[m.length - 1];
    if (l && l.c === s.c && l.o === s.o && l.room === s.room) l.s1 = s.s1; else m.push({ ...s });
  }
  return m;
}

function drawSection(M, axis, k) {
  const d = new Draw(), pos = axis === "x" ? M.xA : M.yB, L = axis === "x" ? M.D : M.W;
  const segs = cutLine(M, axis, pos), H = M.H, b = M.b, hs = 0.9 * k;
  const AL = "ARQ-HACH-ALVEN", CO = "ARQ-HACH-CONCR", P = "ARQ-PAREDE";
  // terreno
  d.line([-b - 1.0, -0.10], [0, -0.10], "ARQ-TERRENO");
  d.line([L, -0.10], [L + b + 1.0, -0.10], "ARQ-TERRENO");
  // contrapiso
  d.hrect(0, -0.10, L, 0, "ANSI37", CO, null, hs * 1.6);
  d.line([0, 0], [L, 0], "ARQ-PISO"); d.line([0, -0.10], [L, -0.10], "ARQ-PISO");
  // baldrames sob paredes (inclui vãos)
  const struct = [];
  for (const s of segs) if (s.c !== 0) { const l = struct[struct.length - 1]; if (l && Math.abs(l.s1 - s.s0) < 1e-6) l.s1 = s.s1; else struct.push({ s0: s.s0, s1: s.s1 }); }
  for (const s of struct) d.hrect(s.s0 - 0.025, -0.50, s.s1 + 0.025, -0.10, "ANSI37", CO, P, hs * 1.6);
  // paredes cortadas / vãos
  for (const s of segs) {
    if (s.c === 1) d.hrect(s.s0, -0.10, s.s1, H, "ANSI31", AL, P, hs);
    else if (s.c === 2) {
      const o = s.o;
      if (o.type === "P") { d.hrect(s.s0, o.head, s.s1, H, "ANSI31", AL, P, hs); d.line([s.s0, 0], [s.s1, 0], P); }
      else {
        d.hrect(s.s0, -0.10, s.s1, o.sill, "ANSI31", AL, P, hs);
        d.hrect(s.s0, o.head, s.s1, H, "ANSI31", AL, P, hs);
        d.rect(s.s0, o.sill, s.s1, o.head, "ARQ-ESQUADRIA");
        const m = (s.s0 + s.s1) / 2;
        d.line([m - 0.015, o.sill], [m - 0.015, o.head], "ARQ-ESQUADRIA");
        d.line([m + 0.015, o.sill], [m + 0.015, o.head], "ARQ-ESQUADRIA");
      }
    }
  }
  // laje
  d.hrect(0, H, L, M.zb, "ANSI37", CO, P, hs * 1.6);
  // ambientes: nome, vista das aberturas na parede ao fundo, revestimento
  for (const s of segs.filter((x) => x.room)) {
    const r = s.room, mid = (s.s0 + s.s1) / 2;
    d.text([mid, 1.35], 2.2 * k, r.name, { al: "c", va: "m", layer: "ARQ-TEXTO", bold: true });
    if (r.kind === "b" || r.kind === "s") {
      d.line([s.s0, 1.5], [s.s1, 1.5], "ARQ-VISTA");
      d.text([mid, 1.5 + 0.8 * k], 1.6 * k, "REV. CERÂMICO h=1,50", { al: "c", va: "b", layer: "ARQ-TEXTO" });
    }
    // aberturas da parede vista (ao fundo)
    for (const o of M.O) {
      let onWall = false;
      if (axis === "y" && o.orient === "H" && Math.abs(o.q0 - r.y1) < 1e-6) onWall = true;       // olhando +y
      if (axis === "x" && o.orient === "V" && Math.abs(o.q1 - r.x0) < 1e-6) onWall = true;       // olhando -x
      if (!onWall) continue;
      const a = Math.max(o.p0, s.s0), c = Math.min(o.p1, s.s1);
      if (c - a < 0.05) continue;
      d.rect(a, o.sill, c, o.head, "ARQ-VISTA");
      if (o.type === "J") { d.rect(a + 0.05, o.sill + 0.05, c - 0.05, o.head - 0.05, "ARQ-VISTA"); if (o.desc.startsWith("Correr")) d.line([(a + c) / 2, o.sill + 0.05], [(a + c) / 2, o.head - 0.05], "ARQ-VISTA"); }
      else { d.rect(a + 0.05, 0, c - 0.05, o.head - 0.05, "ARQ-VISTA"); }
    }
  }
  // telhado
  const i = M.i, zw = M.zw, th = 0.05, TL = "ARQ-COBERTURA";
  let topZ;
  if (axis === "x") {
    const pts = [[-b, zw - i * b], [M.D / 2, M.zr], [M.D + b, zw - i * b]];
    const up = pts.map(([s, z]) => [s, z + th]);
    d.hatch([[...pts, ...up.slice().reverse()]], "SOLID", "ARQ-COBERTURA");
    d.poly([...pts, ...up.slice().reverse()], true, TL);
    // oitão ao fundo (vista)
    d.poly([[0, M.zb], [M.D / 2, M.zr], [M.D, M.zb]], false, "ARQ-VISTA");
    topZ = M.zr + th;
    d.text([M.D * 0.25 - 0.2, zw + i * M.D * 0.25 + 4 * k], 1.8 * k, `${M.tel.nome} i=${Math.round(i * 100)}%`, { al: "c", va: "b", rot: Math.atan(i) * 180 / Math.PI, layer: "ARQ-TEXTO" });
  } else {
    const zc = M.roofZ(M.yB);
    d.hrect(-b, zc, M.W + b, zc + th, "SOLID", "ARQ-COBERTURA", TL);
    // oitões cortados
    d.hrect(0, M.zb, M.t, zc, "ANSI31", AL, P, hs);
    d.hrect(M.W - M.t, M.zb, M.W, zc, "ANSI31", AL, P, hs);
    if (M.yB > M.D / 2) {
      const ze = zw - i * b;
      d.line([-b, ze], [M.W + b, ze], "ARQ-VISTA");
      d.line([-b, ze], [-b, zc], "ARQ-VISTA"); d.line([M.W + b, ze], [M.W + b, zc], "ARQ-VISTA");
      topZ = zc + th;
    } else {
      d.line([-b, M.zr], [M.W + b, M.zr], "ARQ-VISTA");
      d.line([-b, zc + th], [-b, M.zr], "ARQ-VISTA"); d.line([M.W + b, zc + th], [M.W + b, M.zr], "ARQ-VISTA");
      topZ = M.zr;
    }
    d.text([M.W / 2, zc + th + 1.0 * k], 1.8 * k, `${M.tel.nome} i=${Math.round(i * 100)}%`, { al: "c", va: "b", layer: "ARQ-TEXTO" });
  }
  // níveis
  const nx = -b - 0.9;
  nivel(d, nx, 0, k, "±0,00", -1);
  nivel(d, nx, H, k, fmtNivel(H) + " (forro)", -1);
  d.text([-b - 0.2, -0.10 - 1.0 * k], 1.8 * k, "TERRENO " + fmtNivel(-0.10), { al: "r", va: "t", layer: "ARQ-NIVEL" });
  // cotas verticais à direita
  const vx = L + b + 1.0 + 4 * k;
  const zTop = axis === "x" ? M.zr : M.roofZ(M.yB);
  dimChain(d, [0, H, M.zb, zTop], k, { dir: "v", at: vx, from: L + b + 1.0 });
  // cotas horizontais
  const hp = [0, L]; segs.forEach((s) => { if (s.c !== 0) hp.push(s.s0, s.s1); });
  const merged = []; struct.forEach((s) => merged.push(s.s0, s.s1));
  dimChain(d, merged.concat([0, L]), k, { dir: "h", at: -0.50 - 6 * k, from: -0.50 });
  void topZ; void hp;
  const bb = bbox(d.E);
  const nome = axis === "x" ? "CORTE AA" : "CORTE BB";
  titulo(d, L / 2, bb.y0 - 8 * k, k, nome, `ESC. 1:${Math.round(k * 1000)}`);
  return d.E;
}

/* ------------------------------------------------------------------ */
/* 4. Fachada frontal                                                  */
/* ------------------------------------------------------------------ */
function drawFacade(M, k) {
  const d = new Draw(), b = M.b, i = M.i, zw = M.zw, ze = zw - i * b;
  d.line([-b - 1.0, -0.10], [M.W + b + 1.0, -0.10], "ARQ-TERRENO");
  d.poly([[0, -0.10], [0, ze], [M.W, ze], [M.W, -0.10]], false, "ARQ-PAREDE");
  // telhado em elevação
  d.hrect(-b, ze, M.W + b, M.zr, "ANSI31", "ARQ-COBERTURA", "ARQ-COBERTURA", 0.9 * k * 1.6);
  const tl = d.E[d.E.length - 2]; tl.ang = 45; // hachura vertical (canal)
  d.rect(-b, ze - 0.15, M.W + b, ze, "ARQ-COBERTURA");
  // aberturas na fachada (parede y=0)
  for (const o of M.O.filter((o) => o.orient === "H" && o.q0 === 0)) {
    const E = "ARQ-ESQUADRIA";
    if (o.type === "J") {
      d.rect(o.p0, o.sill, o.p1, o.head, E);
      d.rect(o.p0 + 0.05, o.sill + 0.05, o.p1 - 0.05, o.head - 0.05, E);
      d.line([(o.p0 + o.p1) / 2, o.sill + 0.05], [(o.p0 + o.p1) / 2, o.head - 0.05], E);
      d.rect(o.p0 - 0.05, o.sill - 0.04, o.p1 + 0.05, o.sill, E); // peitoril
    } else {
      d.rect(o.p0, 0, o.p1, o.head, E);
      d.rect(o.p0 + 0.05, 0, o.p1 - 0.05, o.head - 0.05, E);
      d.circle([o.p1 - 0.15, 1.05], 0.03, E);
    }
  }
  // cotas
  dimChain(d, [0, M.W], k, { dir: "h", at: -0.10 - 6 * k, from: -0.10 });
  dimChain(d, [-0.10, ze, M.zr], k, { dir: "v", at: M.W + b + 6 * k, from: M.W + b });
  const bb = bbox(d.E);
  titulo(d, M.W / 2, bb.y0 - 6 * k, k, "FACHADA FRONTAL", `ESC. 1:${Math.round(k * 1000)}`);
  return d.E;
}

/* ------------------------------------------------------------------ */
/* 5. Quadros e carimbo                                                */
/* ------------------------------------------------------------------ */
function drawQuadros(M, k) {
  const d = new Draw(), rh = 4.5 * k, T = "PRANCHA-TEXTO", C = "PRANCHA-CARIMBO";
  // Quadro de áreas
  const rows = M.rooms.map((r) => [r.name, fmt((r.x1 - r.x0) * (r.y1 - r.y0))]);
  const util = M.rooms.reduce((a, r) => a + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
  rows.push(["ÁREA ÚTIL", fmt(util)], ["ÁREA CONSTRUÍDA", fmt(M.W * M.D)]);
  const w1 = 70 * k, c1 = 48 * k;
  let y = 0;
  const tab = (x0, w, head, cols, data) => {
    const h = (data.length + 2) * rh;
    d.rect(x0, -h, x0 + w, 0, C);
    d.text([x0 + w / 2, -rh / 2], 2.2 * k, head, { al: "c", va: "m", layer: T, bold: true });
    d.line([x0, -rh], [x0 + w, -rh], C);
    let cx = x0; const xs = [x0];
    cols.forEach((c) => { cx += c.w; xs.push(cx); });
    cols.forEach((c, n) => d.text([xs[n] + 1 * k, -rh * 1.5], 1.8 * k, c.t, { al: "l", va: "m", layer: T, bold: true }));
    d.line([x0, -2 * rh], [x0 + w, -2 * rh], C);
    xs.slice(1, -1).forEach((x) => d.line([x, -rh], [x, -h], C));
    data.forEach((row, n) => {
      row.forEach((v, m) => d.text([xs[m] + 1 * k, -rh * (2.5 + n)], 1.8 * k, v, { al: "l", va: "m", layer: T, bold: n >= data.length - 2 && head.includes("ÁREAS") }));
      if (n < data.length - 1) d.line([x0, -rh * (3 + n)], [x0 + w, -rh * (3 + n)], C);
    });
    return h;
  };
  tab(0, w1, "QUADRO DE ÁREAS (m²)", [{ t: "AMBIENTE", w: c1 }, { t: "ÁREA", w: w1 - c1 }], rows);
  // Quadro de esquadrias
  const by = {};
  for (const o of M.O) {
    const key = `${o.code}|${o.w}|${o.hgt}|${o.sill}`;
    (by[key] ||= { o, n: 0 }).n++;
  }
  const esq = Object.values(by).sort((a, b) => a.o.code.localeCompare(b.o.code))
    .map(({ o, n }) => [o.code, o.desc, `${fmt(o.w)} x ${fmt(o.hgt)}`, o.type === "J" ? fmt(o.sill) : "-", String(n)]);
  const x2 = w1 + 8 * k, w2 = 100 * k;
  tab(x2, w2, "QUADRO DE ESQUADRIAS", [{ t: "CÓD.", w: 12 * k }, { t: "TIPO", w: 30 * k }, { t: "L x H (m)", w: 25 * k }, { t: "PEIT.", w: 17 * k }, { t: "QTD", w: w2 - 84 * k }], esq);
  void y;
  return d.E;
}

const CARIMBO_W = 178, CARIMBO_H = 62;
function drawCarimbo(M, k, fmtNome, escala) {
  const d = new Draw(), S = M.S, C = "PRANCHA-CARIMBO", T = "PRANCHA-TEXTO";
  const W = CARIMBO_W * k, H = CARIMBO_H * k, u = k;
  const lab = (x, y, s) => d.text([x + 1.2 * u, y - 1.2 * u], 1.6 * u, s, { al: "l", va: "t", layer: T });
  const val = (x, y, s, h = 2.6, bold = false) => d.text([x + 1.2 * u, y + 1.4 * u], h * u, s, { al: "l", va: "b", layer: T, bold });
  d.rect(0, 0, W, H, "PRANCHA");
  // linhas horizontais (de cima p/ baixo): 16 | 8 | 8 | 8 | 9 | 13
  const rows = [H, H - 16 * u, H - 24 * u, H - 32 * u, H - 40 * u, H - 49 * u, 0];
  rows.slice(1, -1).forEach((y) => d.line([0, y], [W, y], C));
  // Linha 1: marca + título
  d.line([42 * u, H], [42 * u, rows[1]], C);
  d.text([21 * u, H - 6.2 * u], 3.6 * u, "FOSTER CALC", { al: "c", va: "m", layer: T, bold: true });
  d.text([21 * u, H - 11.2 * u], 1.7 * u, "Planta IA · estudo gerado", { al: "c", va: "m", layer: T });
  const nq = M.rooms.filter((r) => r.kind === "q").length;
  const tit = (S.titulo || `CASA TÉRREA - ${nq} QUARTO${nq > 1 ? "S" : ""}`).toUpperCase();
  lab(42 * u, H, "PROJETO");
  val(42 * u, rows[1] + 1 * u, tit, 4.0, true);
  // Linha 2: conteúdo
  lab(0, rows[1], "CONTEÚDO");
  val(0, rows[2], "PLANTA BAIXA, CORTES AA E BB, FACHADA FRONTAL, QUADROS", 2.4);
  // Linha 3: proprietário
  lab(0, rows[2], "PROPRIETÁRIO");
  val(0, rows[3], (S.proprietario || "").toUpperCase(), 2.6);
  // Linha 4: endereço
  lab(0, rows[3], "ENDEREÇO DA OBRA");
  val(0, rows[4], (S.endereco || "").toUpperCase(), 2.4);
  // Linha 5: área | escala | data | formato | folha
  const cols5 = [0, 46, 80, 112, 142, 178].map((v) => v * u);
  cols5.slice(1, -1).forEach((x) => d.line([x, rows[4]], [x, rows[5]], C));
  const c5 = [["ÁREA CONSTRUÍDA", `${fmt(M.W * M.D)} m²`], ["ESCALA", `1:${escala}`], ["DATA", S.data || ""], ["FORMATO", fmtNome], ["FOLHA", S.folha || "01/01"]];
  c5.forEach(([l, v], n) => { lab(cols5[n], rows[4], l); val(cols5[n], rows[5], v, 2.4); });
  // Linha 6: responsável técnico + assinatura
  d.line([100 * u, rows[5]], [100 * u, 0], C);
  lab(0, rows[5], "RESPONSÁVEL TÉCNICO");
  val(0, 5.6 * u, (S.resp || "").toUpperCase(), 2.6, true);
  d.text([1.2 * u, 1.6 * u], 1.9 * u, S.registro || "", { al: "l", va: "b", layer: T });
  lab(100 * u, rows[5], "ASSINATURA");
  d.line([104 * u, 4.5 * u], [174 * u, 4.5 * u], C);
  return d.E;
}

/* ------------------------------------------------------------------ */
/* 6. Prancha (escolha automática de formato/escala + diagramação)    */
/* ------------------------------------------------------------------ */
const CANDIDATOS = [["A3", 50], ["A2", 50], ["A1", 50], ["A2", 75], ["A3", 100], ["A1", 75], ["A1", 100]];
const OPCOES = [
  [["P", "F"], ["AA", "BB", "Q", "C"]],
  [["P", "Q"], ["AA", "BB", "F", "C"]],
  [["P", "F"], ["AA", "BB"], ["Q", "C"]],
  [["P"], ["AA", "BB"], ["F", "Q", "C"]],
  [["P"], ["F", "AA"], ["BB", "Q", "C"]],
];

export function buildSheet(S, opt = {}) {
  if (opt.marca === "academico") S = { ...S, resp: "USO ACADÊMICO", registro: "Não válido para ART/RRT · Foster Calc plano Estudante" };
  if (opt.marca === "estudo") S = { ...S, resp: "", registro: "Estudo · Foster Calc (plano Grátis)" };
  const M = buildModel(S);
  let cands = CANDIDATOS;
  if (S.formato && S.formato !== "auto") { const [f, e] = S.formato.split("@"); cands = [[f, +e]]; }
  let chosen = null;
  for (const [fmtNome, esc] of cands) {
    const k = esc / 1000;
    const blocks = {
      P: drawPlan(M, k), AA: drawSection(M, "x", k), BB: drawSection(M, "y", k),
      F: drawFacade(M, k), Q: drawQuadros(M, k), C: drawCarimbo(M, k, fmtNome, esc),
    };
    const bb = {}; for (const key in blocks) bb[key] = bbox(blocks[key]);
    const [fw, fh, mg] = FORMATOS[fmtNome];
    const left = 25 * k, m = mg * k, SW = fw * k, SH = fh * k;
    const ax0 = left + 4 * k, ay0 = m + 4 * k, aw = SW - left - m - 8 * k, ah = SH - 2 * m - 8 * k;
    const gap = 10 * k;
    for (const op of OPCOES) {
      const colW = op.map((col) => Math.max(...col.map((b) => bb[b].w)));
      const colH = op.map((col) => col.reduce((a, b) => a + bb[b].h, 0) + gap * (col.length - 1));
      const totW = colW.reduce((a, b) => a + b, 0);
      if (totW + gap * (op.length - 1) <= aw && Math.max(...colH) <= ah) {
        chosen = { M, k, esc, fmtNome, blocks, bb, op, colW, SW, SH, left, m, ax0, ay0, aw, ah, gap };
        break;
      }
    }
    if (chosen) break;
  }
  let aviso = "";
  if (!chosen) { // não coube: usa o último candidato e a 1ª opção mesmo assim
    const [fmtNome, esc] = cands[cands.length - 1], k = esc / 1000;
    const blocks = { P: drawPlan(M, k), AA: drawSection(M, "x", k), BB: drawSection(M, "y", k), F: drawFacade(M, k), Q: drawQuadros(M, k), C: drawCarimbo(M, k, fmtNome, esc) };
    const bb = {}; for (const key in blocks) bb[key] = bbox(blocks[key]);
    const [fw, fh, mg] = FORMATOS[fmtNome];
    const left = 25 * k, m = mg * k, SW = fw * k, SH = fh * k, op = OPCOES[0];
    chosen = { M, k, esc, fmtNome, blocks, bb, op, colW: op.map((col) => Math.max(...col.map((b) => bb[b].w))), SW, SH, left, m,
      ax0: left + 4 * k, ay0: m + 4 * k, aw: SW - left - m - 8 * k, ah: SH - 2 * m - 8 * k, gap: 10 * k };
    aviso = "O desenho não coube na prancha escolhida — tente um formato maior ou escala menor.";
  }
  const { k, blocks, bb, op, colW, SW, SH, left, m, ax0, ay0, aw, ah, gap } = chosen;
  const out = new Draw();
  // moldura
  out.rect(0, 0, SW, SH, "PRANCHA-CARIMBO");
  out.rect(left, m, SW - m, SH - m, "PRANCHA");
  // colunas justificadas
  const free = aw - colW.reduce((a, b) => a + b, 0);
  const g = op.length > 1 ? free / (op.length - 1) : 0;
  let cx = ax0;
  const placed = [];
  op.forEach((col, ci) => {
    const isLast = ci === op.length - 1;
    let y = ay0 + ah; // de cima para baixo
    col.forEach((key) => {
      const b = bb[key];
      let x = key === "C" || key === "Q" ? cx + colW[ci] - b.w : cx + (colW[ci] - b.w) / 2;
      let ty = y - b.h;
      if (key === "C" && isLast) { x = SW - m - b.w; ty = m; }
      if (key === "Q" && isLast && col.includes("C")) { x = SW - m - b.w; }
      placed.push(...translate(blocks[key], x - b.x0, ty - b.y0));
      y = ty - gap;
    });
    cx += colW[ci] + g;
  });
  // se Q ficar sobreposto ao carimbo, empilha logo acima
  out.E.push(...placed);
  out.E.push({ t: "text", p: [SW - m - 1 * k, SH - m + 1.2 * k], h: 1.8 * k, s: "Estudo preliminar gerado automaticamente — conferir antes de usar. Foster Calc · Feito no Brasil", al: "r", va: "b", rot: 0, layer: "PRANCHA-TEXTO" });
  if (opt.marca) {
    const t1 = opt.marca === "academico" ? "USO ACADÊMICO" : "ESTUDO · FOSTER CALC";
    const t2 = opt.marca === "academico" ? "NÃO VÁLIDO PARA ART/RRT" : "ASSINE O PLANO PRO PARA A VERSÃO SEM MARCA";
    out.E.push({ t: "text", p: [SW / 2, SH / 2 + 12 * k], h: 34 * k, s: t1, al: "c", va: "m", rot: 25, layer: "MARCA", bold: true });
    out.E.push({ t: "text", p: [SW / 2 + 10 * k, SH / 2 - 22 * k], h: 12 * k, s: t2, al: "c", va: "m", rot: 25, layer: "MARCA", bold: true });
  }
  return { E: out.E, SW, SH, k, esc: chosen.esc, formato: chosen.fmtNome, M, aviso };
}

/* ------------------------------------------------------------------ */
/* 7. Exportação DXF                                                   */
/* ------------------------------------------------------------------ */
const esc = (s) => s.replace(/[^\x20-\x7e]/g, (c) => "\\U+" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"));
const HA = { l: TextHorizontalAlignment.Left, c: TextHorizontalAlignment.Center, r: TextHorizontalAlignment.Right };
const VA = { b: TextVerticalAlignment.Bottom, m: TextVerticalAlignment.Middle, t: TextVerticalAlignment.Top };

export function toDXF(sheet) {
  const { E, k } = sheet;
  const dx = new DxfWriter();
  dx.setUnits(Units.Meters);
  dx.setVariable("$DWGCODEPAGE", { 3: "ANSI_1252" });
  dx.addLType("TRACOPONTO", "__ . __ . __", [12 * k, -3 * k, 0.5 * k, -3 * k]);
  dx.addLType("TRACEJADA", "__ __ __", [4 * k, -2 * k]);
  for (const [n, L] of Object.entries(LAYERS)) dx.addLayer(n, L.aci, L.lt);
  for (const e of E) {
    const o = { layerName: e.layer };
    if (e.t === "line") dx.addLine(point3d(e.a[0], e.a[1]), point3d(e.b[0], e.b[1]), o);
    else if (e.t === "poly") dx.addLWPolyline(e.pts.map((p) => ({ point: point2d(p[0], p[1]) })), { ...o, flags: e.closed ? LWPolylineFlags.Closed : LWPolylineFlags.None });
    else if (e.t === "arc") dx.addArc(point3d(e.c[0], e.c[1]), e.r, e.a0, e.a1, o);
    else if (e.t === "circle") dx.addCircle(point3d(e.c[0], e.c[1]), e.r, o);
    else if (e.t === "text") {
      const p = point3d(e.p[0], e.p[1]);
      const opt = { ...o, rotation: e.rot || 0 };
      if (!(e.al === "l" && e.va === "b")) { opt.horizontalAlignment = HA[e.al]; opt.verticalAlignment = VA[e.va]; opt.secondAlignmentPoint = p; }
      dx.addText(p, e.h, e.s, opt);
    } else if (e.t === "hatch") {
      const bp = new HatchBoundaryPaths();
      for (const l of e.loops) bp.addPolylineBoundary(new HatchPolylineBoundary(l.map((p) => vertex(p[0], p[1]))));
      const fill = e.pat === "SOLID" ? pattern({ name: HatchPredefinedPatterns.SOLID })
        : pattern({ name: HatchPredefinedPatterns[e.pat], scale: e.sc || 1, angle: e.ang || 0 });
      dx.addHatch(bp, fill, o);
    }
  }
  return dx.stringify();
}

/* ------------------------------------------------------------------ */
/* 8. SVG (pré-visualização e impressão)                               */
/* ------------------------------------------------------------------ */
export function toSVG(sheet, opts = {}) {
  const { E, SW, SH, k } = sheet;
  const X = (x) => +x.toFixed(4), Y = (y) => +(SH - y).toFixed(4);
  const sp = 1.2 * k;
  const parts = [];
  const sw = (layer) => ((LAYERS[layer]?.w || 0.18) * k).toFixed(5);
  const col = (layer) => LAYERS[layer]?.svg || "#111";
  const dash = (layer) => LAYERS[layer]?.lt === "TRACOPONTO" ? ` stroke-dasharray="${12 * k} ${3 * k} ${0.5 * k} ${3 * k}"` : LAYERS[layer]?.lt === "TRACEJADA" ? ` stroke-dasharray="${4 * k} ${2 * k}"` : "";
  for (const e of E) {
    const st = `stroke="${col(e.layer)}" stroke-width="${sw(e.layer)}"${dash(e.layer)} fill="none"`;
    if (e.t === "line") parts.push(`<line x1="${X(e.a[0])}" y1="${Y(e.a[1])}" x2="${X(e.b[0])}" y2="${Y(e.b[1])}" ${st}/>`);
    else if (e.t === "poly") parts.push(`<${e.closed ? "polygon" : "polyline"} points="${e.pts.map((p) => X(p[0]) + "," + Y(p[1])).join(" ")}" ${st}/>`);
    else if (e.t === "circle") parts.push(`<circle cx="${X(e.c[0])}" cy="${Y(e.c[1])}" r="${e.r}" ${st}/>`);
    else if (e.t === "arc") {
      const a0 = e.a0 * Math.PI / 180, a1 = e.a1 * Math.PI / 180;
      const p0 = [e.c[0] + e.r * Math.cos(a0), e.c[1] + e.r * Math.sin(a0)], p1 = [e.c[0] + e.r * Math.cos(a1), e.c[1] + e.r * Math.sin(a1)];
      const large = ((e.a1 - e.a0 + 360) % 360) > 180 ? 1 : 0;
      parts.push(`<path d="M${X(p0[0])} ${Y(p0[1])} A${e.r} ${e.r} 0 ${large} 0 ${X(p1[0])} ${Y(p1[1])}" ${st}/>`);
    } else if (e.t === "hatch") {
      const d = e.loops.map((l) => "M" + l.map((p) => X(p[0]) + " " + Y(p[1])).join("L") + "Z").join("");
      const fill = e.pat === "SOLID" ? col(e.layer) : e.pat === "ANSI37" ? "url(#hc)" : e.ang ? "url(#hv)" : "url(#ha)";
      parts.push(`<path d="${d}" fill="${fill}" stroke="none"${e.pat === "SOLID" ? ' fill-opacity="0.85"' : ""}/>`);
    } else if (e.t === "text") {
      const anchor = { l: "start", c: "middle", r: "end" }[e.al];
      const base = { b: "auto", m: "central", t: "hanging" }[e.va];
      const s = e.s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const tr = e.rot ? ` transform="rotate(${-e.rot} ${X(e.p[0])} ${Y(e.p[1])})"` : "";
      parts.push(`<text x="${X(e.p[0])}" y="${Y(e.p[1])}" font-size="${e.h.toFixed(4)}" text-anchor="${anchor}" dominant-baseline="${base}" fill="${col(e.layer)}"${e.layer === "MARCA" ? ' fill-opacity="0.16"' : ""}${e.bold ? ' font-weight="700"' : ""}${tr}>${s}</text>`);
    }
  }
  const defs = `<defs>
<pattern id="ha" width="${sp}" height="${sp}" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="${sp}" stroke="#777" stroke-width="${0.1 * k}"/></pattern>
<pattern id="hv" width="${sp * 1.6}" height="${sp}" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="${sp}" stroke="#a46aa4" stroke-width="${0.1 * k}"/></pattern>
<pattern id="hc" width="${sp * 1.6}" height="${sp * 1.6}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V${sp * 1.6}M0 0H${sp * 1.6}" stroke="#888" stroke-width="${0.08 * k}"/></pattern>
</defs>`;
  const size = opts.print ? ` width="${(SW / k).toFixed(0)}mm" height="${(SH / k).toFixed(0)}mm"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${X(SW)} ${X(SH)}"${size} font-family="Arial, Helvetica, sans-serif"><rect x="0" y="0" width="${X(SW)}" height="${X(SH)}" fill="#fff"/>${defs}${parts.join("")}</svg>`;
}
