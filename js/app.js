'use strict';

// ===== Estado salvo =====
let S = carregar();

function carregar() {
  try {
    const t = localStorage.getItem(CONFIG.chaveSave);
    if (t) { const o = JSON.parse(t); if (o && o.v === 1) return o; }
  } catch (e) { /* sem save */ }
  return null;
}
function salvarLocal() {
  try { localStorage.setItem(CONFIG.chaveSave, JSON.stringify(S)); } catch (e) { /* navegador sem storage */ }
}
function salvar() {
  S.atualizado = Date.now();
  salvarLocal();
  Nuvem.agendar();
}
// Save que veio da nuvem (outro aparelho ou conta por e-mail)
function aplicarRemoto(remoto) {
  if (remoto && remoto.v === 1) { S = remoto; salvarLocal(); render(); toast('Progresso carregado da nuvem.'); }
  else if (S) Nuvem.enviar();
}
function hoje() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function garantirDia() { if (S.diario.data !== hoje()) S.diario = { data: hoje(), feitos: {} }; }

function novoJogo(nome) {
  const iniciais = ['guerreiro', 'guerreiro', 'mago', 'arqueiro', 'curandeiro'];
  const usados = new Set();
  const ids = iniciais.map(classe => {
    const op = HEROIS.filter(h => h.classe === classe && h.rar === 'comum' && !usados.has(h.id));
    const h = op[Math.floor(Math.random() * op.length)];
    usados.add(h.id);
    return h.id;
  });
  const herois = Object.fromEntries(ids.map(id => [id, 1]));
  S = {
    v: 1, guilda: { nome }, moedas: CONFIG.moedasIniciais, herois,
    equipe: melhorEquipe(herois), fase: 1,
    diario: { data: hoje(), feitos: {} },
    historico: [], stats: { batalhas: 0, v: 0, d: 0 },
  };
  salvar();
  return ids;
}

// ===== Equipe do jogador como unidades de batalha =====
function unidadeHeroi(id) {
  const h = HEROI[id];
  return { nome: h.nome, classe: h.classe, rar: h.rar, heroi: id, ap: aparenciaHeroi(h), ...atributos(h, S.herois[id]) };
}
function minhaEquipe() { return S.equipe.map(id => (id ? unidadeHeroi(id) : null)); }
function poderEquipe() { return poderTime(minhaEquipe()); }
function poderHeroi(id) { return poder(atributos(HEROI[id], S.herois[id])); }

function registrar(tipo, nome, venceu) {
  S.stats.batalhas++; S.stats[venceu ? 'v' : 'd']++;
  S.historico.unshift({ tipo, nome, venceu });
  S.historico = S.historico.slice(0, 8);
}

