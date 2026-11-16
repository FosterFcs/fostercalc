// Supabase Edge Function: planta-ia
// Foster Calc · Planta IA — transforma a descrição da casa (texto ou voz) nos campos do módulo.
// A chave fica só aqui (secret GROQ_API_KEY, a mesma do orca-ia). Só planos Estudante e Pro usam.
// Secrets: GROQ_API_KEY; ALLOWED_ORIGINS (opcional, origens separadas por vírgula)
// Publicar: supabase functions deploy planta-ia --no-verify-jwt   (a função confere o login sozinha)

const GROQ = "https://api.groq.com/openai/v1";
const MAX_TEXTO = 3000;
const MAX_AUDIO = 8 * 1024 * 1024;

function cors(origin: string | null) {
  const env = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = env.length ? env : ["https://fostercalc.com.br", "https://www.fostercalc.com.br", "https://fosterfcs.github.io"];
  const ok = !!origin && (allowed.includes(origin) || /^https:\/\/[a-z0-9-]+\.fostercalc\.com\.br$/.test(origin));
  return {
    ok,
    headers: {
      "Access-Control-Allow-Origin": ok && origin ? origin : allowed[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
      "Vary": "Origin",
    },
  };
}
const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

// campos aceitos e limites (o app ainda confere tudo de novo antes de desenhar)
const NUM: Record<string, [number, number]> = {
  nq: [1, 3], qw0: [2.2, 5], qw1: [2.2, 5], qw2: [2.2, 5], db: [2.4, 5], bw: [1.2, 3], ds: [2.8, 6],
  bsw: [1.1, 3], kw: [2, 5], sw: [1.2, 3], dv: [1, 4], H: [2.4, 4], laje: [0.08, 0.2], beiral: [0.3, 1.2],
  lvw: [1, 2], gw: [2.6, 4.5], gl: [4.5, 7],
  lf: [3, 100], lp: [5, 200], rf: [0, 30], afE: [0, 50], calc: [0, 6], norte: [-360, 360], esquina: [0, 1000],
};
const BOOL = ["suite", "cozSep", "serv", "varanda", "vaga", "lavabo", "garagem"];
const TXT: Record<string, number> = { rua: 60, ruaLat: 40, quadra: 12, lote: 12, bairro: 40, cidade: 40, proprietario: 70, endereco: 78, titulo: 44 };

function limpar(c: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, [a, b]] of Object.entries(NUM)) {
    if (c[k] == null || c[k] === "") continue;
    const n = Number(String(c[k]).replace(",", "."));
    if (Number.isFinite(n)) out[k] = Math.round(Math.min(b, Math.max(a, n)) * 100) / 100;
  }
  if (out.nq != null) out.nq = Math.round(out.nq as number);
  for (const k of BOOL) if (typeof c[k] === "boolean") out[k] = c[k];
  if (c.t === 0.15 || c.t === 0.2 || c.t === "0.15" || c.t === "0.2") out.t = Number(c.t);
  if (["ceramica", "concreto", "fibrocimento"].includes(String(c.telha))) out.telha = String(c.telha);
  if (c.aguas === 2 || c.aguas === 4 || c.aguas === "2" || c.aguas === "4") out.aguas = Number(c.aguas);
  for (const [k, n] of Object.entries(TXT)) if (typeof c[k] === "string" && c[k]) out[k] = (c[k] as string).trim().slice(0, n);
  return out;
}

