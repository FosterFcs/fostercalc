/* Foster Calc · memorial das calculadoras grátis em PDF (download direto, completo, também no celular).
   Lê o conteúdo montado em #memorial (h1, p, h3, table) e gera um A4 com cabeçalho e rodapé.
   Uso: await FCMemorial.baixar(document.getElementById('memorial'), 'nome-do-arquivo.pdf') */
(function () {
  const M = 16, W = 210, H = 297, LARG = W - 2 * M;
  const VERM = [196, 22, 28], TINTA = [20, 20, 20], CINZA = [92, 95, 99], LINHA = [214, 215, 217];

  // a fonte padrão do PDF não tem alguns símbolos: troca por equivalentes
  function limpa(t) {
    return String(t || '').replace(/\s+/g, ' ').replace(/→/g, '->').replace(/≈/g, '~').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/³/g, '3').replace(/²/g, '2')
      .replace(/[  ]/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
  }
  function texto(el) { return limpa(el.textContent); }
  function temNegrito(el) { return !!el.querySelector('b, strong'); }

  function baixar(raiz, nomeArquivo) {
    if (!window.jspdf || !window.jspdf.jsPDF) return Promise.reject(new Error('jsPDF indisponível'));
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    let y = 0, pagina = 0;
    const titulo = texto(raiz.querySelector('h1') || { textContent: 'Memorial de cálculo' });

    function cabecalho() {
      pagina++;
      doc.setFillColor(...VERM); doc.rect(M, 10, 7, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255); doc.text('FC', M + 3.5, 14.8, { align: 'center' });
      doc.setTextColor(...TINTA); doc.setFontSize(11); doc.text('Foster Calc', M + 9.5, 15.2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...CINZA);
      doc.text('Calculadoras grátis · fostercalc.com.br', W - M, 15.2, { align: 'right' });
      doc.setDrawColor(...VERM); doc.setLineWidth(0.6); doc.line(M, 19.5, W - M, 19.5);
      y = 27;
      if (pagina > 1) { doc.setFontSize(9); doc.setTextColor(...CINZA); doc.text(titulo + ' (continuação)', M, y); y += 7; }
    }
    function cabe(h) { if (y + h > H - 20) { doc.addPage(); cabecalho(); } }

    cabecalho();
    for (const el of raiz.children) {
      const tag = el.tagName;
      if (tag === 'H1') {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...TINTA);
        const ls = doc.splitTextToSize(texto(el), LARG); cabe(ls.length * 6.5); doc.text(ls, M, y); y += ls.length * 6.5 + 1;
      } else if (tag === 'H3') {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...VERM);
        cabe(14); y += 3; doc.text(texto(el).toUpperCase(), M, y); y += 2;
        doc.setDrawColor(...LINHA); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 5;
      } else if (tag === 'P') {
        const pequeno = /10pt/.test(el.getAttribute('style') || '');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(pequeno ? 8 : 9.5); doc.setTextColor(...(pequeno ? CINZA : TINTA));
        // quebras de linha <br> viram parágrafos separados
        const partes = el.innerHTML.split(/<br\s*\/?>/i).map(h => { const d = document.createElement('div'); d.innerHTML = h; return limpa(d.textContent); }).filter(Boolean);
        for (const parte of partes) {
          const ls = doc.splitTextToSize(parte, LARG); const lh = pequeno ? 3.8 : 4.6;
          cabe(ls.length * lh); doc.text(ls, M, y); y += ls.length * lh;
        }
        y += 2.5;
      } else if (tag === 'TABLE') {
        doc.setFontSize(9.5);
        for (const tr of el.querySelectorAll('tr')) {
          const tds = tr.querySelectorAll('td, th'); if (!tds.length) continue;
          const a = texto(tds[0]), b = tds[1] ? texto(tds[1]) : '';
          const negrito = temNegrito(tr);
          doc.setFont('helvetica', 'normal');
          const la = doc.splitTextToSize(a, LARG * 0.58), lb = doc.splitTextToSize(b, LARG * 0.40);
          const alt = Math.max(la.length, lb.length) * 4.4 + 2.4;
          cabe(alt);
          doc.setTextColor(...TINTA); doc.text(la, M, y + 3.2);
          doc.setFont('helvetica', negrito ? 'bold' : 'normal'); doc.text(lb, W - M, y + 3.2, { align: 'right' });
          y += alt; doc.setDrawColor(...LINHA); doc.setLineWidth(0.2); doc.line(M, y - 0.8, W - M, y - 0.8);
        }
        y += 3;
      }
    }
    const total = doc.getNumberOfPages(), hoje = new Date().toLocaleDateString('pt-BR');
    for (let i = 1; i <= total; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...CINZA);
      doc.setDrawColor(...LINHA); doc.setLineWidth(0.2); doc.line(M, H - 14, W - M, H - 14);
      doc.text('Foster Engenharia & Construção · (24) 99209-6103 · comercial@fosterconstrucoes.com.br', M, H - 9.5);
      doc.text(`${hoje} · folha ${i}/${total}`, W - M, H - 9.5, { align: 'right' });
    }
    doc.save(nomeArquivo);
    return Promise.resolve();
  }
  window.FCMemorial = { baixar };
})();