// ===== Componentes =====
function esc(t) {
  return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmt(n) { return Number(n).toLocaleString('pt-BR'); }
const ICONE_MOEDA = '<svg class="ic-moeda" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#f2c14e"/><circle cx="10" cy="10" r="6" fill="none" stroke="#a87b12" stroke-width="1.6"/><path d="M10 6.5l2 3.5-2 3.5-2-3.5z" fill="#a87b12"/></svg>';
function moedas(n) { return `<span class="valor">${ICONE_MOEDA}${fmt(n)}</span>`; }

// Símbolos de cada classe (desenhos próprios)
const GLIFOS = {
  guerreiro: '<path d="M32 6l5 5v30h-10V11z" fill="currentColor"/><rect x="20" y="40" width="24" height="5" rx="2" fill="currentColor"/><rect x="29" y="45" width="6" height="9" fill="currentColor" opacity=".8"/><circle cx="32" cy="57" r="3.5" fill="currentColor"/>',
  mago: '<path d="M30 22h4v36h-4z" fill="currentColor" opacity=".85"/><circle cx="32" cy="15" r="8" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="15" r="3.5" fill="currentColor"/><path d="M48 8l1.6 4 4 1.6-4 1.6L48 19l-1.6-3.8-4-1.6 4-1.6zM16 22l1.2 3 3 1.2-3 1.2L16 30l-1.2-2.6-3-1.2 3-1.2z" fill="currentColor"/>',
  arqueiro: '<path d="M18 8c18 6 18 42 0 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M18 8v48" stroke="currentColor" stroke-width="1.5"/><path d="M14 32h36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M52 32l-8-5v10z" fill="currentColor"/><path d="M14 32l-4-4M14 32l-4 4" stroke="currentColor" stroke-width="2"/>',
  dragao: '<path d="M10 40l14-6 6-16 6 10 10-14-2 16 12 6-12 4 6 10-12-2-6 10-4-12-12 2z" fill="currentColor"/><circle cx="36" cy="32" r="2.6" fill="#1a1428"/>',
  curandeiro: '<path d="M27 10h10v15h15v10H37v15H27V35H12V25h15z" fill="currentColor"/><circle cx="32" cy="30" r="25" fill="none" stroke="currentColor" stroke-width="2" opacity=".45"/>',
};
function glifo(classe, cls = 'glifo') {
  return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${GLIFOS[classe]}</svg>`;
}
function estrelas(nivel) {
  return `<span class="estrelas">${'★'.repeat(nivel)}<i>${'★'.repeat(CONFIG.nivelMaximo - nivel)}</i></span>`;
}
function htmlCarta(id, extra = '') {
  const h = HEROI[id], c = CLASSES[h.classe];
  const nivel = S && S.herois[id];
  return `<div class="carta r-${h.rar}" style="--cl:${c.cor}">
    <div class="carta-topo"><span class="carta-classe">${c.nome}</span>${nivel ? `<b>${fmt(poderHeroi(id))}</b>` : ''}</div>
    ${boneco(aparenciaHeroi(h))}
    <div class="carta-nome">${esc(h.nome)}</div>
    <div class="carta-titulo">${h.titulo ? esc(h.titulo) : NOME_RARIDADE[h.rar]}</div>
    ${nivel ? estrelas(nivel) : ''}
    ${extra}
  </div>`;
}

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('ver');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('ver'), 2400);
}

// ===== Navegação =====
let aba = 'inicio';
let subBatalha = 'campanha';
let filtroClasse = 'todos';
let vagaAtual = null;

function render() {
  const app = document.getElementById('app');
  document.getElementById('moedas').innerHTML = S ? moedas(S.moedas) : '';
  if (!S) { app.classList.add('sem-nav'); document.getElementById('tela').innerHTML = telaCriar(); return; }
  app.classList.remove('sem-nav');
  garantirDia();
  document.getElementById('tela').innerHTML = TELAS[aba]();
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('ativo', b.dataset.aba === aba));
}
function irPara(nova) { aba = nova; render(); window.scrollTo(0, 0); }

// ===== Tela: criar guilda =====
function telaCriar() {
  return `<section class="criar">
    <div class="criar-glifos">${ORDEM_CLASSES.map(c => `<span style="--cl:${CLASSES[c].cor}">${boneco(aparenciaHeroi(HEROIS.find(h => h.classe === c && h.rar === 'epico')))}</span>`).join('')}</div>
    <h1>Funde sua guilda</h1>
    <p class="suave">Invoque heróis, monte a equipe e assista às batalhas acontecerem sozinhas. Sua estratégia é a escolha de quem entra em campo.</p>
    <label class="campo-txt">Nome da guilda
      <input id="c-nome" maxlength="24" placeholder="Ex.: Ordem do Carvalho" autocomplete="off"></label>
    <button class="btn" data-acao="criar">Fundar e receber 5 heróis</button>
  </section>`;
}

// ===== Tela: início =====
function telaInicio() {
  const restantes = DIFICULDADES.length - Object.keys(S.diario.feitos).length;
  const tenho = Object.keys(S.herois).length;
  const chefe = ehChefe(S.fase);
  return `<section class="hero-banner">
      <div class="banner-glifos">${S.equipe.filter(Boolean).map(id => `<span style="--cl:${CLASSES[HEROI[id].classe].cor}">${boneco(aparenciaHeroi(HEROI[id]))}</span>`).join('')}</div>
      <h1>${esc(S.guilda.nome)}</h1>
      <div class="banner-info"><span class="tag-poder">Poder ${fmt(poderEquipe())}</span><span>Fase ${S.fase}</span><span>${tenho} heróis</span></div>
    </section>

    <section class="bloco destaque${chefe ? ' chefe' : ''}">
      <div class="bloco-cab"><h2>Campanha · Fase ${S.fase}</h2><span class="suave">${regiaoDa(S.fase)}</span></div>
      <p class="suave">${chefe ? 'Batalha de chefe: um dragão guarda esta fase. Prêmio em dobro.' : 'Avance pelas regiões derrotando monstros.'}</p>
      <button class="btn" data-acao="batalharFase">Batalhar · ${moedas(premioFase(S.fase))}</button>
    </section>

    <section class="bloco linha-bloco" data-acao="ir" data-aba="batalha" data-sub="desafios">
      <div><h2>Desafios do dia</h2><p class="suave">${restantes ? `${restantes} de ${DIFICULDADES.length} disponíveis hoje` : 'Volte amanhã para novos desafios'}</p></div>
      <span class="seta">›</span>
    </section>

    <section class="bloco linha-bloco" data-acao="ir" data-aba="herois">
      <div style="flex:1"><h2>Coleção</h2><p class="suave">${tenho} de ${HEROIS.length} heróis</p>
        <div class="progresso"><i style="width:${(tenho / HEROIS.length * 100).toFixed(1)}%"></i></div></div>
      <span class="seta">›</span>
    </section>

    ${S.historico.length ? `<section class="bloco"><h2>Últimas batalhas</h2><ul class="historico">
      ${S.historico.map(h => `<li><span class="res ${h.venceu ? 'res-v' : 'res-d'}">${h.venceu ? 'V' : 'D'}</span>
        <span class="h-tipo">${esc(h.tipo)}</span><span class="h-nome">${esc(h.nome)}</span></li>`).join('')}
    </ul></section>` : ''}`;
}

// ===== Tela: batalha =====
function telaBatalha() {
  return `<div class="seg">
      <button class="${subBatalha === 'campanha' ? 'ativo' : ''}" data-acao="subBatalha" data-v="campanha">Campanha</button>
      <button class="${subBatalha === 'desafios' ? 'ativo' : ''}" data-acao="subBatalha" data-v="desafios">Desafios do dia</button>
    </div>
    ${subBatalha === 'campanha' ? telaCampanha() : telaDesafios()}`;
}
function linhaInimigos(time) {
  return `<div class="inimigos">${time.map(u => `<span class="ini${u.chefe ? ' chefe' : ''}" style="--cl:${CLASSES[u.classe].cor}" title="${esc(u.nome)}">${boneco(u.ap)}</span>`).join('')}</div>`;
}
function telaCampanha() {
  const time = timeInimigo(S.fase, 'fase-' + S.fase);
  const meu = poderEquipe(), dele = poderTime(time);
  const inicioRegiao = Math.floor((S.fase - 1) / 5) * 5 + 1;
  return `<div class="bloco destaque${ehChefe(S.fase) ? ' chefe' : ''}">
      <div class="bloco-cab"><h2>Fase ${S.fase}${ehChefe(S.fase) ? ' · Chefe' : ''}</h2><span class="suave">${regiaoDa(S.fase)}</span></div>
      ${linhaInimigos(time)}
      <div class="comparar"><span>Sua equipe <b>${fmt(meu)}</b></span><span>Inimigos <b class="${dele > meu ? 'perigo' : ''}">${fmt(dele)}</b></span></div>
      <button class="btn" data-acao="batalharFase">Batalhar · ${moedas(premioFase(S.fase))}</button>
    </div>
    <div class="trilha">${Array.from({ length: 5 }, (_, i) => {
      const f = inicioRegiao + i;
      return `<span class="${f < S.fase ? 'feita' : f === S.fase ? 'atual' : ''}${ehChefe(f) ? ' marco' : ''}">${f}</span>`;
    }).join('')}</div>
    <p class="suave mini centro">A cada 5 fases há um chefe. Vencer libera a próxima fase.</p>`;
}
function desafiosDoDia() {
  return DIFICULDADES.map((d, i) => {
    const faseEq = Math.max(1, S.fase + d.delta);
    return { d, faseEq, time: timeInimigo(faseEq, `dia-${S.diario.data}-${i}`) };
  });
}
function telaDesafios() {
  return `<p class="suave intro">Três desafios por dia. Derrota ainda rende um pouco de moeda.</p>
  <div class="desafios">${desafiosDoDia().map(({ d, faseEq, time }, i) => {
    const feito = S.diario.feitos[i];
    return `<div class="desafio">
      <span class="dif dif-${d.id}">${d.nome}</span>
      ${linhaInimigos(time)}
      <div class="comparar"><span>Poder inimigo <b>${fmt(poderTime(time))}</b></span><span>Vitória ${moedas(premioDesafio(faseEq, d, true))}</span></div>
      ${feito ? `<div class="feito"><span class="res ${feito.venceu ? 'res-v' : 'res-d'}">${feito.venceu ? 'V' : 'D'}</span> ${feito.venceu ? 'Vitória' : 'Derrota'}</div>`
        : `<button class="btn" data-acao="batalharDesafio" data-i="${i}">Batalhar</button>`}
    </div>`;
  }).join('')}</div>`;
}

// ===== Tela: equipe =====
function htmlVaga(i) {
  const id = S.equipe[i];
  if (!id) return `<button class="vaga vazia" data-acao="vaga" data-i="${i}"><span>+</span><small>Vazio</small></button>`;
  const h = HEROI[id];
  return `<button class="vaga r-${h.rar}" style="--cl:${CLASSES[h.classe].cor}" data-acao="vaga" data-i="${i}">
    ${boneco(aparenciaHeroi(h))}<b>${esc(h.nome)}</b><small>${CLASSES[h.classe].nome} · ${'★'.repeat(S.herois[id])}</small></button>`;
}
function telaEquipe() {
  const reservas = Object.keys(S.herois).map(Number).filter(id => !S.equipe.includes(id))
    .sort((a, b) => poderHeroi(b) - poderHeroi(a));
  return `<div class="esc-topo">
      <div><h2>Equipe de batalha</h2><p class="suave">Quem fica na frente recebe os golpes corpo a corpo.</p></div>
      <div class="poder-grande"><small>Poder</small>${fmt(poderEquipe())}</div>
    </div>
    <div class="formacao">
      <div class="fileira-rotulo">Frente</div>
      <div class="fileira">${[0, 1].map(htmlVaga).join('')}</div>
      <div class="fileira-rotulo">Trás</div>
      <div class="fileira">${[2, 3, 4].map(htmlVaga).join('')}</div>
    </div>
    <button class="btn-sec largo" data-acao="melhorEquipe">Montar melhor equipe</button>
    <h2 class="titulo-sec">Reserva (${reservas.length})</h2>
    <div class="grade">${reservas.map(id => `<button class="sem-estilo" data-acao="detalhe" data-id="${id}">${htmlCarta(id)}</button>`).join('')
      || '<p class="suave">Invoque mais heróis para ter reservas.</p>'}</div>`;
}

// ===== Tela: heróis =====
function telaHerois() {
  const lista = HEROIS.filter(h => filtroClasse === 'todos' || h.classe === filtroClasse);
  const tenho = lista.filter(h => S.herois[h.id]).length;
  return `<div class="bloco">
      <div class="bloco-cab"><h2>${filtroClasse === 'todos' ? 'Todos os heróis' : CLASSES[filtroClasse].nome}</h2><span class="suave">${tenho}/${lista.length}</span></div>
      <div class="progresso"><i style="width:${(tenho / lista.length * 100).toFixed(1)}%"></i></div>
      ${filtroClasse !== 'todos' ? `<p class="suave mini">${CLASSES[filtroClasse].papel}</p>` : ''}
    </div>
    <div class="filtros">
      <button class="chip${filtroClasse === 'todos' ? ' ativo' : ''}" data-acao="filtro" data-v="todos">Todos</button>
      ${ORDEM_CLASSES.map(c => `<button class="chip${filtroClasse === c ? ' ativo' : ''}" data-acao="filtro" data-v="${c}" style="--cl:${CLASSES[c].cor}"><i class="bolinha"></i>${CLASSES[c].nome}</button>`).join('')}
    </div>
    <div class="grade">${lista.map(h => S.herois[h.id]
      ? `<button class="sem-estilo" data-acao="detalhe" data-id="${h.id}">${htmlCarta(h.id)}</button>`
      : `<div class="carta vazia r-${h.rar}" style="--cl:${CLASSES[h.classe].cor}">${boneco(aparenciaHeroi(h), 'silhueta')}<b>???</b><small>${NOME_RARIDADE[h.rar]}</small></div>`).join('')}</div>`;
}

// ===== Tela: invocar =====
function telaInvocar() {
  return `<p class="suave intro">Herói repetido sobe 1 nível (+12% de força, até ${CONFIG.nivelMaximo}★). No nível máximo vira moeda.</p>
  <div class="portais">${INVOCACOES.map(p => `<div class="portal p-${p.id}">
      <div class="portal-arte"><span></span><span></span><span></span></div>
      <div class="portal-info">
        <h2>${p.nome}</h2>
        <p class="suave">${p.desc}</p>
        <p class="chances">${RARIDADES.map(r => `<span class="t-${r}">${NOME_RARIDADE[r]} ${Math.round(p.pesos[r] * 100)}%</span>`).join('')}</p>
        <button class="btn" data-acao="invocar" data-id="${p.id}" ${S.moedas < p.preco ? 'disabled' : ''}>${moedas(p.preco)}</button>
      </div>
    </div>`).join('')}</div>`;
}

// ===== Tela: guilda =====
function telaGuilda() {
  const st = S.stats;
  return `<section class="bloco">
      <h2>Sua guilda</h2>
      <label class="campo-txt">Nome<input id="e-nome" maxlength="24" value="${esc(S.guilda.nome)}"></label>
      <button class="btn" data-acao="salvarGuilda">Salvar</button>
    </section>
    <section class="bloco">
      <h2>Números</h2>
      <div class="numeros">
        <div><b>${st.batalhas}</b><span>Batalhas</span></div><div><b>${st.v}</b><span>Vitórias</span></div>
        <div><b>${st.d}</b><span>Derrotas</span></div><div><b>${S.fase - 1}</b><span>Fases vencidas</span></div>
      </div>
    </section>
    ${blocoConta()}
    <section class="bloco">
      <h2>Progresso</h2>
      <p class="suave">O jogo salva sozinho a cada ação.</p>
      <button class="btn-perigo" data-acao="apagar">Apagar tudo e recomeçar</button>
    </section>
    <p class="suave mini centro">${esc(CONFIG.nome)} · protótipo</p>`;
}

function blocoConta() {
  const u = Nuvem.usuario;
  const status = `<p class="status-nuvem" id="status-nuvem" data-estado="${Nuvem.estado}">${Nuvem.texto}</p>`;
  if (!Nuvem.configurada()) return `<section class="bloco"><h2>Conta</h2>${status}</section>`;
  if (!u) return `<section class="bloco"><h2>Conta</h2>${status}</section>`;
  if (!u.is_anonymous && u.email) {
    return `<section class="bloco"><h2>Conta</h2>${status}
      <p>Conectado como <b>${esc(u.email)}</b>. Seu progresso está seguro e abre em qualquer aparelho.</p>
      <button class="btn-sec largo" data-acao="sairConta">Sair desta conta</button></section>`;
  }
  return `<section class="bloco"><h2>Conta</h2>${status}
    <p class="suave">Sua conta é anônima. Vincule um e-mail para não perder o progresso e jogar em outros aparelhos.</p>
    <label class="campo-txt">E-mail<input id="e-email" type="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
    <button class="btn" data-acao="protegerEmail">Vincular e-mail a esta conta</button>
    <button class="btn-sec largo" data-acao="entrarEmail">Já tenho conta: entrar com este e-mail</button>
  </section>`;
}

const TELAS = { inicio: telaInicio, batalha: telaBatalha, equipe: telaEquipe, herois: telaHerois, invocar: telaInvocar, guilda: telaGuilda };

// ===== Reprodução da batalha =====
let B = null;
function htmlUnidade(u) {
  return `<div class="un${u.chefe ? ' chefe' : ''}" id="u${u.uid}" style="--cl:${CLASSES[u.classe].cor}">
    <div class="un-corpo">${boneco(u.ap)}<div class="flutuantes"></div></div>
    <div class="un-nome">${esc(u.nome)}</div>
    <div class="vida"><i style="width:100%"></i><b style="width:0"></b></div>
  </div>`;
}
function assistir({ sim, titulo, premio, extra = '' }) {
  const lado = l => sim.inicio.filter(u => u.lado === l);
  const fileira = (l, frente) => `<div class="arena-fileira">${lado(l).filter(u => frente ? u.vaga < FRENTE : u.vaga >= FRENTE).map(htmlUnidade).join('')}</div>`;
  const el = document.getElementById('batalha');
  el.innerHTML = `<div class="batalha-caixa">
      <div class="batalha-titulo">${esc(titulo)}</div>
      <div class="arena">
        <div class="arena-lado inimigo">${fileira(1, false)}${fileira(1, true)}</div>
        <div class="anuncio" id="banuncio"></div>
        <div class="arena-lado aliado">${fileira(0, true)}${fileira(0, false)}</div>
      </div>
      <ol class="registro" id="bregistro"></ol>
      <div class="batalha-acoes" id="bacoes">
        <button class="chip ativo" data-acao="vel" data-v="1">1x</button>
        <button class="chip" data-acao="vel" data-v="2">2x</button>
        <button class="chip" data-acao="vel" data-v="4">4x</button>
        <button class="btn-sec" data-acao="pular">Pular</button>
      </div>
    </div>`;
  el.hidden = false;
  document.body.classList.add('travado');
  B = { sim, idx: 0, vel: 1, timer: null, premio, extra, fim: false,
    nome: Object.fromEntries(sim.inicio.map(u => [u.uid, u])) };
  B.timer = setTimeout(passo, 600);
}
function aplicarAlvo(a, animar) {
  const u = B.nome[a.uid];
  const el = document.getElementById('u' + a.uid);
  el.querySelector('.vida i').style.width = (a.hp / u.hpMax * 100) + '%';
  el.querySelector('.vida b').style.width = Math.min(100, a.escudo / u.hpMax * 100) + '%';
  if (a.morreu) el.classList.add('caido');
  if (!animar) return;
  const n = document.createElement('span');
  n.className = a.cura ? 'num cura' : a.crit ? 'num crit' : 'num';
  n.textContent = a.cura ? '+' + a.cura : (a.crit ? a.dano + '!' : a.dano);
  el.querySelector('.flutuantes').appendChild(n);
  setTimeout(() => n.remove(), 1100);
  el.classList.remove('atingido'); void el.offsetWidth; el.classList.add(a.cura ? 'curado' : 'atingido');
}
function passo() {
  if (!B || B.fim) return;
  if (B.idx >= B.sim.eventos.length) return finalizar();
  const ev = B.sim.eventos[B.idx++];
  const ator = B.nome[ev.ator];
  const elA = document.getElementById('u' + ev.ator);
  elA.classList.remove('age', 'age-hab'); void elA.offsetWidth;
  elA.classList.add(ev.hab ? 'age-hab' : 'age');
  if (ev.hab) {
    const an = document.getElementById('banuncio');
    an.innerHTML = `<b style="color:${CLASSES[ator.classe].cor}">${esc(ator.nome)}</b> ${esc(ev.hab)}`;
    an.classList.remove('ver'); void an.offsetWidth; an.classList.add('ver');
  }
  setTimeout(() => {
    if (!B || B.fim) return;
    ev.alvos.forEach(a => aplicarAlvo(a, true));
    if (ev.escudoAtor) aplicarAlvo({ uid: ev.ator, hp: lerHp(ev.ator), escudo: ev.escudoAtor }, false);
    registrarLinha(ev);
  }, 220 / B.vel);
  B.timer = setTimeout(passo, (ev.hab ? 1000 : 620) / B.vel);
}
// vida atual mostrada de uma unidade (último valor conhecido nos eventos já exibidos)
function lerHp(uid) {
  for (let i = B.idx - 1; i >= 0; i--) {
    const a = B.sim.eventos[i].alvos.find(x => x.uid === uid);
    if (a) return a.hp;
  }
  return B.nome[uid].hpMax;
}
function registrarLinha(ev) {
  const ator = B.nome[ev.ator];
  const cura = ev.alvos.some(a => a.cura);
  const total = ev.alvos.reduce((s, a) => s + (a.cura || a.dano || 0), 0);
  const alvo = ev.alvos.length === 1 ? esc(B.nome[ev.alvos[0].uid].nome) : `${ev.alvos.length} alvos`;
  const mortes = ev.alvos.filter(a => a.morreu).map(a => esc(B.nome[a.uid].nome));
  const lado = ator.lado ? 'l-ini' : 'l-ali';
  document.getElementById('bregistro').insertAdjacentHTML('afterbegin',
    `<li class="${lado}"><b>${esc(ator.nome)}</b> ${ev.hab ? `usa <em>${esc(ev.hab)}</em> em` : cura ? 'cura' : 'ataca'} ${alvo}: <span class="${cura ? 'cura' : 'dano'}">${cura ? '+' : ''}${total}</span>${mortes.length ? ` · <span class="morte">${mortes.join(', ')} caiu</span>` : ''}</li>`);
}
function finalizar() {
  if (!B || B.fim) return;
  clearTimeout(B.timer);
  B.fim = true;
  for (; B.idx < B.sim.eventos.length; B.idx++) B.sim.eventos[B.idx].alvos.forEach(a => aplicarAlvo(a, false));
  const venceu = B.sim.vencedor === 0;
  document.getElementById('banuncio').classList.remove('ver');
  document.getElementById('bacoes').innerHTML = `<div class="fim">
      <div class="resultado ${venceu ? 'res-v' : 'res-d'}">${venceu ? 'Vitória' : 'Derrota'}</div>
      <div>${moedas(B.premio)} ganhas</div>
      ${B.extra}
      <button class="btn" data-acao="fecharBatalha">Continuar</button>
    </div>`;
}

// ===== Invocação: revelar cartas =====
function receber(ids) {
  return ids.map(id => {
    const h = HEROI[id];
    if (!S.herois[id]) { S.herois[id] = 1; return { id, selo: '<span class="selo novo">NOVO</span>' }; }
    if (S.herois[id] < CONFIG.nivelMaximo) {
      S.herois[id]++;
      return { id, selo: `<span class="selo nivel">NÍVEL ${S.herois[id]}</span>` };
    }
    S.moedas += VALOR_MAXIMO[h.rar];
    return { id, selo: `<span class="selo max">MÁX +${VALOR_MAXIMO[h.rar]}</span>` };
  });
}
function mostrarRevelacao(itens, titulo) {
  const el = document.getElementById('revelar');
  el.innerHTML = `<div class="revelar-caixa">
      <h2>${esc(titulo)}</h2>
      <p class="suave">Toque nas cartas para revelar.</p>
      <div class="reveladas">${itens.map((it, i) => `<button class="virar r-${HEROI[it.id].rar}" data-acao="virar" style="--d:${i * 70}ms">
          <span class="verso"></span><span class="frente">${htmlCarta(it.id, it.selo)}</span></button>`).join('')}</div>
      <div class="revelar-acoes" id="racoes"><button class="btn-sec" data-acao="revelarTodas">Revelar todas</button></div>
    </div>`;
  el.hidden = false;
  document.body.classList.add('travado');
}
function conferirRevelacao() {
  if (!document.querySelectorAll('#revelar .virar:not(.revelada)').length) {
    document.getElementById('racoes').innerHTML = '<button class="btn" data-acao="fecharRevelar">Continuar</button>';
  }
}

// ===== Folhas (escolher herói / detalhe) =====
function abrirFolha(html) {
  const el = document.getElementById('folha');
  el.innerHTML = `<div class="folha-caixa">${html}</div>`;
  el.hidden = false;
  document.body.classList.add('travado');
}
function folhaVaga(i) {
  vagaAtual = i;
  const ids = Object.keys(S.herois).map(Number).sort((a, b) => poderHeroi(b) - poderHeroi(a));
  abrirFolha(`<div class="folha-cab"><h2>${i < FRENTE ? 'Frente' : 'Trás'} · vaga ${i + 1}</h2><button class="fechar" data-acao="fecharFolha" aria-label="Fechar">×</button></div>
    <ul class="escolhas">
      ${S.equipe[i] ? '<li><button data-acao="tirar" class="tirar">Deixar vaga vazia</button></li>' : ''}
      ${ids.map(id => {
        const h = HEROI[id], onde = S.equipe.indexOf(id);
        return `<li><button data-acao="escolher" data-id="${id}" class="${onde === i ? 'atual' : ''}" style="--cl:${CLASSES[h.classe].cor}">
          <span class="esc-glifo r-${h.rar}">${boneco(aparenciaHeroi(h))}</span>
          <span class="esc-nome"><b>${esc(h.nome)}</b><small>${CLASSES[h.classe].nome} · ${NOME_RARIDADE[h.rar]} · ${'★'.repeat(S.herois[id])}${onde >= 0 ? (onde === i ? ' · nesta vaga' : ' · na equipe') : ''}</small></span>
          <span class="esc-poder">${fmt(poderHeroi(id))}</span>
        </button></li>`;
      }).join('')}
    </ul>`);
}
function folhaDetalhe(id) {
  const h = HEROI[id], c = CLASSES[h.classe], nivel = S.herois[id], a = atributos(h, nivel);
  const naEquipe = S.equipe.includes(id);
  abrirFolha(`<div class="folha-cab"><h2>${esc(h.nome)}</h2><button class="fechar" data-acao="fecharFolha" aria-label="Fechar">×</button></div>
    <div class="detalhe">
      ${htmlCarta(id)}
      <div class="detalhe-info">
        <p class="suave">${h.titulo ? esc(h.titulo) + ' · ' : ''}${c.nome} ${NOME_RARIDADE[h.rar].toLowerCase()} · nível ${nivel}/${CONFIG.nivelMaximo}</p>
        <div class="atributos">
          <span>Vida<b>${fmt(a.hp)}</b></span><span>Ataque<b>${fmt(a.atk)}</b></span>
          <span>Defesa<b>${fmt(a.def)}</b></span><span>Velocidade<b>${fmt(a.spd)}</b></span>
        </div>
        <p class="hab"><b>Ataque normal</b>${c.normal}</p>
        <p class="hab"><b>${c.hab.nome}</b>${c.hab.desc}</p>
        <p class="suave mini">${c.papel}</p>
      </div>
    </div>
    ${naEquipe ? '<p class="suave centro">Este herói já está na equipe.</p>' : '<p class="suave centro mini">Para escalar, vá em Equipe e toque numa vaga.</p>'}`);
}
function fechar(id) {
  document.getElementById(id).hidden = true;
  if (['batalha', 'revelar', 'folha'].every(x => document.getElementById(x).hidden)) document.body.classList.remove('travado');
}

// ===== Ações =====
const ACOES = {
  aba: d => irPara(d.aba),
  ir: d => { if (d.sub) subBatalha = d.sub; irPara(d.aba); },
  subBatalha: d => { subBatalha = d.v; render(); },
  filtro: d => { filtroClasse = d.v; render(); },

  criar: () => {
    const nome = document.getElementById('c-nome').value.trim();
    if (nome.length < 3) return toast('Dê um nome à guilda (mínimo 3 letras).');
    const ids = novoJogo(nome);
    render();
    mostrarRevelacao(ids.map(id => ({ id, selo: '<span class="selo novo">NOVO</span>' })), 'Seus primeiros heróis');
  },

  batalharFase: () => {
    if (!S.equipe.some(Boolean)) return toast('Coloque pelo menos um herói na equipe.');
    const fase = S.fase;
    const inimigo = timeInimigo(fase, 'fase-' + fase);
    const sim = simularBatalha(minhaEquipe(), inimigo, hashTexto('b' + Date.now()));
    const venceu = sim.vencedor === 0;
    const premio = venceu ? premioFase(fase) : 30;
    S.moedas += premio;
    let extra = '';
    if (venceu) {
      S.fase++;
      extra = `<div class="fim-extra">Fase ${S.fase} liberada${ehChefe(fase) ? ' · chefe derrotado!' : ''}</div>`;
    } else {
      extra = '<div class="fim-extra suave">Dica: suba o nível dos heróis ou mude quem fica na frente.</div>';
    }
    registrar('Campanha', `Fase ${fase} · ${regiaoDa(fase)}`, venceu);
    salvar();
    assistir({ sim, premio, extra, titulo: `Fase ${fase} · ${regiaoDa(fase)}` });
  },
  batalharDesafio: d => {
    garantirDia();
    const i = Number(d.i);
    if (S.diario.feitos[i]) return;
    if (!S.equipe.some(Boolean)) return toast('Coloque pelo menos um herói na equipe.');
    const { d: dif, faseEq, time } = desafiosDoDia()[i];
    const sim = simularBatalha(minhaEquipe(), time, hashTexto('d' + Date.now() + i));
    const venceu = sim.vencedor === 0;
    const premio = premioDesafio(faseEq, dif, venceu);
    S.moedas += premio;
    S.diario.feitos[i] = { venceu };
    registrar('Desafio', dif.nome, venceu);
    salvar();
    assistir({ sim, premio, titulo: `Desafio do dia · ${dif.nome}` });
  },
  vel: (d, el) => {
    if (!B) return;
    B.vel = Number(d.v);
    document.querySelectorAll('#bacoes .chip').forEach(b => b.classList.toggle('ativo', b === el));
  },
  pular: () => finalizar(),
  fecharBatalha: () => { clearTimeout(B && B.timer); B = null; fechar('batalha'); render(); },

  invocar: d => {
    const inv = INVOCACOES.find(x => x.id === d.id);
    if (S.moedas < inv.preco) return toast('Moedas insuficientes.');
    S.moedas -= inv.preco;
    const itens = receber(invocar(inv));
    salvar();
    render();
    mostrarRevelacao(itens, inv.nome);
  },
  virar: (d, el) => { el.classList.add('revelada'); conferirRevelacao(); },
  revelarTodas: () => { document.querySelectorAll('#revelar .virar').forEach(b => b.classList.add('revelada')); conferirRevelacao(); },
  fecharRevelar: () => { fechar('revelar'); render(); },

  melhorEquipe: () => { S.equipe = melhorEquipe(S.herois); salvar(); render(); toast('Melhor equipe montada.'); },
  vaga: d => folhaVaga(Number(d.i)),
  escolher: d => {
    const id = Number(d.id), i = vagaAtual;
    const onde = S.equipe.indexOf(id);
    if (onde >= 0) S.equipe[onde] = S.equipe[i];
    S.equipe[i] = id;
    salvar(); fechar('folha'); render();
  },
  tirar: () => { S.equipe[vagaAtual] = null; salvar(); fechar('folha'); render(); },
  detalhe: d => folhaDetalhe(Number(d.id)),
  fecharFolha: () => fechar('folha'),

  salvarGuilda: () => {
    const nome = document.getElementById('e-nome').value.trim();
    if (nome.length < 3) return toast('O nome precisa de pelo menos 3 letras.');
    S.guilda.nome = nome; salvar(); render(); toast('Guilda atualizada.');
  },
  apagar: () => {
    if (!confirm('Apagar todo o progresso? Isso não pode ser desfeito.')) return;
    try { localStorage.removeItem(CONFIG.chaveSave); } catch (e) { /* ignora */ }
    Nuvem.apagar();
    S = null; aba = 'inicio'; render();
  },

  protegerEmail: async () => {
    const email = document.getElementById('e-email').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Digite um e-mail válido.');
    try { await Nuvem.protegerComEmail(email); toast('Enviamos um link de confirmação para ' + email); }
    catch (e) { toast('Não deu certo: ' + e.message); }
  },
  entrarEmail: async () => {
    const email = document.getElementById('e-email').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Digite um e-mail válido.');
    if (!confirm('Entrar em outra conta substitui o progresso deste aparelho pelo da conta. Continuar?')) return;
    try { await Nuvem.entrarComEmail(email); toast('Abra o link que enviamos para ' + email); }
    catch (e) { toast('Não deu certo: ' + e.message); }
  },
  sairConta: async () => {
    if (!confirm('Sair da conta? O progresso continua salvo nela.')) return;
    await Nuvem.sair();
    try { localStorage.removeItem(CONFIG.chaveSave); } catch (e) { /* ignora */ }
    location.reload();
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-acao]');
  if (el && ACOES[el.dataset.acao]) ACOES[el.dataset.acao](el.dataset, el);
  else if (e.target.id === 'folha') fechar('folha');
});

document.title = CONFIG.nome + ' · Batalha de heróis';
render();

// Sincroniza com a nuvem: fica o save mais recente
Nuvem.iniciar(aplicarRemoto).then(remoto => {
  if (remoto && remoto.v === 1 && (!S || (remoto.atualizado || 0) > (S.atualizado || 0))) {
    S = remoto; salvarLocal(); render();
  } else if (S) Nuvem.enviar();
  if (aba === 'guilda') render();
});