const SISTEMA = `Você é o assistente do módulo Foster Projeto do Foster Calc. Ele desenha o projeto legal de UMA CASA TÉRREA
(planta, cortes, fachadas, implantação) a partir de campos fixos. Leia a descrição do usuário (português do Brasil, às vezes
transcrita de áudio, com erros) e devolva SOMENTE JSON no formato:
{"campos": {...}, "resumo": "uma frase do que foi entendido", "observacoes": ["..."]}

Tipologia: casa retangular com quartos e banheiros enfileirados no fundo; sala/cozinha na frente; laje plana;
telhado de duas ou quatro águas; garagem coberta opcional na lateral esquerda.
Campos possíveis (use só os que a descrição pedir ou deixar claros; medidas em metros, números com ponto):
- nq: quantidade de quartos (1 a 3), contando a suíte
- qw0, qw1, qw2: largura de cada quarto (2,2 a 5). "quartos de 3x3" → largura 3 e db 3
- db: profundidade dos quartos e banheiros (2,4 a 5)
- suite: true se o quarto 1 for suíte; bsw: largura do banho da suíte (1,1 a 3)
- bw: largura do banheiro social (1,2 a 3)
- ds: profundidade da sala/cozinha (2,8 a 6)
- cozSep: true para cozinha separada da sala; false se pedir cozinha americana ou integrada; kw: largura da cozinha (2 a 5)
- serv: true se pedir área de serviço/lavanderia; sw: largura (1,2 a 3)
- varanda: true se pedir varanda/alpendre na frente; dv: profundidade (1 a 4)
- lavabo: true se pedir lavabo; lvw: largura (1 a 2)
- garagem: true se pedir garagem coberta/abrigo para carro; gw: largura (2,6 a 4,5); gl: comprimento (4,5 a 7)
- aguas: 2 ou 4 (telhado de duas ou quatro águas)
- H: pé-direito (2,4 a 4); laje: espessura (0,08 a 0,2); t: parede 0.15 ou 0.2
- telha: "ceramica", "concreto" ou "fibrocimento"; beiral (0,3 a 1,2)
- lf: frente do terreno; lp: profundidade do terreno ("terreno 10x25" → lf 10, lp 25); rf: recuo frontal;
  afE: afastamento lateral esquerdo; calc: largura do passeio; norte: ângulo do norte em graus
- vaga: true/false para vaga de carro descoberta no terreno (com garagem coberta, não precisa)
- rua, quadra, lote, bairro, cidade, esquina (distância até a esquina em m), ruaLat (rua da esquina), proprietario, endereco, titulo

Regras:
- Se pedir uma área total (ex. "casa de 60 m²"), ajuste larguras e profundidades para chegar perto.
  Área fechada ≈ (soma das larguras dos ambientes do fundo + 0,15 × (n.º de ambientes + 1)) × (ds + db + 0,45).
- Se o terreno for informado, a casa precisa caber na frente dele com cerca de 1,50 m de cada lado:
  largura da casa ≈ soma das larguras dos ambientes do fundo + 0,15 × (n.º de ambientes + 1) ≤ frente − 3
  (com garagem coberta, desconte também a largura da garagem).
  Reduza as larguras (quartos até 2,5; banheiros e serviço até 1,2) e, se ainda assim não couber, diga em "observacoes".
- Não invente nomes, endereços nem medidas que não foram ditos, exceto para atingir uma área pedida.
- Em "observacoes", liste em frases curtas o que foi pedido e o módulo NÃO faz (sobrado, casa em L, segundo banheiro social,
  piscina, churrasqueira, edícula, mais de 3 quartos, closet, escritório etc.)
  e as dúvidas importantes. Se não houver, use [].
- Responda só o JSON, sem texto fora dele.`;

Deno.serve(async (req) => {
  const { ok, headers } = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (!ok) return json({ erro: "origem não permitida" }, 403, headers);
  if (req.method !== "POST") return json({ erro: "use POST" }, 405, headers);

  const key = Deno.env.get("GROQ_API_KEY");
  const acao = new URL(req.url).searchParams.get("acao");
  if (acao === "ping") return json({ ok: true, chave: !!key }, 200, headers);
  if (!key) return json({ erro: "IA não configurada" }, 500, headers);

  // só Estudante e Pro: confere o plano do usuário logado
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ erro: "login_necessario" }, 401, headers);
  const sbUrl = Deno.env.get("SUPABASE_URL")!, sbAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const conta = await fetch(`${sbUrl}/rest/v1/rpc/plano_atual`, {
    method: "POST", headers: { apikey: sbAnon, Authorization: auth, "Content-Type": "application/json" }, body: "{}",
  });
  if (!conta.ok) return json({ erro: "login_necessario" }, 401, headers);
  const plano = await conta.json();
  if (plano !== "pro" && plano !== "estudante") return json({ erro: "plano_gratis" }, 402, headers);

  try {
    if (acao === "interpretar") {
      const { texto } = await req.json();
      if (typeof texto !== "string" || !texto.trim()) return json({ erro: "texto vazio" }, 400, headers);
      if (texto.length > MAX_TEXTO) return json({ erro: "texto muito longo" }, 413, headers);
      const r = await fetch(`${GROQ}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", temperature: 0, response_format: { type: "json_object" },
          messages: [{ role: "system", content: SISTEMA }, { role: "user", content: texto }],
        }),
      });
      if (!r.ok) return json({ erro: "falha na IA", status: r.status }, 502, headers);
      const j = await r.json();
      const bruto = JSON.parse(j.choices[0].message.content || "{}");
      const obs = Array.isArray(bruto.observacoes) ? bruto.observacoes.filter((x: unknown) => typeof x === "string").slice(0, 8).map((x: string) => x.slice(0, 200)) : [];
      return json({ campos: limpar(bruto.campos || {}), resumo: String(bruto.resumo || "").slice(0, 300), observacoes: obs }, 200, headers);
    }
    if (acao === "transcrever") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return json({ erro: "áudio ausente" }, 400, headers);
      if (file.size > MAX_AUDIO) return json({ erro: "áudio muito longo" }, 413, headers);
      const fd = new FormData();
      fd.append("file", file, file.name || "audio.webm");
      fd.append("model", "whisper-large-v3-turbo");
      fd.append("language", "pt");
      const r = await fetch(`${GROQ}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd });
      if (!r.ok) return json({ erro: "falha na transcrição", status: r.status }, 502, headers);
      const j = await r.json();
      return json({ text: j.text || "" }, 200, headers);
    }
    return json({ erro: "ação inválida" }, 400, headers);
  } catch (e) {
    return json({ erro: "erro interno", detalhe: String(e) }, 500, headers);
  }
});
