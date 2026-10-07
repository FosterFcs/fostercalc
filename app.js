// Foster Calc — camada comum: login, plano, projetos salvos, barra superior e downloads.
// Usa a chave publicável do Supabase (segura no navegador; o acesso é controlado por RLS).
(function () {
  const CONFIG = {
    url: 'https://fvsdlpnvqfvjdxmfgbjx.supabase.co',
    chave: 'sb_publishable_VT3XEbInyTr2Eu-AuLnrqw_BOrA2jYy',
    precoPro: 'R$ 29,90/mês',                         // plano mensal (preço de lançamento)
    precoAnual: 'R$ 299/ano',                         // plano anual
    anualEquivale: 'R$ 24,92/mês',                    // anual dividido por 12
    whatsapp: '5524992096103',                        // contato comercial para assinar o Pro
  };
  const sb = window.supabase ? window.supabase.createClient(CONFIG.url, CONFIG.chave) : null;
  let sessao = null, perfil = null, pro = false;
  const ouvintes = [];

  // ---------- estilos da barra e dos diálogos ----------
  const css = `
  .fc-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;padding-block:10px;margin-bottom:6px;font:500 .9rem var(--f-body,system-ui)}
  .fc-logo{font:700 1.25rem/1 var(--f-display,system-ui);letter-spacing:.02em;color:var(--ink);text-decoration:none;display:flex;align-items:center;gap:8px}
  .fc-logo b{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:5px;background:var(--accent);color:var(--sheet);font-size:.95rem}
  .fc-nav{display:flex;gap:4px;flex:1 1 auto}
  .fc-nav a{color:var(--muted);text-decoration:none;padding:6px 10px;border-radius:4px}
  .fc-nav a[aria-current="page"]{color:var(--ink);background:var(--sheet);box-shadow:inset 0 -2px 0 var(--accent)}
  .fc-nav a:hover{color:var(--ink)}
  .fc-user{display:flex;align-items:center;gap:8px;margin-left:auto}
  .fc-btn{font:600 .85rem var(--f-body,system-ui);border-radius:4px;padding:7px 12px;cursor:pointer;border:1px solid var(--accent);background:var(--accent);color:var(--sheet)}
  .fc-btn.ghost{background:transparent;color:var(--accent)}
  .fc-btn:disabled{opacity:.5;cursor:wait}
  .fc-plano{font:600 .66rem var(--f-body,system-ui);letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:99px;background:var(--line);color:var(--muted)}
  .fc-plano.pro{background:var(--accent);color:var(--sheet)}
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
  .fc-plans div:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .fc-plans div.on{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
  .fc-plans b{display:block;font:600 1.05rem var(--f-display,system-ui);text-transform:uppercase}
  .fc-plans ul{margin:6px 0 0;padding-left:16px;color:var(--muted)}`;
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
    perfil = null; pro = false;
    if (!sb || !sessao) return;
    const { data } = await sb.from('perfis').select('nome, registro_profissional, empresa, plano, plano_ate').eq('id', sessao.user.id).maybeSingle();
    perfil = data;
    const r = await sb.rpc('plano_ativo'); pro = !!r.data;
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
    const link = (href, nome, id) => `<a href="${href}" ${pagina === id ? 'aria-current="page"' : ''}>${nome}</a>`;
    alvo.className = 'fc-bar';
    alvo.innerHTML = `<a class="fc-logo" href="./"><b>FC</b>Foster Calc</a>
      <nav class="fc-nav" aria-label="Módulos">${link('./', 'Início', 'inicio')}${link('viga.html', 'Vigas', 'viga')}${link('laje.html', 'Lajes', 'laje')}${link('./#projetos', 'Meus projetos', '-')}</nav>
      <div class="fc-user">${sessao
        ? `<span class="fc-plano ${pro ? 'pro' : ''}">${pro ? 'Pro' : 'Grátis'}</span><span class="fc-mail" title="${esc(sessao.user.email)}">${esc(perfil?.nome || sessao.user.email)}</span><button class="fc-btn ghost" type="button" data-fc="sair">Sair</button>`
        : `<button class="fc-btn" type="button" data-fc="entrar">Entrar</button>`}</div>`;
    alvo.querySelector('[data-fc="entrar"]')?.addEventListener('click', () => entrar());
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
        <span class="fc-erro" data-erro role="alert"></span>
        <div class="fc-row"><button class="fc-btn" data-ok>Entrar</button><button class="fc-btn ghost" type="button" data-fechar>Cancelar</button></div>
        <div class="fc-row"><button type="button" class="fc-link" data-alt>Criar conta grátis</button><button type="button" class="fc-link" data-esq>Esqueci a senha</button></div>
      </form>`);
      const f = d.querySelector('form'), erro = d.querySelector('[data-erro]');
      const aplicar = () => {
        d.querySelector('[data-t]').textContent = { entrar: 'Entrar', criar: 'Criar conta', esqueci: 'Recuperar senha' }[modo];
        d.querySelector('[data-ok]').textContent = { entrar: 'Entrar', criar: 'Criar conta', esqueci: 'Enviar link' }[modo];
        d.querySelector('[data-nome]').hidden = modo !== 'criar';
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
    let plano = planoInicial === 'mensal' ? 'mensal' : 'anual';
    const d = dialogo(`<div class="fc-in"><h3>Foster Calc Pro</h3><p>${esc(motivo)}</p>
      <div class="fc-plans" role="radiogroup" aria-label="Escolha o plano">
        <div data-plano="mensal" role="radio" tabindex="0"><b>Mensal</b>${esc(CONFIG.precoPro)}<ul><li>Preço de lançamento</li><li>Cancele quando quiser</li></ul></div>
        <div data-plano="anual" role="radio" tabindex="0"><b>Anual</b>${esc(CONFIG.precoAnual)}<ul><li>2 meses grátis</li><li>Equivale a ${esc(CONFIG.anualEquivale)}</li></ul></div></div>
      <p>Inclui memória de cálculo em PDF, detalhamento em DXF e os novos módulos primeiro. A assinatura é ativada pelo nosso atendimento no WhatsApp <b>(24) 99209-6103</b>.</p>
      <div class="fc-row"><a class="fc-btn" style="text-decoration:none" data-wa target="_blank" rel="noopener">Assinar pelo WhatsApp</a><button class="fc-btn ghost" type="button" data-fechar>Agora não</button></div></div>`);
    const wa = d.querySelector('[data-wa]');
    const marcar = () => {
      d.querySelectorAll('[data-plano]').forEach(el => { const on = el.dataset.plano === plano; el.classList.toggle('on', on); el.setAttribute('aria-checked', on); });
      const nome = plano === 'anual' ? `anual (${CONFIG.precoAnual})` : `mensal (${CONFIG.precoPro})`;
      wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Olá! Quero assinar o Foster Calc Pro, plano ${nome}. Meu e-mail de cadastro é ${sessao?.user.email || ''}.`)}`;
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
    if (!pro) { telaPlanos(`Para ${acao}, é preciso o plano Pro.`); return false; }
    return true;
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
  async function lerProjeto(id) { const { data } = await sb.from('projetos').select('*').eq('id', id).maybeSingle(); return data; }
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
    get sessao() { return sessao; }, get pro() { return pro; }, get perfil() { return perfil; },
    aoMudar: f => ouvintes.push(f), CONFIG,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
