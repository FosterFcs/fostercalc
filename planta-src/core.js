// Foster Calc · Foster Projeto — núcleo geométrico
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
    data: new Date().toLocaleDateString("pt-BR"), formato: "auto", formato2: "auto", formato3: "auto", formato4: "auto",
    tensao: 127, pChuveiro: 5500,
    // estrutura (pré-lançamento)
    sadm: 150, gAdd: 1.0, qLaje: 0.5, pPar: 1.9, fck: 25, secao: 30,
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
  "EST-PAREDE":        { aci: 8, lt: "Continuous", svg: "#b9b9b9", w: 0.13 },
  "EST-PILAR":         { aci: 5, lt: "Continuous", svg: "#1f4fa3", w: 0.35 },
  "EST-VIGA":          { aci: 4, lt: "Continuous", svg: "#0a6f96", w: 0.30 },
  "EST-BALDRAME":      { aci: 4, lt: "TRACEJADA", svg: "#0a6f96", w: 0.20 },
  "EST-SAPATA":        { aci: 6, lt: "TRACEJADA", svg: "#8a2a8a", w: 0.25 },
  "EST-TEXTO":         { aci: 2, lt: "Continuous", svg: "#111", w: 0.18 },
  "ELE-PONTO":         { aci: 1, lt: "Continuous", svg: "#c0161b", w: 0.25 },
  "ELE-TEXTO":         { aci: 1, lt: "Continuous", svg: "#8f1015", w: 0.15 },
  "HID-AGUA":          { aci: 5, lt: "Continuous", svg: "#1f4fa3", w: 0.25 },
  "HID-ESGOTO":        { aci: 30, lt: "Continuous", svg: "#8a5a14", w: 0.25 },
  "HID-TEXTO":         { aci: 5, lt: "Continuous", svg: "#1f3d7a", w: 0.15 },
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
/* 5b. Folha estrutural                                                */
/* ------------------------------------------------------------------ */
function contornoParedes(d, M, layer) {
  // contorno das paredes (projeção), sem hachura
  const G = grid(M), { X, Y, C } = G;
  const isW = (i, j) => i >= 0 && j >= 0 && i < C.length && j < C[0].length && C[i][j].c !== 0;
  const segs = [];
  for (let i = 0; i <= C.length; i++) for (let j = 0; j < Y.length - 1; j++) if (isW(i - 1, j) !== isW(i, j)) segs.push({ v: true, k: X[i], a: Y[j], b: Y[j + 1] });
  for (let j = 0; j <= Y.length - 1; j++) for (let i = 0; i < X.length - 1; i++) if (isW(i, j - 1) !== isW(i, j)) segs.push({ v: false, k: Y[j], a: X[i], b: X[i + 1] });
  for (const s of mergeSegs(segs)) d.line(s.v ? [s.k, s.a] : [s.a, s.k], s.v ? [s.k, s.b] : [s.b, s.k], layer);
}
function pilaresDesenho(d, E, k, rotulo) {
  for (const p of E.pilares) {
    d.hrect(p.x - p.bx / 2, p.y - p.by / 2, p.x + p.bx / 2, p.y + p.by / 2, "SOLID", "EST-PILAR", "EST-PILAR");
    if (rotulo) {
      const dx = p.ori === "H" ? 0 : p.bx / 2 + 1.2 * k, dy = p.ori === "H" ? p.by / 2 + 1.2 * k : 0;
      d.text([p.x + dx, p.y + dy], 1.9 * k, rotulo(p), { al: p.ori === "H" ? "c" : "l", va: p.ori === "H" ? "b" : "m", layer: "EST-TEXTO", bold: true });
    }
  }
}
function cotasEixos(d, E, M, k) {
  const xs = [...new Set(E.pilares.filter((p) => !p.var).map((p) => r2(p.x)))], ys = [...new Set(E.pilares.map((p) => r2(p.y)))];
  const topo = M.D + 6 * k, esq = Math.min(0, M.Y0) - 0;
  dimChain(d, xs, k, { dir: "h", at: topo + 4 * k, from: M.D });
  dimChain(d, ys, k, { dir: "v", at: -6 * k - 4 * k, from: 0 });
  void esq;
}
function drawLocacao(M, E, k, esc) {
  const d = new Draw();
  contornoParedes(d, M, "EST-PAREDE");
  for (const v of E.baldrames) {
    const o = v.bw / 200;
    if (v.d === "H") { d.line([v.a0, v.c - o], [v.a1, v.c - o], "EST-BALDRAME"); d.line([v.a0, v.c + o], [v.a1, v.c + o], "EST-BALDRAME"); }
    else { d.line([v.c - o, v.a0], [v.c - o, v.a1], "EST-BALDRAME"); d.line([v.c + o, v.a0], [v.c + o, v.a1], "EST-BALDRAME"); }
  }
  for (const p of E.pilares) {
    const A = p.sap.A / 100, B = p.sap.B / 100;
    d.rect(p.x - A / 2, p.y - B / 2, p.x + A / 2, p.y + B / 2, "EST-SAPATA");
  }
  pilaresDesenho(d, E, k, null);
  for (const p of E.pilares) {
    const B = p.sap.B / 100, A = p.sap.A / 100;
    d.text([p.x + A / 2 + 0.8 * k, p.y + B / 2 + 0.4 * k], 1.8 * k, `${p.id}/S${p.id.slice(1)}`, { al: "l", va: "b", layer: "EST-TEXTO", bold: true });
  }
  for (const v of E.baldrames) {
    const mid = (v.a0 + v.a1) / 2;
    const vao = v.vaos.reduce((a, s) => (s.L > a.L ? s : a), v.vaos[0]);
    const m2 = v.d === "H" ? (pilaresMeio(E, vao) ?? mid) : (pilaresMeio(E, vao) ?? mid);
    if (v.d === "H") d.text([m2, v.c - v.bw / 200 - 0.8 * k], 1.7 * k, `${v.id} ${v.bw}x${v.h}`, { al: "c", va: "t", layer: "EST-TEXTO" });
    else d.text([v.c - v.bw / 200 - 0.8 * k, m2], 1.7 * k, `${v.id} ${v.bw}x${v.h}`, { al: "c", va: "b", rot: 90, layer: "EST-TEXTO" });
  }
  cotasEixos(d, E, M, k);
  tituloAbaixo(d, k, "LOCAÇÃO DE PILARES E FUNDAÇÕES", `ESC. 1:${esc}`, M.W / 2);
  return d.E;
}
function pilaresMeio(E, vao) {
  const a = E.pilares.find((p) => p.id === vao.pi), b = E.pilares.find((p) => p.id === vao.pf);
  if (!a || !b) return null;
  return Math.abs(a.y - b.y) < 1e-3 ? (a.x + b.x) / 2 : (a.y + b.y) / 2;
}
function drawFormas(M, E, k, esc) {
  const d = new Draw();
  contornoParedes(d, M, "EST-PAREDE");
  for (const v of E.vigas) {
    const o = v.bw / 200;
    if (v.d === "H") d.rect(v.a0, v.c - o, v.a1, v.c + o, "EST-VIGA"); else d.rect(v.c - o, v.a0, v.c + o, v.a1, "EST-VIGA");
  }
  pilaresDesenho(d, E, k, (p) => `${p.id} ${p.b}x${p.h}`);
  for (const l of E.lajes) {
    const cx = (l.x0 + l.x1) / 2, cy = (l.y0 + l.y1) / 2, hs = Math.min(l.lx, l.ly) < 2 ? 0.8 : 1;
    d.circle([cx, cy], 3.2 * k * hs, "EST-TEXTO");
    d.text([cx, cy], 2.0 * k * hs, l.id, { al: "c", va: "m", layer: "EST-TEXTO", bold: true });
    d.text([cx, cy - 4.2 * k * hs], 1.7 * k * hs, `h=${l.h}`, { al: "c", va: "t", layer: "EST-TEXTO" });
    d.text([cx, cy - 6.6 * k * hs], 1.6 * k * hs, `${fmt(l.lx)} x ${fmt(l.ly)}`, { al: "c", va: "t", layer: "EST-TEXTO" });
  }
  for (const v of E.vigas) {
    const vao = v.vaos.reduce((a, s) => (s.L > a.L ? s : a), v.vaos[0]);
    const m2 = pilaresMeio(E, vao) ?? (v.a0 + v.a1) / 2;
    if (v.d === "H") d.text([m2, v.c + v.bw / 200 + 0.8 * k], 1.8 * k, `${v.id} (${v.bw}x${v.h})`, { al: "c", va: "b", layer: "EST-TEXTO", bold: true });
    else d.text([v.c + v.bw / 200 + 0.8 * k, m2], 1.8 * k, `${v.id} (${v.bw}x${v.h})`, { al: "c", va: "t", rot: 90, layer: "EST-TEXTO", bold: true });
  }
  cotasEixos(d, E, M, k);
  tituloAbaixo(d, k, "FORMAS DO RESPALDO", `ESC. 1:${esc} · LAJE +${fmt(M.H)}`, M.W / 2);
  return d.E;
}
function drawQuadrosEst(M, E, k) {
  const d = new Draw();
  const qp = E.pilares.map((p) => [p.id, `${p.b}x${p.h}`, String(p.N), `S${p.id.slice(1)}`, `${p.sap.A}x${p.sap.B}`]);
  const w1 = 86 * k;
  const h1 = tabela(d, 0, w1, k, "PILARES E SAPATAS (PRELIMINAR)", [{ t: "PILAR", w: 14 * k }, { t: "SEÇÃO", w: 18 * k }, { t: "Nk (kN)", w: 18 * k }, { t: "SAP.", w: 14 * k }, { t: "A x B (cm)", w: 22 * k }], qp);
  const d2 = new Draw();
  const qv = [...E.vigas, ...E.baldrames].map((v) => [v.id, `${v.bw}x${v.h}`, v.vaos.map((s) => fmt(s.L)).join(" / ").slice(0, 34), v.id.startsWith("VB") ? `parede ${fmt(M.H)} m` : `${fmt(Math.max(...v.vaos.map((s) => s.g + s.q)), 1)}`]);
  tabela(d2, 0, 92 * k, k, "VIGAS E BALDRAMES", [{ t: "VIGA", w: 14 * k }, { t: "SEÇÃO", w: 16 * k }, { t: "VÃOS (m)", w: 40 * k }, { t: "g+q máx", w: 22 * k }], qv);
  d.E.push(...translate(d2.E, w1 + 6 * k, 0));
  const d3 = new Draw();
  const ql = E.lajes.map((l) => [l.id, l.nome.slice(0, 14), `${fmt(l.lx)} x ${fmt(l.ly)}`, String(l.h), `${fmt(l.g)} / ${fmt(l.q)}`]);
  const h3 = tabela(d3, 0, 92 * k, k, "LAJES MACIÇAS", [{ t: "LAJE", w: 12 * k }, { t: "AMBIENTE", w: 28 * k }, { t: "lx x ly (m)", w: 22 * k }, { t: "h", w: 8 * k }, { t: "g / q", w: 22 * k }], ql);
  const yl = -Math.max(h1, (E.vigas.length + E.baldrames.length + 2) * 4.5 * k) - 6 * k;
  d.E.push(...translate(d3.E, w1 + 6 * k, yl));
  const notas = [
    `Cargas: laje g = 25·h + ${fmt(E.op.gAdd)} (revest./forro) + ${fmt(E.op.gTel)} (telhado) kN/m²; q = ${fmt(E.op.qL)} kN/m² (conferir NBR 6120).`,
    `Paredes ${fmt(E.op.pPar)} kN/m² sobre os baldrames; σadm do solo = ${fmt(E.op.sadm, 0)} kPa (confirmar com sondagem).`,
    "Nk por reações isostáticas das vigas + peso próprio. Lançamento PRELIMINAR: dimensionar cada peça",
    "nos módulos do Foster Calc e conferir por profissional habilitado (projeto estrutural com ART).",
  ];
  notas.forEach((t, i) => d.text([0, yl - i * 3.2 * k - (h1 > -yl ? h1 - (-yl) : 0) - 2 * k], 1.7 * k, t, { al: "l", va: "t", layer: "PRANCHA-TEXTO" }));
  return d.E;
}

