// Foster Calc · Planta IA — núcleo geométrico
// modelo → folha 01 (planta, cortes, fachada frontal, quadros) e folha 02 (situação, implantação,
// cobertura, fachadas, índices) → DXF / SVG
import {
  Hatch, DxfWriter, point3d, point2d, Units, HatchBoundaryPaths, HatchPolylineBoundary, vertex,
  pattern, HatchPredefinedPatterns, TextHorizontalAlignment, TextVerticalAlignment, LWPolylineFlags
} from "@tarikjabiri/dxf";

/* ------------------------------------------------------------------ */
/* Parâmetros padrão                                                   */
/* ------------------------------------------------------------------ */
export function defaults() {
  return {
    // programa
    nq: 2, qw: [3.0, 2.8, 2.8], bw: 1.6, serv: false, sw: 1.6, ds: 3.8, db: 3.0,
    varanda: false, dv: 1.8, suite: false, bsw: 1.4, cozSep: false, kw: 2.8,
    // construção
    t: 0.15, H: 2.8, laje: 0.10, telha: "ceramica", beiral: 0.6,
    // terreno
    lf: 10, lp: 25, rf: 5, afE: "", vaga: true, calc: 2.0, norte: 0,
    rua: "", ruaLat: "", esquina: "", quadra: "", lote: "", bairro: "", cidade: "",
    // limites da lei de zoneamento (vazio = não confere)
    toMax: "", caMax: "", permMin: "", rfMin: "", rlMin: "", rfuMin: "",
    // prancha
    corteA: "auto", corteB: "auto", titulo: "", proprietario: "", endereco: "", resp: "", registro: "",
    data: new Date().toLocaleDateString("pt-BR"), formato: "auto", formato2: "auto",
  };
}

export const TELHAS = {
  ceramica: { nome: "TELHA CERÂMICA", i: 0.30 },
  concreto: { nome: "TELHA DE CONCRETO", i: 0.30 },
  fibrocimento: { nome: "TELHA DE FIBROCIMENTO", i: 0.15 },
};

