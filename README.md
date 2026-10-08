# Foster Calc

Cálculo de lajes maciças e treliçadas, vigas contínuas, pilares retangulares, escadas, sapatas isoladas e blocos sobre estacas de concreto armado pela ABNT NBR 6118:2023, no navegador.
PWA estático (GitHub Pages) com login, projetos salvos e plano Pro no Supabase.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Página inicial, meus projetos e planos |
| `viga.html` | Módulo de vigas (1 a 5 vãos, balanços, cargas concentradas, parede/baldrame) |
| `laje.html` | Módulo de lajes maciças |
| `pilar.html` | Módulo de pilares (flexão composta oblíqua, 2ª ordem) |
| `sapata.html` | Módulo de sapatas isoladas rígidas |
| `trelicada.html` | Módulo de lajes treliçadas unidirecionais (vigotas TR, enchimento cerâmico ou EPS) |
| `escada.html` | Módulo de escadas de lance reto com patamares |
| `divisa.html` | Módulo de sapata de divisa com viga alavanca |
| `associada.html` | Módulo de sapata associada (dois pilares, viga de rigidez) |
| `muro.html` | Módulo de muro de arrimo de flexão |
| `bloco.html` | Módulo de blocos sobre 1 a 4 estacas (bielas e tirantes) |
| `validacao.html` | Comparação com exemplos resolvidos publicados (gerada por script a partir dos dados de validação) |
| `explica.js` | Textos do modo didático (botão “?” na memória de viga, laje e pilar; planos Estudante e Pro) |
| `termos.html` | Termos de uso e política de privacidade (LGPD) |
| `LICENSE` | Licença proprietária: © Foster Engenharia & Construção, todos os direitos reservados |
| `app.js` | Login, plano, projetos salvos, barra superior e downloads |
| `manifest.json`, `sw.js`, `icon-*.png` | Instalação como app e uso offline |

## Publicar no GitHub Pages

1. Crie o repositório `fostercalc` em github.com/FosterFcs (público).
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
4. O site fica em `https://fosterfcs.github.io/fostercalc/`.

## Configurar o login no Supabase (uma vez)

Projeto: **foster-calc** (`fvsdlpnvqfvjdxmfgbjx`, São Paulo).

Em **Authentication → URL Configuration**:
- *Site URL*: `https://fosterfcs.github.io/fostercalc/`
- *Redirect URLs*: adicione `https://fosterfcs.github.io/fostercalc/**`
  (e depois `https://fostercalc.com.br/**` quando o domínio estiver apontado)

Sem isso, os links de confirmação de e-mail e de recuperação de senha voltam para o endereço errado.

O envio de e-mails do Supabase gratuito tem limite baixo por hora. Para produção, configure um SMTP próprio
em **Authentication → Emails → SMTP Settings** (ex.: Resend, Brevo ou o e-mail da Foster).

## Ativar o plano Pro de um cliente

No **SQL Editor** do Supabase:

```sql
update public.perfis
set plano = 'pro', plano_ate = now() + interval '30 days'
where id = (select id from auth.users where email = 'cliente@exemplo.com');
```

Plano anual: use `interval '365 days'` no lugar de `'30 days'`.

Plano Estudante: `set plano = 'estudante'` (mesmos intervalos). PDF e DXF saem com a marca de uso acadêmico, sem cabeçalho profissional nem carimbo.

Para cancelar: `set plano = 'gratis', plano_ate = null`.
Assinantes com `plano_ate` vencido voltam a ser tratados como grátis automaticamente.

## Perfil do engenheiro e cabeçalho do PDF

- Clique no seu nome, no topo do site, para abrir **Meu perfil**: nome, CREA/CAU, empresa, telefone, e-mail, cidade e logo (PNG ou JPG; é reduzido automaticamente).
- Em cada módulo, a seção **Projeto e exportação** tem os campos **Obra**, **Cliente** e **ART/RRT nº**. Eles ficam lembrados entre os módulos e são salvos junto com o projeto.
- Todas as folhas do PDF saem com cabeçalho (logo, responsável técnico, obra, cliente, data e folha) e a última folha traz o carimbo com espaço para assinatura e número da ART.
- Logos ficam no bucket privado `logos`, na pasta de cada usuário (`<id do usuário>/logo.png`).

## Banco de dados

- `perfis`: nome, CREA/CAU, empresa, telefone, e-mail, cidade, logo, plano e validade. O usuário edita só os dados cadastrais; o plano só muda pelo painel/SQL.
- `projetos`: entradas de cada cálculo salvo (`modulo` = viga, laje, trelicada, pilar, sapata, divisa, associada, bloco, escada ou muro). Cada usuário vê apenas os seus.
- `exportacoes`: registro de cada PDF/DXF baixado (só aceita inserção de quem é Pro).

Todas as tabelas com RLS; o verificador de segurança do Supabase está sem alertas.

## Integração entre módulos

- Laje maciça, laje treliçada e escada: botão **Usar na viga** em cada reação leva g e q (kN/m) para `viga.html?g=..&q=..&L=..&de=..`.
- Viga: tabela **Reações nos pilares** com link **Calcular pilar** (`pilar.html?Nk=..&hx=..&fck=..`).
- Pilar: links para sapata (`sapata.html?...`) e bloco sobre estacas (`bloco.html?...`) com seção, Nk, momento e fck preenchidos.

## Limitações conhecidas

- O cálculo e a geração de PDF/DXF rodam no navegador. O bloqueio do Pro impede o uso normal,
  mas um usuário técnico consegue contorná-lo lendo o código. Próximo passo: gerar a memória em
  PDF numa Edge Function, que só responde a assinantes.
- Cobrança manual (WhatsApp). Próximo passo: integrar Asaas ou Mercado Pago com webhook que
  atualiza `perfis.plano` sozinho.
- Preços exibidos: mensal `R$ 29,90/mês` (lançamento) e anual `R$ 299/ano`, em `app.js` (`CONFIG.precoPro`, `CONFIG.precoAnual`, `CONFIG.anualEquivale`) e nos cards de `index.html`.