/* ------------------------------------------------------------------ */
/* 5c. Folha de instalações                                            */
/* ------------------------------------------------------------------ */
function baseInstal(d, M, k) {
  contornoParedes(d, M, "EST-PAREDE");
  for (const o of M.O) if (o.swing) { const la = o.swing.open * Math.PI / 180; d.line(o.swing.h, [o.swing.h[0] + o.w * Math.cos(la), o.swing.h[1] + o.w * Math.sin(la)], "EST-PAREDE"); }
  for (const r of M.rooms) d.text([(r.x0 + r.x1) / 2, r.y0 + 0.35], 1.7 * k, r.name, { al: "c", va: "b", layer: "EST-PAREDE" });
  if (M.varanda) { d.line([0, -M.dv], [M.W, -M.dv], "EST-PAREDE"); for (const p of M.pilares) d.rect(p.x0, p.y0, p.x1, p.y1, "EST-PAREDE"); }
}
function drawEletrica(M, I, k, esc) {
  const d = new Draw(), L = "ELE-PONTO", T = "ELE-TEXTO", s = 1.6 * k;
  baseInstal(d, M, k);
  for (const p of I.ele) {
    const [nx, ny] = p.n || [0, 1], tx = -ny, ty = nx;
    if (p.tipo === "luz") {
      d.circle([p.x, p.y], 2.2 * k, L);
      d.line([p.x - 1.5 * k, p.y - 1.5 * k], [p.x + 1.5 * k, p.y + 1.5 * k], L); d.line([p.x - 1.5 * k, p.y + 1.5 * k], [p.x + 1.5 * k, p.y - 1.5 * k], L);
      d.text([p.x + 2.8 * k, p.y + 0.6 * k], 1.6 * k, `${p.cid} · ${p.va} VA`, { al: "l", va: "b", layer: T });
    } else if (p.tipo === "tug" || p.tipo === "tugA") {
      const b = [p.x + nx * 0.02, p.y + ny * 0.02], tip = [b[0] + nx * s * 1.4, b[1] + ny * s * 1.4];
      const tri = [[b[0] + tx * s, b[1] + ty * s], tip, [b[0] - tx * s, b[1] - ty * s]];
      if (p.tipo === "tug") d.hatch([tri], "SOLID", L); else { d.poly(tri, true, L); d.line([b[0] + tx * s * 0.5 + nx * s * 0.7, b[1] + ty * s * 0.5 + ny * s * 0.7], [b[0] - tx * s * 0.5 + nx * s * 0.7, b[1] - ty * s * 0.5 + ny * s * 0.7], L); }
      d.text([tip[0] + nx * 1.2 * k, tip[1] + ny * 1.2 * k], 1.4 * k, `${p.cid}${p.va >= 600 ? " " + p.va : ""}`, { al: "c", va: "m", layer: T });
    } else if (p.tipo === "tue") {
      const c = [p.x + nx * s, p.y + ny * s];
      d.hrect(c[0] - s, c[1] - s, c[0] + s, c[1] + s, "SOLID", L, L);
      d.text([c[0] + nx * 2.6 * k, c[1] + ny * 2.6 * k], 1.5 * k, `${p.rot} ${p.cid} ${p.va} W`, { al: "c", va: "m", layer: T, bold: true });
    } else if (p.tipo === "int") {
      const c = [p.x + nx * s, p.y + ny * s];
      d.circle(c, 1.3 * k, L);
      d.text(c, 1.3 * k, p.rot === "S2" ? "S2" : "S", { al: "c", va: "m", layer: T, bold: true });
    } else if (p.tipo === "qd") {
      d.hrect(p.x - 0.25, p.y, p.x + 0.25, p.y + 0.12, "SOLID", L, L);
      d.text([p.x, p.y + 0.12 + 1.2 * k], 1.8 * k, "QD", { al: "c", va: "b", layer: T, bold: true });
    }
  }
  tituloAbaixo(d, k, "PONTOS ELÉTRICOS", `ESC. 1:${esc}`, M.W / 2);
  return d.E;
}
function drawHidro(M, I, k, esc) {
  const d = new Draw(), A = "HID-AGUA", E = "HID-ESGOTO", T = "HID-TEXTO", s = 1.4 * k;
  baseInstal(d, M, k);
  const rot = {};
  for (const p of I.hid) {
    if (p.tipo === "AF") { d.hatch([[[p.x, p.y + s], [p.x + s, p.y], [p.x, p.y - s], [p.x - s, p.y]]], "SOLID", A); }
    else if (p.tipo === "ES") { d.hrect(p.x - s * 0.8, p.y - s * 0.8, p.x + s * 0.8, p.y + s * 0.8, "SOLID", E, E); }
    else if (p.tipo === "RS") { d.circle([p.x, p.y], s, E); d.line([p.x - s, p.y], [p.x + s, p.y], E); d.line([p.x, p.y - s], [p.x, p.y + s], E); }
    else if (p.tipo === "CI" || p.tipo === "CG") {
      const h = p.tipo === "CG" ? 0.3 : 0.3;
      d.rect(p.x - h, p.y - h, p.x + h, p.y + h, E); d.line([p.x - h, p.y - h], [p.x + h, p.y + h], E);
      d.text([p.x, p.y - h - 1.0 * k], 1.6 * k, p.tipo, { al: "c", va: "t", layer: T, bold: true });
    }
    if (["AF", "ES"].includes(p.tipo)) { const key = p.room + p.ap.split(" ")[0]; if (!rot[key] && p.tipo === "AF") { rot[key] = 1; d.text([p.x + (p.x > (M.W / 2) ? -2.2 : 2.2) * k, p.y + 1.6 * k], 1.4 * k, p.ap.split(" (")[0], { al: p.x > M.W / 2 ? "r" : "l", va: "b", layer: T }); } }
  }
  // ligação esquemática do esgoto às caixas
  const cis = I.hid.filter((p) => p.tipo === "CI" || p.tipo === "CG");
  for (let i = 0; i < cis.length - 1; i++) { const a = cis[i], b = cis[cis.length - 1]; if (a !== b) d.line([a.x, a.y], a.y === b.y ? [b.x, b.y] : [a.x, b.y], E); }
  const cg = cis.find((p) => p.tipo === "CG"), fim = cis[cis.length - 1];
  if (cg && fim) d.line([cg.x, cg.y + 0.3], [fim.x, fim.y - 0.3], E);
  d.text([M.W / 2, M.D + 1.4], 1.8 * k, `Caixa d'água ${I.reserv.caixa} L sobre a laje (${I.reserv.moradores} moradores × ${I.reserv.consumo} L/dia)`, { al: "c", va: "b", layer: T, bold: true });
  tituloAbaixo(d, k, "PONTOS HIDROSSANITÁRIOS", `ESC. 1:${esc}`, M.W / 2);
  return d.E;
}
function drawQuadrosInst(M, I, k) {
  const d = new Draw();
  const linhas = I.circ.map((c) => [c.id, c.nome.slice(0, 30), String(c.n), String(Math.round(c.va)), String(c.tensao), fmt(c.Ib, 1), `${c.sec}`, `${c.In} A${c.dr ? " + DR" : ""}`]);
  linhas.push(["", "TOTAL INSTALADO", "", String(Math.round(I.total)), "", "", "", ""]);
  const h1 = tabela(d, 0, 178 * k, k, "QUADRO DE CIRCUITOS (PRÉ-DIMENSIONAMENTO)", [{ t: "CIRC.", w: 12 * k }, { t: "DESCRIÇÃO", w: 56 * k }, { t: "PTS", w: 10 * k }, { t: "VA", w: 16 * k }, { t: "V", w: 12 * k }, { t: "Ib (A)", w: 16 * k }, { t: "mm²", w: 14 * k }, { t: "PROTEÇÃO", w: 42 * k }], linhas, [linhas.length - 1]);
  const R = I.resumo;
  const hid = [["Pontos de água fria", String(R.af)], ["Pontos de esgoto", String(R.es)], ["Ralos sifonados", String(R.rs)], ["Caixas de inspeção", String(R.ci)], ["Caixa de gordura", String(R.cg)], [`Caixa d'água (${I.reserv.litros} L/dia)`, `${I.reserv.caixa} L`]];
  const d2 = new Draw(); tabela(d2, 0, 86 * k, k, "HIDROSSANITÁRIO", [{ t: "ITEM", w: 62 * k }, { t: "QTD", w: 24 * k }], hid);
  d.E.push(...translate(d2.E, 0, -h1 - 6 * k));
  // legenda
  const lg = new Draw(), x0 = 92 * k, s = 1.6 * k, L = "ELE-PONTO";
  let y = -h1 - 6 * k - 3 * k;
  const item = (desenha, txt) => { desenha(x0 + 3 * k, y); lg.text([x0 + 8 * k, y], 1.7 * k, txt, { al: "l", va: "m", layer: "PRANCHA-TEXTO" }); y -= 4.6 * k; };
  lg.text([x0, y + 3 * k], 2.0 * k, "LEGENDA", { al: "l", va: "b", layer: "PRANCHA-TEXTO", bold: true });
  item((x, yy) => { lg.circle([x, yy], 2.0 * k, L); lg.line([x - 1.4 * k, yy - 1.4 * k], [x + 1.4 * k, yy + 1.4 * k], L); lg.line([x - 1.4 * k, yy + 1.4 * k], [x + 1.4 * k, yy - 1.4 * k], L); }, "Ponto de luz no teto (circuito · VA)");
  item((x, yy) => lg.hatch([[[x - s, yy - s * 0.7], [x + s, yy - s * 0.7], [x, yy + s * 0.8]]], "SOLID", L), "Tomada baixa (0,30 m)");
  item((x, yy) => lg.poly([[x - s, yy - s * 0.7], [x + s, yy - s * 0.7], [x, yy + s * 0.8]], true, L), "Tomada alta / bancada (1,10 m)");
  item((x, yy) => lg.hrect(x - s, yy - s, x + s, yy + s, "SOLID", L, L), "Tomada de uso específico (CH chuveiro, MLR máquina)");
  item((x, yy) => { lg.circle([x, yy], 1.3 * k, L); lg.text([x, yy], 1.2 * k, "S", { al: "c", va: "m", layer: "ELE-TEXTO", bold: true }); }, "Interruptor (1,10 m) · S2 = duas seções");
  item((x, yy) => lg.hrect(x - 2.4 * k, yy - 0.8 * k, x + 2.4 * k, yy + 0.8 * k, "SOLID", L, L), "Quadro de distribuição (1,50 m)");
  item((x, yy) => lg.hatch([[[x, yy + s], [x + s, yy], [x, yy - s], [x - s, yy]]], "SOLID", "HID-AGUA"), "Ponto de água fria");
  item((x, yy) => lg.hrect(x - s * 0.8, yy - s * 0.8, x + s * 0.8, yy + s * 0.8, "SOLID", "HID-ESGOTO", "HID-ESGOTO"), "Ponto de esgoto (ø mm)");
  item((x, yy) => { lg.circle([x, yy], s, "HID-ESGOTO"); lg.line([x - s, yy], [x + s, yy], "HID-ESGOTO"); lg.line([x, yy - s], [x, yy + s], "HID-ESGOTO"); }, "Ralo sifonado");
  item((x, yy) => { lg.rect(x - s, yy - s, x + s, yy + s, "HID-ESGOTO"); lg.line([x - s, yy - s], [x + s, yy + s], "HID-ESGOTO"); }, "Caixa de inspeção (CI) / de gordura (CG)");
  d.E.push(...lg.E);
  const notas = [
    `Previsão de cargas e número mínimo de pontos conforme NBR 5410 (9.5.2). Tensão ${I.V} V; chuveiros em 220 V.`,
    "Condutores e disjuntores indicativos (método B1, sem fatores de correção). Dimensionar com queda de tensão, agrupamento e DR 30 mA.",
    "Pontos hidrossanitários indicativos: traçado, diâmetros e ventilação no projeto conforme NBR 5626 e NBR 8160.",
  ];
  notas.forEach((t, i) => d.text([0, y - 2 * k - i * 3.2 * k], 1.6 * k, t, { al: "l", va: "t", layer: "PRANCHA-TEXTO" }));
  return d.E;
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
  d.text([21 * u, H - 11.2 * u], 1.7 * u, "Foster Projeto · estudo gerado", { al: "c", va: "m", layer: T });
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
      else if (ultima && ["Q", "QI", "QE", "QI4"].includes(key)) x = SW - m - b.w;
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
    C: drawCarimbo(M, k, f, `1:${esc}`, "01/04", conteudo1) } });
  const m2 = (k, f, esc) => ({ ordem: ["IMP", "SIT", "COB", "FP", "FD", "FE", "QI"], blocos: {
    IMP: drawImplantacao(M, k, esc), SIT: drawSituacao(M, k, esc), COB: drawCobertura(M, k, esc),
    FP: drawFacade(M, k, "fundos", esc), FD: drawFacade(M, k, "direita", esc), FE: drawFacade(M, k, "esquerda", esc), QI: drawIndices(M, k),
    C: drawCarimbo(M, k, f, `INDICADAS`, "02/04", conteudo2) } });
  const E = estrutura(M, op.est || {});
  const conteudo3 = "LOCAÇÃO DE PILARES E FUNDAÇÕES, FORMAS DO RESPALDO, QUADROS ESTRUTURAIS (PRELIMINAR)";
  const m3 = (k, f, esc) => ({ ordem: ["LOC", "FOR", "QE"], blocos: {
    LOC: drawLocacao(M, E, k, esc), FOR: drawFormas(M, E, k, esc), QE: drawQuadrosEst(M, E, k),
    C: drawCarimbo(M, k, f, `1:${esc}`, "03/04", conteudo3) } });
  const I4 = instalacoes(M, op.inst || {});
  const conteudo4 = "PONTOS ELÉTRICOS E HIDROSSANITÁRIOS, QUADRO DE CIRCUITOS, LEGENDA (PRELIMINAR)";
  const m4 = (k, f, esc) => ({ ordem: ["ELE", "HID", "QI4"], blocos: {
    ELE: drawEletrica(M, I4, k, esc), HID: drawHidro(M, I4, k, esc), QI4: drawQuadrosInst(M, I4, k),
    C: drawCarimbo(M, k, f, `1:${esc}`, "04/04", conteudo4) } });
  const folhas = [];
  for (const [montar, cands, nome] of [[m1, escolha(S.formato, CAND1), "Folha 01"], [m2, escolha(S.formato2, CAND2), "Folha 02"], [m3, escolha(S.formato3, CAND1), "Folha 03"], [m4, escolha(S.formato4, CAND1), "Folha 04"]]) {
    let lay = diagramar(cands, montar);
    if (!lay) {
      lay = diagramar([["A0", cands[cands.length - 1][1]], ["A0", 200], ["A0", 250]], montar);
      avisos.push(`${nome}: o desenho não coube no formato escolhido; foi usado o A0.`);
    }
    if (!lay) throw new Error("Não foi possível diagramar a prancha. Confira as medidas.");
    folhas.push({ nome, E: compor(lay, op.marca, NOTA), SW: lay.SW, SH: lay.SH, k: lay.k, esc: lay.esc, formato: lay.fmtNome });
  }
  avisos.push(...E.avisos);
  return { folhas, M, E, I: I4, avisos };
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