export const LAYERS = {
  "ARQ-PAREDE":        { aci: 7, lt: "Continuous", svg: "#111", w: 0.40 },
  "ARQ-HACH-ALVEN":    { aci: 8, lt: "Continuous", svg: "#666", w: 0.10 },
  "ARQ-HACH-CONCR":    { aci: 8, lt: "Continuous", svg: "#666", w: 0.10 },
  "ARQ-PILAR":         { aci: 7, lt: "Continuous", svg: "#111", w: 0.35 },
  "ARQ-ESQUADRIA":     { aci: 4, lt: "Continuous", svg: "#0a6f96", w: 0.20 },
  "ARQ-MOBILIARIO":    { aci: 8, lt: "Continuous", svg: "#8a8a8a", w: 0.13 },
  "ARQ-VISTA":         { aci: 8, lt: "Continuous", svg: "#777", w: 0.15 },
  "ARQ-PROJECAO":      { aci: 8, lt: "TRACEJADA", svg: "#777", w: 0.13 },
  "ARQ-COBERTURA":     { aci: 6, lt: "Continuous", svg: "#8a2a8a", w: 0.25 },
  "ARQ-COBERTURA-PROJ":{ aci: 6, lt: "TRACEJADA", svg: "#8a2a8a", w: 0.15 },
  "ARQ-PISO":          { aci: 8, lt: "Continuous", svg: "#666", w: 0.25 },
  "ARQ-TERRENO":       { aci: 3, lt: "Continuous", svg: "#3b6e2a", w: 0.30 },
  "ARQ-LOTE":          { aci: 1, lt: "Continuous", svg: "#b3261e", w: 0.40 },
  "ARQ-PASSEIO":       { aci: 8, lt: "Continuous", svg: "#777", w: 0.18 },
  "ARQ-PERMEAVEL":     { aci: 3, lt: "Continuous", svg: "#5e8c3a", w: 0.10 },
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

const FORMATOS = { A3: [420, 297, 7], A2: [594, 420, 10], A1: [841, 594, 10], A0: [1189, 841, 10] };

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const r2 = (v) => Math.round(v * 1000) / 1000;
const EPS = 1e-6;
const num = (v, d) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : d; };
const opt = (v) => { if (v === "" || v == null) return null; const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmt = (v, n = 2) => (Math.round(v * 10 ** n) / 10 ** n).toFixed(n).replace(".", ",");
const fmtNivel = (v) => (Math.abs(v) < 1e-6 ? "±0,00" : (v > 0 ? "+" : "") + fmt(v));

class Draw {
  constructor() { this.E = []; }
  line(a, b, layer) { this.E.push({ t: "line", a, b, layer }); }
  poly(pts, closed, layer) { this.E.push({ t: "poly", pts, closed: !!closed, layer }); }
  rect(x0, y0, x1, y1, layer) { this.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, layer); }
  arc(c, r, a0, a1, layer) { this.E.push({ t: "arc", c, r, a0, a1, layer }); }
  circle(c, r, layer) { this.E.push({ t: "circle", c, r, layer }); }
  text(p, h, s, o = {}) { this.E.push({ t: "text", p, h, s: String(s), al: o.al || "l", va: o.va || "b", rot: o.rot || 0, layer: o.layer || "ARQ-TEXTO", bold: !!o.bold }); }
  hatch(loops, pat, layer, sc = 1, ang = 0) { this.E.push({ t: "hatch", loops, pat, layer, sc, ang }); }
  hrect(x0, y0, x1, y1, pat, layer, outlineLayer, sc, ang) {
    if (x1 - x0 < 1e-6 || y1 - y0 < 1e-6) return;
    this.hatch([[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]], pat, layer, sc, ang);
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
      const dx0 = e.al === "c" ? -w / 2 : e.al === "r" ? -w : 0;
      const dy0 = e.va === "m" ? -h / 2 : e.va === "t" ? -h : 0;
      const a = (e.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      [[dx0, dy0], [dx0 + w, dy0], [dx0 + w, dy0 + h], [dx0, dy0 + h]].forEach(([x, y]) => add(e.p[0] + x * c - y * s, e.p[1] + x * s + y * c));
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

function transform(E, f, escR = 1) {
  return E.map((e) => {
    const n = { ...e };
    if (e.a) n.a = f(e.a);
    if (e.b) n.b = f(e.b);
    if (e.c) n.c = f(e.c);
    if (e.p) n.p = f(e.p);
    if (e.pts) n.pts = e.pts.map(f);
    if (e.loops) n.loops = e.loops.map((l) => l.map(f));
    if (e.t === "arc" || e.t === "circle") n.r = e.r * escR;
    return n;
  });
}
const translate = (E, dx, dy) => transform(E, (p) => [p[0] + dx, p[1] + dy]);

/* ------------------------------------------------------------------ */
/* 1. Modelo paramétrico                                               */
/* ------------------------------------------------------------------ */
export function buildModel(S0) {
  const S = { ...defaults(), ...S0 };
  const avisos = [];
  const t = clamp(num(S.t, 0.15), 0.1, 0.3);
  const nq = clamp(Math.round(num(S.nq, 2)), 1, 3);
  const ds = clamp(num(S.ds, 3.8), 2.5, 8), db = clamp(num(S.db, 3.0), 2.2, 6);
  const H = clamp(num(S.H, 2.8), 2.3, 5), laje = clamp(num(S.laje, 0.1), 0.06, 0.3);
  const qw = [0, 1, 2].map((i) => clamp(num((S.qw || [])[i], 2.8), 2.0, 6));
  const suite = !!S.suite, serv = !!S.serv, varanda = !!S.varanda;

  const back = [];
  for (let i = 0; i < nq; i++) {
    const name = i === 0 && suite ? "SUÍTE" : nq === 1 ? "QUARTO" : `QUARTO ${i + 1}`;
    back.push({ name, w: qw[i], kind: "q", first: i === 0 });
    if (i === 0 && suite) back.push({ name: "BANHO SUÍTE", w: clamp(num(S.bsw, 1.4), 1.1, 3), kind: "bs" });
  }
  // com cozinha separada, o banheiro vai logo após o 1º quarto para abrir na sala, não na cozinha
  const bwcR = { name: "BANHEIRO", w: clamp(num(S.bw, 1.6), 1.1, 3), kind: "b" };
  if (S.cozSep && nq > 1) back.splice(back.findIndex((r) => r.kind === "q" && !r.first), 0, bwcR);
  else if (S.cozSep) back.unshift(bwcR);
  else back.push(bwcR);
  if (serv) back.push({ name: "A. SERVIÇO", w: clamp(num(S.sw, 1.6), 1.2, 3.5), kind: "s" });

  const W = r2(t + back.reduce((a, r) => a + r.w, 0) + (back.length - 1) * t + t);
  const D = r2(3 * t + ds + db);
  const yi0 = r2(t + ds), yi1 = r2(2 * t + ds), ytop = r2(yi1 + db);

  // zona frontal: sala/cozinha integradas ou separadas
  const rooms = [];
  let sala, coz = null;
  const kw = clamp(num(S.kw, 2.8), 2.0, 6);
  const cozSep = !!S.cozSep && W - 3 * t - kw >= 2.6;
  if (S.cozSep && !cozSep) avisos.push("Cozinha separada não coube: a sala ficaria com menos de 2,60 m. Mantida integrada.");
  if (cozSep) {
    coz = { name: "COZINHA", kind: "coz", x0: r2(W - t - kw), y0: t, x1: r2(W - t), y1: yi0 };
    sala = { name: "SALA", kind: "sala", x0: t, y0: t, x1: r2(coz.x0 - t), y1: yi0 };
    rooms.push(sala, coz);
  } else {
    sala = { name: "SALA/COZINHA", kind: "sc", x0: t, y0: t, x1: r2(W - t), y1: yi0 };
    rooms.push(sala);
  }
  let x = t;
  for (const r of back) { rooms.push({ ...r, x0: r2(x), y0: yi1, x1: r2(x + r.w), y1: ytop }); x += r.w + t; }

  const O = [];
  const add = (o) => { o.w = r2(o.p1 - o.p0); o.hgt = r2(o.head - o.sill); O.push(o); return o; };

  // fachada frontal: janela da sala + porta de entrada (dentro da sala)
  const salaFim = sala.x1;
  let jw = Math.min(1.5, Math.max(1.0, (salaFim - t) / 3.2));
  const jp0 = t + 0.5;
  let dp0 = jp0 + jw + 0.5;
  if (dp0 + 0.9 > salaFim - 0.3) {
    jw = Math.max(0.8, salaFim - 0.3 - 0.9 - 0.4 - jp0);
    dp0 = jp0 + jw + 0.4;
    if (dp0 + 0.9 > salaFim - 0.15) { dp0 = Math.max(t + 0.15, salaFim - 0.15 - 0.9); jw = 0; avisos.push("Sala estreita: a janela da fachada foi retirada para caber a porta."); }
  }
  if (jw > 0) add({ type: "J", orient: "H", p0: r2(jp0), p1: r2(jp0 + jw), q0: 0, q1: t, sill: 0.9, head: 2.1, desc: "Correr 2 folhas" });
  add({ type: "P", orient: "H", p0: r2(dp0), p1: r2(dp0 + 0.9), q0: 0, q1: t, sill: 0, head: 2.1, desc: "Abrir 1 folha", entrada: true,
        swing: { h: [r2(dp0), t], open: 90, closed: 0 } });
  // cozinha: janela na lateral direita
  const kc = t + ds / 2, kjw = Math.min(1.2, ds - 0.8);
  add({ type: "J", orient: "V", p0: r2(kc - kjw / 2), p1: r2(kc + kjw / 2), q0: r2(W - t), q1: W, sill: 1.1, head: 2.1, desc: "Correr 2 folhas" });
  // sala funda: janela também na lateral esquerda
  if (ds >= 4.2) add({ type: "J", orient: "V", p0: r2(kc - 0.6), p1: r2(kc + 0.6), q0: 0, q1: t, sill: 0.9, head: 2.1, desc: "Correr 2 folhas" });
  // vão livre entre sala e cozinha
  if (cozSep) add({ type: "V", orient: "V", p0: r2(yi0 - 0.15 - 0.9), p1: r2(yi0 - 0.15), q0: r2(coz.x0 - t), q1: coz.x0, sill: 0, head: 2.1, desc: "Vão livre" });

  const regiao = (a, b) => {
    if (!cozSep) return "sc";
    if (b <= sala.x1 + EPS) return "sala";
    if (a >= coz.x0 - EPS) return "coz";
    return "parede";
  };
  for (const r of rooms) {
    if (r.y0 !== yi1) continue;
    const w = r.x1 - r.x0, cx = (r.x0 + r.x1) / 2;
    if (r.kind === "bs") {
      const q1 = rooms.find((q) => q.kind === "q" && q.first);
      add({ type: "P", orient: "V", p0: r2(yi1 + 0.15), p1: r2(yi1 + 0.85), q0: q1.x1, q1: r.x0, sill: 0, head: 2.1, desc: "Abrir 1 folha",
            swing: { h: [q1.x1, r2(yi1 + 0.15)], open: 180, closed: 90 } });
      r.door = "L";
      add({ type: "J", orient: "H", p0: r2(cx - 0.3), p1: r2(cx + 0.3), q0: ytop, q1: r2(ytop + t), sill: 1.5, head: 2.1, desc: "Basculante" });
      continue;
    }
    const dw = r.kind === "b" ? 0.7 : 0.8;
    const cand = {
      R: { p0: r2(r.x1 - 0.10 - dw), p1: r2(r.x1 - 0.10), swing: { h: [r2(r.x1 - 0.10), yi1], open: 90, closed: 180 } },
      L: { p0: r2(r.x0 + 0.10), p1: r2(r.x0 + 0.10 + dw), swing: { h: [r2(r.x0 + 0.10), yi1], open: 90, closed: 0 } },
    };
    const ordem = r.kind === "q" && r.first && suite ? ["L", "R"] : ["R", "L"];
    const quer = r.kind === "s" ? (cozSep ? "coz" : "sc") : (cozSep ? "sala" : "sc");
    let lado = ordem.find((l) => regiao(cand[l].p0, cand[l].p1) === quer) || ordem.find((l) => regiao(cand[l].p0, cand[l].p1) !== "parede");
    if (!lado) { lado = ordem[0]; avisos.push(`A porta do ${r.name.toLowerCase()} ficou sobre a parede entre sala e cozinha: ajuste as larguras.`); }
    else if (cozSep && r.kind !== "s" && regiao(cand[lado].p0, cand[lado].p1) === "coz") avisos.push(`A porta do ${r.name.toLowerCase()} abre para a cozinha. Confira o código sanitário ou ajuste as larguras.`);
    r.door = lado;
    add({ type: "P", orient: "H", ...cand[lado], q0: yi0, q1: yi1, sill: 0, head: 2.1, desc: "Abrir 1 folha", room: r.name });
    if (r.kind === "q") {
      const ww = Math.min(1.5, w - 0.6);
      add({ type: "J", orient: "H", p0: r2(cx - ww / 2), p1: r2(cx + ww / 2), q0: ytop, q1: r2(ytop + t), sill: 0.9, head: 2.1, desc: "Correr 2 folhas" });
    } else if (r.kind === "b") {
      add({ type: "J", orient: "H", p0: r2(cx - 0.3), p1: r2(cx + 0.3), q0: ytop, q1: r2(ytop + t), sill: 1.5, head: 2.1, desc: "Basculante" });
    } else if (r.kind === "s") {
      const p1 = r2(r.x1 - 0.10), p0 = r2(p1 - 0.8);
      add({ type: "P", orient: "H", p0, p1, q0: ytop, q1: r2(ytop + t), sill: 0, head: 2.1, desc: "Abrir 1 folha (externa)",
            swing: { h: [p1, ytop], open: 270, closed: 180 } });
    }
  }
  // códigos automáticos por tipo e tamanho: J1, J2… / P1 (entrada), P2… / V1
  const grupos = { J: [], P: [], V: [] };
  for (const o of O) {
    const chave = `${o.w}|${o.hgt}|${o.sill}|${o.desc}`;
    let g = grupos[o.type].find((x) => x.chave === chave);
    if (!g) grupos[o.type].push(g = { chave, w: o.w, hgt: o.hgt, desc: o.desc, itens: [] });
    g.itens.push(o);
  }
  for (const tp of ["J", "P", "V"]) {
    grupos[tp].sort((a, b) => (a.desc.includes("externa") - b.desc.includes("externa")) || (b.w * b.hgt - a.w * a.hgt));
    if (tp === "P") { const i = grupos.P.findIndex((g) => g.itens.some((o) => o.entrada)); if (i > 0) grupos.P.unshift(grupos.P.splice(i, 1)[0]); }
    grupos[tp].forEach((g, n) => g.itens.forEach((o) => (o.code = `${tp}${n + 1}`)));
  }

  // cobertura (duas águas, cumeeira paralela à fachada)
  const tel = TELHAS[S.telha] || TELHAS.ceramica;
  const i = tel.i, b = clamp(num(S.beiral, 0.6), 0.2, 1.5);
  const dv = varanda ? clamp(num(S.dv, 1.8), 1.0, 4) : 0;
  const Y0 = -dv, Y1 = D, Yr = (Y0 + Y1) / 2;
  const zb = r2(H + laje), zw = r2(zb + 0.15);
  const zr = r2(zw + i * (Y1 - Y0) / 2);
  const roofZ = (y) => zw + i * Math.min(y - Y0, Y1 - y);
  if (zw - i * b < 2.2) avisos.push("Beiral baixo (menos de 2,20 m na ponta). Reduza o beiral ou a varanda.");
  const pilares = [];
  if (varanda) {
    const pw = 0.15;
    const xs = [0, W - pw]; if (W > 6.5) xs.push(W / 2 - pw / 2);
    xs.forEach((x0) => pilares.push({ x0: r2(x0), x1: r2(x0 + pw), y0: r2(-dv), y1: r2(-dv + pw) }));
  }

  // terreno e implantação (origem no canto frontal esquerdo do lote)
  const lf = Math.max(3, num(S.lf, 10)), lp = Math.max(5, num(S.lp, 25));
  const rf = Math.max(0, num(S.rf, 4));
  const afEnum = opt(S.afE);
  const afE = afEnum == null ? r2((lf - W) / 2) : afEnum;
  const hx0 = afE, hy0 = r2(rf + dv);
  const recuos = { frontal: rf, esq: r2(afE), dir: r2(lf - afE - W), fundos: r2(lp - hy0 - D) };
  if (recuos.esq < -EPS || recuos.dir < -EPS) avisos.push("A casa não cabe na largura do lote.");
  if (recuos.fundos < -EPS) avisos.push("A casa não cabe na profundidade do lote.");
  const entrada = O.find((o) => o.entrada);
  const portaX = hx0 + (entrada.p0 + entrada.p1) / 2;
  let vaga = null, caminho = null;
  if (S.vaga) {
    const vw = 2.5, vl = 5.0;
    const ladoDir = portaX < lf / 2;
    if (rf >= vl) vaga = ladoDir ? { x0: lf - 0.2 - vw, x1: lf - 0.2, y0: 0, y1: vl } : { x0: 0.2, x1: 0.2 + vw, y0: 0, y1: vl };
    else if (recuos.dir >= vw + 0.2) vaga = { x0: lf - 0.1 - vw, x1: lf - 0.1, y0: 0, y1: vl };
    else if (recuos.esq >= vw + 0.2) vaga = { x0: 0.1, x1: 0.1 + vw, y0: 0, y1: vl };
    else avisos.push("Sem espaço para a vaga de 2,50 × 5,00 m no recuo frontal ou nas laterais.");
  }
  if (rf > 0.3) {
    caminho = { x0: r2(portaX - 0.6), x1: r2(portaX + 0.6), y0: 0, y1: rf };
    if (vaga && caminho.x1 > vaga.x0 && caminho.x0 < vaga.x1) caminho = null;
  }
  const Alote = lf * lp, Afech = W * D, Avar = W * dv, Aproj = W * (D + dv);
  const Apav = (vaga ? (vaga.x1 - vaga.x0) * (vaga.y1 - vaga.y0) : 0) + (caminho ? (caminho.x1 - caminho.x0) * (caminho.y1 - caminho.y0) : 0);
  const Aperm = Math.max(0, Alote - Aproj - Apav);
  const idx = { Alote, Afech, Avar, Aconst: Afech + Avar, Aproj, Apav, Aperm, TO: Aproj / Alote, CA: (Afech + Avar) / Alote, perm: Aperm / Alote };

  const bwc = rooms.find((r) => r.kind === "b");
  const xA = S.corteA === "auto" || S.corteA == null ? r2((bwc.x0 + bwc.x1) / 2 + 0.12) : num(S.corteA, (bwc.x0 + bwc.x1) / 2);
  const yB = S.corteB === "auto" || S.corteB == null ? r2(yi1 + db * 0.55) : num(S.corteB, yi1 + db / 2);

  return {
    S, avisos, t, W, D, yi0, yi1, ytop, ds, db, rooms, O, H, laje, zb, zw, zr, i, b, tel, roofZ, xA, yB,
    varanda, dv, Y0, Y1, Yr, pilares, sala, coz, cozSep,
    lote: { lf, lp, hx0, hy0, recuos, vaga, caminho, calc: Math.max(0, num(S.calc, 2)), norte: num(S.norte, 0) }, idx,
  };
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
  return { X, Y, C };
}

function mergeSegs(segs) {
  const groups = {};
  for (const s of segs) (groups[(s.v ? "v" : "h") + s.k] ||= []).push(s);
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
/* Símbolos comuns                                                     */
/* ------------------------------------------------------------------ */
// o.escala: fator do desenho (ex. 0,2 na situação em 1:500 dentro de folha 1:100) para escrever a medida real
function dimChain(d, pts, k, o) {
  const L = "ARQ-COTA", th = 2.0 * k, tick = 1.2 * k, gap = 1.0 * k, ext = 1.5 * k, f = o.escala || 1;
  const sgn = Math.sign(o.at - o.from) || 1;
  pts = [...new Set(pts.map(r2))].sort((a, b) => a - b);
  if (pts.length < 2) return;
  const P = (a, c) => (o.dir === "h" ? [a, c] : [c, a]);
  d.line(P(pts[0], o.at), P(pts[pts.length - 1], o.at), L);
  pts.forEach((a) => {
    d.line(P(a, o.from + sgn * gap), P(a, o.at + sgn * ext), L);
    const [cx, cy] = P(a, o.at);
    d.line([cx - tick, cy - tick], [cx + tick, cy + tick], L);
  });
  let alterna = 0;
  for (let n = 0; n < pts.length - 1; n++) {
    const len = pts[n + 1] - pts[n];
    if (len < 0.005) continue;
    const s = fmt(len / f), mid = (pts[n] + pts[n + 1]) / 2;
    const narrow = len < th * 0.62 * s.length + 0.6 * k;
    const off = (narrow ? (alterna++ % 2 ? 6.0 : 3.4) : 0.8) * k;
    if (!narrow) alterna = 0;
    if (o.dir === "h") d.text([mid, o.at + (sgn > 0 ? off : -off - th)], th, s, { al: "c", va: "b", layer: L });
    else d.text([o.at + (sgn > 0 ? off + th : -off), mid], th, s, { al: "c", va: "b", rot: 90, layer: L });
  }
}

function nivel(d, x, z, k, label, side = 1) {
  const s = 1.6 * k;
  d.hatch([[[x, z], [x - s * 0.6, z + s], [x + s * 0.6, z + s]]], "SOLID", "ARQ-NIVEL");
  d.line([x - s * 0.6 * side, z], [x + side * 9 * k, z], "ARQ-NIVEL");
  d.text([x + side * 1.2 * k, z + s + 0.6 * k], 2.0 * k, label, { al: side > 0 ? "l" : "r", va: "b", layer: "ARQ-NIVEL" });
}

function titulo(d, x, y, k, nome, esc) {
  d.text([x, y], 4.0 * k, nome, { al: "c", va: "b", layer: "ARQ-TEXTO", bold: true });
  const w = 4.0 * k * 0.62 * nome.length;
  d.line([x - w / 2, y - 1.2 * k], [x + w / 2, y - 1.2 * k], "ARQ-TEXTO");
  d.text([x, y - 2.4 * k], 2.5 * k, esc, { al: "c", va: "t", layer: "ARQ-TEXTO" });
}
const tituloAbaixo = (d, k, nome, esc, x) => { const bb = bbox(d.E); titulo(d, x ?? (bb.x0 + bb.x1) / 2, bb.y0 - 8 * k, k, nome, esc); };

function marcaCorte(d, p, k, letra, dirVec) {
  const R = 3.2 * k;
  d.circle(p, R, "ARQ-CORTE-SIMB");
  d.text(p, 3.0 * k, letra, { al: "c", va: "m", layer: "ARQ-CORTE-SIMB", bold: true });
  const [ux, uy] = dirVec, nx = -uy, ny = ux;
  const bx = p[0] + ux * R, by = p[1] + uy * R;
  d.hatch([[[bx + nx * 1.6 * k, by + ny * 1.6 * k], [bx + ux * 3.2 * k, by + uy * 3.2 * k], [bx - nx * 1.6 * k, by - ny * 1.6 * k]]], "SOLID", "ARQ-CORTE-SIMB");
}

function seta(d, a, b, k, layer) {
  d.line(a, b, layer);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = 2.2 * k;
  const p1 = [b[0] - s * Math.cos(ang - 0.35), b[1] - s * Math.sin(ang - 0.35)], p2 = [b[0] - s * Math.cos(ang + 0.35), b[1] - s * Math.sin(ang + 0.35)];
  d.hatch([[b, p1, p2]], "SOLID", layer);
}

function arcoPorta(d, o, E) {
  const { h, open, closed } = o.swing, r = o.w;
  const ccw = ((closed - open) % 360 + 360) % 360 === 90;
  const [a0, a1] = ccw ? [open, closed] : [closed, open];
  const la = open * Math.PI / 180;
  d.line(h, [h[0] + r * Math.cos(la), h[1] + r * Math.sin(la)], E);
  d.arc(h, r, ((a0 % 360) + 360) % 360, ((a1 % 360) + 360) % 360, E);
  return la;
}

/* ------------------------------------------------------------------ */
/* 2. Planta baixa                                                     */
/* ------------------------------------------------------------------ */
function drawPlan(M, k, esc) {
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
  // esquadrias
  const E = "ARQ-ESQUADRIA";
  for (const o of M.O) {
    const mid = (o.p0 + o.p1) / 2, m = (o.q0 + o.q1) / 2;
    const H = o.orient === "H";
    const P = (p, q) => (H ? [p, q] : [q, p]);
    if (o.type === "J") {
      for (const q of [o.q0, o.q1, m - 0.02, m + 0.02]) d.line(P(o.p0, q), P(o.p1, q), E);
      const fora = o.q0 < EPS ? -1 : 1;
      if (H) d.text([mid, fora < 0 ? o.q0 - 3.0 * k : o.q1 + 1.0 * k], 2.0 * k, o.code, { al: "c", va: "b", layer: "ARQ-TEXTO" });
      else d.text([fora < 0 ? o.q0 - 1.0 * k : o.q1 + 3.0 * k, mid], 2.0 * k, o.code, { al: "c", va: "b", rot: 90, layer: "ARQ-TEXTO" });
    } else if (o.type === "V") {
      d.line(P(o.p0, o.q0), P(o.p1, o.q0), "ARQ-PROJECAO");
      d.line(P(o.p0, o.q1), P(o.p1, o.q1), "ARQ-PROJECAO");
      d.text(H ? [mid, o.q1 + 1.2 * k] : [o.q0 - 1.2 * k, mid], 1.8 * k, o.code, { al: "c", va: "b", rot: H ? 0 : 90, layer: "ARQ-TEXTO" });
    } else if (o.swing) {
      const la = arcoPorta(d, o, E);
      const off = o.w * 0.42;
      const p = H ? [mid, m + Math.sign(Math.sin(la)) * off] : [m + Math.sign(Math.cos(la)) * off, mid];
      d.text(p, 2.0 * k, o.code, { al: "c", va: "m", layer: "ARQ-TEXTO" });
    }
  }
  // varanda
  if (M.varanda) {
    for (const p of M.pilares) d.hrect(p.x0, p.y0, p.x1, p.y1, "SOLID", "ARQ-PILAR", "ARQ-PILAR");
    d.line([0, -M.dv], [M.W, -M.dv], "ARQ-PISO");
    d.line([0, -M.dv], [0, 0], "ARQ-PISO"); d.line([M.W, -M.dv], [M.W, 0], "ARQ-PISO");
    d.text([M.W * 0.72, -M.dv / 2 + 0.6 * k], 2.5 * k, "VARANDA", { al: "c", va: "b", layer: "ARQ-TEXTO", bold: true });
    d.text([M.W * 0.72, -M.dv / 2 - 0.6 * k], 1.8 * k, `A = ${fmt(M.W * M.dv)} m²`, { al: "c", va: "t", layer: "ARQ-TEXTO" });
  }
  // mobiliário
  const F = "ARQ-MOBILIARIO";
  for (const r of M.rooms) {
    const w = r.x1 - r.x0, h = r.y1 - r.y0;
    if (r.kind === "q") {
      const bw = r.first && w >= 2.7 ? 1.38 : 0.88;
      const shift = w > 2.6 ? (r.door === "L" ? 0.25 : -0.25) : 0;
      const cx = (r.x0 + r.x1) / 2 + shift, y1 = r.y1, y0 = y1 - 1.88;
      d.rect(cx - bw / 2, y0, cx + bw / 2, y1, F);
      d.rect(cx - bw / 2 + 0.05, y1 - 0.45, cx + bw / 2 - 0.05, y1 - 0.08, F);
      const temSuite = M.rooms.some((x) => x.kind === "bs") && r.first;
      if (h >= 2.8 && w >= 2.4) {
        const gl = Math.min(1.6, h - 2.1);
        if (r.door !== "L") d.rect(r.x0, r.y0 + 0.15, r.x0 + 0.55, r.y0 + 0.15 + gl, F);
        else if (!temSuite) d.rect(r.x1 - 0.55, r.y0 + 0.95, r.x1, r.y0 + 0.95 + Math.min(gl, h - 2.9), F);
      }
    } else if (r.kind === "b" || r.kind === "bs") {
      const top = r.y1, boxD = Math.min(0.9, h - 1.4);
      d.rect(r.x0, top - boxD, r.x1, top, F);
      d.line([r.x0, top - boxD], [r.x1, top], F);
      d.circle([(r.x0 + r.x1) / 2, top - boxD / 2], 0.05, F);
      const ladoL = r.door !== "L";             // louças na parede oposta à porta
      const xw = ladoL ? r.x0 : r.x1, sg = ladoL ? 1 : -1;
      const vy = r.y0 + Math.min(1.35, h - boxD - 0.45);
      d.rect(Math.min(xw, xw + sg * 0.18), vy - 0.19, Math.max(xw, xw + sg * 0.18), vy + 0.19, F);
      d.circle([xw + sg * 0.40, vy], 0.21, F);
      if (vy - 0.25 > r.y0 + 0.62) {
        d.rect(Math.min(xw, xw + sg * 0.45), r.y0 + 0.12, Math.max(xw, xw + sg * 0.45), r.y0 + 0.62, F);
        d.circle([xw + sg * 0.24, r.y0 + 0.37], 0.14, F);
      }
    } else if (r.kind === "s") {
      d.rect(r.x0, r.y1 - 0.55, r.x0 + 0.55, r.y1, F);
      if (r.x0 + 1.25 <= r.x1 - 0.9) d.rect(r.x0 + 0.65, r.y1 - 0.6, r.x0 + 1.25, r.y1, F);
    }
    if (r.kind === "sc" || r.kind === "coz") {
      const pl = Math.min(1.5, h - 1.5), pc = (r.y0 + r.y1) / 2;
      d.rect(r.x1 - 0.6, pc - pl / 2, r.x1, pc + pl / 2, F);
      d.rect(r.x1 - 0.48, pc - 0.25, r.x1 - 0.08, pc + 0.05, F);
      if (pc - pl / 2 - 0.6 >= r.y0) {
        d.rect(r.x1 - 0.6, pc - pl / 2 - 0.6, r.x1, pc - pl / 2, F);
        [[0.15, 0.15], [0.45, 0.15], [0.15, 0.45], [0.45, 0.45]].forEach(([a, b]) => d.circle([r.x1 - 0.6 + a, pc - pl / 2 - 0.6 + b], 0.08, F));
      }
      if (pc + pl / 2 + 0.75 <= r.y1) d.rect(r.x1 - 0.7, pc + pl / 2 + 0.05, r.x1, pc + pl / 2 + 0.75, F);
    }
    if (r.kind === "sc" || r.kind === "sala") {
      const sl = Math.min(2.1, h - 0.6), cy = (r.y0 + r.y1) / 2;
      d.rect(r.x0, cy - sl / 2, r.x0 + 0.85, cy + sl / 2, F);
      d.rect(r.x0 + 0.2, cy - sl / 2 + 0.2, r.x0 + 0.85, cy + sl / 2 - 0.2, F);
    }
  }
  // textos dos ambientes
  for (const r of M.rooms) {
    const w = r2(r.x1 - r.x0), h = r2(r.y1 - r.y0), A = w * h;
    const banho = r.kind === "b" || r.kind === "bs";
    const dx = banho ? (r.door === "L" ? -0.15 : 0.18) : 0;
    const cx = (r.x0 + r.x1) / 2 + dx, cy = (r.y0 + r.y1) / 2 + (r.kind === "q" ? -0.35 : banho ? -0.1 : 0);
    const hn = (w < 1.9 ? (w < 1.5 ? 1.6 : 2.0) : 2.5) * k;
    d.text([cx, cy + 1.6 * k], hn, r.name, { al: "c", va: "b", layer: "ARQ-TEXTO", bold: true });
    d.text([cx, cy + 0.6 * k], 1.8 * k, `${fmt(w)} x ${fmt(h)}`, { al: "c", va: "t", layer: "ARQ-TEXTO" });
    d.text([cx, cy - 2.0 * k], 1.8 * k, `A = ${fmt(A)} m²`, { al: "c", va: "t", layer: "ARQ-TEXTO" });
  }
  // projeção da cobertura
  const b = M.b;
  d.rect(-b, M.Y0 - b, M.W + b, M.D + b, "ARQ-COBERTURA-PROJ");
  d.line([-b, M.Yr], [M.W + b, M.Yr], "ARQ-COBERTURA-PROJ");
  // cotas
  const o1 = b + 7 * k, o2 = o1 + 7 * k;
  const backPts = [0, M.W]; M.rooms.filter((r) => r.y0 === M.yi1).forEach((r) => backPts.push(r.x0, r.x1));
  dimChain(d, backPts, k, { dir: "h", at: M.D + o1, from: M.D });
  dimChain(d, [0, M.W], k, { dir: "h", at: M.D + o2, from: M.D });
  const frontPts = [0, M.W]; M.O.filter((o) => o.orient === "H" && o.q0 === 0).forEach((o) => frontPts.push(o.p0, o.p1));
  const yF = M.Y0 - o1;
  dimChain(d, frontPts, k, { dir: "h", at: yF, from: M.Y0 });
  const ladoPts = [0, t, M.yi0, M.yi1, M.ytop, M.D]; if (M.varanda) ladoPts.push(M.Y0);
  dimChain(d, ladoPts, k, { dir: "v", at: -o1, from: 0 });
  dimChain(d, [M.Y0, M.D], k, { dir: "v", at: -o2, from: 0 });
  // linhas de corte
  const ext = o2 + 6 * k;
  d.line([M.xA, yF - 4 * k], [M.xA, M.D + ext], "ARQ-CORTE");
  d.line([-ext, M.yB], [M.W + b + 6 * k, M.yB], "ARQ-CORTE");
  marcaCorte(d, [M.xA, M.D + ext + 3.2 * k], k, "A", [-1, 0]);
  marcaCorte(d, [M.xA, yF - 4 * k - 3.2 * k], k, "A", [-1, 0]);
  marcaCorte(d, [-ext - 3.2 * k, M.yB], k, "B", [0, 1]);
  marcaCorte(d, [M.W + b + 6 * k + 3.2 * k, M.yB], k, "B", [0, 1]);
  tituloAbaixo(d, k, "PLANTA BAIXA", `ESC. 1:${esc}`, M.W / 2);
  return d.E;
}

/* ------------------------------------------------------------------ */
/* 3. Cortes                                                           */
/* ------------------------------------------------------------------ */
function cutLine(M, axis, pos) {
  const G = grid(M), { X, Y, C } = G, out = [];
  const A = axis === "x" ? X : Y;
  if (A.some((v) => Math.abs(v - pos) < 1e-4)) pos += 0.02;
  if (axis === "x") {
    const i = X.findIndex((v, n) => n < X.length - 1 && pos > v && pos < X[n + 1]);
    for (let j = 0; j < Y.length - 1; j++) out.push({ s0: Y[j], s1: Y[j + 1], ...C[i][j] });
  } else {
    const j = Y.findIndex((v, n) => n < Y.length - 1 && pos > v && pos < Y[n + 1]);
    for (let i = 0; i < X.length - 1; i++) out.push({ s0: X[i], s1: X[i + 1], ...C[i][j] });
  }
  const m = [];
  for (const s of out) {
    const l = m[m.length - 1];
    if (l && l.c === s.c && l.o === s.o && l.room === s.room) l.s1 = s.s1; else m.push({ ...s });
  }
  return m;
}

function drawSection(M, axis, k, esc) {
  const d = new Draw(), pos = axis === "x" ? M.xA : M.yB, L = axis === "x" ? M.D : M.W;
  const segs = cutLine(M, axis, pos), H = M.H, b = M.b, hs = 0.9 * k;
  const AL = "ARQ-HACH-ALVEN", CO = "ARQ-HACH-CONCR", P = "ARQ-PAREDE";
  const s0 = axis === "x" ? M.Y0 : 0;
  d.line([s0 - b - 1.0, -0.10], [s0, -0.10], "ARQ-TERRENO");
  d.line([L, -0.10], [L + b + 1.0, -0.10], "ARQ-TERRENO");
  d.hrect(s0, -0.10, L, 0, "ANSI37", CO, null, hs * 1.6);
  d.line([s0, 0], [L, 0], "ARQ-PISO"); d.line([s0, -0.10], [L, -0.10], "ARQ-PISO");
  if (s0 < 0) d.line([s0, -0.10], [s0, 0], "ARQ-PISO");
  const struct = [];
  for (const s of segs) if (s.c !== 0) { const l = struct[struct.length - 1]; if (l && Math.abs(l.s1 - s.s0) < 1e-6) l.s1 = s.s1; else struct.push({ s0: s.s0, s1: s.s1 }); }
  for (const s of struct) d.hrect(s.s0 - 0.025, -0.50, s.s1 + 0.025, -0.10, "ANSI37", CO, P, hs * 1.6);
  for (const s of segs) {
    if (s.c === 1) d.hrect(s.s0, -0.10, s.s1, H, "ANSI31", AL, P, hs);
    else if (s.c === 2) {
      const o = s.o;
      if (o.type !== "J") { d.hrect(s.s0, o.head, s.s1, H, "ANSI31", AL, P, hs); d.line([s.s0, 0], [s.s1, 0], P); }
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
  d.hrect(0, H, L, M.zb, "ANSI37", CO, P, hs * 1.6);
  for (const s of segs.filter((x) => x.room)) {
    const r = s.room, mid = (s.s0 + s.s1) / 2;
    d.text([mid, 1.35], (s.s1 - s.s0 < 1.6 ? 1.8 : 2.2) * k, r.name, { al: "c", va: "m", layer: "ARQ-TEXTO", bold: true });
    if (r.kind === "b" || r.kind === "bs" || r.kind === "s") {
      d.line([s.s0, 1.5], [s.s1, 1.5], "ARQ-VISTA");
      if (s.s1 - s.s0 > 1.3) d.text([mid, 1.5 + 0.8 * k], 1.6 * k, "REV. CERÂMICO h=1,50", { al: "c", va: "b", layer: "ARQ-TEXTO" });
    }
    for (const o of M.O) {
      let onWall = false;
      if (axis === "y" && o.orient === "H" && Math.abs(o.q0 - r.y1) < 1e-6) onWall = true;
      if (axis === "x" && o.orient === "V" && Math.abs(o.q1 - r.x0) < 1e-6) onWall = true;
      if (!onWall) continue;
      const a = Math.max(o.p0, s.s0), c = Math.min(o.p1, s.s1);
      if (c - a < 0.05) continue;
      d.rect(a, o.sill, c, o.head, "ARQ-VISTA");
      if (o.type === "J") { d.rect(a + 0.05, o.sill + 0.05, c - 0.05, o.head - 0.05, "ARQ-VISTA"); if (o.desc.startsWith("Correr")) d.line([(a + c) / 2, o.sill + 0.05], [(a + c) / 2, o.head - 0.05], "ARQ-VISTA"); }
      else if (o.type === "P") d.rect(a + 0.05, 0, c - 0.05, o.head - 0.05, "ARQ-VISTA");
    }
  }
  const i = M.i, zw = M.zw, th = 0.05, TL = "ARQ-COBERTURA";
  if (axis === "x") {
    const pts = [[M.Y0 - b, zw - i * b], [M.Yr, M.zr], [M.D + b, zw - i * b]];
    const up = pts.map(([s, z]) => [s, z + th]);
    d.hatch([[...pts, ...up.slice().reverse()]], "SOLID", TL);
    d.poly([...pts, ...up.slice().reverse()], true, TL);
    const oit = M.Yr > 0 ? [[0, M.zb], [0, M.roofZ(0)], [M.Yr, M.zr], [M.D, M.zw], [M.D, M.zb]] : [[0, M.zb], [0, M.roofZ(0)], [M.D, M.zw], [M.D, M.zb]];
    d.poly(oit, false, "ARQ-VISTA");
    if (M.varanda) {
      d.rect(M.Y0, 0, M.Y0 + 0.15, M.roofZ(M.Y0 + 0.15), "ARQ-VISTA");
      d.text([M.Y0 + M.dv / 2 + 0.1, 1.35], 2.0 * k, "VARANDA", { al: "c", va: "m", layer: "ARQ-TEXTO", bold: true });
    }
    const ty = M.Y0 + (M.Yr - M.Y0) * 0.45;
    d.text([ty, M.roofZ(ty) + th + 3 * k], 1.8 * k, `${M.tel.nome} i=${Math.round(i * 100)}%`, { al: "c", va: "b", rot: Math.atan(i) * 180 / Math.PI, layer: "ARQ-TEXTO" });
  } else {
    const zc = M.roofZ(M.yB);
    d.hrect(-b, zc, M.W + b, zc + th, "SOLID", TL, TL);
    d.hrect(0, M.zb, M.t, zc, "ANSI31", AL, P, hs);
    d.hrect(M.W - M.t, M.zb, M.W, zc, "ANSI31", AL, P, hs);
    if (M.yB > M.Yr) {
      const ze = zw - i * b;
      d.line([-b, ze], [M.W + b, ze], "ARQ-VISTA");
      d.line([-b, ze], [-b, zc], "ARQ-VISTA"); d.line([M.W + b, ze], [M.W + b, zc], "ARQ-VISTA");
    } else {
      d.line([-b, M.zr], [M.W + b, M.zr], "ARQ-VISTA");
      d.line([-b, zc + th], [-b, M.zr], "ARQ-VISTA"); d.line([M.W + b, zc + th], [M.W + b, M.zr], "ARQ-VISTA");
    }
    d.text([M.W / 2, zc + th + 1.0 * k], 1.8 * k, `${M.tel.nome} i=${Math.round(i * 100)}%`, { al: "c", va: "b", layer: "ARQ-TEXTO" });
  }
  const nx = s0 - b - 0.9;
  nivel(d, nx, 0, k, "±0,00", -1);
  nivel(d, nx, H, k, fmtNivel(H) + " (forro)", -1);
  d.text([s0 - b - 0.2, -0.10 - 1.0 * k], 1.8 * k, "TERRENO " + fmtNivel(-0.10), { al: "r", va: "t", layer: "ARQ-NIVEL" });
  const vx = L + b + 1.0 + 4 * k;
  const zTop = axis === "x" ? M.zr : M.roofZ(M.yB);
  dimChain(d, [0, H, M.zb, zTop], k, { dir: "v", at: vx, from: L + b + 1.0 });
  const hp = []; struct.forEach((s) => hp.push(s.s0, s.s1));
  if (axis === "x" && M.varanda) hp.push(M.Y0);
  dimChain(d, hp.concat([0, L]), k, { dir: "h", at: -0.50 - 6 * k, from: -0.50 });
  tituloAbaixo(d, k, axis === "x" ? "CORTE AA" : "CORTE BB", `ESC. 1:${esc}`, (s0 + L) / 2);
  return d.E;
}

/* ------------------------------------------------------------------ */
/* 4. Fachadas                                                         */
/* ------------------------------------------------------------------ */
function drawFacade(M, k, lado, esc) {
  const d = new Draw(), b = M.b, i = M.i, zw = M.zw, ze = zw - i * b, th = 0.05;
  const E = "ARQ-ESQUADRIA", TL = "ARQ-COBERTURA";
  const cfg = {
    frente:   { s: (x) => x, nome: "FACHADA FRONTAL" },
    fundos:   { s: (x) => M.W - x, nome: "FACHADA POSTERIOR" },
    direita:  { s: (y) => y, nome: "FACHADA LATERAL DIREITA" },
    esquerda: { s: (y) => M.D - y, nome: "FACHADA LATERAL ESQUERDA" },
  }[lado];
  const S = cfg.s;
  const longa = lado === "frente" || lado === "fundos";
  const r0 = longa ? -b : Math.min(S(M.Y0 - b), S(M.D + b)), r1 = longa ? M.W + b : Math.max(S(M.Y0 - b), S(M.D + b));
  d.line([r0 - 1.0, -0.10], [r1 + 1.0, -0.10], "ARQ-TERRENO");
  if (longa) {
    d.poly([[0, -0.10], [0, ze], [M.W, ze], [M.W, -0.10]], false, "ARQ-PAREDE");
    d.hrect(-b, ze, M.W + b, M.zr, "ANSI31", TL, TL, 0.9 * k * 1.6, 45);
    d.rect(-b, ze - 0.15, M.W + b, ze, TL);
  } else {
    const ys = [0, M.D]; if (M.Yr > 0 && M.Yr < M.D) ys.splice(1, 0, M.Yr);
    const topo = ys.map((y) => [S(y), M.roofZ(y)]);
    d.poly([[S(0), -0.10], ...topo, [S(M.D), -0.10]], false, "ARQ-PAREDE");
    const beir = [[S(M.Y0 - b), zw - i * b], [S(M.Yr), M.zr], [S(M.D + b), zw - i * b]];
    const up = beir.map(([s, z]) => [s, z + th]);
    d.hatch([[...beir, ...up.slice().reverse()]], "SOLID", TL);
    d.poly([...beir, ...up.slice().reverse()], true, TL);
    d.line([S(0), M.zb], [S(M.D), M.zb], "ARQ-VISTA");
  }
  const naParede = (o) => lado === "frente" ? o.orient === "H" && o.q0 < EPS
    : lado === "fundos" ? o.orient === "H" && o.q1 > M.D - EPS
    : lado === "direita" ? o.orient === "V" && o.q1 > M.W - EPS
    : o.orient === "V" && o.q0 < EPS;
  for (const o of M.O.filter(naParede)) {
    const a = Math.min(S(o.p0), S(o.p1)), c = Math.max(S(o.p0), S(o.p1));
    if (o.type === "J") {
      d.rect(a, o.sill, c, o.head, E);
      d.rect(a + 0.05, o.sill + 0.05, c - 0.05, o.head - 0.05, E);
      if (o.desc.startsWith("Correr")) d.line([(a + c) / 2, o.sill + 0.05], [(a + c) / 2, o.head - 0.05], E);
      else d.line([a + 0.05, (o.sill + o.head) / 2], [c - 0.05, (o.sill + o.head) / 2], E);
      d.rect(a - 0.05, o.sill - 0.04, c + 0.05, o.sill, E);
    } else {
      d.rect(a, 0, c, o.head, E);
      d.rect(a + 0.05, 0, c - 0.05, o.head - 0.05, E);
      d.circle([c - 0.15, 1.05], 0.03, E);
    }
  }
  if (M.varanda) {
    if (lado === "frente") {
      for (const p of M.pilares) d.rect(S(p.x0), 0, S(p.x1), ze, "ARQ-PILAR");
      d.line([0, 0], [M.W, 0], "ARQ-PISO");
    } else if (!longa) {
      const ps = lado === "direita" ? M.pilares.filter((p) => p.x1 > M.W - EPS) : M.pilares.filter((p) => p.x0 < EPS);
      for (const p of ps) { const a = Math.min(S(p.y0), S(p.y1)), c = Math.max(S(p.y0), S(p.y1)); d.rect(a, 0, c, M.roofZ(p.y0 + 0.15), "ARQ-PILAR"); }
      d.line([S(M.Y0), 0], [S(0), 0], "ARQ-PISO");
    }
  }
  const base = longa ? [0, M.W] : [S(0), S(M.D)];
  if (!longa && M.varanda) base.push(S(M.Y0));
  dimChain(d, base, k, { dir: "h", at: -0.10 - 6 * k, from: -0.10 });
  dimChain(d, longa ? [-0.10, ze, M.zr] : [-0.10, M.zb, M.zr], k, { dir: "v", at: r1 + 6 * k, from: r1 });
  tituloAbaixo(d, k, cfg.nome, `ESC. 1:${esc}`, (Math.min(...base) + Math.max(...base)) / 2);
  return d.E;
}

/* ------------------------------------------------------------------ */
/* 5. Cobertura, implantação e situação                                */
/* ------------------------------------------------------------------ */
function drawCobertura(M, k, esc) {
  const d = new Draw(), b = M.b, TL = "ARQ-COBERTURA";
  const x0 = -b, x1 = M.W + b, y0 = M.Y0 - b, y1 = M.D + b;
  d.hatch([[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]], "ANSI31", TL, 0.9 * k * 1.6, 45);
  d.rect(x0, y0, x1, y1, TL);
  d.line([x0, M.Yr], [x1, M.Yr], TL);
  d.rect(0, 0, M.W, M.D, "ARQ-PROJECAO");
  if (M.varanda) for (const p of M.pilares) d.rect(p.x0, p.y0, p.x1, p.y1, "ARQ-PROJECAO");
  const lab = `i=${Math.round(M.i * 100)}%`;
  for (const [ya, yb] of [[M.Yr - 0.4, (y0 + M.Yr) / 2 - 0.2], [M.Yr + 0.4, (y1 + M.Yr) / 2 + 0.2]]) {
    seta(d, [M.W * 0.3, ya], [M.W * 0.3, yb], k, TL);
    d.text([M.W * 0.3 + 1.5 * k, (ya + yb) / 2], 2.2 * k, lab, { al: "l", va: "m", layer: "ARQ-TEXTO", bold: true });
  }
  d.text([M.W * 0.66, M.Yr + 1.5 * k], 2.0 * k, "CUMEEIRA", { al: "c", va: "b", layer: "ARQ-TEXTO" });
  d.text([M.W / 2, y0 + 3 * k], 2.2 * k, `${M.tel.nome} · BEIRAL ${fmt(b)} m`, { al: "c", va: "b", layer: "ARQ-TEXTO", bold: true });
  dimChain(d, [x0, 0, M.W, x1], k, { dir: "h", at: y1 + 7 * k, from: y1 });
  dimChain(d, [y0, M.Y0, M.Yr, M.D, y1].filter((v, n, a) => a.indexOf(v) === n), k, { dir: "v", at: x1 + 7 * k, from: x1 });
  tituloAbaixo(d, k, "PLANTA DE COBERTURA", `ESC. 1:${esc}`, M.W / 2);
  return d.E;
}

function rosaNorte(d, c, k, ang) {
  const R = 6 * k, a = (90 - ang) * Math.PI / 180;
  d.circle(c, R, "ARQ-TEXTO");
  const tip = [c[0] + R * 1.25 * Math.cos(a), c[1] + R * 1.25 * Math.sin(a)];
  const l = [c[0] + R * 0.45 * Math.cos(a + 2.4), c[1] + R * 0.45 * Math.sin(a + 2.4)];
  const r = [c[0] + R * 0.45 * Math.cos(a - 2.4), c[1] + R * 0.45 * Math.sin(a - 2.4)];
  d.hatch([[tip, l, c]], "SOLID", "ARQ-TEXTO");
  d.poly([tip, l, c, r], true, "ARQ-TEXTO");
  d.text([c[0] + R * 1.9 * Math.cos(a), c[1] + R * 1.9 * Math.sin(a)], 3.0 * k, "N", { al: "c", va: "m", layer: "ARQ-TEXTO", bold: true });
}

function drawImplantacao(M, k, esc) {
  const d = new Draw(), L = M.lote, { lf, lp, hx0, hy0, recuos } = L;
  const H = (x, y) => [hx0 + x, hy0 + y];
  const cw = L.calc;
  if (cw > 0) {
    d.rect(-2, -cw, lf + 2, 0, "ARQ-PASSEIO");
    const portaLote = L.hx0 + (M.O.find((o) => o.entrada).p0 + M.O.find((o) => o.entrada).p1) / 2;
    d.text([portaLote < lf / 2 ? lf * 0.78 : lf * 0.22, -cw / 2], 2.0 * k, "PASSEIO", { al: "c", va: "m", layer: "ARQ-TEXTO" });
  }
  d.line([-3, -cw - 0.15], [lf + 3, -cw - 0.15], "ARQ-PASSEIO");
  d.text([lf / 2, -cw - 4 * k], 3.0 * k, (M.S.rua || "RUA").toUpperCase(), { al: "c", va: "t", layer: "ARQ-TEXTO", bold: true });
  // área permeável = lote − edificação − pisos
  const lot = [[0, 0], [lf, 0], [lf, lp], [0, lp]];
  const furos = [[H(0, M.Y0), H(M.W, M.Y0), H(M.W, M.D), H(0, M.D)]];
  if (L.vaga) furos.push([[L.vaga.x0, L.vaga.y0], [L.vaga.x1, L.vaga.y0], [L.vaga.x1, L.vaga.y1], [L.vaga.x0, L.vaga.y1]]);
  if (L.caminho) furos.push([[L.caminho.x0, L.caminho.y0], [L.caminho.x1, L.caminho.y0], [L.caminho.x1, L.caminho.y1 - 0.001], [L.caminho.x0, L.caminho.y1 - 0.001]]);
  const dentro = (f) => f.every(([x, y]) => x >= -EPS && y >= -EPS && x <= lf + EPS && y <= lp + EPS);
  if (furos.every(dentro)) d.hatch([lot, ...furos], "DOTS", "ARQ-PERMEAVEL", 4 * k);
  d.poly(lot, true, "ARQ-LOTE");
  d.poly([H(0, 0), H(M.W, 0), H(M.W, M.D), H(0, M.D)], true, "ARQ-PAREDE");
  d.hatch([[H(0, 0), H(M.W, 0), H(M.W, M.D), H(0, M.D)]], "ANSI31", "ARQ-HACH-ALVEN", 0.9 * k * 2);
  if (M.varanda) {
    d.poly([H(0, M.Y0), H(M.W, M.Y0), H(M.W, 0), H(0, 0)], true, "ARQ-PISO");
    for (const p of M.pilares) d.hrect(...H(p.x0, p.y0), ...H(p.x1, p.y1), "SOLID", "ARQ-PILAR", "ARQ-PILAR");
  }
  d.rect(...H(-M.b, M.Y0 - M.b), ...H(M.W + M.b, M.D + M.b), "ARQ-COBERTURA-PROJ");
  const cx = hx0 + M.W / 2, cy = hy0 + M.D / 2;
  const nq = M.rooms.filter((r) => r.kind === "q").length;
  d.text([cx, cy + 1.2 * k], 2.5 * k, `CASA TÉRREA · ${nq} QUARTO${nq > 1 ? "S" : ""}`, { al: "c", va: "b", layer: "ARQ-TEXTO", bold: true });
  d.text([cx, cy - 1.2 * k], 2.0 * k, `A. CONSTRUÍDA = ${fmt(M.idx.Aconst)} m² · PISO +0,10`, { al: "c", va: "t", layer: "ARQ-TEXTO" });
  if (L.vaga) {
    const v = L.vaga;
    d.rect(v.x0, v.y0, v.x1, v.y1, "ARQ-PISO");
    d.line([v.x0, v.y0], [v.x1, v.y1], "ARQ-PISO"); d.line([v.x1, v.y0], [v.x0, v.y1], "ARQ-PISO");
    d.text([(v.x0 + v.x1) / 2, v.y1 - 1.5 * k], 1.8 * k, "VAGA 2,50 x 5,00", { al: "c", va: "t", layer: "ARQ-TEXTO", bold: true });
  }
  if (L.caminho) { const c = L.caminho; d.rect(c.x0, c.y0, c.x1, c.y1, "ARQ-PISO"); }
  const ax = L.caminho ? (L.caminho.x0 + L.caminho.x1) / 2 : L.vaga ? (L.vaga.x0 + L.vaga.x1) / 2 : lf / 2;
  seta(d, [ax, -cw - 0.4], [ax, Math.min(0.9, hy0 + M.Y0 - 0.2)], k, "ARQ-TEXTO");
  d.text([ax + 1.5 * k, -cw / 2 + 0.1], 1.8 * k, "ACESSO", { al: "l", va: "b", layer: "ARQ-TEXTO" });
  const o1 = 7 * k, o2 = 14 * k;
  dimChain(d, [0, hx0, hx0 + M.W, lf].filter((v) => v >= -EPS && v <= lf + EPS), k, { dir: "h", at: lp + o1, from: lp });
  dimChain(d, [0, lf], k, { dir: "h", at: lp + o2, from: lp });
  const ladoPts = [0, hy0 + M.Y0, hy0, hy0 + M.D, lp].filter((v, n, a) => a.indexOf(v) === n && v >= -EPS && v <= lp + EPS);
  dimChain(d, ladoPts, k, { dir: "v", at: lf + o1, from: lf });
  dimChain(d, [0, lp], k, { dir: "v", at: lf + o2, from: lf });
  const rt = (p, s, rot = 0) => d.text(p, 1.8 * k, s, { al: "c", va: "m", rot, layer: "ARQ-TEXTO" });
  if (recuos.frontal > 1.2) rt([hx0 + M.W / 2, (hy0 + M.Y0) / 2 + 2 * k], `RECUO FRONTAL ${fmt(recuos.frontal)}`);
  if (recuos.fundos > 1.2) rt([hx0 + M.W / 2, (hy0 + M.D + lp) / 2], `RECUO DE FUNDOS ${fmt(recuos.fundos)}`);
  if (recuos.esq > 0.5) rt([hx0 / 2, cy], `AFAST. ${fmt(recuos.esq)}`, 90);
  if (recuos.dir > 0.5) rt([(hx0 + M.W + lf) / 2, cy], `AFAST. ${fmt(recuos.dir)}`, 90);
  const ident = [M.S.lote && `LOTE ${M.S.lote}`, M.S.quadra && `QUADRA ${M.S.quadra}`].filter(Boolean).join(" · ");
  d.text([lf / 2, lp + o2 + 9 * k], 2.2 * k, `${ident ? ident + " · " : ""}TERRENO ${fmt(lf)} x ${fmt(lp)} = ${fmt(M.idx.Alote)} m²`, { al: "c", va: "b", layer: "ARQ-TEXTO", bold: true });
  rosaNorte(d, [-14 * k, lp - 10 * k], k, M.lote.norte);
  const lx = -3, ly = -cw - 12 * k;
  d.hrect(lx, ly - 3 * k, lx + 6 * k, ly, "DOTS", "ARQ-PERMEAVEL", "ARQ-PERMEAVEL", 4 * k);
  d.text([lx + 8 * k, ly - 1.5 * k], 1.8 * k, `ÁREA PERMEÁVEL = ${fmt(M.idx.Aperm)} m² (${fmt(M.idx.perm * 100, 1)}%)`, { al: "l", va: "m", layer: "ARQ-TEXTO" });
  tituloAbaixo(d, k, "IMPLANTAÇÃO", `ESC. 1:${esc}`, lf / 2);
  return d.E;
}

function drawSituacao(M, k, escFolha) {
  const escS = escFolha <= 125 ? 500 : 1000, f = escFolha / escS;
  const d = new Draw(), L = M.lote, lf = L.lf, lp = L.lp, rua = 12;
  const esq = opt(M.S.esquina), temEsq = esq != null && esq >= 0;
  const nEsq = temEsq ? Math.min(6, Math.floor(esq / lf + 1e-6)) : 2;
  const xIni = temEsq ? -esq : -2 * lf, xFim = 3 * lf;
  for (let n = 0; n < nEsq; n++) d.rect(-(n + 1) * lf, 0, -n * lf, lp, "ARQ-PROJECAO");
  if (temEsq && esq > nEsq * lf + 0.01) d.rect(xIni, 0, -nEsq * lf, lp, "ARQ-PROJECAO");
  for (let n = 1; n <= 2; n++) d.rect(n * lf, 0, (n + 1) * lf, lp, "ARQ-PROJECAO");
  d.hrect(0, 0, lf, lp, "ANSI31", "ARQ-LOTE", "ARQ-LOTE", 0.9 * k * 1.5 / f);
  d.line([xIni, lp], [xFim, lp], "ARQ-PASSEIO");
  d.line([xIni - (temEsq ? rua : 6), -rua], [xFim + 6, -rua], "ARQ-PASSEIO");
  d.line([xIni - (temEsq ? 0 : 6), 0], [xFim + 6, 0], "ARQ-PASSEIO");
  if (temEsq) {
    d.line([xIni, 0], [xIni, lp + 6], "ARQ-PASSEIO");
    d.line([xIni - rua, -rua], [xIni - rua, lp + 6], "ARQ-PASSEIO");
  }
  const d2 = new Draw(); d2.E = transform(d.E, (p) => [p[0] * f, p[1] * f], f);
  d2.text([(xIni + xFim) / 2 * f, -rua / 2 * f], 2.2 * k, (M.S.rua || "RUA").toUpperCase(), { al: "c", va: "m", layer: "ARQ-TEXTO", bold: true });
  if (temEsq) d2.text([(xIni - rua / 2) * f, lp / 2 * f], 2.2 * k, (M.S.ruaLat || "RUA LATERAL").toUpperCase(), { al: "c", va: "m", rot: 90, layer: "ARQ-TEXTO", bold: true });
  d2.text([lf / 2 * f, lp * f + 2 * k], 2.0 * k, M.S.lote ? `LOTE ${M.S.lote}` : "LOTE", { al: "c", va: "b", layer: "ARQ-TEXTO", bold: true });
  if (M.S.quadra) d2.text([(xIni + xFim) / 2 * f, lp * f + 6 * k], 2.0 * k, `QUADRA ${M.S.quadra}`, { al: "c", va: "b", layer: "ARQ-TEXTO" });
  if (temEsq && esq > 0) dimChain(d2, [xIni * f, 0], k, { dir: "h", at: -rua * f - 5 * k, from: -rua * f, escala: f });
  const bairro = [M.S.bairro, M.S.cidade].filter(Boolean).join(" · ");
  if (bairro) d2.text([(xIni + xFim) / 2 * f, -rua * f - 12 * k], 2.0 * k, bairro.toUpperCase(), { al: "c", va: "t", layer: "ARQ-TEXTO" });
  rosaNorte(d2, [xFim * f + 12 * k, lp * f - 6 * k], k, M.lote.norte);
  tituloAbaixo(d2, k, "SITUAÇÃO", `ESC. 1:${escS}`, (xIni + xFim) / 2 * f);
  return d2.E;
}

/* ------------------------------------------------------------------ */
/* 6. Quadros e carimbo                                                */
/* ------------------------------------------------------------------ */
function tabela(d, x0, w, k, head, cols, data, boldRows = []) {
  const rh = 4.5 * k, T = "PRANCHA-TEXTO", C = "PRANCHA-CARIMBO";
  const h = (data.length + 2) * rh;
  d.rect(x0, -h, x0 + w, 0, C);
  d.text([x0 + w / 2, -rh / 2], 2.2 * k, head, { al: "c", va: "m", layer: T, bold: true });
  d.line([x0, -rh], [x0 + w, -rh], C);
  const xs = [x0]; let cx = x0; cols.forEach((c) => { cx += c.w; xs.push(cx); });
  cols.forEach((c, n) => d.text([xs[n] + 1 * k, -rh * 1.5], 1.8 * k, c.t, { al: "l", va: "m", layer: T, bold: true }));
  d.line([x0, -2 * rh], [x0 + w, -2 * rh], C);
  xs.slice(1, -1).forEach((x) => d.line([x, -rh], [x, -h], C));
  data.forEach((row, n) => {
    row.forEach((v, m) => d.text([xs[m] + 1 * k, -rh * (2.5 + n)], 1.8 * k, v, { al: "l", va: "m", layer: T, bold: boldRows.includes(n) || v === "NÃO ATENDE" }));
    if (n < data.length - 1) d.line([x0, -rh * (3 + n)], [x0 + w, -rh * (3 + n)], C);
  });
  return h;
}

function drawQuadros(M, k) {
  const d = new Draw();
  const rows = M.rooms.map((r) => [r.name, fmt((r.x1 - r.x0) * (r.y1 - r.y0))]);
  if (M.varanda) rows.push(["VARANDA", fmt(M.idx.Avar)]);
  const util = M.rooms.reduce((a, r) => a + (r.x1 - r.x0) * (r.y1 - r.y0), 0) + M.idx.Avar;
  rows.push(["ÁREA ÚTIL", fmt(util)], ["ÁREA CONSTRUÍDA", fmt(M.idx.Aconst)]);
  const w1 = 70 * k;
  tabela(d, 0, w1, k, "QUADRO DE ÁREAS (m²)", [{ t: "AMBIENTE", w: 48 * k }, { t: "ÁREA", w: 22 * k }], rows, [rows.length - 2, rows.length - 1]);
  const by = {};
  for (const o of M.O) (by[o.code] ||= { o, n: 0 }).n++;
  const esq = Object.values(by).sort((a, b) => a.o.code[0].localeCompare(b.o.code[0]) || +a.o.code.slice(1) - +b.o.code.slice(1))
    .map(({ o, n }) => [o.code, o.desc, `${fmt(o.w)} x ${fmt(o.hgt)}`, o.type === "J" ? fmt(o.sill) : "-", String(n)]);
  const x2 = w1 + 8 * k, w2 = 100 * k;
  tabela(d, x2, w2, k, "QUADRO DE ESQUADRIAS", [{ t: "CÓD.", w: 12 * k }, { t: "TIPO", w: 34 * k }, { t: "L x H (m)", w: 22 * k }, { t: "PEIT.", w: 16 * k }, { t: "QTD", w: 16 * k }], esq);
  return d.E;
}

export function indices(M) {
  const S = M.S, I = M.idx, R = M.lote.recuos;
  const chk = (val, lim, tipo) => {
    if (lim == null) return "";
    return (tipo === "max" ? val <= lim + 1e-9 : val >= lim - 1e-9) ? "ATENDE" : "NÃO ATENDE";
  };
  const toMax = opt(S.toMax), caMax = opt(S.caMax), permMin = opt(S.permMin), rfMin = opt(S.rfMin), rlMin = opt(S.rlMin), rfuMin = opt(S.rfuMin);
  return [
    { nome: "Área do terreno", val: `${fmt(I.Alote)} m²`, lim: "", st: "" },
    { nome: "Área construída", val: `${fmt(I.Aconst)} m²`, lim: "", st: "" },
    { nome: "Área de projeção", val: `${fmt(I.Aproj)} m²`, lim: "", st: "" },
    { nome: "Taxa de ocupação", val: `${fmt(I.TO * 100, 1)}%`, lim: toMax == null ? "" : `máx. ${fmt(toMax, 1)}%`, st: chk(I.TO * 100, toMax, "max") },
    { nome: "Coef. de aproveitamento", val: fmt(I.CA, 2), lim: caMax == null ? "" : `máx. ${fmt(caMax, 2)}`, st: chk(I.CA, caMax, "max") },
    { nome: "Área permeável", val: `${fmt(I.Aperm)} m² (${fmt(I.perm * 100, 1)}%)`, lim: permMin == null ? "" : `mín. ${fmt(permMin, 1)}%`, st: chk(I.perm * 100, permMin, "min") },
    { nome: "Recuo frontal", val: `${fmt(R.frontal)} m`, lim: rfMin == null ? "" : `mín. ${fmt(rfMin)} m`, st: chk(R.frontal, rfMin, "min") },
    { nome: "Afastamentos laterais", val: `${fmt(R.esq)} / ${fmt(R.dir)} m`, lim: rlMin == null ? "" : `mín. ${fmt(rlMin)} m`, st: chk(Math.min(R.esq, R.dir), rlMin, "min") },
    { nome: "Recuo de fundos", val: `${fmt(R.fundos)} m`, lim: rfuMin == null ? "" : `mín. ${fmt(rfuMin)} m`, st: chk(R.fundos, rfuMin, "min") },
  ];
}

function drawIndices(M, k) {
  const d = new Draw();
  const rows = indices(M).map((r) => [r.nome.toUpperCase(), r.val, r.lim || "-", r.st || "-"]);
  tabela(d, 0, 178 * k, k, "QUADRO DE ÍNDICES URBANÍSTICOS", [{ t: "ÍNDICE", w: 58 * k }, { t: "PROJETO", w: 46 * k }, { t: "LIMITE (LEI)", w: 40 * k }, { t: "SITUAÇÃO", w: 34 * k }], rows);
  d.text([0, -(rows.length + 2) * 4.5 * k - 2 * k], 1.6 * k, "Limites informados pelo usuário conforme a lei de uso e ocupação do solo do município. Pisos considerados: vaga e caminho de acesso.", { al: "l", va: "t", layer: "PRANCHA-TEXTO" });
  return d.E;
}

const CARIMBO_W = 178, CARIMBO_H = 62;
function drawCarimbo(M, k, fmtNome, escala, folha, conteudo) {
  const d = new Draw(), S = M.S, C = "PRANCHA-CARIMBO", T = "PRANCHA-TEXTO";
  const W = CARIMBO_W * k, H = CARIMBO_H * k, u = k;
  const lab = (x, y, s) => d.text([x + 1.2 * u, y - 1.2 * u], 1.6 * u, s, { al: "l", va: "t", layer: T });
  const val = (x, y, s, h = 2.6, bold = false) => d.text([x + 1.2 * u, y + 1.4 * u], h * u, s, { al: "l", va: "b", layer: T, bold });
  d.rect(0, 0, W, H, "PRANCHA");
  const rows = [H, H - 16 * u, H - 24 * u, H - 32 * u, H - 40 * u, H - 49 * u, 0];
  rows.slice(1, -1).forEach((y) => d.line([0, y], [W, y], C));
  d.line([42 * u, H], [42 * u, rows[1]], C);
  d.text([21 * u, H - 6.2 * u], 3.6 * u, "FOSTER CALC", { al: "c", va: "m", layer: T, bold: true });
  d.text([21 * u, H - 11.2 * u], 1.7 * u, "Planta IA · estudo gerado", { al: "c", va: "m", layer: T });
  const nq = M.rooms.filter((r) => r.kind === "q").length;
  const tit = (S.titulo || `CASA TÉRREA - ${nq} QUARTO${nq > 1 ? "S" : ""}`).toUpperCase().slice(0, 44);
  lab(42 * u, H, "PROJETO ARQUITETÔNICO");
  val(42 * u, rows[1] + 1 * u, tit, 4.0, true);
  lab(0, rows[1], "CONTEÚDO"); val(0, rows[2], conteudo, 2.2);
  lab(0, rows[2], "PROPRIETÁRIO"); val(0, rows[3], (S.proprietario || "").toUpperCase().slice(0, 70), 2.6);
  lab(0, rows[3], "ENDEREÇO DA OBRA"); val(0, rows[4], (S.endereco || "").toUpperCase().slice(0, 78), 2.4);
  const cols5 = [0, 46, 80, 112, 142, 178].map((v) => v * u);
  cols5.slice(1, -1).forEach((x) => d.line([x, rows[4]], [x, rows[5]], C));
  const c5 = [["ÁREA CONSTRUÍDA", `${fmt(M.idx.Aconst)} m²`], ["ESCALA", escala], ["DATA", S.data || ""], ["FORMATO", fmtNome], ["FOLHA", folha]];
  c5.forEach(([l, v], n) => { lab(cols5[n], rows[4], l); val(cols5[n], rows[5], v, n === 1 && v.length > 8 ? 1.9 : 2.4); });
  d.line([100 * u, rows[5]], [100 * u, 0], C);
  lab(0, rows[5], "RESPONSÁVEL TÉCNICO");
  val(0, 5.6 * u, (S.resp || "").toUpperCase().slice(0, 40), 2.6, true);
  d.text([1.2 * u, 1.6 * u], 1.9 * u, (S.registro || "").slice(0, 60), { al: "l", va: "b", layer: T });
  lab(100 * u, rows[5], "ASSINATURA");
  d.line([104 * u, 4.5 * u], [174 * u, 4.5 * u], C);
  return d.E;
}

/* ------------------------------------------------------------------ */
/* 7. Diagramação automática                                           */
/* ------------------------------------------------------------------ */
function particoes(n, ncol) {
  const out = [];
  const rec = (ini, resta, acc) => {
    if (resta === 1) { out.push([...acc, [ini, n]]); return; }
    for (let fim = ini + 1; fim <= n - (resta - 2); fim++) rec(fim, resta - 1, [...acc, [ini, fim]]);
  };
  rec(0, ncol, []);
  return out;
}

function diagramar(cands, montar) {
  for (const [fmtNome, esc] of cands) {
    const k = esc / 1000;
    const { ordem, blocos } = montar(k, fmtNome, esc);
    const bb = {}; for (const key in blocos) bb[key] = bbox(blocos[key]);
    const [fw, fh, mg] = FORMATOS[fmtNome];
    const left = 25 * k, m = mg * k, SW = fw * k, SH = fh * k;
    const ax0 = left + 4 * k, ay0 = m + 4 * k, aw = SW - left - m - 8 * k, ah = SH - 2 * m - 8 * k, gap = 9 * k;
    let melhor = null;
    for (let ncol = 1; ncol <= 4; ncol++) {
      for (const part of particoes(ordem.length, ncol)) {
        const cols = part.map(([a, b]) => ordem.slice(a, b));
        cols[cols.length - 1] = [...cols[cols.length - 1], "C"];
        const colW = cols.map((c) => Math.max(...c.map((x) => bb[x].w)));
        const colH = cols.map((c) => c.reduce((a, x) => a + bb[x].h, 0) + gap * (c.length - 1));
        const totW = colW.reduce((a, b) => a + b, 0) + gap * (cols.length - 1);
        if (totW > aw || Math.max(...colH) > ah) continue;
        // prefere colunas equilibradas (ocupa a folha por igual) e poucas colunas
        const nota = Math.max(...colH) / ah + 0.08 * cols.length + 0.2 * (1 - totW / aw);
        if (!melhor || nota < melhor.nota) melhor = { cols, colW, nota };
      }
    }
    if (melhor) return { k, esc, fmtNome, blocos, bb, ...melhor, SW, SH, left, m, ax0, ay0, aw, ah, gap };
  }
  return null;
}

function compor(lay, marca, nota) {
  const { k, blocos, bb, cols, colW, SW, SH, left, m, ax0, ay0, aw, ah, gap } = lay;
  const out = new Draw();
  out.rect(0, 0, SW, SH, "PRANCHA-CARIMBO");
  out.rect(left, m, SW - m, SH - m, "PRANCHA");
  const livre = aw - colW.reduce((a, b) => a + b, 0);
  const g = cols.length > 1 ? livre / (cols.length - 1) : 0;
  let cx = ax0;
  cols.forEach((col, ci) => {
    const ultima = ci === cols.length - 1;
    let y = ay0 + ah;
    col.forEach((key) => {
      const b = bb[key];
      let x = cx + (colW[ci] - b.w) / 2, ty = y - b.h;
      if (key === "C") { x = SW - m - b.w; ty = m; }
      else if (ultima && ["Q", "QI"].includes(key)) x = SW - m - b.w;
      out.E.push(...translate(blocos[key], x - b.x0, ty - b.y0));
      y = ty - gap;
    });
    cx += colW[ci] + g;
  });
  out.text([SW - m - 1 * k, SH - m + 1.2 * k], 1.8 * k, nota, { al: "r", va: "b", layer: "PRANCHA-TEXTO" });
  if (marca) {
    const t1 = marca === "academico" ? "USO ACADÊMICO" : "ESTUDO · FOSTER CALC";
    const t2 = marca === "academico" ? "NÃO VÁLIDO PARA ART/RRT" : "ASSINE O PLANO PRO PARA A VERSÃO SEM MARCA";
    out.text([SW / 2, SH / 2 + 12 * k], 34 * k, t1, { al: "c", va: "m", rot: 25, layer: "MARCA", bold: true });
    out.text([SW / 2 + 10 * k, SH / 2 - 22 * k], 12 * k, t2, { al: "c", va: "m", rot: 25, layer: "MARCA", bold: true });
  }
  return out.E;
}

const CAND1 = [["A3", 50], ["A2", 50], ["A1", 50], ["A2", 75], ["A3", 100], ["A1", 75], ["A1", 100], ["A0", 100]];
const CAND2 = [["A3", 100], ["A2", 100], ["A1", 100], ["A2", 125], ["A1", 125], ["A1", 200], ["A0", 200]];
const NOTA = "Estudo preliminar gerado automaticamente — conferir antes de usar. Foster Calc · Feito no Brasil";

export function buildSheets(S0, op = {}) {
  let S = { ...defaults(), ...S0 };
  if (op.marca === "academico") S = { ...S, resp: "USO ACADÊMICO", registro: "Não válido para ART/RRT · Foster Calc plano Estudante" };
  if (op.marca === "estudo") S = { ...S, resp: "", registro: "Estudo · Foster Calc (plano Grátis)" };
  const M = buildModel(S);
  const escolha = (v, padrao) => (v && v !== "auto" ? [v.split("@")].map(([f, e]) => [f, +e]) : padrao);
  const avisos = [...M.avisos];
  const conteudo1 = "PLANTA BAIXA, CORTES AA E BB, FACHADA FRONTAL, QUADROS DE ÁREAS E ESQUADRIAS";
  const conteudo2 = "SITUAÇÃO, IMPLANTAÇÃO, COBERTURA, FACHADAS LATERAIS E POSTERIOR, ÍNDICES";
  const m1 = (k, f, esc) => ({ ordem: ["P", "F", "AA", "BB", "Q"], blocos: {
    P: drawPlan(M, k, esc), AA: drawSection(M, "x", k, esc), BB: drawSection(M, "y", k, esc), F: drawFacade(M, k, "frente", esc), Q: drawQuadros(M, k),
    C: drawCarimbo(M, k, f, `1:${esc}`, "01/02", conteudo1) } });
  const m2 = (k, f, esc) => ({ ordem: ["IMP", "SIT", "COB", "FP", "FD", "FE", "QI"], blocos: {
    IMP: drawImplantacao(M, k, esc), SIT: drawSituacao(M, k, esc), COB: drawCobertura(M, k, esc),
    FP: drawFacade(M, k, "fundos", esc), FD: drawFacade(M, k, "direita", esc), FE: drawFacade(M, k, "esquerda", esc), QI: drawIndices(M, k),
    C: drawCarimbo(M, k, f, `INDICADAS`, "02/02", conteudo2) } });
  const folhas = [];
  for (const [montar, cands, nome] of [[m1, escolha(S.formato, CAND1), "Folha 01"], [m2, escolha(S.formato2, CAND2), "Folha 02"]]) {
    let lay = diagramar(cands, montar);
    if (!lay) {
      lay = diagramar([["A0", cands[cands.length - 1][1]], ["A0", 200], ["A0", 250]], montar);
      avisos.push(`${nome}: o desenho não coube no formato escolhido; foi usado o A0.`);
    }
    if (!lay) throw new Error("Não foi possível diagramar a prancha. Confira as medidas.");
    folhas.push({ nome, E: compor(lay, op.marca, NOTA), SW: lay.SW, SH: lay.SH, k: lay.k, esc: lay.esc, formato: lay.fmtNome });
  }
  return { folhas, M, avisos };
}

/* ------------------------------------------------------------------ */
/* 8. Exportação DXF (folhas lado a lado no espaço do modelo)          */
/* ------------------------------------------------------------------ */
// Hachuras próprias (a biblioteca tem o padrão DOTS errado e o ângulo altera o padrão de forma permanente).
// [ângulo, espaçamento, deslocamento ao longo da linha, traços] — espaçamento 1 = 1 unidade × escala
const PADROES = {
  ANSI31: { nome: "FC_ALVENARIA", fam: [[45, 1, 0, []]] },
  ANSI37: { nome: "FC_CONCRETO", fam: [[45, 1, 0, []], [135, 1, 0, []]] },
  DOTS: { nome: "FC_PERMEAVEL", fam: [[0, 0.75, 0.375, [0, -0.75]]] },
};
Hatch.prototype.pattern = function (dx, fill) {
  const P = PADROES[fill.base], ang = fill.angle || 0, sc = fill.scale || 1;
  dx.push(52, ang); dx.push(41, sc); dx.push(77, 0);
  dx.push(78, P.fam.length);
  for (const [a, sp, sh, dashes] of P.fam) {
    const t = ((a + ang) * Math.PI) / 180, s = sp * sc, u = sh * sc;
    dx.push(53, a + ang); dx.push(43, 0); dx.push(44, 0);
    dx.push(45, +(u * Math.cos(t) - s * Math.sin(t)).toFixed(6)); dx.push(46, +(u * Math.sin(t) + s * Math.cos(t)).toFixed(6));
    dx.push(79, dashes.length); for (const d of dashes) dx.push(49, d * sc);
  }
};

const HA = { l: TextHorizontalAlignment.Left, c: TextHorizontalAlignment.Center, r: TextHorizontalAlignment.Right };
const VA = { b: TextVerticalAlignment.Bottom, m: TextVerticalAlignment.Middle, t: TextVerticalAlignment.Top };

export function toDXF(res) {
  const folhas = res.folhas || [res];
  const k0 = folhas[0].k;
  const dx = new DxfWriter();
  dx.setUnits(Units.Meters);
  dx.setVariable("$DWGCODEPAGE", { 3: "ANSI_1252" });
  dx.addLType("TRACOPONTO", "__ . __ . __", [12 * k0, -3 * k0, 0.5 * k0, -3 * k0]);
  dx.addLType("TRACEJADA", "__ __ __", [4 * k0, -2 * k0]);
  for (const [n, L] of Object.entries(LAYERS)) dx.addLayer(n, L.aci, L.lt);
  let ox = 0;
  for (const f of folhas) {
    for (const e of translate(f.E, ox, 0)) {
      const o = { layerName: e.layer };
      if (e.t === "line") dx.addLine(point3d(e.a[0], e.a[1]), point3d(e.b[0], e.b[1]), o);
      else if (e.t === "poly") dx.addLWPolyline(e.pts.map((p) => ({ point: point2d(p[0], p[1]) })), { ...o, flags: e.closed ? LWPolylineFlags.Closed : LWPolylineFlags.None });
      else if (e.t === "arc") dx.addArc(point3d(e.c[0], e.c[1]), e.r, e.a0, e.a1, o);
      else if (e.t === "circle") dx.addCircle(point3d(e.c[0], e.c[1]), e.r, o);
      else if (e.t === "text") {
        const p = point3d(e.p[0], e.p[1]);
        const o2 = { ...o, rotation: e.rot || 0 };
        if (!(e.al === "l" && e.va === "b")) { o2.horizontalAlignment = HA[e.al]; o2.verticalAlignment = VA[e.va]; o2.secondAlignmentPoint = p; }
        dx.addText(p, e.h, e.s, o2);
      } else if (e.t === "hatch") {
        const bp = new HatchBoundaryPaths();
        for (const l of e.loops) bp.addPolylineBoundary(new HatchPolylineBoundary(l.map((p) => vertex(p[0], p[1]))));
        const fill = e.pat === "SOLID" ? pattern({ name: HatchPredefinedPatterns.SOLID })
          : { name: PADROES[e.pat].nome, base: e.pat, scale: e.sc || 1, angle: e.ang || 0 };
        dx.addHatch(bp, fill, o);
      }
    }
    ox += f.SW + 20 * f.k;
  }
  // padrões próprios: tipo 2 (personalizado) para o CAD usar as linhas gravadas no arquivo
  return dx.stringify().replace(/(\r?\n2\r?\nFC_[A-Z]+[\s\S]{0,20000}?\r?\n76\r?\n)1(\r?\n)/g, "$12$2");
}

/* ------------------------------------------------------------------ */
/* 9. SVG (pré-visualização e impressão)                               */
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
      const fill = e.pat === "SOLID" ? col(e.layer) : e.pat === "ANSI37" ? "url(#hc)" : e.pat === "DOTS" ? "url(#hd)" : e.ang ? "url(#hv)" : "url(#ha)";
      parts.push(`<path d="${d}" fill="${fill}" fill-rule="evenodd" stroke="none"${e.pat === "SOLID" ? ' fill-opacity="0.85"' : ""}/>`);
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
<pattern id="hd" width="${sp * 3}" height="${sp * 3}" patternUnits="userSpaceOnUse"><circle cx="${sp * 0.7}" cy="${sp * 0.8}" r="${0.22 * k}" fill="#6f9a4c"/><circle cx="${sp * 2.2}" cy="${sp * 2.3}" r="${0.22 * k}" fill="#6f9a4c"/></pattern>
</defs>`;
  const size = opts.print ? ` width="${(SW / k).toFixed(0)}mm" height="${(SH / k).toFixed(0)}mm"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${X(SW)} ${X(SH)}"${size} font-family="Arial, Helvetica, sans-serif"><rect x="0" y="0" width="${X(SW)}" height="${X(SH)}" fill="#fff"/>${defs}${parts.join("")}</svg>`;
}

/* ------------------------------------------------------------------ */
/* 10. Leitor rápido de descrição (roda no aparelho, sem IA)           */
/* ------------------------------------------------------------------ */
const NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, "três": 3, quatro: 4, cinco: 5 };
const n2 = (s) => parseFloat(String(s).replace(",", "."));
export function interpretarTexto(texto) {
  const t = " " + String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ") + " ";
  const c = {}, ok = [], nao = [];
  const N = "(\\d+(?:[.,]\\d+)?)";
  let m;
  // quartos
  if ((m = t.match(/(\d|um|uma|dois|duas|tres|quatro|cinco)\s+(?:quartos?|dormitorios?|dorms?)\b/))) {
    const q = NUMEROS[m[1]] || +m[1];
    c.nq = Math.min(3, Math.max(1, q)); ok.push(`${c.nq} quarto${c.nq > 1 ? "s" : ""}`);
    if (q > 3) nao.push("O módulo faz até 3 quartos.");
  }
  if ((m = t.match(new RegExp(`(?:quartos?|dormitorios?)\\s+(?:de\\s+)?${N}\\s*(?:m\\s*)?(?:x|por)\\s*${N}`)))) {
    c.qw0 = c.qw1 = c.qw2 = n2(m[1]); c.db = n2(m[2]); ok.push(`quartos de ${m[1]} x ${m[2]} m`);
  }
  // suíte
  if (/\bsem suite\b/.test(t)) { c.suite = false; ok.push("sem suíte"); }
  else if (/\bsuite\b/.test(t)) { c.suite = true; ok.push("quarto 1 com suíte"); }
  // cozinha
  if (/cozinha (?:americana|integrada|aberta)|sala e cozinha integrad|sala\/cozinha|sala cozinha/.test(t)) { c.cozSep = false; ok.push("cozinha integrada à sala"); }
  else if (/cozinha (?:separada|fechada|independente)|sala e cozinha separad/.test(t)) { c.cozSep = true; ok.push("cozinha separada"); }
  // serviço
  if (/\bsem (?:area de servico|lavanderia)\b/.test(t)) c.serv = false;
  else if (/area de servico|lavanderia|\bservico\b/.test(t)) { c.serv = true; ok.push("área de serviço"); }
  // varanda
  if (/\bsem (?:varanda|alpendre)\b/.test(t)) c.varanda = false;
  else if (/varanda|alpendre|area frontal coberta/.test(t)) {
    c.varanda = true; ok.push("varanda");
    if ((m = t.match(new RegExp(`(?:varanda|alpendre)\\s+(?:de\\s+)?${N}\\s*m`)))) c.dv = n2(m[1]);
  }
  // vaga
  if (/\bsem (?:vaga|garagem)\b/.test(t)) { c.vaga = false; ok.push("sem vaga"); }
  else if (/\bvaga|garagem|estacionamento\b/.test(t)) { c.vaga = true; ok.push("vaga de carro"); if (/garagem coberta/.test(t)) nao.push("Garagem coberta ainda não: a vaga sai descoberta no terreno."); }
  // terreno
  if ((m = t.match(new RegExp(`(?:terreno|lote)\\s+(?:de\\s+)?${N}\\s*(?:m\\s*)?(?:x|por)\\s*${N}`)))) { c.lf = n2(m[1]); c.lp = n2(m[2]); ok.push(`terreno ${m[1]} x ${m[2]} m`); }
  if ((m = t.match(new RegExp(`recuo(?: frontal)?\\s+(?:de\\s+)?${N}`)))) { c.rf = n2(m[1]); ok.push(`recuo frontal ${m[1]} m`); }
  if ((m = t.match(new RegExp(`pe[- ]?direito\\s+(?:de\\s+)?${N}`)))) { c.H = n2(m[1]); ok.push(`pé-direito ${m[1]} m`); }
  // telhado
  if (/fibrocimento|eternit|brasilit/.test(t)) { c.telha = "fibrocimento"; ok.push("telha de fibrocimento"); }
  else if (/telha de concreto/.test(t)) { c.telha = "concreto"; ok.push("telha de concreto"); }
  else if (/ceramica|colonial|romana|portuguesa/.test(t)) { c.telha = "ceramica"; ok.push("telha cerâmica"); }
  // paredes
  if (/parede[s]? (?:de )?(?:20|0[.,]20)\b/.test(t)) c.t = 0.2;
  // o que o módulo ainda não faz
  const fora = [[/sobrado|dois andares|2 andares|pavimento superior/, "Sobrado ainda não: o módulo faz casa térrea."],
    [/piscina/, "Piscina não entra no desenho."], [/churrasqueira|area gourmet|espaco gourmet/, "Churrasqueira/área gourmet ainda não."],
    [/edicula/, "Edícula ainda não."], [/quatro aguas|4 aguas/, "Telhado de quatro águas ainda não: sai em duas águas."],
    [/closet/, "Closet ainda não."], [/escritorio/, "Escritório ainda não."], [/lavabo|dois banheiros|2 banheiros/, "Só um banheiro social (mais o da suíte)."]];
  for (const [re, s] of fora) if (re.test(t)) nao.push(s);
  return { campos: c, entendido: ok, observacoes: nao };
}

/* ------------------------------------------------------------------ */
/* 11. Encaixar a casa na frente do lote                               */
/* ------------------------------------------------------------------ */
// Reduz as larguras dos ambientes do fundo (até os mínimos) para a casa caber com o afastamento lateral dado.
export function encaixar(S0) {
  const S = { ...defaults(), ...S0 };
  const M = buildModel(S);
  const lf = M.lote.lf;
  const MIN = { q: 2.5, b: 1.2, bs: 1.2, s: 1.2 };
  const chave = (r) => r.kind === "q" ? "qw" + (r.first ? 0 : +r.name.slice(-1) - 1) : { b: "bw", bs: "bsw", s: "sw" }[r.kind];
  const fundo = M.rooms.filter((r) => r.y0 === M.yi1).map((r) => ({ k: chave(r), w: r.x1 - r.x0, min: MIN[r.kind] }));
  const folga = fundo.reduce((a, r) => a + Math.max(0, r.w - r.min), 0);
  // 1º: 1,50 m de cada lado; 2º: encostada na divisa esquerda com 1,50 m do outro lado
  for (const [afTotal, divisa] of [[3.0, false], [1.5, true]]) {
    const disp = lf - afTotal;
    if (M.W <= disp + 1e-6) return { ok: true, mudou: divisa, divisa, campos: divisa ? { afE: "0" } : {}, largura: M.W };
    const falta = M.W - disp;
    if (folga < falta - 1e-6) continue;
    const campos = {};
    for (const r of fundo) campos[r.k] = +(Math.floor((r.w - Math.max(0, r.w - r.min) * (falta / folga)) / 0.05 + 1e-6) * 0.05).toFixed(2);
    if (divisa) campos.afE = "0";
    return { ok: true, mudou: true, divisa, campos, largura: r2(M.W - falta) };
  }
  return { ok: false, mudou: true, campos: {}, largura: r2(M.W - folga) };
}
