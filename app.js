// Foster Calc — camada comum: login, plano, projetos salvos, barra superior e downloads.
// Usa a chave publicável do Supabase (segura no navegador; o acesso é controlado por RLS).
(function () {
  const CONFIG = {
    url: 'https://fvsdlpnvqfvjdxmfgbjx.supabase.co',
    chave: 'sb_publishable_VT3XEbInyTr2Eu-AuLnrqw_BOrA2jYy',
    precoPro: 'R$ 29,90/mês',                         // plano mensal (preço de lançamento)
    precoAnual: 'R$ 299/ano',                         // plano anual
    anualEquivale: 'R$ 24,92/mês',                    // anual dividido por 12
    precoEst: 'R$ 9,90/mês',                          // plano Estudante mensal
    precoEstAnual: 'R$ 79/ano',                       // plano Estudante anual
    // links públicos de pagamento (Asaas). O cliente deve pagar com o mesmo e-mail do cadastro no Foster Calc.
    linksPagamento: {
      'est-mensal': 'https://www.asaas.com/c/6o5n5wj2u1r0zrdp',
      'est-anual': 'https://www.asaas.com/c/2hnn8c4mfn57zq2a',
      mensal: 'https://www.asaas.com/c/oio2jw9yiygf6csf',
      anual: 'https://www.asaas.com/c/zjevnkzmkp66gzda',
    },
    whatsapp: '5524992096103',                        // contato comercial para assinar o Pro
  };
  const sb = window.supabase ? window.supabase.createClient(CONFIG.url, CONFIG.chave) : null;
  let sessao = null, perfil = null, pro = false, plano = 'gratis';
  const ouvintes = [];

  // ---------- estilos da barra e dos diálogos ----------
  const css = `
  .fc-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;padding-block:10px;margin-bottom:6px;font:500 .9rem var(--f-body,system-ui)}
  .fc-logo{font:700 1.25rem/1 var(--f-display,system-ui);letter-spacing:.02em;color:var(--ink);text-decoration:none;display:flex;align-items:center;gap:8px}
  .fc-logo b{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:5px;background:var(--accent);color:var(--sheet);font-size:.95rem}
  .fc-nav{display:flex;gap:4px;flex:1 1 auto;min-width:0;overflow-x:auto;scrollbar-width:none}
  .fc-nav::-webkit-scrollbar{display:none}
  .fc-nav a{color:var(--muted);text-decoration:none;padding:6px 10px;border-radius:4px;white-space:nowrap}
  .fc-nav a[aria-current="page"]{color:var(--ink);background:var(--sheet);box-shadow:inset 0 -2px 0 var(--accent)}
  .fc-nav a:hover{color:var(--ink)}
  .fc-user{display:flex;align-items:center;gap:8px;margin-left:auto}
  .fc-btn{font:600 .85rem var(--f-body,system-ui);border-radius:4px;padding:7px 12px;cursor:pointer;border:1px solid var(--accent);background:var(--accent);color:var(--sheet)}
  .fc-btn.ghost{background:transparent;color:var(--accent)}
  .fc-btn:disabled{opacity:.5;cursor:wait}
  .fc-plano{font:600 .66rem var(--f-body,system-ui);letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:99px;background:var(--line);color:var(--muted)}
  .fc-plano.pro{background:var(--accent);color:var(--sheet)}
  .fc-plano.est{background:var(--ink);color:var(--sheet)}
  .fc-q{margin-left:6px;width:18px;height:18px;border-radius:50%;border:1px solid var(--accent,#c4161c);background:transparent;color:var(--accent,#c4161c);font:700 .7rem/1 var(--f-body,system-ui);cursor:pointer;padding:0;vertical-align:1px}
  .fc-q[aria-expanded="true"]{background:var(--accent,#c4161c);color:var(--sheet,#fff)}
  tr.fc-exp td{background:var(--accent-soft,#f8e3e3);font:400 .82rem/1.5 var(--f-body,system-ui);color:var(--ink,#141414);padding:8px 12px;white-space:normal}
  .fc-alarme{position:fixed;left:50%;transform:translateX(-50%);width:max-content;flex-direction:row;line-height:1.2;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:50;display:flex;gap:10px;align-items:center;max-width:calc(100vw - 24px);background:var(--bad,#a3121a);color:#fff;border:0;border-radius:999px;padding:10px 18px;font:500 .9rem var(--f-body,system-ui);box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;animation:fcPulso 1.6s ease-in-out 3}
  .fc-alarme b,.fc-alarme span{white-space:nowrap}
  .fc-alarme span{opacity:.85;text-decoration:underline}
  @keyframes fcPulso{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.05)}}
  @media (prefers-reduced-motion:reduce){.fc-alarme{animation:none}}
  .fc-campo-erro{outline:2px solid var(--bad,#a3121a)!important;outline-offset:1px;background:var(--bad-soft,#f6e1df)!important}
  .fc-didatico{font-size:.8rem;color:var(--muted,#666);margin:0 0 8px}
  .fc-mail{color:var(--muted);font-size:.82rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fc-dlg{border:1px solid var(--line);border-radius:8px;padding:0;background:var(--sheet);color:var(--ink);width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 32px)}
  .fc-dlg::backdrop{background:rgb(10 14 12 / .45)}
  .fc-dlg form,.fc-dlg .fc-in{padding:20px 22px;display:flex;flex-direction:column;gap:12px}
  .fc-dlg h3{font:600 1.4rem/1.1 var(--f-display,system-ui);text-transform:uppercase;letter-spacing:.02em;margin:0}
  .fc-dlg p{margin:0;font-size:.9rem;color:var(--muted)}
  .fc-dlg label{display:flex;flex-direction:column;gap:4px;font-size:.8rem;color:var(--muted)}
  .fc-dlg input{font:500 .95rem var(--f-mono,monospace);color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:8px 10px}
  .fc-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .fc-link{background:none;border:0;color:var(--accent);cursor:pointer;font:500 .85rem var(--f-body,system-ui);padding:0}
  .fc-erro{color:var(--bad);font-size:.85rem}
  .fc-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;max-height:50vh;overflow:auto;border-top:1px solid var(--line)}
  .fc-lista li{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:9px 2px;border-bottom:1px solid var(--line)}
  .fc-lista small{display:block;color:var(--muted);font-size:.76rem}
  .fc-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);transform:translateX(-50%);background:var(--ink);color:var(--sheet);padding:9px 14px;border-radius:6px;font:500 .88rem var(--f-body,system-ui);z-index:50;max-width:calc(100vw - 32px)}
  .fc-plans{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .fc-plans div{border:1px solid var(--line);border-radius:6px;padding:10px 12px;font-size:.84rem;cursor:pointer}
  .fc-grupo{margin:12px 0 6px!important;font:600 .74rem var(--f-body,system-ui);text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
  .fc-nota{font-size:.8rem;color:var(--muted)}
  .fc-plans div:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .fc-plans div.on{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
  .fc-plans b{display:block;font:600 1.05rem var(--f-display,system-ui);text-transform:uppercase}
  .fc-plans ul{margin:6px 0 0;padding-left:16px;color:var(--muted)}
  .fc-nome{background:none;border:0;padding:0;cursor:pointer;font:500 .82rem var(--f-body,system-ui);color:var(--ink);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:3px}
  .fc-nome:hover{text-decoration-color:var(--accent)}
  .fc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .fc-grid2 .full{grid-column:1/-1}
  .fc-logo-prev{display:flex;align-items:center;gap:12px;border:1px dashed var(--line);border-radius:6px;padding:10px;min-height:64px}
  .fc-logo-prev img{max-width:150px;max-height:56px;object-fit:contain;background:#fff;border-radius:3px}
  .fc-abas{display:flex;gap:6px;margin:-8px 0 18px;flex-wrap:wrap}
  .fc-copy{margin:28px 0 0;padding-top:12px;border-top:1px solid var(--line,#ddd);font-size:.78rem;color:var(--muted,#666);display:flex;flex-wrap:wrap;gap:4px 16px;justify-content:space-between}
  .fc-copy a{color:inherit}
  .fc-abas a{font:600 .85rem var(--f-body,system-ui);text-decoration:none;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:5px 14px;background:var(--sheet)}
  .fc-abas a[aria-current="page"]{color:var(--sheet);background:var(--ink);border-color:var(--ink)}
  .fc-obra{display:grid;grid-template-columns:2fr 1.4fr 1fr;gap:10px;margin:0 0 14px}
  @media (max-width:700px){.fc-obra{grid-template-columns:1fr}}
  .fc-obra label{display:flex;flex-direction:column;gap:4px;font-size:.78rem;color:var(--muted);min-width:0}
  .fc-obra input{font:500 .9rem var(--f-body,system-ui);color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:7px 9px;width:100%}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function toast(t) { const d = document.createElement('div'); d.className = 'fc-toast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); }
  function dialogo(html) {
    const d = document.createElement('dialog'); d.className = 'fc-dlg'; d.innerHTML = html; document.body.appendChild(d);
    d.addEventListener('close', () => setTimeout(() => d.remove(), 50));
    d.addEventListener('click', ev => { if (ev.target === d) d.close(); });
    d.showModal(); return d;
  }

  // ---------- sessão e plano ----------
  async function carregarPerfil() {
    perfil = null; pro = false; plano = 'gratis';
    if (!sb || !sessao) return;
    const { data } = await sb.from('perfis').select('nome, registro_profissional, empresa, telefone, email_contato, cidade, logo_path, plano, plano_ate').eq('id', sessao.user.id).maybeSingle();
    perfil = data;
    const r = await sb.rpc('plano_atual');
    if (!r.error && typeof r.data === 'string') plano = r.data;
    else { const r2 = await sb.rpc('plano_ativo'); plano = r2.data ? 'pro' : 'gratis'; }
    pro = plano === 'pro';
    await carregarLogo();
  }
  let logo = null, logoPath = null;                      // { data: dataURL, w, h }
  async function carregarLogo() {
    const p = perfil?.logo_path || null;
    if (p === logoPath) return; logoPath = p; logo = null;
    if (!p) return;
    try {
      const { data, error } = await sb.storage.from('logos').download(p);
      if (error || !data) return;
      logo = await blobParaLogo(data);
    } catch (e) { logo = null; }
  }
  function blobParaLogo(blob) {
    return new Promise((ok, falha) => {
      const fr = new FileReader();
      fr.onload = () => { const img = new Image(); img.onload = () => ok({ data: fr.result, w: img.naturalWidth, h: img.naturalHeight }); img.onerror = falha; img.src = fr.result; };
      fr.onerror = falha; fr.readAsDataURL(blob);
    });
  }
  // reduz a imagem para no máximo 900×360 px e grava em PNG (mantém transparência)
  function prepararLogo(file) {
    return new Promise((ok, falha) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 900 / img.naturalWidth, 360 / img.naturalHeight);
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(b => b ? ok(b) : falha(new Error('conversão')), 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('imagem')); };
      img.src = url;
    });
  }

  function telaPerfil() {
    if (!sessao) return entrar('Entre na sua conta para editar o perfil.');
    const p = perfil || {};
    const campo = (n, rot, ph, extra = '') => `<label${extra}>${rot}<input name="${n}" value="${esc(p[n] || '')}" placeholder="${esc(ph)}" maxlength="120"></label>`;
    const d = dialogo(`<form method="dialog" novalidate><h3>Meu perfil</h3>
      <p>Esses dados aparecem no cabeçalho e no carimbo da memória de cálculo em PDF.</p>
      <div class="fc-grid2">
        ${campo('nome', 'Nome do responsável técnico', 'Eng. Civil Fulano de Tal', ' class="full"')}
        ${campo('registro_profissional', 'CREA / CAU', 'CREA-SP 000000000')}
        ${campo('empresa', 'Empresa', 'Sua empresa Ltda.')}
        ${campo('telefone', 'Telefone', '(11) 90000-0000')}
        ${campo('cidade', 'Cidade / UF', 'São Paulo/SP')}
        ${campo('email_contato', 'E-mail de contato', 'contato@empresa.com.br', ' class="full"')}
      </div>
      <div><span style="font-size:.8rem;color:var(--muted)">Logo (PNG ou JPG)</span>
        <div class="fc-logo-prev"><span data-prev>${logo ? `<img src="${logo.data}" alt="Logo atual">` : '<span style="color:var(--muted);font-size:.85rem">Sem logo</span>'}</span>
          <div class="fc-row"><label class="fc-btn ghost" style="flex-direction:row;color:var(--accent)">Escolher arquivo<input type="file" name="logo" accept="image/png,image/jpeg" hidden></label>
          <button type="button" class="fc-link" data-rm ${logo ? '' : 'hidden'}>Remover</button></div></div></div>
      <span class="fc-erro" data-erro role="alert"></span>
      <div class="fc-row"><button class="fc-btn" data-ok>Salvar perfil</button><button class="fc-btn ghost" type="button" data-fechar>Cancelar</button></div></form>`);
    const f = d.querySelector('form'), erro = d.querySelector('[data-erro]');
    let novoLogo = null, removerLogo = false;
    d.querySelector('[data-fechar]').onclick = () => d.close();
    f.logo.addEventListener('change', async () => {
      const file = f.logo.files[0]; if (!file) return; erro.textContent = '';
      if (!/^image\/(png|jpeg)$/.test(file.type)) { erro.textContent = 'Use uma imagem PNG ou JPG.'; return; }
      if (file.size > 8 * 1024 * 1024) { erro.textContent = 'Imagem muito grande (máximo 8 MB).'; return; }
      try { novoLogo = await prepararLogo(file); removerLogo = false;
        d.querySelector('[data-prev]').innerHTML = `<img src="${URL.createObjectURL(novoLogo)}" alt="Novo logo">`; d.querySelector('[data-rm]').hidden = false;
      } catch (e) { erro.textContent = 'Não foi possível ler essa imagem.'; }
    });
    d.querySelector('[data-rm]').onclick = () => { novoLogo = null; removerLogo = true; d.querySelector('[data-prev]').innerHTML = '<span style="color:var(--muted);font-size:.85rem">Sem logo</span>'; d.querySelector('[data-rm]').hidden = true; };
    f.addEventListener('submit', async ev => {
      ev.preventDefault(); erro.textContent = '';
      const bt = d.querySelector('[data-ok]'); bt.disabled = true;
      try {
        const dados = {}; for (const k of ['nome', 'registro_profissional', 'empresa', 'telefone', 'cidade', 'email_contato']) dados[k] = f[k].value.trim() || null;
        const uid = sessao.user.id, caminho = `${uid}/logo.png`;
        if (novoLogo) {
          const up = await sb.storage.from('logos').upload(caminho, novoLogo, { upsert: true, contentType: 'image/png' });
          if (up.error) throw new Error('Não foi possível enviar o logo. Tente uma imagem menor.');
          dados.logo_path = caminho; logoPath = '__recarregar__';
        } else if (removerLogo && perfil?.logo_path) {
          await sb.storage.from('logos').remove([perfil.logo_path]); dados.logo_path = null;
        }
        const { error } = await sb.from('perfis').update(dados).eq('id', uid);
        if (error) throw new Error('Não foi possível salvar o perfil. Verifique a conexão.');
        await carregarPerfil(); desenharBarra(); d.close(); toast('Perfil salvo.');
      } catch (e) { erro.textContent = e.message; } finally { bt.disabled = false; }
    });
  }

  // ---------- abas de subtipo (lajes e fundações) ----------
  function abasSubtipo() {
    const pagina = document.body.dataset.pagina || '';
    const grupos = { laje: [['laje.html', 'Laje maciça', 'laje'], ['trelicada.html', 'Laje treliçada', 'trelicada']],
      sapata: [['sapata.html', 'Sapata isolada', 'sapata'], ['divisa.html', 'Sapata de divisa', 'divisa'], ['associada.html', 'Sapata associada', 'associada'], ['bloco.html', 'Bloco sobre estacas', 'bloco']] };
    const g = grupos[pagina] || grupos[{ trelicada: 'laje', bloco: 'sapata', divisa: 'sapata', associada: 'sapata' }[pagina]];
    const hd = document.querySelector('header.top'); if (!g || !hd) return;
    const nav = document.createElement('nav'); nav.className = 'fc-abas'; nav.setAttribute('aria-label', 'Tipo');
    nav.innerHTML = g.map(([h, n, id]) => `<a href="${h}" ${id === pagina ? 'aria-current="page"' : ''}>${n}</a>`).join('');
    hd.insertAdjacentElement('afterend', nav);
  }

  // ---------- dados da obra (aparecem no PDF e são salvos com o projeto) ----------
  const OBRA = ['obra', 'cliente', 'art'];
  function lembrarObra(v) { try { localStorage.setItem('fc-obra', JSON.stringify(v)); } catch (e) {} }
  function obraLembrada() { try { return JSON.parse(localStorage.getItem('fc-obra') || '{}'); } catch (e) { return {}; } }
  function dadosObra() { const o = {}; for (const k of OBRA) { const el = document.getElementById('fc-' + k); o[k] = el ? el.value.trim() : ''; } return o; }
  function aplicarObra(o) { if (!o) return; for (const k of OBRA) { const el = document.getElementById('fc-' + k); if (el && o[k] != null) el.value = o[k]; } }
  function injetarCamposObra() {
    const bt = document.getElementById('btnPdf'); if (!bt || document.getElementById('fc-obra')) return;
    const acoes = bt.closest('.actions'); if (!acoes) return;
    const box = document.createElement('div'); box.className = 'fc-obra';
    box.innerHTML = `<label>Obra / identificação<input id="fc-obra" maxlength="120" placeholder="Residência Silva · Rua das Flores, 100"></label>
      <label>Cliente<input id="fc-cliente" maxlength="120" placeholder="Nome do cliente"></label>
      <label>ART / RRT nº<input id="fc-art" maxlength="40" placeholder="Opcional"></label>`;
    acoes.parentNode.insertBefore(box, acoes);
    aplicarObra(obraLembrada());
    box.addEventListener('input', () => lembrarObra(dadosObra()));
  }

  // ---------- cabeçalho e carimbo do PDF ----------
  const PDF = { topo: 30, base: 24 };
  function txtPdf(t) { return String(t ?? '').replace(/[−–—]/g, '-').replace(/[^\x00-\xFF]/g, ''); }
  function finalizarPdf(doc, aviso) {
    const academico = !pro && plano === 'estudante';
    const naoAtende = calculoComErro(), errosPdf = errosDaTela();
    const n = doc.getNumberOfPages(), o = dadosObra(), p = academico ? { nome: perfil?.nome ? 'Estudante: ' + perfil.nome : 'Uso acadêmico' } : (perfil || {});
    const data = new Date().toLocaleDateString('pt-BR');
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = W > H ? 12 : 14;
      // cabeçalho
      let xt = M;
      if (logo && !academico) {
        const bw = 36, bh = 15, k = Math.min(bw / logo.w, bh / logo.h), w = logo.w * k, h = logo.h * k;
        try { doc.addImage(logo.data, 'PNG', M, 7 + (bh - h) / 2, w, h, 'logo-fc', 'FAST'); xt = M + w + 5; } catch (e) { xt = M; }
      }
      doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
      doc.text(txtPdf(p.nome || p.empresa || 'Foster Calc'), xt, 11);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(80);
      const l2 = [p.registro_profissional, p.nome && p.empresa ? p.empresa : null].filter(Boolean).join(' · ');
      const l3 = [p.telefone, p.email_contato, p.cidade].filter(Boolean).join(' · ');
      if (l2) doc.text(txtPdf(l2), xt, 15);
      if (l3) doc.text(txtPdf(l3), xt, l2 ? 19 : 15);
      // direita: obra
      const xr = W - M; doc.setTextColor(20);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.4);
      doc.text(txtPdf(o.obra ? 'Obra: ' + o.obra : 'Memória de cálculo estrutural'), xr, 11, { align: 'right', maxWidth: W / 2 - 10 });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(80);
      if (o.cliente) doc.text(txtPdf('Cliente: ' + o.cliente), xr, 15, { align: 'right', maxWidth: W / 2 - 10 });
      doc.text(txtPdf(`Data: ${data} · Folha ${i}/${n}`), xr, o.cliente ? 19 : 15, { align: 'right' });
      doc.setDrawColor(196, 22, 28); doc.setLineWidth(0.7); doc.line(M, 23.5, W - M, 23.5);
      // rodapé
      doc.setDrawColor(180); doc.setLineWidth(0.2); doc.line(M, H - 11, W - M, H - 11);
      doc.setFont('helvetica', 'italic'); doc.setFontSize(6.4); doc.setTextColor(110);
      doc.text(doc.splitTextToSize(txtPdf(aviso), W - 2 * M - 46), M, H - 7.5);
      doc.setFont('helvetica', 'normal'); doc.text('Gerado no Foster Calc · fostercalc.com.br', W - M, H - 7.5, { align: 'right' });
      doc.setFontSize(5.6); doc.text(txtPdf(`© ${new Date().getFullYear()} Foster Engenharia & Construção`), W - M, H - 4.5, { align: 'right' });
      if (naoAtende) {                                   // carimbo de cálculo que não atende
        doc.setFillColor(255, 255, 255); doc.setDrawColor(163, 18, 26); doc.setLineWidth(0.6);
        doc.setFillColor(163, 18, 26); doc.rect(0, 0, W, 5.2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4); doc.setTextColor(255, 255, 255);
        doc.text(txtPdf('NÃO ATENDE À NORMA · ' + (errosPdf[0] || 'há verificações não atendidas')).slice(0, 160), M, 3.6, { maxWidth: W - 2 * M });
        doc.setTextColor(163, 18, 26);
        try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.12 })); } catch (e) {}
        doc.setFontSize(W > H ? 52 : 44); doc.text(txtPdf('NÃO ATENDE'), W / 2, H / 2 + 30, { align: 'center', angle: 35 });
        try { doc.restoreGraphicsState(); } catch (e) {}
        doc.setTextColor(20);
      }
      if (academico) {                                   // marca d'água do plano Estudante
        try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.13 })); } catch (e) {}
        doc.setFont('helvetica', 'bold'); doc.setTextColor(196, 22, 28); doc.setFontSize(W > H ? 46 : 40);
        doc.text('USO ACADÊMICO', W / 2, H / 2 - 6, { align: 'center', angle: 35 });
        doc.setFontSize(W > H ? 22 : 19); doc.text(txtPdf('NÃO VÁLIDO PARA ART/RRT'), W / 2 + 12, H / 2 + 14, { align: 'center', angle: 35 });
        try { doc.restoreGraphicsState(); } catch (e) {}
        doc.setTextColor(20);
      }
    }
    if (academico) {                                     // sem carimbo de responsabilidade técnica
      doc.setPage(n);
      const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = W > H ? 12 : 14;
      const y0 = H - 23, larg = Math.min(150, W - 2 * M), x0 = W - M - larg;
      doc.setFillColor(255, 255, 255); doc.rect(x0, y0, larg, 11, 'F');
      doc.setDrawColor(196, 22, 28); doc.setLineWidth(0.4); doc.rect(x0, y0, larg, 11);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(196, 22, 28);
      doc.text(txtPdf('DOCUMENTO DE USO ACADÊMICO · NÃO VÁLIDO PARA ART/RRT'), x0 + larg / 2, y0 + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2); doc.setTextColor(90);
      doc.text(txtPdf('Gerado no plano Estudante do Foster Calc. Para projetos profissionais, use o plano Pro.'), x0 + larg / 2, y0 + 8.8, { align: 'center' });
      return;
    }
    // carimbo de responsabilidade técnica na última folha
    doc.setPage(n);
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = W > H ? 12 : 14;
    const y0 = H - 23, larg = Math.min(150, W - 2 * M), x0 = W - M - larg;
    doc.setFillColor(255, 255, 255); doc.rect(x0, y0, larg, 11, 'F');
    doc.setDrawColor(60); doc.setLineWidth(0.3); doc.rect(x0, y0, larg, 11);
    doc.line(x0 + larg * 0.62, y0, x0 + larg * 0.62, y0 + 11);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(110);
    doc.text('RESPONSÁVEL TÉCNICO', x0 + 2, y0 + 2.6); doc.text('ART / RRT Nº', x0 + larg * 0.62 + 2, y0 + 2.6);
    doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(x0 + 2, y0 + 7.2, x0 + larg * 0.62 - 2, y0 + 7.2);
    doc.setFontSize(6.6); doc.setTextColor(20);
    doc.text(txtPdf([p.nome, p.registro_profissional].filter(Boolean).join(' · ') || 'Nome e registro profissional'), x0 + 2, y0 + 9.8);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.4);
    if (o.art) doc.text(txtPdf(o.art), x0 + larg * 0.62 + 2, y0 + 8.2);
    else { doc.setDrawColor(150); doc.line(x0 + larg * 0.62 + 2, y0 + 8.4, x0 + larg - 3, y0 + 8.4); }
  }
  async function iniciar() {
    if (!sb) { desenharBarra(); return; }
    const { data } = await sb.auth.getSession(); sessao = data.session;
    await carregarPerfil(); desenharBarra(); ouvintes.forEach(f => f());
    sb.auth.onAuthStateChange(async (ev, s) => {
      if (ev === 'PASSWORD_RECOVERY') novaSenha();
      sessao = s; await carregarPerfil(); desenharBarra(); ouvintes.forEach(f => f());
    });
  }

  function desenharBarra() {
    const alvo = document.getElementById('fc-bar'); if (!alvo) return;
    const pagina = document.body.dataset.pagina || '';
    const grupo = { laje: 'lajes', trelicada: 'lajes', viga: 'vigas', pilar: 'pilares', sapata: 'fundacoes', bloco: 'fundacoes', divisa: 'fundacoes', associada: 'fundacoes', escada: 'escadas', muro: 'muros', inicio: 'inicio' }[pagina];
    const link = (href, nome, id) => `<a href="${href}" ${grupo === id ? 'aria-current="page"' : ''}>${nome}</a>`;
    alvo.className = 'fc-bar';
    alvo.innerHTML = `<a class="fc-logo" href="./"><b>FC</b>Foster Calc</a>
      <nav class="fc-nav" aria-label="Módulos">${link('./', 'Início', 'inicio')}${link('laje.html', 'Lajes', 'lajes')}${link('viga.html', 'Vigas', 'vigas')}${link('pilar.html', 'Pilares', 'pilares')}${link('sapata.html', 'Fundações', 'fundacoes')}${link('escada.html', 'Escadas', 'escadas')}${link('muro.html', 'Muros', 'muros')}${link('./#projetos', 'Meus projetos', '-')}</nav>
      <div class="fc-user">${sessao
        ? `<span class="fc-plano ${pro ? 'pro' : plano === 'estudante' ? 'est' : ''}">${pro ? 'Pro' : plano === 'estudante' ? 'Estudante' : 'Grátis'}</span><button class="fc-nome" type="button" data-fc="perfil" title="Meu perfil · ${esc(sessao.user.email)}">${esc(perfil?.nome || sessao.user.email)}</button><button class="fc-btn ghost" type="button" data-fc="sair">Sair</button>`
        : `<button class="fc-btn" type="button" data-fc="entrar">Entrar</button>`}</div>`;
    alvo.querySelector('[data-fc="entrar"]')?.addEventListener('click', () => entrar());
    alvo.querySelector('[data-fc="perfil"]')?.addEventListener('click', () => telaPerfil());
    alvo.querySelector('[data-fc="sair"]')?.addEventListener('click', async () => { await sb.auth.signOut(); toast('Você saiu da conta.'); });
  }

  function entrar(motivo) {
    return new Promise(resolve => {
      let modo = 'entrar';
      const d = dialogo(`<form method="dialog" novalidate>
        <h3 data-t>Entrar</h3>
        <p>${esc(motivo || 'Entre para salvar projetos e acessar seus cálculos de qualquer aparelho.')}</p>
        <label data-nome hidden>Nome<input name="nome" autocomplete="name"></label>
        <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
        <label data-senha>Senha<input name="senha" type="password" autocomplete="current-password" minlength="6"></label>
        <small data-aceite hidden style="display:block;font-size:.78rem;color:var(--muted,#666);margin:-2px 0 4px">Ao criar a conta, você concorda com os <a href="termos.html" target="_blank" rel="noopener" style="color:inherit">Termos de uso e a Política de privacidade</a>.</small>
        <span class="fc-erro" data-erro role="alert"></span>
        <div class="fc-row"><button class="fc-btn" data-ok>Entrar</button><button class="fc-btn ghost" type="button" data-fechar>Cancelar</button></div>
        <div class="fc-row"><button type="button" class="fc-link" data-alt>Criar conta grátis</button><button type="button" class="fc-link" data-esq>Esqueci a senha</button></div>
      </form>`);
      const f = d.querySelector('form'), erro = d.querySelector('[data-erro]');
      const aplicar = () => {
        d.querySelector('[data-t]').textContent = { entrar: 'Entrar', criar: 'Criar conta', esqueci: 'Recuperar senha' }[modo];
        d.querySelector('[data-ok]').textContent = { entrar: 'Entrar', criar: 'Criar conta', esqueci: 'Enviar link' }[modo];
        d.querySelector('[data-nome]').hidden = modo !== 'criar';
        d.querySelector('[data-aceite]').hidden = modo !== 'criar';
        d.querySelector('[data-senha]').hidden = modo === 'esqueci';
        d.querySelector('[data-alt]').textContent = modo === 'entrar' ? 'Criar conta grátis' : 'Já tenho conta';
        f.senha.autocomplete = modo === 'criar' ? 'new-password' : 'current-password'; erro.textContent = '';
      };
      d.querySelector('[data-alt]').onclick = () => { modo = modo === 'entrar' ? 'criar' : 'entrar'; aplicar(); };
      d.querySelector('[data-esq]').onclick = () => { modo = 'esqueci'; aplicar(); };
      d.querySelector('[data-fechar]').onclick = () => d.close();
      d.addEventListener('close', () => resolve(!!sessao));
      f.addEventListener('submit', async ev => {
        ev.preventDefault(); erro.textContent = '';
        const email = f.email.value.trim(), senha = f.senha.value;
        if (!/^\S+@\S+\.\S+$/.test(email)) { erro.textContent = 'Informe um e-mail válido.'; return; }
        if (modo !== 'esqueci' && senha.length < 6) { erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
        const bt = d.querySelector('[data-ok]'); bt.disabled = true;
        try {
          const voltar = location.origin + location.pathname;
          if (modo === 'entrar') {
            const { error } = await sb.auth.signInWithPassword({ email, password: senha });
            if (error) throw new Error(error.message.includes('confirm') ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.' : 'E-mail ou senha incorretos.');
            sessao = (await sb.auth.getSession()).data.session; await carregarPerfil(); d.close(); toast('Bem-vindo à Foster Calc.');
          } else if (modo === 'criar') {
            const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome: f.nome.value.trim() }, emailRedirectTo: voltar } });
            if (error) throw new Error(error.message.includes('registered') ? 'Este e-mail já tem conta. Use "Já tenho conta".' : 'Não foi possível criar a conta. Tente novamente.');
            if (data.session) { sessao = data.session; await carregarPerfil(); d.close(); toast('Conta criada.'); }
            else { d.querySelector('p').textContent = `Enviamos um link de confirmação para ${email}. Abra o e-mail e depois entre com sua senha.`; modo = 'entrar'; aplicar(); }
          } else {
            await sb.auth.resetPasswordForEmail(email, { redirectTo: voltar });
            d.querySelector('p').textContent = `Se ${email} tiver conta, você vai receber um link para criar uma nova senha.`; modo = 'entrar'; aplicar();
          }
        } catch (e) { erro.textContent = e.message; } finally { bt.disabled = false; }
      });
      aplicar(); f.email.focus();
    });
  }

  function novaSenha() {
    const d = dialogo(`<form method="dialog"><h3>Nova senha</h3><label>Nova senha<input name="s" type="password" minlength="6" autocomplete="new-password" required></label>
      <span class="fc-erro" data-erro role="alert"></span><div class="fc-row"><button class="fc-btn">Salvar senha</button></div></form>`);
    d.querySelector('form').addEventListener('submit', async ev => {
      ev.preventDefault(); const s = ev.target.s.value;
      if (s.length < 6) { d.querySelector('[data-erro]').textContent = 'Mínimo de 6 caracteres.'; return; }
      const { error } = await sb.auth.updateUser({ password: s });
      if (error) d.querySelector('[data-erro]').textContent = 'Não foi possível salvar. Peça um novo link.'; else { d.close(); toast('Senha atualizada.'); }
    });
  }

  function telaPlanos(motivo, planoInicial) {
    const OP = {
      mensal: { grupo: 'Pro', nome: 'Pro mensal', preco: CONFIG.precoPro, itens: ['Preço de lançamento', 'Cancele quando quiser'] },
      anual: { grupo: 'Pro', nome: 'Pro anual', preco: CONFIG.precoAnual, itens: ['2 meses grátis', 'Equivale a ' + CONFIG.anualEquivale] },
      'est-mensal': { grupo: 'Estudante', nome: 'Estudante mensal', preco: CONFIG.precoEst, itens: ['PDF e DXF com marca acadêmica', 'Modo didático'] },
      'est-anual': { grupo: 'Estudante', nome: 'Estudante anual', preco: CONFIG.precoEstAnual, itens: ['O ano letivo inteiro', 'Desconto no Pro ao se formar'] },
    };
    let plano = OP[planoInicial] ? planoInicial : 'anual';
    const cartao = k => `<div data-plano="${k}" role="radio" tabindex="0"><b>${esc(OP[k].nome)}</b>${esc(OP[k].preco)}<ul>${OP[k].itens.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
    const d = dialogo(`<div class="fc-in"><h3>Planos Foster Calc</h3><p>${esc(motivo)}</p>
      <p class="fc-grupo">Profissional · PDF com seu cabeçalho, logo e carimbo para a ART</p>
      <div class="fc-plans" role="radiogroup" aria-label="Plano profissional">${cartao('mensal')}${cartao('anual')}</div>
      <p class="fc-grupo">Estudante · para aprender e conferir exercícios</p>
      <div class="fc-plans" role="radiogroup" aria-label="Plano estudante">${cartao('est-mensal')}${cartao('est-anual')}</div>
      <p class="fc-nota">Pagamento por Pix ou cartão. <b>Use no pagamento o mesmo e-mail do seu cadastro no Foster Calc</b>${sessao ? ` (${esc(sessao.user.email)})` : ''}. No plano Estudante, PDF e DXF saem com a marca “uso acadêmico, não válido para ART/RRT”.</p>
      <div class="fc-row"><a class="fc-btn" style="text-decoration:none" data-pagar target="_blank" rel="noopener">Assinar agora</a><a class="fc-btn ghost" style="text-decoration:none" data-wa target="_blank" rel="noopener">Dúvidas no WhatsApp</a><button class="fc-btn ghost" type="button" data-fechar>Agora não</button></div></div>`);
    const wa = d.querySelector('[data-wa]'), pagar = d.querySelector('[data-pagar]');
    const marcar = () => {
      d.querySelectorAll('[data-plano]').forEach(el => { const on = el.dataset.plano === plano; el.classList.toggle('on', on); el.setAttribute('aria-checked', on); });
      const o = OP[plano];
      const extra = o.grupo === 'Estudante' ? ' Declaro que sou estudante e vou usar o plano só para fins acadêmicos.' : '';
      wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Olá! Quero assinar o Foster Calc, plano ${o.nome} (${o.preco}). Meu e-mail de cadastro é ${sessao?.user.email || ''}.${extra}`)}`;
      pagar.href = CONFIG.linksPagamento[plano] || wa.href;
      pagar.textContent = `Assinar ${o.nome}`;
    };
    d.querySelectorAll('[data-plano]').forEach(el => {
      el.onclick = () => { plano = el.dataset.plano; marcar(); };
      el.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.click(); } };
    });
    marcar();
    d.querySelector('[data-fechar]').onclick = () => d.close();
  }

  async function exigirPro(acao) {
    if (!sb) { toast('Sem conexão com o servidor. Tente novamente.'); return false; }
    if (!sessao && !(await entrar(`Entre na sua conta para ${acao}.`))) return false;
    await carregarPerfil(); desenharBarra();
    if (!pro && plano !== 'estudante') { telaPlanos(`Para ${acao}, é preciso um plano pago (Estudante ou Pro).`); return false; }
    marcarDxf();
    if (calculoComErro() && !(await confirmarComErro())) return false;
    if (!pro) toast('Plano Estudante: o arquivo sai com a marca "uso acadêmico".');
    else if (!perfil?.nome) toast('Dica: preencha seu perfil (clique no seu nome no topo) para sair com nome, CREA e logo no PDF.');
    return true;
  }
  // ---------- trava de exportação quando o cálculo não atende ----------
  const calculoComErro = () => !!document.querySelector('#status.bad');
  const errosDaTela = () => [...document.querySelectorAll('#status.bad li')].map(li => li.textContent.trim()).filter(Boolean);
  function confirmarComErro() {
    return new Promise(resolve => {
      const lista = errosDaTela().slice(0, 4).map(t => `<li>${esc(t)}</li>`).join('');
      const d = dialogo(`<div class="fc-in"><h3 style="color:var(--bad,#a3121a)">⚠ Cálculo com verificações não atendidas</h3>
        <ul style="margin:6px 0 10px;padding-left:18px;font-size:.86rem">${lista}</ul>
        <p>O recomendado é corrigir os dados antes de exportar. Se exportar agora, o arquivo sai com o carimbo <b>“NÃO ATENDE À NORMA”</b> em todas as folhas.</p>
        <div class="fc-row"><button class="fc-btn" type="button" data-corrigir>Voltar e corrigir</button><button class="fc-btn ghost" type="button" data-mesmo>Exportar mesmo assim</button></div></div>`);
      let r = false;
      d.querySelector('[data-corrigir]').onclick = () => { r = false; d.close(); };
      d.querySelector('[data-mesmo]').onclick = () => { r = true; d.close(); };
      d.addEventListener('close', () => { if (!r) irParaErro(); resolve(r); });
    });
  }
  // DXF: acrescenta textos de aviso (plano Estudante e cálculo que não atende) na seção de entidades
  function marcarDxf() {
    const Z = window.JSZip; if (!Z || Z.prototype.__fcMarca) return;
    const orig = Z.prototype.file; Z.prototype.__fcMarca = true;
    Z.prototype.file = function (nome, dados, ...r) {
      if (arguments.length < 2) return orig.apply(this, arguments);
      if (typeof dados === 'string' && /\.dxf$/i.test(nome)) {
        const nl = dados.includes('\r\n') ? '\r\n' : '\n';
        const txt = (camada, y, s) => ['0', 'TEXT', '8', camada, '62', '1', '10', '0', '20', String(y), '30', '0', '40', '12', '1', s].join(nl) + nl;
        let t = '';
        if (!pro && plano === 'estudante') t += txt('USO_ACADEMICO', -80, 'USO ACADEMICO - NAO VALIDO PARA ART/RRT - Foster Calc plano Estudante');
        if (calculoComErro()) t += txt('NAO_ATENDE', -100, 'NAO ATENDE A NORMA - calculo com verificacoes nao atendidas');
        const k = dados.lastIndexOf('0' + nl + 'ENDSEC');
        if (t && k > 0) dados = dados.slice(0, k) + t + dados.slice(k);
      }
      return orig.call(this, nome, dados, ...r);
    };
  }
  async function registrarExport(modulo, formato) { try { await sb.from('exportacoes').insert({ modulo, formato }); } catch (e) { /* métrica não bloqueia o download */ } }

  function baixar(nome, dados, tipo) {
    const blob = dados instanceof Blob ? dados : new Blob([dados], { type: tipo || 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- projetos ----------
  async function salvarProjeto(modulo, entrada, sugestao, idAtual) {
    if (!sb) return null;
    entrada = { ...entrada, _obra: dadosObra() };
    if (entrada._obra.obra && !idAtual) sugestao = `${entrada._obra.obra} · ${sugestao}`;
    if (!sessao && !(await entrar('Entre na sua conta para salvar este projeto.'))) return null;
    return new Promise(resolve => {
      const d = dialogo(`<form method="dialog"><h3>Salvar projeto</h3>
        <label>Nome do projeto<input name="nome" maxlength="120" required value="${esc(sugestao)}"></label>
        ${idAtual ? '<label style="flex-direction:row;align-items:center;gap:8px;color:var(--ink)"><input type="checkbox" name="novo" style="width:auto"> Salvar como novo projeto</label>' : ''}
        <span class="fc-erro" data-erro role="alert"></span>
        <div class="fc-row"><button class="fc-btn">Salvar</button><button class="fc-btn ghost" type="button" data-fechar>Cancelar</button></div></form>`);
      let res = null;
      d.querySelector('[data-fechar]').onclick = () => d.close();
      d.addEventListener('close', () => resolve(res));
      d.querySelector('form').addEventListener('submit', async ev => {
        ev.preventDefault(); const nome = ev.target.nome.value.trim();
        if (!nome) { d.querySelector('[data-erro]').textContent = 'Dê um nome ao projeto.'; return; }
        const novo = !idAtual || (ev.target.novo && ev.target.novo.checked);
        const q = novo ? sb.from('projetos').insert({ modulo, nome, entrada }).select('id, nome').single()
                       : sb.from('projetos').update({ nome, entrada }).eq('id', idAtual).select('id, nome').single();
        const { data, error } = await q;
        if (error) { d.querySelector('[data-erro]').textContent = 'Não foi possível salvar. Verifique a conexão.'; return; }
        res = data; d.close(); toast(`Projeto "${data.nome}" salvo.`);
      });
    });
  }
  async function listarProjetos(modulo) {
    if (!sb || !sessao) return [];
    let q = sb.from('projetos').select('id, modulo, nome, atualizado_em').order('atualizado_em', { ascending: false }).limit(100);
    if (modulo) q = q.eq('modulo', modulo);
    const { data } = await q; return data || [];
  }
  async function lerProjeto(id) {
    const { data } = await sb.from('projetos').select('*').eq('id', id).maybeSingle();
    if (data?.entrada?._obra) { aplicarObra(data.entrada._obra); lembrarObra(data.entrada._obra); }
    return data;
  }
  async function apagarProjeto(id) { const { error } = await sb.from('projetos').delete().eq('id', id); return !error; }

  async function abrirProjeto(modulo) {
    if (!sb) return null;
    if (!sessao && !(await entrar('Entre na sua conta para ver seus projetos.'))) return null;
    const lista = await listarProjetos(modulo);
    return new Promise(resolve => {
      const d = dialogo(`<div class="fc-in"><h3>Meus projetos</h3>
        ${lista.length ? `<ul class="fc-lista">${lista.map(p => `<li><span>${esc(p.nome)}<small>${new Date(p.atualizado_em).toLocaleString('pt-BR')}</small></span><button class="fc-btn ghost" data-id="${p.id}">Abrir</button></li>`).join('')}</ul>` : '<p>Nenhum projeto salvo neste módulo ainda.</p>'}
        <div class="fc-row"><button class="fc-btn ghost" type="button" data-fechar>Fechar</button></div></div>`);
      let res = null;
      d.querySelector('[data-fechar]').onclick = () => d.close();
      d.querySelectorAll('[data-id]').forEach(b => b.onclick = async () => { res = await lerProjeto(b.dataset.id); d.close(); });
      d.addEventListener('close', () => resolve(res));
    });
  }

  window.FC = {
    sb, toast, dialogo, entrar, exigirPro, registrarExport, baixar, salvarProjeto, abrirProjeto, listarProjetos, lerProjeto, apagarProjeto, telaPlanos,
    telaPerfil, finalizarPdf, dadosObra, PDF,
    get sessao() { return sessao; }, get pro() { return pro; }, get plano() { return plano; }, get perfil() { return perfil; },
    aoMudar: f => ouvintes.push(f), CONFIG,
  };
  function rodapeAutoria() {
    if (document.querySelector('.fc-copy') || document.body.dataset.pagina === 'inicio') return;
    const p = document.createElement('p'); p.className = 'fc-copy';
    p.innerHTML = `<span>© ${new Date().getFullYear()} Foster Engenharia &amp; Construção · Todos os direitos reservados</span><a href="termos.html">Termos de uso e privacidade</a>`;
    const ref = document.querySelector('.disclaimer');
    (ref ? ref.parentNode : (document.querySelector('.wrap') || document.body)).appendChild(p);
  }
  // ---------- modo didático: botão "?" em cada linha da memória ----------
  const DIDATICO = ['viga', 'laje', 'pilar'];
  function modoDidatico() {
    const pagina = document.body.dataset.pagina, alvo = document.getElementById('memoria');
    if (!DIDATICO.includes(pagina) || !alvo) return;
    const s = document.createElement('script'); s.src = 'explica.js';
    s.onload = () => {
      const dic = Object.assign({}, (window.FC_EXPLICA || {}).comum, (window.FC_EXPLICA || {})[pagina]);
      const nota = document.createElement('p'); nota.className = 'fc-didatico';
      nota.innerHTML = 'Modo didático: toque em <b>?</b> ao lado de cada item para ver o que ele significa (planos Estudante e Pro).';
      alvo.parentNode.insertBefore(nota, alvo);
      const decorar = () => {
        alvo.querySelectorAll('tbody tr:not(.fc-exp)').forEach(tr => {
          const td = tr.cells[0]; if (!td || td.querySelector('.fc-q')) return;
          const chave = td.textContent.trim(); if (!dic[chave]) return;
          const b = document.createElement('button'); b.type = 'button'; b.className = 'fc-q'; b.textContent = '?';
          b.setAttribute('aria-label', 'Explicar: ' + chave); b.setAttribute('aria-expanded', 'false'); b.dataset.chave = chave;
          td.appendChild(b);
        });
      };
      new MutationObserver(decorar).observe(alvo, { childList: true, subtree: true });
      decorar();
      alvo.addEventListener('click', ev => {
        const b = ev.target.closest('.fc-q'); if (!b) return;
        ev.preventDefault(); ev.stopPropagation();
        if (!pro && plano !== 'estudante') { telaPlanos('O modo didático, com a explicação de cada item da memória, faz parte dos planos Estudante e Pro.', 'est-anual'); return; }
        const tr = b.closest('tr'), prox = tr.nextElementSibling;
        if (prox && prox.classList.contains('fc-exp')) { prox.remove(); b.setAttribute('aria-expanded', 'false'); return; }
        const ex = document.createElement('tr'); ex.className = 'fc-exp';
        const td = document.createElement('td'); td.colSpan = tr.cells.length; td.textContent = dic[b.dataset.chave];
        ex.appendChild(td); tr.after(ex); b.setAttribute('aria-expanded', 'true');
      });
    };
    document.head.appendChild(s);
  }
  // ---------- alarme: faixa fixa, vibração, campos destacados e seção da memória aberta ----------
  const CAMPOS_ALARME = {
    laje: [[/espessura|ductilidade|cisalhamento/i, ['h']], [/concreto/i, ['fck']]],
    viga: [[/seção|biela|ductilidade|altura|4% ?ac/i, ['h', 'bw']], [/largura/i, ['bw', 'phiL']], [/estribo/i, ['phiT', 'bw']], [/concreto/i, ['fck']], [/apoio/i, ['apoio']]],
    pilar: [[/seção|esbeltez|dimensão|área/i, ['hx', 'hy']], [/fck|concreto/i, ['fck']], [/esbeltez/i, ['lex', 'ley']]],
    sapata: [[/tensão do solo|cargas/i, ['sadm']], [/diagonal/i, ['fck']]],
    trelicada: [[/altura|flecha|nervura|cortante/i, ['altura', 'L']]],
    escada: [[/espessura|cortante/i, ['h']]],
    bloco: [[/capacidade|estacas com essa/i, ['cap', 'n']], [/bielas/i, ['ap', 'bp', 'phiE', 'fck']], [/tirante/i, ['phiE']]],
    divisa: [[/alívio|próximos|distância/i, ['l']], [/largura/i, ['bw']], [/tensão no solo/i, ['sadm']], [/diagonal/i, ['fck']]],
    associada: [[/balanço/i, ['limEsq']], [/largura da viga/i, ['bw']], [/tensão no solo/i, ['sadm']], [/diagonal/i, ['fck']]],
    muro: [[/cortina/i, ['t1']], [/tensão|núcleo|tombamento|deslizamento/i, ['sadm', 'H']], [/concreto/i, ['fck']]],
  };
  function irParaErro() {
    const s = document.getElementById('status'); if (!s) return;
    s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const c = document.querySelector('.fc-campo-erro'); if (c && innerWidth > 900) setTimeout(() => c.focus({ preventScroll: true }), 400);
  }
  function alarme() {
    const st = document.getElementById('status'); if (!st) return;
    const pagina = document.body.dataset.pagina;
    const barra = document.createElement('button'); barra.type = 'button'; barra.className = 'fc-alarme'; barra.hidden = true;
    barra.onclick = irParaErro; document.body.appendChild(barra);
    let visivel = false, anterior = null;
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visivel = es[0].isIntersecting; atualizarBarra(); }).observe(st);
    let ruim = false, n = 0;
    function atualizarBarra() { barra.hidden = !ruim || visivel; barra.innerHTML = '<b>⚠ Cálculo não atende à norma</b><span>ver o que corrigir</span>'; }
    const avaliar = () => {
      ruim = st.classList.contains('bad');
      const msgs = errosDaTela(); n = Math.max(1, msgs.length);
      document.querySelectorAll('.fc-campo-erro').forEach(el => { el.classList.remove('fc-campo-erro'); el.removeAttribute('data-fc-erro'); });
      if (ruim) {
        for (const [re, ids] of CAMPOS_ALARME[pagina] || []) {
          const m = msgs.find(t => re.test(t)); if (!m) continue;
          ids.forEach(id => { const el = document.getElementById(id); if (el && el.closest('form')) { el.classList.add('fc-campo-erro'); el.title = 'Ajuste este campo: ' + m; } });
        }
      }
      if (ruim && anterior === false) {
        try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) {}
        // abre a seção da memória onde está o problema
        setTimeout(() => document.querySelectorAll('#memoria details').forEach(d => { if (d.querySelector('.alerta')) d.open = true; }), 30);
      }
      anterior = ruim; atualizarBarra();
    };
    new MutationObserver(avaliar).observe(st, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    avaliar();
  }
  const comecar = () => { abasSubtipo(); injetarCamposObra(); rodapeAutoria(); modoDidatico(); alarme(); iniciar(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', comecar); else comecar();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