/* ------------------------------------------------------------------ */
/* 12. Pré-lançamento estrutural (térrea com laje de forro)            */
/* ------------------------------------------------------------------ */
// Pilares nos encontros de paredes e a cada ≤ 4,5 m; vigas de respaldo e baldrames sobre as paredes;
// uma laje por ambiente; cargas por áreas de influência simplificadas (vãos isostáticos). Preliminar.
const CARGA_TELHA = { ceramica: 1.0, concreto: 1.1, fibrocimento: 0.35 }; // kN/m² em projeção, com madeiramento
export function estrutura(M, op = {}) {
  const S = M.S, t = M.t, c = t / 2, W = M.W, D = M.D;
  const Lmax = 4.5, hp = num(op.secao ?? S.secao, 30) / 100;          // lado maior do pilar (m)
  const gAdd = num(op.gAdd ?? S.gAdd, 1.0), qL = num(op.qL ?? S.qLaje, 0.5), pPar = num(op.pPar ?? S.pPar, 1.9);
  const sadm = num(op.sadm ?? S.sadm, 150), fck = num(op.fck ?? S.fck, 25);
  const hL = M.laje, gTel = CARGA_TELHA[S.telha] ?? 1.0;
  const avisos = [];
  // linhas de parede (eixos)
  const linhas = [];
  linhas.push({ d: "H", c: c, a0: c, a1: W - c }, { d: "H", c: M.yi0 + c, a0: c, a1: W - c }, { d: "H", c: M.ytop + c, a0: c, a1: W - c });
  linhas.push({ d: "V", c: c, a0: c, a1: D - c }, { d: "V", c: W - c, a0: c, a1: D - c });
  const fundo = M.rooms.filter((r) => r.y0 === M.yi1).sort((a, b) => a.x0 - b.x0);
  fundo.slice(0, -1).forEach((r) => linhas.push({ d: "V", c: r.x1 + c, a0: M.yi0 + c, a1: M.ytop + c }));
  if (M.cozSep) linhas.push({ d: "V", c: M.coz.x0 - c, a0: c, a1: M.yi0 + c });
  const k3 = (v) => Math.round(v * 1000) / 1000;
  const nos = new Map();
  const addNo = (x, y) => { const key = k3(x) + "|" + k3(y); if (!nos.has(key)) nos.set(key, { x: k3(x), y: k3(y) }); return nos.get(key); };
  // nós: pontas das paredes e todos os cruzamentos (cantos, encontros em T e em cruz)
  for (const L of linhas) { L.d === "H" ? (addNo(L.a0, L.c), addNo(L.a1, L.c)) : (addNo(L.c, L.a0), addNo(L.c, L.a1)); }
  for (const h of linhas.filter((l) => l.d === "H")) for (const v of linhas.filter((l) => l.d === "V"))
    if (v.c >= h.a0 - 1e-3 && v.c <= h.a1 + 1e-3 && h.c >= v.a0 - 1e-3 && h.c <= v.a1 + 1e-3) addNo(v.c, h.c);
  const naLinha = (L, p) => (L.d === "H" ? Math.abs(p.y - L.c) < 1e-3 && p.x >= L.a0 - 1e-3 && p.x <= L.a1 + 1e-3 : Math.abs(p.x - L.c) < 1e-3 && p.y >= L.a0 - 1e-3 && p.y <= L.a1 + 1e-3);
  const vaosDe = (L) => M.O.filter((o) => (L.d === "H" ? o.orient === "H" : o.orient === "V") && o.q0 <= L.c + 1e-6 && o.q1 >= L.c - 1e-6);
  // pilares intermediários (evitando portas e janelas)
  for (const L of linhas) {
    const pos = [...nos.values()].filter((p) => naLinha(L, p)).map((p) => (L.d === "H" ? p.x : p.y)).sort((a, b) => a - b);
    const abert = vaosDe(L);
    const livre = (s) => abert.every((o) => s + hp / 2 + 0.05 <= o.p0 || s - hp / 2 - 0.05 >= o.p1);
    for (let n = 0; n < pos.length - 1; n++) {
      const a = pos[n], b = pos[n + 1], vao = b - a;
      if (vao <= Lmax + 1e-6) continue;
      const nd = Math.ceil(vao / Lmax);
      for (let m = 1; m < nd; m++) {
        let s = a + (vao * m) / nd, ok = livre(s);
        for (let d = 0.05; !ok && d < vao / nd / 2; d += 0.05) { if (livre(s + d)) { s += d; ok = true; } else if (livre(s - d)) { s -= d; ok = true; } }
        if (!ok) avisos.push(`Não achei trecho de parede sem abertura para um pilar intermediário (${L.d === "H" ? "parede horizontal" : "parede vertical"} em ${fmt(L.c)} m).`);
        L.d === "H" ? addNo(s, L.c) : addNo(L.c, s);
      }
    }
  }
  // pilares
  const emH = (p) => linhas.some((L) => L.d === "H" && naLinha(L, p));
  const lista = [...nos.values()].sort((a, b) => b.y - a.y || a.x - b.x);
  const pilares = lista.map((p, i) => {
    const ori = emH(p) ? "H" : "V";
    const bx = ori === "H" ? hp : t, by = ori === "H" ? t : hp;
    return { id: `P${i + 1}`, x: p.x, y: p.y, bx, by, b: Math.round(t * 100), h: Math.round(hp * 100), ori, N: 0, var: false };
  });
  if (M.varanda) M.pilares.forEach((q) => pilares.push({ id: `P${pilares.length + 1}`, x: (q.x0 + q.x1) / 2, y: (q.y0 + q.y1) / 2, bx: 0.15, by: 0.15, b: 15, h: 15, ori: "H", N: 0, var: true }));
  const pilarEm = (x, y) => pilares.find((p) => Math.abs(p.x - x) < 1e-3 && Math.abs(p.y - y) < 1e-3);
  // lajes (eixo a eixo)
  const ordem = M.rooms.slice().sort((a, b) => b.y0 - a.y0 || a.x0 - b.x0);
  const lajes = ordem.map((r, i) => {
    const x0 = r.x0 - c, x1 = r.x1 + c, y0 = r.y0 - c, y1 = r.y1 + c;
    return { id: `L${i + 1}`, nome: r.name, x0, x1, y0, y1, lx: r2(x1 - x0), ly: r2(y1 - y0), h: Math.round(hL * 100), g: r2(gAdd + gTel), q: qL };
  });
  for (const l of lajes) {
    const viz = (fn) => lajes.some((o) => o !== l && fn(o));
    const sob = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 0.3;
    l.bordas = {
      esq: viz((o) => Math.abs(o.x1 - l.x0) < 1e-3 && sob(o.y0, o.y1, l.y0, l.y1)) ? "E" : "A",
      dir: viz((o) => Math.abs(o.x0 - l.x1) < 1e-3 && sob(o.y0, o.y1, l.y0, l.y1)) ? "E" : "A",
      inf: viz((o) => Math.abs(o.y1 - l.y0) < 1e-3 && sob(o.x0, o.x1, l.x0, l.x1)) ? "E" : "A",
      sup: viz((o) => Math.abs(o.y0 - l.y1) < 1e-3 && sob(o.x0, o.x1, l.x0, l.x1)) ? "E" : "A",
    };
    const lx = Math.min(l.lx, l.ly), ly = Math.max(l.lx, l.ly);
    const pg = 25 * hL + l.g, pq = l.q;
    const kLongo = lx / 4 * (2 - lx / ly), kCurto = lx / 4;
    const kx = l.lx >= l.ly ? kLongo : kCurto, ky = l.ly > l.lx ? kLongo : kCurto; // kx: bordas horizontais (comprimento lx)
    l.bordasCarga = [
      { d: "H", c: l.y0, a0: l.x0, a1: l.x1, g: pg * kx, q: pq * kx }, { d: "H", c: l.y1, a0: l.x0, a1: l.x1, g: pg * kx, q: pq * kx },
      { d: "V", c: l.x0, a0: l.y0, a1: l.y1, g: pg * ky, q: pq * ky }, { d: "V", c: l.x1, a0: l.y0, a1: l.y1, g: pg * ky, q: pq * ky },
    ];
    l.armacao = ly / lx > 2 ? "uma direção" : "duas direções";
  }
  // vigas de respaldo e baldrames (mesmas linhas)
  const linhasOrd = [...linhas.filter((l) => l.d === "H").sort((a, b) => b.c - a.c), ...linhas.filter((l) => l.d === "V").sort((a, b) => a.c - b.c || b.a1 - a.a1)];
  const vigas = [], baldrames = [];
  const gVar = M.varanda ? (gTel + 0.3) * M.dv / 2 : 0, qVar = M.varanda ? 0.25 * M.dv / 2 : 0;
  linhasOrd.forEach((L, i) => {
    const ps = pilares.filter((p) => !p.var && naLinha(L, p)).sort((a, b) => (L.d === "H" ? a.x - b.x : a.y - b.y));
    const pos = ps.map((p) => (L.d === "H" ? p.x : p.y));
    const vaos = [];
    for (let n = 0; n < pos.length - 1; n++) {
      const s0 = pos[n], s1 = pos[n + 1], Lv = s1 - s0;
      let g = 0, q = 0;
      for (const l of lajes) for (const e of l.bordasCarga) {
        if (e.d !== L.d || Math.abs(e.c - L.c) > 1e-3) continue;
        const ov = Math.min(s1, e.a1) - Math.max(s0, e.a0);
        if (ov > 1e-3) { g += e.g * ov / Lv; q += e.q * ov / Lv; }
      }
      if (L.d === "H" && Math.abs(L.c - c) < 1e-3) { g += gVar; q += qVar; }   // meia varanda na viga da frente
      vaos.push({ L: r2(Lv), g: r2(g), q: r2(q), pi: ps[n].id, pf: ps[n + 1].id });
    }
    if (!vaos.length) return;
    const hV = Math.max(30, Math.ceil(Math.max(...vaos.map((v) => v.L)) * 100 / 12 / 5) * 5);
    const comum = { d: L.d, c: L.c, a0: pos[0], a1: pos[pos.length - 1], bw: Math.round(t * 100), pilares: ps.map((p) => p.id) };
    vigas.push({ ...comum, id: `V${vigas.length + 1}`, h: hV, vaos });
    baldrames.push({ ...comum, id: `VB${baldrames.length + 1}`, h: 30, vaos: vaos.map((v) => ({ ...v, g: r2(M.H * pPar), q: 0 })) });
  });
  // cargas nos pilares: reações isostáticas das vigas + peso próprio
  const reag = (v) => v.vaos.forEach((s) => {
    const pp = 25 * (v.bw / 100) * (v.h / 100);
    const R = ((s.g + pp + s.q) * s.L) / 2;
    pilares.find((p) => p.id === s.pi).N += R; pilares.find((p) => p.id === s.pf).N += R;
  });
  vigas.forEach(reag); baldrames.forEach(reag);
  const nVar = pilares.filter((p) => p.var).length;
  for (const p of pilares) {
    if (p.var) p.N += ((gTel + 0.3 + 0.25) * M.W * M.dv / 2) / nVar;
    p.N += 25 * (p.b / 100) * (p.h / 100) * (M.H + M.laje + 0.5);
    p.N = Math.ceil(p.N);
    p.L = r2(M.H + M.laje + 0.5);
    // sapata (A em x, B em y) com balanços iguais
    const ap = p.bx * 100, bp = p.by * 100, area = (p.N * 1.05) / sadm * 1e4;  // cm²
    const dif = ap - bp;
    let B = (-dif + Math.sqrt(dif * dif + 4 * area)) / 2, A = B + dif;
    A = Math.max(60, Math.ceil(A / 5) * 5); B = Math.max(60, Math.ceil(B / 5) * 5);
    p.sap = { A, B };
  }
  if (lajes.some((l) => Math.min(l.lx, l.ly) > 5)) avisos.push("Há laje com menor vão acima de 5 m: confira a espessura e considere uma viga intermediária.");
  return { pilares, vigas, baldrames, lajes, avisos, op: { gAdd, qL, pPar, sadm, fck, gTel, hp } };
}

// links para dimensionar cada peça nos módulos do Foster Calc
export function linksEstrutura(E, M) {
  const fck = E.op.fck, q = (o) => new URLSearchParams(Object.entries(o).map(([k, v]) => [k, String(v)])).toString();
  const out = {};
  for (const l of E.lajes) out[l.id] = "laje.html?" + q({ lx: l.lx, ly: l.ly, h: l.h, apoio: Math.round(M.t * 100), g: l.g, q: l.q, fck, b_esq: l.bordas.esq, b_dir: l.bordas.dir, b_inf: l.bordas.inf, b_sup: l.bordas.sup, nome: `${l.id} (${l.nome.toLowerCase()})` });
  for (const v of E.vigas) out[v.id] = "viga.html?" + q({ vaos: v.vaos.map((s) => `${s.L}:${s.g}:${s.q}`).join(","), bw: v.bw, h: v.h, apoio: Math.round(E.op.hp * 100), hPar: 0, fck, nome: v.id });
  for (const v of E.baldrames) out[v.id] = "viga.html?" + q({ vaos: v.vaos.map((s) => `${s.L}:0:0`).join(","), bw: v.bw, h: v.h, apoio: Math.round(E.op.hp * 100), hPar: M.H, pPar: E.op.pPar, fck, nome: `Baldrame ${v.id}` });
  for (const p of E.pilares) {
    out[p.id] = "pilar.html?" + q({ hx: Math.round(p.bx * 100), hy: Math.round(p.by * 100), L: p.L, lex: p.L, ley: p.L, Nk: p.N, Mxtopo: 0, Mxbase: 0, Mytopo: 0, Mybase: 0, fck });
    out["S" + p.id.slice(1)] = "sapata.html?" + q({ ap: Math.round(p.bx * 100), bp: Math.round(p.by * 100), Nk: p.N, Mxk: 0, Myk: 0, sadm: E.op.sadm, fck });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 13. Quantitativos (a partir do modelo e do pré-lançamento)          */
/* ------------------------------------------------------------------ */
const TAXA_ACO = { sapata: 50, baldrame: 80, pilar: 110, viga: 100, laje: 80 }; // kg/m³ (estimativa)
export function quantitativos(M, E, INS = instalacoes(M)) {
  const t = M.t, H = M.H, hL = M.laje;
  const area = (r) => (r.x1 - r.x0) * (r.y1 - r.y0);
  const perim = (r) => 2 * ((r.x1 - r.x0) + (r.y1 - r.y0));
  // paredes: comprimento de eixo pela área das células de parede e vãos
  const G = grid(M); let aPar = 0, aVao = 0;
  for (let i = 0; i < G.C.length; i++) for (let j = 0; j < G.C[0].length; j++) {
    const a = (G.X[i + 1] - G.X[i]) * (G.Y[j + 1] - G.Y[j]);
    if (G.C[i][j].c === 1) aPar += a; else if (G.C[i][j].c === 2) aVao += a;
  }
  const Lparede = (aPar + aVao) / t;
  const Lext = 2 * (M.W - t) + 2 * (M.D - t), Lint = Math.max(0, Lparede - Lext);
  const ext = (o) => (o.orient === "H" ? o.q0 < EPS || o.q1 > M.D - EPS : o.q0 < EPS || o.q1 > M.W - EPS);
  const vaosExt = M.O.filter(ext), vaosInt = M.O.filter((o) => !ext(o));
  const aV = (l) => l.reduce((s, o) => s + o.w * o.hgt, 0);
  // oitões (parede acima da laje nas duas laterais, até o telhado)
  let aOitao = 0; const n = 60;
  for (let k = 0; k < n; k++) { const y = (M.D * (k + 0.5)) / n; aOitao += Math.max(0, M.roofZ(y) - M.zb) * (M.D / n); }
  aOitao *= 2;
  const alvenaria = Lparede * H - aV(M.O) + aOitao;
  // revestimentos de parede
  const pInt = 2 * (M.W - 2 * t) + 2 * (M.D - 2 * t);
  const revInt = 2 * Lint * H + pInt * H - 2 * aV(vaosInt) - aV(vaosExt);
  const molh = M.rooms.filter((r) => ["b", "bs", "s", "coz"].includes(r.kind));
  let ceramParede = molh.reduce((s, r) => s + perim(r) * 1.5, 0)
    - M.O.filter((o) => o.type !== "J").reduce((s, o) => s + (molh.some((r) => (o.room || "") === r.name) ? o.w * 1.5 : 0), 0);
  if (!M.cozSep) ceramParede += (M.ds) * 1.5;                       // parede da pia na sala/cozinha
  const zParede = M.zw;                                              // parede externa até o apoio do telhado
  const revExt = 2 * (M.W + M.D) * zParede + aOitao - aV(vaosExt);
  const pisoInt = M.rooms.reduce((s, r) => s + area(r), 0), pisoVar = M.varanda ? M.W * M.dv : 0;
  const secos = M.rooms.filter((r) => ["q", "sala", "sc"].includes(r.kind));
  const rodape = secos.reduce((s, r) => s + perim(r), 0) - M.O.filter((o) => o.type !== "J").reduce((s, o) => s + o.w, 0) * 0.8;
  const tetos = pisoInt;
  const telhado = (M.W + 2 * M.b) * (M.D - M.Y0 + 2 * M.b) * Math.sqrt(1 + M.i * M.i);
  // estrutura (a partir do pré-lançamento)
  const sap = E.pilares.map((p) => { const A = p.sap.A / 100, B = p.sap.B / 100, hs = Math.max(0.25, Math.max(A - p.bx, B - p.by) / 3); return { A, B, hs }; });
  const vSap = sap.reduce((s, x) => s + x.A * x.B * x.hs, 0);
  const Lbal = E.baldrames.reduce((s, v) => s + v.vaos.reduce((a, x) => a + x.L, 0), 0);
  const vBal = E.baldrames.reduce((s, v) => s + (v.bw / 100) * (v.h / 100) * v.vaos.reduce((a, x) => a + x.L, 0), 0);
  const vPil = E.pilares.reduce((s, p) => s + p.bx * p.by * p.L, 0);
  const vVig = E.vigas.reduce((s, v) => s + (v.bw / 100) * Math.max(0, v.h / 100 - hL) * v.vaos.reduce((a, x) => a + x.L, 0), 0);
  const aLaje = E.lajes.reduce((s, l) => s + (l.lx - t) * (l.ly - t), 0), vLaje = aLaje * hL;
  const fSap = sap.reduce((s, x) => s + 2 * (x.A + x.B) * x.hs, 0);
  const fBal = E.baldrames.reduce((s, v) => s + 2 * (v.h / 100) * v.vaos.reduce((a, x) => a + x.L, 0), 0);
  const fPil = E.pilares.reduce((s, p) => s + 2 * (p.bx + p.by) * p.L, 0);
  const fVig = E.vigas.reduce((s, v) => s + (2 * Math.max(0, v.h / 100 - hL) + v.bw / 100) * v.vaos.reduce((a, x) => a + x.L, 0), 0);
  const escav = sap.reduce((s, x) => s + (x.A + 0.3) * (x.B + 0.3) * 1.5, 0) + E.baldrames.reduce((s, v) => s + (v.bw / 100 + 0.3) * 0.4 * v.vaos.reduce((a, x) => a + x.L, 0), 0);
  const Ac = M.idx.Aconst;
  const esq = {};
  for (const o of M.O) (esq[o.code] ||= { o, n: 0 }).n++;
  const I_ = (desc, un, qtd, memoria) => ({ desc, un, qtd: Math.round(qtd * 100) / 100, memoria });
  const etapas = [
    { etapa: "Serviços preliminares", itens: [
      I_("Limpeza do terreno", "m²", M.idx.Alote, "área do lote"),
      I_("Locação da obra (gabarito)", "m²", Ac, "área construída"),
    ] },
    { etapa: "Fundações", itens: [
      I_("Escavação manual (sapatas e baldrames)", "m³", escav, "sapatas (A+0,30)(B+0,30)×1,50 + baldrames (bw+0,30)×0,40×L"),
      I_("Lastro de concreto magro (5 cm)", "m³", sap.reduce((s, x) => s + x.A * x.B * 0.05, 0), "A×B×0,05 das sapatas"),
      I_("Concreto estrutural das sapatas", "m³", vSap, "A×B×h, h = maior balanço/3 (≥ 25 cm)"),
      I_("Concreto estrutural dos baldrames", "m³", vBal, `${fmt(Lbal)} m de baldrame`),
      I_("Fôrmas de sapatas e baldrames", "m²", fSap + fBal, "faces laterais"),
      I_("Aço CA-50/60 (fundações)", "kg", vSap * TAXA_ACO.sapata + vBal * TAXA_ACO.baldrame, `taxas ${TAXA_ACO.sapata} e ${TAXA_ACO.baldrame} kg/m³`),
      I_("Impermeabilização dos baldrames", "m²", Lbal * (0.15 + 0.6), "topo + 30 cm nas faces"),
    ] },
    { etapa: "Estrutura", itens: [
      I_("Concreto dos pilares", "m³", vPil, `${E.pilares.length} pilares`),
      I_("Concreto das vigas de respaldo", "m³", vVig, "seção abaixo da laje"),
      I_(`Concreto da laje maciça (h=${Math.round(hL * 100)} cm)`, "m³", vLaje, `${fmt(aLaje)} m² de laje`),
      I_("Fôrmas (pilares, vigas e laje)", "m²", fPil + fVig + aLaje, "faces de pilares, laterais e fundo de vigas, fundo de laje"),
      I_("Aço CA-50/60 (estrutura)", "kg", vPil * TAXA_ACO.pilar + vVig * TAXA_ACO.viga + vLaje * TAXA_ACO.laje, `taxas ${TAXA_ACO.pilar}/${TAXA_ACO.viga}/${TAXA_ACO.laje} kg/m³`),
    ] },
    { etapa: "Alvenaria", itens: [
      I_(`Alvenaria de vedação ${Math.round(t * 100) - 1} cm (bloco cerâmico)`, "m²", alvenaria, `${fmt(Lparede)} m de parede × ${fmt(H)} m − vãos + oitões`),
      I_("Vergas e contravergas", "m", M.O.reduce((s, o) => s + (o.w + 0.6) * (o.type === "J" ? 2 : 1), 0), "vão + 30 cm de cada lado"),
    ] },
    { etapa: "Cobertura", itens: [
      I_(`Telhado (${M.tel.nome.toLowerCase()}) com madeiramento`, "m²", telhado, `projeção × √(1+i²), i = ${Math.round(M.i * 100)}%`),
      I_("Cumeeira", "m", M.W + 2 * M.b, "comprimento da cumeeira"),
    ] },
    { etapa: "Esquadrias", itens: Object.values(esq).sort((a, b) => a.o.code.localeCompare(b.o.code, "pt", { numeric: true }))
        .map(({ o, n }) => I_(`${o.code} · ${o.type === "J" ? "janela" : o.type === "P" ? "porta" : "vão"} ${o.desc.toLowerCase()} ${fmt(o.w)} × ${fmt(o.hgt)} m`, "un", n, o.type === "J" ? `peitoril ${fmt(o.sill)} m` : ""))
        .filter((x) => !x.desc.includes("vão livre"))
        .concat([I_("Peitoris de granito", "m", M.O.filter((o) => o.type === "J").reduce((s, o) => s + o.w + 0.1, 0), "largura das janelas + 10 cm"),
          I_("Soleiras de granito (portas externas)", "m", vaosExt.filter((o) => o.type === "P").reduce((s, o) => s + o.w, 0), "")]) },
    { etapa: "Instalações elétricas", itens: [
      I_("Ponto de luz com interruptor", "un", INS.resumo.luz, "um por ambiente (NBR 5410)"),
      I_("Ponto de tomada", "un", INS.resumo.tug, "mínimos da NBR 5410 por perímetro"),
      I_("Ponto de chuveiro", "un", INS.resumo.chuv, `${fmt(INS.pChuv, 0)} W em 220 V`),
      I_("Ponto de tomada de uso específico (máquina de lavar)", "un", INS.resumo.tue - INS.resumo.chuv, ""),
      I_(`Quadro de distribuição com ${INS.circ.length} circuitos e DR`, "un", 1, `${fmt(INS.total, 0)} VA instalados`),
    ] },
    { etapa: "Instalações hidrossanitárias", itens: [
      I_("Ponto de água", "un", INS.resumo.af, "água fria"),
      I_("Ponto de esgoto", "un", INS.resumo.es, ""),
      I_("Instalação de vaso sanitário", "un", INS.resumo.vaso, ""),
      I_("Ralo sifonado", "un", INS.resumo.rs, ""),
      I_("Caixa de inspeção 60×60", "un", INS.resumo.ci, ""),
      I_("Caixa de gordura", "un", INS.resumo.cg, ""),
      I_(`Caixa d'água ${INS.reserv.caixa} L instalada`, "un", 1, `${INS.reserv.moradores} moradores × ${INS.reserv.consumo} L/dia`),
    ] },
    { etapa: "Revestimentos", itens: [
      I_("Chapisco interno e externo", "m²", revInt + revExt + tetos, "paredes + tetos"),
      I_("Emboço/reboco interno", "m²", Math.max(0, revInt - ceramParede), "paredes internas, sem as áreas com cerâmica"),
      I_("Reboco externo", "m²", revExt, "fachadas e oitões − vãos"),
      I_("Reboco do teto", "m²", tetos, "área dos ambientes"),
      I_("Revestimento cerâmico de parede (h = 1,50 m)", "m²", ceramParede, "banheiros, serviço e cozinha"),
    ] },
    { etapa: "Pisos", itens: [
      I_("Contrapiso", "m²", pisoInt + pisoVar, M.varanda ? "ambientes + varanda" : "ambientes"),
      I_("Piso cerâmico", "m²", pisoInt + pisoVar, ""),
      I_("Rodapé cerâmico", "m", Math.max(0, rodape), "quartos e sala − portas"),
    ] },
    { etapa: "Pintura", itens: [
      I_("Pintura látex PVA em tetos", "m²", tetos, ""),
      I_("Pintura látex acrílica interna", "m²", Math.max(0, revInt - ceramParede), ""),
      I_("Pintura látex acrílica externa (com selador)", "m²", revExt, ""),
    ] },
    { etapa: "Área externa", itens: [
      ...(M.lote.vaga ? [I_("Piso de concreto da vaga", "m²", 12.5, "2,50 × 5,00 m")] : []),
      ...(M.lote.caminho ? [I_("Caminho de acesso (concreto)", "m²", (M.lote.caminho.x1 - M.lote.caminho.x0) * (M.lote.caminho.y1 - M.lote.caminho.y0), "")] : []),
      I_("Limpeza final da obra", "m²", Ac, "área construída"),
    ] },
  ];
  return etapas.map((e) => ({ ...e, itens: e.itens.filter((x) => x.qtd > 0) })).filter((e) => e.itens.length);
}

/* ------------------------------------------------------------------ */
/* 14. Memorial descritivo                                             */
/* ------------------------------------------------------------------ */
export function memorial(M, E, Q, INS = instalacoes(M)) {
  const S = M.S, I = M.idx, nq = M.rooms.filter((r) => r.kind === "q").length;
  const q = (etapa, inicio) => (Q.find((e) => e.etapa === etapa)?.itens || []).find((i) => i.desc.startsWith(inicio));
  const v = (it, un = true) => (it ? `${fmt(it.qtd)}${un ? " " + it.un : ""}` : "—");
  const amb = M.rooms.map((r) => `${r.name.toLowerCase()} (${fmt((r.x1 - r.x0) * (r.y1 - r.y0))} m²)`).join(", ") + (M.varanda ? `, varanda (${fmt(I.Avar)} m²)` : "");
  const end = [S.endereco, S.bairro, S.cidade].filter(Boolean).join(", ");
  const lote = [S.lote && `lote ${S.lote}`, S.quadra && `quadra ${S.quadra}`].filter(Boolean).join(", ");
  const esqd = (Q.find((e) => e.etapa === "Esquadrias")?.itens || []).filter((i) => i.un === "un").map((i) => `${i.desc} (${fmt(i.qtd, 0)} un)`);
  return [
    { t: "1. Objeto", p: [
      `Este memorial descreve os materiais e serviços para a construção de uma residência unifamiliar térrea de ${nq} quarto${nq > 1 ? "s" : ""}${M.rooms.some((r) => r.kind === "bs") ? ", sendo uma suíte" : ""}, com área construída de ${fmt(I.Aconst)} m²${end ? `, situada em ${end}` : ""}${lote ? ` (${lote})` : ""}.`,
      `Terreno de ${fmt(M.lote.lf)} × ${fmt(M.lote.lp)} m (${fmt(I.Alote)} m²). Taxa de ocupação ${fmt(I.TO * 100, 1)}%, coeficiente de aproveitamento ${fmt(I.CA, 2)} e área permeável de ${fmt(I.Aperm)} m² (${fmt(I.perm * 100, 1)}%).`,
      `Ambientes: ${amb}.`,
    ] },
    { t: "2. Serviços preliminares", p: [
      "O terreno será limpo, com retirada de vegetação e entulho. A obra será locada com gabarito de madeira, conferindo esquadro, alinhamentos e os recuos do projeto de implantação.",
      "Serão providenciados ligação provisória de água e energia, barracão para materiais e placa da obra com os dados do responsável técnico.",
    ] },
    { t: "3. Fundações", p: [
      `Fundação direta em sapatas isoladas de concreto armado sob os ${E.pilares.length} pilares, ligadas por vigas baldrame de ${E.baldrames[0]?.bw ?? 15} × ${E.baldrames[0]?.h ?? 30} cm sob todas as paredes. Tensão admissível do solo adotada no pré-dimensionamento: ${fmt(E.op.sadm, 0)} kPa, a confirmar com sondagem (NBR 6122).`,
      `As cavas receberão lastro de concreto magro de 5 cm. Os baldrames serão impermeabilizados no topo e nas faces laterais antes do início da alvenaria. Quantidades estimadas: escavação ${v(q("Fundações", "Escavação"))}, concreto ${fmt((q("Fundações", "Concreto estrutural das sapatas")?.qtd || 0) + (q("Fundações", "Concreto estrutural dos baldrames")?.qtd || 0))} m³.`,
    ] },
    { t: "4. Estrutura", p: [
      `Estrutura em concreto armado C${E.op.fck} (NBR 6118): pilares de ${Math.round(M.t * 100)} × ${Math.round(E.op.hp * 100)} cm, vigas de respaldo sobre as paredes e laje maciça de ${Math.round(M.laje * 100)} cm sobre todos os ambientes, com o forro em ${fmt(M.H)} m de pé-direito.`,
      `Aço CA-50 e CA-60. As armaduras, cobrimentos e detalhes seguirão o projeto estrutural, que deverá ser elaborado e assinado por profissional habilitado. Concreto estimado: ${fmt((q("Estrutura", "Concreto dos pilares")?.qtd || 0) + (q("Estrutura", "Concreto das vigas")?.qtd || 0) + (q("Estrutura", "Concreto da laje")?.qtd || 0))} m³.`,
    ] },
    { t: "5. Alvenaria", p: [
      `Paredes em blocos cerâmicos de vedação de ${Math.round(M.t * 100) - 1} cm (NBR 15270), assentados com argamassa de cimento, cal e areia, em fiadas niveladas e aprumadas, amarradas aos pilares com tela ou ferro-cabelo. Área estimada: ${v(q("Alvenaria", "Alvenaria"))}.`,
      "Todas as aberturas terão vergas e contravergas de concreto armado, passando 30 cm de cada lado do vão. Os oitões laterais serão em alvenaria até a linha do telhado.",
    ] },
    { t: "6. Cobertura", p: [
      `Telhado de duas águas em ${M.tel.nome.toLowerCase()}, inclinação de ${Math.round(M.i * 100)}%, sobre estrutura de madeira tratada apoiada na laje e nos oitões, com beiral de ${fmt(M.b)} m. Área de telhado estimada: ${v(q("Cobertura", "Telhado"))}, cumeeira de ${v(q("Cobertura", "Cumeeira"))}.`,
      M.varanda ? `A varanda frontal de ${fmt(M.dv)} m terá a cobertura contínua com o telhado principal, apoiada em pilares de 15 × 15 cm.` : "As águas pluviais escoarão pelo beiral livre; calhas e condutores, se previstos, seguirão o projeto de instalações.",
    ] },
    { t: "7. Esquadrias", p: [
      `Janelas em alumínio com vidro liso de 4 mm e portas internas em madeira semi-oca com batente e guarnições; porta de entrada em madeira maciça. Relação: ${esqd.join("; ")}.`,
      `Peitoris e soleiras externas em granito. Ferragens cromadas com fechaduras de cilindro nas portas externas.`,
    ] },
    { t: "8. Revestimentos", p: [
      `Paredes internas e externas com chapisco e reboco (massa única) desempenado e feltrado. Tetos com chapisco e reboco. Áreas molhadas (banheiros${M.rooms.some((r) => r.kind === "s") ? ", área de serviço" : ""} e cozinha) com revestimento cerâmico até 1,50 m de altura, assentado com argamassa colante e rejuntado.`,
      `Quantidades estimadas: reboco interno ${v(q("Revestimentos", "Emboço"))}, reboco externo ${v(q("Revestimentos", "Reboco externo"))}, cerâmica de parede ${v(q("Revestimentos", "Revestimento cerâmico"))}.`,
    ] },
    { t: "9. Pisos", p: [
      `Contrapiso de concreto com 5 cm sobre o aterro compactado, nivelado (caimento para os ralos nas áreas molhadas), e piso cerâmico em todos os ambientes${M.varanda ? " e na varanda" : ""}, com rodapé cerâmico nos ambientes secos. Área de piso: ${v(q("Pisos", "Piso cerâmico"))}.`,
    ] },
    { t: "10. Pintura", p: [
      "Tetos em látex PVA branco; paredes internas em látex acrílico sobre massa corrida nas áreas secas; fachadas em látex acrílico sobre selador. Mínimo de duas demãos, sobre superfícies limpas e secas.",
    ] },
    { t: "11. Instalações", p: [
      `Instalações elétricas conforme NBR 5410: ${INS.resumo.luz} pontos de luz, ${INS.resumo.tug} pontos de tomada de uso geral, ${INS.resumo.chuv} chuveiro(s) e ${Math.max(0, INS.resumo.tue - INS.resumo.chuv)} tomada(s) de uso específico, em ${INS.circ.length} circuitos (${fmt(INS.total, 0)} VA instalados), com quadro de distribuição, disjuntores, dispositivo DR 30 mA nos circuitos de áreas molhadas e externas, e aterramento.`,
      `Água fria conforme NBR 5626, com ${INS.resumo.af} pontos e caixa d'água de ${INS.reserv.caixa} L sobre a laje. Esgoto conforme NBR 8160, com ${INS.resumo.es} pontos, ${INS.resumo.rs} ralos sifonados, ${INS.resumo.ci} caixas de inspeção e caixa de gordura. Os projetos executivos de instalações serão elaborados à parte.`,
    ] },
    { t: "12. Serviços complementares e limpeza", p: [
      `${M.lote.vaga ? "Vaga de carro e " : ""}caminho de acesso em piso de concreto. A obra será entregue limpa, com remoção de entulho, e com todas as instalações testadas.`,
    ] },
    { t: "Observação", p: [
      "Memorial e quantidades gerados automaticamente pelo Foster Calc a partir do estudo preliminar. Devem ser revistos e completados pelo responsável técnico, conforme os projetos executivos e as exigências do município.",
    ] },
  ];
}

/* ------------------------------------------------------------------ */
/* 15. Instalações: pontos elétricos (NBR 5410) e hidrossanitários     */
/* ------------------------------------------------------------------ */
const IZ_B1 = [[1.5, 17.5], [2.5, 24], [4, 32], [6, 41], [10, 57], [16, 76]]; // A, 2 condutores carregados, PVC, método B1
const DISJ = [10, 16, 20, 25, 32, 40, 50, 63];
function protecao(Ib, secMin) {
  const In = DISJ.find((d) => d >= Ib) || 63;
  const sec = (IZ_B1.find(([s, iz]) => s >= secMin && iz >= In) || IZ_B1[IZ_B1.length - 1])[0];
  return { In, sec };
}
export function instalacoes(M, op = {}) {
  const S = M.S, V = num(op.tensao ?? S.tensao, 127) === 220 ? 220 : 127, Vch = 220;
  const pc = num(op.pChuveiro ?? S.pChuveiro, 5500), pChuv = pc >= 2000 && pc <= 9000 ? pc : 5500;
  const ele = [], hid = [];
  const area = (r) => (r.x1 - r.x0) * (r.y1 - r.y0), perim = (r) => 2 * ((r.x1 - r.x0) + (r.y1 - r.y0));
  // portas e vãos que tocam cada face do ambiente
  const aberturasDaFace = (r, face) => M.O.filter((o) => {
    if (face === "inf") return o.orient === "H" && Math.abs(o.q1 - r.y0) < 1e-6 && o.p1 > r.x0 && o.p0 < r.x1;
    if (face === "sup") return o.orient === "H" && Math.abs(o.q0 - r.y1) < 1e-6 && o.p1 > r.x0 && o.p0 < r.x1;
    if (face === "esq") return o.orient === "V" && Math.abs(o.q1 - r.x0) < 1e-6 && o.p1 > r.y0 && o.p0 < r.y1;
    return o.orient === "V" && Math.abs(o.q0 - r.x1) < 1e-6 && o.p1 > r.y0 && o.p0 < r.y1;
  });
  // ponto no perímetro interno (anti-horário a partir do canto inferior esquerdo)
  const noPerimetro = (r, s) => {
    const w = r.x1 - r.x0, h = r.y1 - r.y0, P = 2 * (w + h); s = ((s % P) + P) % P;
    if (s < w) return { x: r.x0 + s, y: r.y0, face: "inf", n: [0, 1], u: s };
    if (s < w + h) return { x: r.x1, y: r.y0 + (s - w), face: "dir", n: [-1, 0], u: s - w };
    if (s < 2 * w + h) return { x: r.x1 - (s - w - h), y: r.y1, face: "sup", n: [0, -1], u: s - w - h };
    return { x: r.x0, y: r.y1 - (s - 2 * w - h), face: "esq", n: [1, 0], u: s - 2 * w - h };
  };
  const livre = (r, p, folga = 0.3) => {
    const w = r.x1 - r.x0, h = r.y1 - r.y0, comp = p.face === "inf" || p.face === "sup" ? w : h;
    if (p.u < 0.25 || p.u > comp - 0.25) return false;                     // longe dos cantos
    const c = p.face === "inf" || p.face === "sup" ? p.x : p.y;
    return aberturasDaFace(r, p.face).filter((o) => o.type !== "J").every((o) => c < o.p0 - folga || c > o.p1 + folga);
  };
  const distribuir = (r, n, tipo, va, circ, ocupados = []) => {
    const P = perim(r), out = [];
    for (let k = 0; k < n; k++) {
      let s = (P * (k + 0.5)) / n, p = noPerimetro(r, s), tent = 0;
      while ((!livre(r, p) || ocupados.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.6)) && tent < 40) { tent++; s += (tent % 2 ? 1 : -1) * 0.15 * tent; p = noPerimetro(r, s); }
      const pt = { tipo, x: p.x, y: p.y, n: p.n, va, circ, room: r.name, h: tipo === "tugA" ? 1.1 : 0.3 };
      out.push(pt); ocupados.push(pt);
    }
    return out;
  };
  const molhado = (r) => ["coz", "sc", "s"].includes(r.kind);
  for (const r of M.rooms) {
    const A = area(r), P = perim(r);
    // iluminação (ponto no teto)
    const vaLuz = A <= 6 ? 100 : 100 + 60 * Math.floor((A - 6) / 4 + 1e-9);
    ele.push({ tipo: "luz", x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, va: vaLuz, circ: "ILUM", room: r.name });
    // tomadas
    const ocup = [];
    if (r.kind === "b" || r.kind === "bs") {
      const ladoL = r.door !== "L", xw = ladoL ? r.x0 : r.x1;
      ele.push({ tipo: "tugA", x: xw, y: r.y0 + 0.9, n: [ladoL ? 1 : -1, 0], va: 600, circ: "TUG-BAN", room: r.name, h: 1.1 });
      const box = r.y1 - Math.min(0.9, r.y1 - r.y0 - 1.4) / 2;
      ele.push({ tipo: "tue", x: (r.x0 + r.x1) / 2, y: r.y1, n: [0, -1], va: pChuv, circ: "CHUV", room: r.name, h: 2.2, rot: "CH" });
      void box;
    } else if (molhado(r)) {
      let nT = Math.max(1, Math.ceil(P / 3.5 - 1e-9));
      const pts = [];
      if (r.kind !== "s") {          // bancada da pia: 2 tomadas na parede da pia
        const pc = (r.y0 + r.y1) / 2;
        for (const dy of [-0.45, 0.45]) { const p = { tipo: "tugA", x: r.x1, y: pc + dy, n: [-1, 0], room: r.name, h: 1.1 }; pts.push(p); ocup.push(p); }
        nT = Math.max(nT, 2);
      }
      const resto = Math.max(0, nT - pts.length);
      if (r.kind === "sc") {         // sala/cozinha: tomadas da cozinha (3,5 m) só na metade da pia; a sala segue 5 m
        const cozP = (r.y1 - r.y0) * 2 + Math.min(3, (r.x1 - r.x0) / 2) * 2;
        const nC = Math.max(2, Math.ceil(cozP / 3.5 - 1e-9));
        const meia = { ...r, x0: r.x1 - Math.min(3, (r.x1 - r.x0) / 2) };
        pts.push(...distribuir(meia, nC - 2, "tug", 0, "", ocup));
        const sala = { ...r, x1: meia.x0 };
        const nS = Math.max(1, Math.ceil((2 * (sala.x1 - sala.x0) + 2 * (sala.y1 - sala.y0)) / 5 - 1e-9));
        distribuir(sala, nS, "tug", 100, "TUG-SOC", ocup).forEach((p) => ele.push(p));
      } else pts.push(...distribuir(r, resto, "tug", 0, "", ocup));
      pts.forEach((p, i) => ele.push({ ...p, va: i < 3 ? 600 : 100, circ: r.kind === "s" ? "TUG-SERV" : "TUG-COZ", room: r.name }));
      if (r.kind === "s") ele.push({ tipo: "tue", x: Math.min(r.x0 + 0.95, r.x1 - 0.3), y: r.y1, n: [0, -1], va: 1000, circ: "MLR", room: r.name, h: 0.9, rot: "MLR" });
    } else {
      const nT = A <= 6 ? 1 : Math.max(1, Math.ceil(P / 5 - 1e-9));
      distribuir(r, nT, "tug", 100, "TUG-SOC", ocup).forEach((p) => ele.push(p));
    }
  }
  if (!M.rooms.some((r) => r.kind === "s")) {                           // sem área de serviço: máquina na cozinha
    const k = M.rooms.find((r) => r.kind === "coz" || r.kind === "sc");
    ele.push({ tipo: "tue", x: k.x1, y: Math.max(k.y0 + 0.4, (k.y0 + k.y1) / 2 - 1.3), n: [-1, 0], va: 1000, circ: "MLR", room: k.name, h: 0.9, rot: "MLR" });
  }
  if (M.varanda) {
    ele.push({ tipo: "luz", x: M.W * 0.4, y: -M.dv / 2, va: 100, circ: "ILUM", room: "VARANDA" });
    ele.push({ tipo: "tug", x: M.W * 0.2, y: 0, n: [0, -1], va: 100, circ: "TUG-SOC", room: "VARANDA", h: 0.3 });
  }
  // interruptores junto às portas (lado da fechadura, dentro do ambiente)
  for (const r of M.rooms) {
    const portas = M.O.filter((o) => o.type !== "J" && ((o.orient === "H" && o.p1 > r.x0 && o.p0 < r.x1 && (Math.abs(o.q1 - r.y0) < 1e-6 || Math.abs(o.q0 - r.y1) < 1e-6))
      || (o.orient === "V" && o.p1 > r.y0 && o.p0 < r.y1 && (Math.abs(o.q1 - r.x0) < 1e-6 || Math.abs(o.q0 - r.x1) < 1e-6))));
    const o = portas.find((x) => x.entrada) || portas.find((x) => x.room === r.name) || portas.find((x) => x.type === "P") || portas[0];
    if (!o) continue;
    const hinge = o.swing ? (o.orient === "H" ? o.swing.h[0] : o.swing.h[1]) : o.p0;
    const latch = Math.abs(hinge - o.p0) < 1e-6 ? o.p1 + 0.15 : o.p0 - 0.15;
    let x, y, n;
    if (o.orient === "H") { x = latch; y = Math.abs(o.q1 - r.y0) < 1e-6 ? r.y0 : r.y1; n = [0, y === r.y0 ? 1 : -1]; }
    else { y = latch; x = Math.abs(o.q1 - r.x0) < 1e-6 ? r.x0 : r.x1; n = [x === r.x0 ? 1 : -1, 0]; }
    x = clamp(x, r.x0 + 0.1, r.x1 - 0.1); y = clamp(y, r.y0 + 0.1, r.y1 - 0.1);
    ele.push({ tipo: "int", x, y, n, va: 0, circ: "", room: r.name, h: 1.1, rot: M.varanda && o.entrada ? "S2" : "S" });
  }
  // quadro de distribuição: parede da frente, ao lado da porta de entrada (lado da dobradiça)
  const ent = M.O.find((o) => o.entrada), sala = M.sala;
  const xq = ent.p0 - 0.45 > sala.x0 + 0.3 ? ent.p0 - 0.45 : ent.p1 + 0.6;
  ele.push({ tipo: "qd", x: xq, y: M.t, n: [0, 1], va: 0, circ: "", room: sala.name, h: 1.5 });

  // circuitos
  const grupo = (c) => ele.filter((p) => p.circ === c);
  const circ = [];
  const add = (nome, pts, tensao, secMin, dr) => {
    if (!pts.length) return;
    const va = pts.reduce((s, p) => s + p.va, 0), Ib = va / tensao;
    const { In, sec } = protecao(Ib, secMin);
    const id = `C${circ.length + 1}`;
    pts.forEach((p) => (p.cid = id));
    circ.push({ id, nome, n: pts.length, va, tensao, Ib, In, sec, dr });
  };
  const ilum = grupo("ILUM"), vaIl = ilum.reduce((s, p) => s + p.va, 0);
  if (vaIl > 1200) { const fr = ilum.filter((p) => p.y < M.yi0), fu = ilum.filter((p) => p.y >= M.yi0); add("Iluminação social", fr, V, 1.5, false); add("Iluminação íntima", fu, V, 1.5, false); }
  else add("Iluminação", ilum, V, 1.5, false);
  const soc = grupo("TUG-SOC"), ext = soc.some((p) => p.room === "VARANDA");   // tomada externa pede DR
  if (soc.reduce((s, p) => s + p.va, 0) > 1800) { const h = Math.ceil(soc.length / 2); add("Tomadas sala/quartos (1)", soc.slice(0, h), V, 2.5, soc.slice(0, h).some((p) => p.room === "VARANDA")); add("Tomadas sala/quartos (2)", soc.slice(h), V, 2.5, soc.slice(h).some((p) => p.room === "VARANDA")); }
  else add(ext ? "Tomadas sala, quartos e varanda" : "Tomadas sala e quartos", soc, V, 2.5, ext);
  add("Tomadas cozinha", grupo("TUG-COZ"), V, 2.5, true);
  add("Tomadas área de serviço", grupo("TUG-SERV"), V, 2.5, true);
  add("Tomadas banheiros", grupo("TUG-BAN"), V, 2.5, true);
  grupo("CHUV").forEach((p) => add(`Chuveiro (${p.room.toLowerCase()})`, [p], Vch, 2.5, true));
  add("Máquina de lavar", grupo("MLR"), V, 2.5, true);
  const total = circ.reduce((s, c) => s + c.va, 0);

  // hidrossanitário
  const H = (tipo, x, y, ap, room, extra = {}) => hid.push({ tipo, x, y, ap, room, ...extra });
  for (const r of M.rooms) {
    if (r.kind === "b" || r.kind === "bs") {
      const ladoL = r.door !== "L", xw = ladoL ? r.x0 : r.x1, sg = ladoL ? 1 : -1;
      const boxD = Math.min(0.9, (r.y1 - r.y0) - 1.4), vy = r.y0 + Math.min(1.35, (r.y1 - r.y0) - boxD - 0.45);
      H("AF", xw, vy + 0.15, "Vaso", r.name); H("ES", xw + sg * 0.3, vy, "Vaso (100)", r.name, { d: 100 });
      if (vy - 0.25 > r.y0 + 0.62) { H("AF", xw, r.y0 + 0.37, "Lavatório", r.name); H("ES", xw + sg * 0.12, r.y0 + 0.25, "Lavatório (40)", r.name, { d: 40 }); }
      H("AF", (r.x0 + r.x1) / 2, r.y1, "Chuveiro", r.name);
      H("RS", (r.x0 + r.x1) / 2, r.y1 - boxD / 2, "Ralo sifonado (box)", r.name);
      H("RS", (r.x0 + r.x1) / 2 + sg * 0.2, r.y0 + 0.5, "Ralo sifonado", r.name);
    } else if (r.kind === "coz" || r.kind === "sc") {
      const pc = (r.y0 + r.y1) / 2;
      H("AF", r.x1, pc - 0.1, "Pia", r.name); H("ES", r.x1 - 0.2, pc - 0.1, "Pia (50)", r.name, { d: 50 });
    } else if (r.kind === "s") {
      H("AF", r.x0 + 0.28, r.y1, "Tanque", r.name); H("ES", r.x0 + 0.28, r.y1 - 0.2, "Tanque (40)", r.name, { d: 40 });
      H("AF", Math.min(r.x0 + 0.95, r.x1 - 0.3), r.y1, "Máquina de lavar", r.name); H("ES", Math.min(r.x0 + 0.95, r.x1 - 0.3), r.y1 - 0.2, "Máquina (50)", r.name, { d: 50 });
      H("RS", (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, "Ralo sifonado", r.name);
    }
  }
  if (!M.rooms.some((r) => r.kind === "s")) {
    const k = M.rooms.find((r) => r.kind === "coz" || r.kind === "sc"), yk = Math.max(k.y0 + 0.4, (k.y0 + k.y1) / 2 - 1.3);
    H("AF", k.x1, yk, "Máquina de lavar", k.name); H("ES", k.x1 - 0.2, yk, "Máquina (50)", k.name, { d: 50 });
  }
  // caixas externas: inspeção atrás das áreas molhadas do fundo, gordura ao lado da cozinha
  const fundoMolh = M.rooms.filter((r) => ["b", "bs", "s"].includes(r.kind));
  fundoMolh.forEach((r) => H("CI", (r.x0 + r.x1) / 2, M.D + 0.8, "Caixa de inspeção 60×60", r.name));
  const kz = M.rooms.find((r) => r.kind === "coz" || r.kind === "sc");
  H("CG", M.W + 0.8, (kz.y0 + kz.y1) / 2, "Caixa de gordura", kz.name);
  H("CI", M.W + 0.8, M.D + 0.8, "Caixa de inspeção 60×60", "");
  const moradores = M.rooms.filter((r) => r.kind === "q").length * 2;
  const litros = moradores * 150;
  const caixa = [500, 1000, 1500, 2000, 3000].find((v) => v >= litros) || 3000;
  return {
    ele, circ, total, V, pChuv, hid,
    reserv: { moradores, consumo: 150, litros, caixa },
    resumo: {
      luz: ele.filter((p) => p.tipo === "luz").length, tug: ele.filter((p) => p.tipo === "tug" || p.tipo === "tugA").length,
      chuv: ele.filter((p) => p.rot === "CH").length, tue: ele.filter((p) => p.tipo === "tue").length, int: ele.filter((p) => p.tipo === "int").length,
      af: hid.filter((p) => p.tipo === "AF").length, es: hid.filter((p) => p.tipo === "ES").length, rs: hid.filter((p) => p.tipo === "RS").length,
      ci: hid.filter((p) => p.tipo === "CI").length, cg: hid.filter((p) => p.tipo === "CG").length, vaso: hid.filter((p) => p.ap === "Vaso").length,
    },
  };
}
