'use strict';

// =====================================================================
// Estado salvo
// =====================================================================
let S = carregar();

function migrar(o) { // saves antigos ganham os campos novos sem perder nada
  if (typeof o.xp !== 'number') o.xp = 0;
  if (typeof o.nivel !== 'number') o.nivel = 1;
  if (!o.missoes) o.missoes = null;
  return o;
}
function carregar() {
  try {
    const t = localStorage.getItem(CONFIG.chaveSave);
    if (t) { const o = JSON.parse(t); if (o && o.v === 1) return migrar(o); }
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
  if (remoto && remoto.v === 1) { S = migrar(remoto); salvarLocal(); render(); toast('Progresso carregado da nuvem.'); }
  else if (S) Nuvem.enviar();
}
function hoje() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function garantirDia() {
  if (S.diario.data !== hoje()) S.diario = { data: hoje(), feitos: {} };
  if (!S.missoes || S.missoes.data !== hoje()) S.missoes = { data: hoje(), lista: missoesDoDia(hoje()) };
}

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
    xp: 0, nivel: 1, missoes: { data: hoje(), lista: missoesDoDia(hoje()) },
  };
  salvar();
  return ids;
}

// =====================================================================
// Regras ligadas ao estado
// =====================================================================
function unidadeHeroi(id) {
  const h = HEROI[id];
  return { nome: h.nome, classe: h.classe, rar: h.rar, heroi: id, ap: aparenciaHeroi(h), ...atributos(h, S.herois[id]) };
}
function minhaEquipe() { return S.equipe.map(id => (id ? unidadeHeroi(id) : null)); }
function poderEquipe() { return poderTime(minhaEquipe()); }
function poderHeroi(id) { return poder(atributos(HEROI[id], S.herois[id] || 1)); }
function tenho(id) { return !!S.herois[id]; }

function registrar(tipo, nome, venceu) {
  S.stats.batalhas++; S.stats[venceu ? 'v' : 'd']++;
  S.historico.unshift({ tipo, nome, venceu, quando: Date.now() });
  S.historico = S.historico.slice(0, 8);
}
function ganharXp(qtd) {
  const antes = { nivel: S.nivel, xp: S.xp };
  S.xp += qtd;
  const niveis = [];
  let moedasGanhas = 0;
  while (S.xp >= xpParaProximo(S.nivel)) {
    S.xp -= xpParaProximo(S.nivel);
    S.nivel++;
    const p = premioNivel(S.nivel);
    moedasGanhas += p;
    niveis.push(S.nivel);
  }
  S.moedas += moedasGanhas;
  return { antes, qtd, niveis, moedas: moedasGanhas };
}
function progresso(tipo, qtd = 1) {
  garantirDia();
  for (const m of S.missoes.lista) if (m.tipo === tipo && !m.coletada) m.prog = Math.min(m.meta, m.prog + qtd);
}
function missoesProntas() {
  if (!S || !S.missoes || S.missoes.data !== hoje()) return 0;
  return S.missoes.lista.filter(m => m.prog >= m.meta && !m.coletada).length;
}
function desafiosDoDia() {
  return DIFICULDADES.map((d, i) => {
    const faseEq = Math.max(1, S.fase + d.delta);
    return { d, faseEq, time: timeInimigo(faseEq, `dia-${S.diario.data}-${i}`) };
  });
}

// =====================================================================
// Componentes de interface
// =====================================================================
function esc(t) {
  return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmt(n) { return Number(n).toLocaleString('pt-BR'); }
const ICONE_MOEDA = '<svg class="ic-moeda" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#f2c14e"/><circle cx="10" cy="10" r="6" fill="none" stroke="#a87b12" stroke-width="1.6"/><path d="M10 6.5l2 3.5-2 3.5-2-3.5z" fill="#a87b12"/></svg>';
function moedas(n) { return `<span class="valor">${ICONE_MOEDA}${fmt(n)}</span>`; }
function estrelas(nivel) {
  return `<span class="estrelas" aria-label="Nível ${nivel} de ${CONFIG.nivelMaximo}">${'★'.repeat(nivel)}<i>${'★'.repeat(CONFIG.nivelMaximo - nivel)}</i></span>`;
}
function brasao(nome, grande) {
  const ini = nome.trim().split(/\s+/).filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join('') || nome.slice(0, 2);
  return `<span class="brasao${grande ? ' brasao--grande' : ''}" aria-hidden="true">${esc(ini.toUpperCase())}</span>`;
}
function seloRar(rar) { return `<span class="selo selo--rar" data-rar="${rar}">${NOME_RARIDADE[rar]}</span>`; }
function seloClasse(classe) {
  return `<span class="selo selo--classe" style="--cl:var(--cl-${classe})">${icone(ICONE_CLASSE[classe])}${CLASSES[classe].nome}</span>`;
}
function retrato(ap, cls = '') { return `<div class="retrato ${cls}" style="--cl:var(--cl-${ap.classe})">${boneco(ap)}</div>`; }
// Personagem animado (esqueleto + poses, js/animacao.js). Fora da tela, para sozinho.
function vivo(id, { anim = '', atraso = 0, cls = '' } = {}) {
  const h = HEROI[id];
  return `<canvas class="vivo sp-${h.classe} ${cls}" data-heroi="${id}"${anim ? ` data-anim="${anim}" data-atraso="${atraso}"` : ''} aria-hidden="true"></canvas>`;
}
const ANIM_ATAQUE = { guerreiro: 'golpe', mago: 'conjurar', arqueiro: 'disparo', dragao: 'mordida', curandeiro: 'conjurar' };
const ANIM_HAB = { guerreiro: 'grito', mago: 'conjurarForte', arqueiro: 'disparoForte', dragao: 'sopro', curandeiro: 'bencao' };
// Anima a troca de posições na formação (mede antes, mede depois e anima a diferença)
function comTransicao(fn) {
  const antes = new Map();
  document.querySelectorAll('.vaga[data-heroi]').forEach(el => antes.set(el.dataset.heroi, el.getBoundingClientRect()));
  fn();
  if (movimentoReduzido()) return;
  document.querySelectorAll('.vaga[data-heroi]').forEach(el => {
    const r0 = antes.get(el.dataset.heroi), r1 = el.getBoundingClientRect();
    const tela = el.querySelector('canvas.vivo');
    if (!r0) {
      el.animate([{ opacity: 0, transform: 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
      Palco.agir(tela, 'apresentacao', 140);
      return;
    }
    const dx = r0.left - r1.left, dy = r0.top - r1.top;
    if (Math.abs(dx) + Math.abs(dy) < 2) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 440, easing: 'cubic-bezier(.2,.8,.2,1)' });
    Palco.agir(tela, 'apresentacao', 260);
  });
}
function cena(regiao, W, H) { return `<img class="cena-fundo" src="${Campo.cenaUrl(regiao, W, H)}" alt="">`; }

// Card de herói (catálogo, reserva, revelação)
function hcard(id, { acao = 'detalhe', extra = '', sel = false, animado = false, anim = '' } = {}) {
  const h = HEROI[id];
  const meu = tenho(id);
  const ap = aparenciaHeroi(h);
  const tag = acao ? 'button' : 'div';
  const attrs = acao ? `data-acao="${acao}" data-id="${id}" aria-label="${esc(h.nome)}, ${CLASSES[h.classe].nome} ${NOME_RARIDADE[h.rar]}"` : '';
  if (!meu) {
    return `<${tag} class="hcard is-bloq" data-rar="${h.rar}" ${attrs}>
      <div class="hcard__topo">${seloRar(h.rar)}<span class="hcard__classe" style="--cl:var(--cl-${h.classe})">${icone(ICONE_CLASSE[h.classe])}</span></div>
      <div class="retrato">${boneco(ap, 'silhueta')}</div>
      <span class="cadeado">${icone('cadeado')}</span>
      <div class="hcard__info"><div class="hcard__nome">${esc(h.nome)}</div><div class="hcard__sub">Ainda não invocado</div></div>
      ${extra}
    </${tag}>`;
  }
  const a = atributos(h, S.herois[id]);
  return `<${tag} class="hcard${h.rar === 'lendario' ? ' is-lendario' : ''}${sel ? ' is-sel' : ''}" data-rar="${h.rar}" ${attrs}>
    <div class="hcard__topo">${seloRar(h.rar)}<span class="hcard__classe" style="--cl:var(--cl-${h.classe})" data-dica="${CLASSES[h.classe].nome}">${icone(ICONE_CLASSE[h.classe])}</span></div>
    ${animado ? `<div class="retrato" style="--cl:var(--cl-${h.classe})">${vivo(id, { anim })}</div>` : retrato(ap)}
    <div class="hcard__info">
      <div class="hcard__nome">${esc(h.nome)}</div>
      <div class="hcard__sub">${h.titulo ? esc(h.titulo) : CLASSES[h.classe].nome}</div>
      <div class="hcard__linha">${estrelas(S.herois[id])}<span class="hcard__poder">${icone('raio')}${fmt(poder(a))}</span></div>
      <div class="hcard__stats">
        <span>${icone('espada')}${a.atk}</span><span>${icone('vida')}${fmt(a.hp)}</span>
        <span>${icone('defesa')}${a.def}</span><span>${icone('velocidade')}${a.spd}</span>
      </div>
    </div>
    ${extra}
  </${tag}>`;
}

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('ver');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('ver'), 2600);
}

// =====================================================================
// Navegação
// =====================================================================
const ABAS = [
  { id: 'inicio', nome: 'Início', ic: 'inicio' },
  { id: 'batalha', nome: 'Batalha', ic: 'batalha' },
  { id: 'equipe', nome: 'Equipe', ic: 'equipe' },
  { id: 'herois', nome: 'Heróis', ic: 'herois' },
  { id: 'invocar', nome: 'Invocar', ic: 'invocar' },
];
let aba = 'inicio';
let subBatalha = 'campanha';
const filtro = { classe: 'todos', rar: 'todas', ordem: 'poder', meus: false };
let vagaAtual = null;

function render() {
  const app = document.getElementById('app');
  document.getElementById('b-guilda').innerHTML = icone('perfil');
  if (!S) {
    app.classList.add('sem-nav');
    document.getElementById('tela').innerHTML = telaCriar();
    return;
  }
  app.classList.remove('sem-nav');
  garantirDia();
  document.getElementById('r-moedas').innerHTML = moedas(S.moedas);
  document.getElementById('r-nivel').innerHTML = `${icone('xp')}Nv ${S.nivel}`;
  const alerta = missoesProntas();
  const navHtml = ABAS.map(a => `<button class="nav-item${a.id === aba ? ' is-sel' : ''}" data-acao="aba" data-aba="${a.id}"${a.id === aba ? ' aria-current="page"' : ''}>
      ${icone(a.ic)}<span>${a.nome}</span>${a.id === 'inicio' && alerta ? '<span class="alerta" aria-label="Recompensa disponível"></span>' : ''}</button>`).join('');
  document.getElementById('nav-topo').innerHTML = navHtml;
  document.getElementById('nav-baixo').innerHTML = navHtml;
  document.getElementById('tela').innerHTML = TELAS[aba]();
  Palco.hidratar(document.getElementById('tela'));
}
function irPara(nova) { aba = nova; render(); window.scrollTo(0, 0); }

// =====================================================================
// Tela: criar guilda
// =====================================================================
function telaCriar() {
  const amostra = ['guerreiro', 'mago', 'dragao', 'arqueiro', 'curandeiro'].map(c => HEROIS.find(h => h.classe === c && (h.rar === 'epico' || h.rar === 'lendario')));
  return `<section class="abertura">
    <div class="abertura__cena">${cena('Floresta Sussurrante', 240, 100)}
      <div class="abertura__herois">${amostra.map(h => boneco(aparenciaHeroi(h))).join('')}</div>
    </div>
    <h1>Funde sua guilda</h1>
    <p class="suave">Invoque heróis, monte a equipe e assista às batalhas acontecerem sozinhas. Sua estratégia é escolher quem entra em campo e onde fica.</p>
    <label class="campo-txt">Nome da guilda
      <input id="c-nome" maxlength="24" placeholder="Ex.: Ordem do Carvalho" autocomplete="off"></label>
    <button class="btn btn--grande btn--bloco" data-acao="criar">${icone('xp')}Fundar e receber 5 heróis</button>
  </section>`;
}

// =====================================================================
// Tela: início (painel de aventura)
// =====================================================================
function blocoXp() {
  const meta = xpParaProximo(S.nivel);
  return `<div class="aventura__xp">
    <div class="linha linha--entre"><span>Nível ${S.nivel}</span><span class="num">${fmt(S.xp)} / ${fmt(meta)} XP</span></div>
    <div class="barra"><i style="width:${(S.xp / meta * 100).toFixed(1)}%"></i></div>
  </div>`;
}
function telaInicio() {
  const fase = S.fase, regiao = regiaoDa(fase), chefe = ehChefe(fase);
  const time = timeInimigo(fase, 'fase-' + fase);
  const restantes = DIFICULDADES.length - Object.keys(S.diario.feitos).length;
  const qtdHerois = Object.keys(S.herois).length;
  return `<div class="inicio-grade">
    <div class="pilha">
      <section class="aventura">
        ${cena(regiao, 240, 130)}
        <div class="aventura__perfil">
          ${brasao(S.guilda.nome)}
          <div class="aventura__xp" style="gap:4px">
            <h1>${esc(S.guilda.nome)}</h1>
            ${blocoXp()}
          </div>
        </div>
        <div class="aventura__equipe">${S.equipe.filter(Boolean).map(id => vivo(id)).join('')}</div>
        <div class="aventura__acao">
          <div class="info"><span>${icone('mapa')} ${esc(regiao)}</span><span>Poder da equipe <b class="ouro num">${fmt(poderEquipe())}</b></span></div>
          <button class="btn btn--grande btn--bloco" data-acao="batalharFase">${icone('batalha')}${chefe ? 'Enfrentar o chefe' : 'Continuar aventura'} · Fase ${fase}</button>
          <div class="info"><span>Inimigos: poder <b class="num">${fmt(poderTime(time))}</b></span><span>Prêmio ${moedas(premioFase(fase))}</span></div>
        </div>
      </section>
      <div class="atalhos">
        <button class="atalho" data-acao="aba" data-aba="equipe">${icone('equipe')}Equipe<small>${S.equipe.filter(Boolean).length}/5 heróis</small></button>
        <button class="atalho" data-acao="ir" data-aba="batalha" data-sub="desafios">${icone('trofeu')}Desafios<small>${restantes} de 3 hoje</small></button>
        <button class="atalho" data-acao="aba" data-aba="invocar">${icone('invocar')}Invocar<small>${qtdHerois}/${HEROIS.length} heróis</small></button>
      </div>
    </div>
    <div class="pilha">
      ${cardMissoes()}
      ${cardAtividade()}
    </div>
  </div>`;
}
function cardMissoes() {
  const lista = S.missoes.lista;
  const feitas = lista.filter(m => m.coletada).length;
  return `<section class="card">
    <div class="card__cab"><h2>${icone('missao')}Missões do dia</h2><span class="selo selo--ouro">${feitas}/${lista.length}</span></div>
    <div class="missoes">${lista.map((m, i) => {
      const pronta = m.prog >= m.meta && !m.coletada;
      return `<div class="missao${pronta ? ' is-pronta' : ''}${m.coletada ? ' is-feita' : ''}">
        <div class="missao__txt">${esc(textoMissao(m))}</div>
        <div class="missao__barra"><div class="barra barra--fina"><i style="width:${(m.prog / m.meta * 100).toFixed(0)}%"></i></div><span class="num">${m.prog}/${m.meta}</span></div>
        <div class="missao__acao">${m.coletada
          ? `<span class="selo selo--ok">${icone('check')}Feita</span>`
          : `<button class="btn btn--peq${pronta ? '' : ' btn--sec'}" data-acao="coletarMissao" data-i="${i}" ${pronta ? '' : 'disabled'}>${pronta ? icone('presente') : ''}${moedas(m.premio)}</button>`}</div>
      </div>`;
    }).join('')}</div>
    <p class="suave mini" style="margin-top:var(--e3)">Cada missão também dá ${XP_MISSAO} XP. Renovam todo dia.</p>
  </section>`;
}
function cardAtividade() {
  const tenhoN = Object.keys(S.herois).length;
  return `<section class="card card--plano">
    <div class="card__cab"><h2>${icone('relogio')}Atividade recente</h2></div>
    ${S.historico.length ? `<ul class="atividades">${S.historico.slice(0, 5).map(h => `<li>
        <span class="res ${h.venceu ? 'res--v' : 'res--d'}">${h.venceu ? 'V' : 'D'}</span>
        <span class="tipo">${esc(h.tipo)}</span><span class="nome">${esc(h.nome)}</span></li>`).join('')}</ul>`
      : `<div class="estado">${icone('batalha')}<p>Nenhuma batalha ainda. Sua primeira aventura está a um toque.</p></div>`}
    <div style="margin-top:var(--e4)" class="pilha" >
      <div class="linha linha--entre mini"><span class="suave">Coleção de heróis</span><b class="num">${tenhoN}/${HEROIS.length}</b></div>
      <div class="barra barra--fina barra--info"><i style="width:${(tenhoN / HEROIS.length * 100).toFixed(1)}%"></i></div>
    </div>
  </section>`;
}

// =====================================================================
// Tela: batalha (campanha + desafios)
// =====================================================================
function barraForcas(meu, dele) {
  const pct = meu / (meu + dele) * 100;
  const v = meu >= dele * 1.15 ? ['ok-txt', 'Vantagem sua'] : meu >= dele * 0.92 ? ['ouro', 'Batalha equilibrada'] : ['erro-txt', 'Inimigos mais fortes'];
  return `<div class="forcas">
    <div class="forcas__nomes"><span>Sua equipe <b class="num">${fmt(meu)}</b></span><span>Inimigos <b class="num">${fmt(dele)}</b></span></div>
    <div class="forcas__barra" role="img" aria-label="Comparação de poder"><i style="width:${pct.toFixed(1)}%"></i><s></s></div>
    <span class="forcas__veredito ${v[0]}">${v[1]}</span>
  </div>`;
}
function telaBatalha() {
  return `<div class="cabecalho"><div><h1>Batalha</h1><p class="suave">A luta é automática: escolha bem quem entra em campo.</p></div>
      <button class="btn btn--sec btn--peq" data-acao="aba" data-aba="equipe">${icone('equipe')}Ajustar equipe</button></div>
    <div class="seg" style="margin-bottom:var(--e4)" role="tablist">
      <button class="${subBatalha === 'campanha' ? 'is-sel' : ''}" data-acao="subBatalha" data-v="campanha" role="tab" aria-selected="${subBatalha === 'campanha'}">${icone('mapa')}Campanha</button>
      <button class="${subBatalha === 'desafios' ? 'is-sel' : ''}" data-acao="subBatalha" data-v="desafios" role="tab" aria-selected="${subBatalha === 'desafios'}">${icone('trofeu')}Desafios do dia</button>
    </div>
    ${subBatalha === 'campanha' ? secCampanha() : secDesafios()}`;
}
function secCampanha() {
  const fase = S.fase, regiao = regiaoDa(fase), chefe = ehChefe(fase);
  const time = timeInimigo(fase, 'fase-' + fase);
  const inicioRegiao = Math.floor((fase - 1) / 5) * 5 + 1;
  const nos = Array.from({ length: 5 }, (_, i) => inicioRegiao + i);
  return `<section class="card regiao${chefe ? ' card--chefe' : ''}">
    <div class="regiao__cena">${cena(regiao, 240, 90)}
      <div class="regiao__titulo"><small>Região ${Math.floor((fase - 1) / 5) + 1}</small><h2>${esc(regiao)}</h2></div>
      <div class="regiao__inimigos">${time.map(u => boneco(u.ap)).join('')}</div>
    </div>
    <div class="regiao__corpo">
      <div class="trilha" aria-label="Fases da região">${nos.map((f, i) => `${i ? `<span class="trilha__elo${f <= fase ? ' is-feito' : ''}"></span>` : ''}
        <span class="trilha__no${f < fase ? ' is-feito' : f === fase ? ' is-atual' : ''}${ehChefe(f) ? ' is-chefe' : ''}" data-dica="${ehChefe(f) ? 'Chefe' : 'Fase ' + f}">${f < fase ? icone('check') : ehChefe(f) ? icone('caveira') : f}</span>`).join('')}</div>
      <div class="linha linha--entre"><h3>Fase ${fase}${chefe ? ' · Chefe' : ''}</h3>${chefe ? '<span class="selo selo--chefe">Prêmio em dobro</span>' : `<span class="selo">${time.length} inimigos</span>`}</div>
      ${barraForcas(poderEquipe(), poderTime(time))}
      <button class="btn btn--grande btn--bloco" data-acao="batalharFase">${icone('batalha')}Batalhar · ${moedas(premioFase(fase))}</button>
      <p class="suave mini centro">Vitória libera a próxima fase e rende XP. A cada 5 fases há um chefe.</p>
    </div>
  </section>`;
}
function secDesafios() {
  return `<div class="desafios">${desafiosDoDia().map(({ d, faseEq, time }, i) => {
    const feito = S.diario.feitos[i];
    const cor = { facil: 'selo--ok', medio: 'selo--ouro', dificil: 'selo--erro' }[d.id];
    return `<section class="card desafio">
      <div class="desafio__topo"><span class="selo ${cor}">${d.nome}</span><span class="suave mini">Nível de fase ${faseEq}</span></div>
      <div class="fileira-sprites">${time.map(u => boneco(u.ap)).join('')}</div>
      ${barraForcas(poderEquipe(), poderTime(time))}
      <div class="desafio__rodape">
        <span class="mini suave">Vitória ${moedas(premioDesafio(faseEq, d, true))}</span>
        ${feito
          ? `<span class="selo ${feito.venceu ? 'selo--ok' : 'selo--erro'}">${feito.venceu ? icone('check') + 'Vitória' : 'Derrota'}</span>`
          : `<button class="btn btn--peq" data-acao="batalharDesafio" data-i="${i}">${icone('batalha')}Batalhar</button>`}
      </div>
    </section>`;
  }).join('')}</div>
  <p class="suave mini centro" style="margin-top:var(--e3)">Três desafios por dia. Derrota ainda rende um pouco de moeda e XP.</p>`;
}

// =====================================================================
// Tela: equipe
// =====================================================================
function htmlVaga(i) {
  const id = S.equipe[i];
  const rotulo = i < FRENTE ? 'Frente' : 'Trás';
  if (!id) return `<button class="vaga vaga--vazia" data-acao="vaga" data-i="${i}" aria-label="Vaga vazia (${rotulo})">${icone('mais')}<small>Vazia</small></button>`;
  const h = HEROI[id];
  return `<button class="vaga${vagaAtual === i ? ' is-sel' : ''}" data-rar="${h.rar}" data-acao="vaga" data-i="${i}" data-heroi="${id}" aria-label="${esc(h.nome)} (${rotulo}). Trocar">
    <div class="retrato" style="--cl:var(--cl-${h.classe})">${vivo(id)}</div>
    <div class="vaga__info"><b>${esc(h.nome)}</b><small>${CLASSES[h.classe].nome} · ${fmt(poderHeroi(id))}</small>${estrelas(S.herois[id])}</div>
  </button>`;
}
function telaEquipe() {
  const eq = minhaEquipe().filter(Boolean);
  const reservas = Object.keys(S.herois).map(Number).filter(id => !S.equipe.includes(id)).sort((a, b) => poderHeroi(b) - poderHeroi(a));
  const soma = k => eq.reduce((s, u) => s + u[k], 0);
  return `<div class="cabecalho"><div><h1>Equipe</h1><p class="suave">Toque numa vaga para trocar o herói. A frente recebe os golpes corpo a corpo.</p></div>
      <div class="poder-total"><small>Poder</small><b class="num">${fmt(poderEquipe())}</b></div></div>
    <div class="equipe-grade">
      <div class="pilha">
        <section class="formacao" aria-label="Formação">
          <div class="formacao__rotulo">${icone('defesa')}Frente<span></span></div>
          <div class="formacao__fila formacao__fila--frente">${[0, 1].map(htmlVaga).join('')}</div>
          <div class="formacao__rotulo">${icone('arco')}Trás<span></span></div>
          <div class="formacao__fila">${[2, 3, 4].map(htmlVaga).join('')}</div>
        </section>
        <div class="resumo-equipe">
          <div><small>${icone('vida')}Vida</small><b class="num">${fmt(soma('hp'))}</b></div>
          <div><small>${icone('espada')}Ataque</small><b class="num">${fmt(soma('atk'))}</b></div>
          <div><small>${icone('defesa')}Defesa</small><b class="num">${fmt(soma('def'))}</b></div>
          <div><small>${icone('velocidade')}Veloc.</small><b class="num">${eq.length ? Math.round(soma('spd') / eq.length) : 0}</b></div>
        </div>
        <button class="btn btn--sec btn--bloco" data-acao="melhorEquipe">${icone('troca')}Montar melhor equipe</button>
      </div>
      <section>
        <div class="cabecalho" style="margin-top:0"><h2>Reserva</h2><span class="suave mini">${reservas.length} heróis</span></div>
        ${reservas.length ? `<div class="grade-herois">${reservas.map(id => hcard(id)).join('')}</div>`
          : `<div class="estado">${icone('invocar')}<p>Todos os seus heróis estão em campo.</p><button class="btn btn--peq" data-acao="aba" data-aba="invocar">Invocar mais heróis</button></div>`}
      </section>
    </div>`;
}

// =====================================================================
// Tela: heróis (catálogo)
// =====================================================================
const ORDENS = { poder: 'Poder', raridade: 'Raridade', nivel: 'Nível', nome: 'Nome' };
function listaFiltrada() {
  const rarIdx = r => RARIDADES.indexOf(r);
  let lista = HEROIS.filter(h => (filtro.classe === 'todos' || h.classe === filtro.classe)
    && (filtro.rar === 'todas' || h.rar === filtro.rar) && (!filtro.meus || tenho(h.id)));
  const chave = {
    poder: h => -(tenho(h.id) ? poderHeroi(h.id) : poder(atributos(h, 1)) / 10),
    raridade: h => -rarIdx(h.rar) * 1000 - (S.herois[h.id] || 0),
    nivel: h => -(S.herois[h.id] || 0) * 10 - rarIdx(h.rar),
    nome: () => 0,
  }[filtro.ordem];
  lista = lista.sort((a, b) => (tenho(b.id) - tenho(a.id)) || (chave(a) - chave(b)) || a.nome.localeCompare(b.nome));
  return lista;
}
function telaHerois() {
  const lista = listaFiltrada();
  const meus = HEROIS.filter(h => tenho(h.id)).length;
  return `<div class="cabecalho"><div><h1>Heróis</h1><p class="suave">Sua coleção: <b class="ouro num">${meus}</b> de ${HEROIS.length}</p></div></div>
    <div class="ferramentas">
      <div class="ferramentas__chips" role="group" aria-label="Filtrar por classe">
        <button class="chip${filtro.classe === 'todos' ? ' is-sel' : ''}" data-acao="filtroClasse" data-v="todos">Todas</button>
        ${ORDEM_CLASSES.map(c => `<button class="chip${filtro.classe === c ? ' is-sel' : ''}" data-acao="filtroClasse" data-v="${c}" style="--cl:var(--cl-${c})"><span class="ponto"></span>${CLASSES[c].nome}</button>`).join('')}
      </div>
      <div class="ferramentas__linha">
        <label class="sr" for="f-rar">Raridade</label>
        <select class="seletor" id="f-rar" data-filtro="rar">
          <option value="todas"${filtro.rar === 'todas' ? ' selected' : ''}>Todas as raridades</option>
          ${RARIDADES.map(r => `<option value="${r}"${filtro.rar === r ? ' selected' : ''}>${NOME_RARIDADE[r]}</option>`).join('')}
        </select>
        <label class="sr" for="f-ordem">Ordenar</label>
        <select class="seletor" id="f-ordem" data-filtro="ordem">
          ${Object.entries(ORDENS).map(([k, v]) => `<option value="${k}"${filtro.ordem === k ? ' selected' : ''}>Ordenar: ${v}</option>`).join('')}
        </select>
        <button class="chip" data-acao="soMeus" aria-pressed="${filtro.meus}">${icone('check')}Só os meus</button>
        <span class="contagem num">${lista.length} heróis</span>
      </div>
    </div>
    ${lista.length ? `<div class="grade-herois">${lista.map(h => hcard(h.id)).join('')}</div>`
      : `<div class="estado">${icone('filtro')}<p>Nenhum herói com esses filtros.</p><button class="btn btn--sec btn--peq" data-acao="limparFiltros">Limpar filtros</button></div>`}`;
}

// =====================================================================
// Tela: invocar
// =====================================================================
function telaInvocar() {
  const lendas = POR_RARIDADE.lendario;
  const vitrine = [lendas[2], lendas[0], lendas[3]].filter(Boolean);
  return `<div class="cabecalho"><div><h1>Invocar</h1><p class="suave">Use moedas para chamar novos heróis para a guilda.</p></div>
      <span class="recurso">${moedas(S.moedas)}</span></div>
    <div class="pilha">
      <section class="vitrine" aria-label="Heróis lendários">
        <div class="vitrine__texto"><small>Portal das lendas</small><h2>Heróis lendários podem atender ao chamado</h2></div>
        <div class="vitrine__aneis"></div>
        <div class="vitrine__herois">${vitrine.map((h, i) => `<span class="${i === 1 ? 'destaque' : ''}" data-dica="${esc(h.nome)} · ${esc(h.titulo)}">${vivo(h.id)}</span>`).join('')}</div>
      </section>
      <div class="portais">${INVOCACOES.map(p => `<section class="card portal portal--${p.id}">
          <div class="portal__arte" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="portal__info">
            <div class="linha linha--entre"><h2>${p.nome}</h2>${p.garantia ? `<span class="selo selo--rar" data-rar="${p.garantia}">${NOME_RARIDADE[p.garantia]}+ garantido</span>` : ''}</div>
            <p class="suave mini">${p.desc}</p>
            <div class="portal__chances">${RARIDADES.map(r => `<span class="selo selo--rar" data-rar="${r}">${NOME_RARIDADE[r]} ${Math.round(p.pesos[r] * 100)}%</span>`).join('')}</div>
            <button class="btn" data-acao="invocar" data-id="${p.id}" ${S.moedas < p.preco ? 'disabled' : ''}>${icone('invocar')}Invocar · ${moedas(p.preco)}</button>
            ${S.moedas < p.preco ? `<span class="mini apagado">Faltam ${fmt(p.preco - S.moedas)} moedas. Ganhe mais em batalhas e missões.</span>` : ''}
          </div>
        </section>`).join('')}</div>
      <details class="card card--plano regras">
        <summary>${icone('info')}Como funciona a invocação${icone('seta')}</summary>
        <ul>
          <li>Cada invocação sorteia heróis de acordo com as chances de cada portal.</li>
          <li>Herói repetido sobe 1 nível (+12% de força), até ${CONFIG.nivelMaximo}★.</li>
          <li>Repetido no nível máximo vira moedas: ${RARIDADES.map(r => `${NOME_RARIDADE[r]} ${VALOR_MAXIMO[r]}`).join(', ')}.</li>
          <li>Moedas vêm só de batalhas, missões e níveis da guilda. Não há compras no jogo.</li>
        </ul>
        <table class="tabela-chances">
          <thead><tr><th>Portal</th>${RARIDADES.map(r => `<th>${NOME_RARIDADE[r]}</th>`).join('')}</tr></thead>
          <tbody>${INVOCACOES.map(p => `<tr><td>${p.nome}</td>${RARIDADES.map(r => `<td>${Math.round(p.pesos[r] * 100)}%</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </details>
    </div>`;
}

// =====================================================================
// Tela: guilda (perfil e conta)
// =====================================================================
function telaGuilda() {
  const st = S.stats;
  return `<div class="cabecalho"><div><h1>Guilda</h1><p class="suave">Seu perfil, conta e progresso.</p></div></div>
    <div class="grade-2">
      <div class="pilha">
        <section class="card">
          <div class="perfil">${brasao(S.guilda.nome, true)}<div class="perfil__xp"><h2>${esc(S.guilda.nome)}</h2>${blocoXp()}</div></div>
        </section>
        <section class="card card--plano pilha">
          <h2>Nome da guilda</h2>
          <label class="campo-txt"><span class="sr">Nome</span><input id="e-nome" maxlength="24" value="${esc(S.guilda.nome)}"></label>
          <button class="btn btn--sec" data-acao="salvarGuilda">Salvar nome</button>
        </section>
        <section class="card card--plano">
          <div class="card__cab"><h2>${icone('trofeu')}Números</h2></div>
          <div class="numeros">
            <div><b class="num">${st.batalhas}</b><span>Batalhas</span></div><div><b class="num">${st.v}</b><span>Vitórias</span></div>
            <div><b class="num">${st.d}</b><span>Derrotas</span></div><div><b class="num">${S.fase - 1}</b><span>Fases vencidas</span></div>
          </div>
        </section>
      </div>
      <div class="pilha">
        ${blocoConta()}
        <section class="card card--plano pilha">
          <h2>Progresso</h2>
          <p class="suave mini">O jogo salva sozinho a cada ação.</p>
          <button class="btn btn--perigo" data-acao="apagar">Apagar tudo e recomeçar</button>
        </section>
        <p class="suave mini centro">${esc(CONFIG.nome)} · protótipo</p>
      </div>
    </div>`;
}
function blocoConta() {
  const u = Nuvem.usuario;
  const status = `<p class="status-nuvem" id="status-nuvem" data-estado="${Nuvem.estado}">${Nuvem.texto}</p>`;
  const cab = `<div class="card__cab"><h2>${icone('nuvem')}Conta</h2></div>`;
  if (!Nuvem.configurada() || !u) return `<section class="card card--plano">${cab}${status}</section>`;
  if (!u.is_anonymous && u.email) {
    return `<section class="card card--plano pilha">${cab}${status}
      <p>Conectado como <b>${esc(u.email)}</b>. Seu progresso abre em qualquer aparelho.</p>
      <button class="btn btn--sec" data-acao="sairConta">Sair desta conta</button></section>`;
  }
  return `<section class="card card--plano pilha">${cab}${status}
    <p class="suave mini">Sua conta é anônima. Vincule um e-mail para não perder o progresso e jogar em outros aparelhos.</p>
    <label class="campo-txt">E-mail<input id="e-email" type="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
    <button class="btn" data-acao="protegerEmail">Vincular e-mail a esta conta</button>
    <button class="btn btn--sec" data-acao="entrarEmail">Já tenho conta: entrar com este e-mail</button>
  </section>`;
}

const TELAS = { inicio: telaInicio, batalha: telaBatalha, equipe: telaEquipe, herois: telaHerois, invocar: telaInvocar, guilda: telaGuilda };

// =====================================================================
// Batalha (arena)
// =====================================================================
let B = null;
function linhaElenco(u) {
  return `<div class="eb" id="eb-${u.uid}" style="--cl:var(--cl-${u.classe})">
    ${boneco(u.ap)}
    <span class="eb__nome">${esc(u.nome)}</span>
    <div class="eb__base">
      <div class="barra ${u.lado ? 'barra--erro' : 'barra--ok'}"><i style="width:100%"></i></div>
      <div class="eb__carga" aria-hidden="true"><i></i><i></i></div>
    </div>
  </div>`;
}
function assistir({ sim, titulo, regiao, nomeInimigo, recompensa }) {
  const lado = l => sim.inicio.filter(u => u.lado === l);
  const el = document.getElementById('batalha');
  el.innerHTML = `<div class="arena">
      <div class="placar-hud">
        <div class="ph-time ph-ali"><span>${esc(S.guilda.nome)}</span></div>
        <div class="ph-centro">
          <div class="ph-num"><b id="bvivos0">${lado(0).length}</b><i>✕</i><b id="bvivos1">${lado(1).length}</b></div>
          <div class="ph-turno" id="bturno">Turno 0</div>
        </div>
        <div class="ph-time ph-ini"><span>${esc(nomeInimigo)}</span></div>
      </div>
      <div class="elenco-batalha elenco-batalha--ini" aria-label="Inimigos">${lado(1).map(linhaElenco).join('')}</div>
      <div class="campo-wrap" id="bcampo">
        <canvas id="campo"></canvas><canvas id="campo-hud"></canvas>
        <div class="carregando" aria-label="Preparando o campo"></div>
        <div class="resultado" id="bfim" hidden></div>
      </div>
      <div class="elenco-batalha elenco-batalha--ali" aria-label="Sua equipe">${lado(0).map(linhaElenco).join('')}</div>
      <div class="narracao" id="bnarra" aria-live="polite">${esc(titulo)}</div>
      <div class="legenda-carga" aria-hidden="true"><span><i></i>carga da habilidade</span><span><i class="cheia"></i>habilidade no próximo turno</span></div>
      <div class="controles" id="bacoes">
        <button class="chip is-sel" data-acao="vel" data-v="1">1x</button>
        <button class="chip" data-acao="vel" data-v="2">2x</button>
        <button class="chip" data-acao="vel" data-v="4">4x</button>
        <button class="btn btn--sec btn--peq" data-acao="pular">Pular para o resultado</button>
      </div>
    </div>`;
  el.hidden = false;
  document.body.classList.add('travado');
  B = { sim, recompensa, fim: false };
  Campo.iniciar({ sim, regiao, aoFim: finalizar });
}
function finalizar() {
  if (!B || B.fim) return;
  B.fim = true;
  Campo.pular();
  const venceu = B.sim.vencedor === 0;
  const r = B.recompensa;
  const xp = r.xp;
  const meta = xpParaProximo(xp.antes.nivel);
  const subiu = xp.niveis.length > 0;
  const painel = document.getElementById('bfim');
  painel.className = 'resultado ' + (venceu ? 'resultado--v' : 'resultado--d');
  painel.innerHTML = `<div class="resultado__caixa" role="dialog" aria-label="Resultado da batalha">
      <div class="resultado__titulo">${venceu ? 'Vitória' : 'Derrota'}</div>
      ${r.extra ? `<p class="${venceu ? 'ouro' : 'suave'}" style="font-weight:700">${r.extra}</p>` : ''}
      <div class="premios">
        <div class="premio"><span>${icone('presente')}Moedas</span><b class="valor">${ICONE_MOEDA}+${fmt(r.moedas)}</b></div>
        <div class="premio"><span>${icone('xp')}Experiência</span><b class="num">+${xp.qtd} XP</b></div>
        ${subiu ? `<div class="premio premio--nivel"><span>${icone('coroa')}Nível ${xp.niveis[xp.niveis.length - 1]} alcançado!</span><b class="valor">${ICONE_MOEDA}+${fmt(xp.moedas)}</b></div>` : ''}
        <div class="pilha" style="gap:6px">
          <div class="linha linha--entre mini suave"><span>Nível ${S.nivel}</span><span class="num">${fmt(S.xp)} / ${fmt(xpParaProximo(S.nivel))} XP</span></div>
          <div class="barra"><i id="bxp" style="width:${subiu ? 0 : (xp.antes.xp / meta * 100).toFixed(1)}%"></i></div>
        </div>
        ${r.missoes ? `<div class="premio"><span>${icone('missao')}Missões</span><b class="mini">${r.missoes}</b></div>` : ''}
      </div>
      <div class="resultado__acoes">
        ${venceu && r.proxima ? `<button class="btn btn--grande" data-acao="proximaFase">${icone('batalha')}Próxima fase</button>` : ''}
        ${!venceu ? `<button class="btn" data-acao="ajustarEquipe">${icone('equipe')}Ajustar equipe</button>` : ''}
        <button class="btn ${venceu && r.proxima ? 'btn--sec' : venceu ? '' : 'btn--sec'}" data-acao="fecharBatalha">Continuar</button>
      </div>
    </div>`;
  painel.hidden = false;
  document.getElementById('bacoes').hidden = true;
  requestAnimationFrame(() => setTimeout(() => {
    const b = document.getElementById('bxp');
    if (b) b.style.width = (S.xp / xpParaProximo(S.nivel) * 100).toFixed(1) + '%';
  }, 120));
}
function fecharBatalha() { Campo.parar(); B = null; fechar('batalha'); render(); }

// Aplica todas as consequências da batalha antes de animar (fechar no meio não trapaceia)
function concluirBatalha({ tipo, faseEq, venceu, premio, sim }) {
  S.moedas += premio;
  const resumo = resumoBatalha(sim);
  const prontasAntes = missoesProntas();
  if (venceu) progresso('vencer');
  if (venceu && tipo === 'campanha') progresso('campanha');
  if (tipo === 'desafio') progresso('desafios');
  progresso('monstros', resumo.monstros);
  progresso('habilidades', resumo.habilidades);
  const xp = ganharXp(xpBatalha(tipo, faseEq, venceu));
  const novas = missoesProntas() - prontasAntes;
  return { moedas: premio, xp, missoes: novas > 0 ? `${novas} pronta${novas > 1 ? 's' : ''} para coletar` : '' };
}

// =====================================================================
// Invocação: revelar cartas
// =====================================================================
function receber(ids) {
  return ids.map(id => {
    const h = HEROI[id];
    if (!S.herois[id]) { S.herois[id] = 1; return { id, selo: `<span class="selo selo--ok selo-canto">Novo</span>` }; }
    if (S.herois[id] < CONFIG.nivelMaximo) {
      S.herois[id]++;
      return { id, selo: `<span class="selo selo--rar selo-canto" data-rar="raro">Nível ${S.herois[id]}</span>` };
    }
    S.moedas += VALOR_MAXIMO[h.rar];
    return { id, selo: `<span class="selo selo--ouro selo-canto">Máx · +${VALOR_MAXIMO[h.rar]}</span>` };
  });
}
function mostrarRevelacao(itens, titulo) {
  const melhor = itens.reduce((m, it, i) => RARIDADES.indexOf(HEROI[it.id].rar) > RARIDADES.indexOf(HEROI[itens[m].id].rar) ? i : m, 0);
  const el = document.getElementById('revelar');
  el.innerHTML = `<div class="revelar__caixa">
      <h2>${esc(titulo)}</h2>
      <p class="suave">Toque nas cartas para revelar.</p>
      <div class="reveladas">${itens.map((it, i) => `<button class="virar${i === melhor && itens.length > 1 ? ' is-destaque' : ''}" data-rar="${HEROI[it.id].rar}" data-acao="virar" style="--d:${i * 70}ms" aria-label="Revelar carta ${i + 1}">
          <span class="verso">${icone('invocar')}</span><span class="frente">${hcard(it.id, { acao: null, extra: it.selo, animado: true })}</span></button>`).join('')}</div>
      <div class="destaque-invocacao" id="rdestaque" hidden></div>
      <div id="racoes"><button class="btn btn--sec" data-acao="revelarTodas">Revelar todas</button></div>
    </div>`;
  el.hidden = false;
  el.dataset.melhor = itens[melhor].id;
  document.body.classList.add('travado');
  Palco.hidratar(el);
}
function conferirRevelacao() {
  if (document.querySelectorAll('#revelar .virar:not(.is-revelada)').length) return;
  const h = HEROI[document.getElementById('revelar').dataset.melhor];
  const d = document.getElementById('rdestaque');
  if (h && (h.rar === 'epico' || h.rar === 'lendario')) {
    d.innerHTML = `<span class="selo selo--rar" data-rar="${h.rar}">${NOME_RARIDADE[h.rar]}</span><h2>${esc(h.nome)}${h.titulo ? ', ' + esc(h.titulo) : ''}</h2>`;
    d.hidden = false;
  }
  document.getElementById('racoes').innerHTML = '<button class="btn btn--grande" data-acao="fecharRevelar">Continuar</button>';
}

// =====================================================================
// Modais: escolher herói para a vaga, detalhe do herói
// =====================================================================
function abrirModal(html) {
  const el = document.getElementById('modal');
  el.innerHTML = `<div class="modal__caixa" role="dialog" aria-modal="true">${html}</div>`;
  el.hidden = false;
  Palco.hidratar(el);
  document.body.classList.add('travado');
  const foco = el.querySelector('button, input');
  if (foco) foco.focus({ preventScroll: true });
}
function cabModal(titulo) {
  return `<div class="modal__cab"><h2>${titulo}</h2><button class="btn-icone" data-acao="fecharModal" aria-label="Fechar">${icone('fechar')}</button></div>`;
}
function modalVaga(i) {
  vagaAtual = i;
  document.querySelectorAll('.vaga.is-sel').forEach(v => v.classList.remove('is-sel'));
  const sel = document.querySelector(`.vaga[data-i="${i}"]`);
  if (sel) { sel.classList.add('is-sel'); Palco.agir(sel.querySelector('canvas.vivo'), 'apresentacao'); }
  const atual = S.equipe[i];
  const pAtual = atual ? poderHeroi(atual) : 0;
  const aAtual = atual ? atributos(HEROI[atual], S.herois[atual]) : null;
  const ids = Object.keys(S.herois).map(Number).sort((a, b) => poderHeroi(b) - poderHeroi(a));
  const delta = (v, base) => {
    const d = v - base;
    return d === 0 ? '<span class="apagado">=</span>' : `<span class="${d > 0 ? 'delta-mais' : 'delta-menos'}">${d > 0 ? '▲' : '▼'}${fmt(Math.abs(d))}</span>`;
  };
  abrirModal(`${cabModal(`${i < FRENTE ? 'Frente' : 'Trás'} · vaga ${i + 1}`)}
    <p class="suave mini">${atual ? `Comparando com <b>${esc(HEROI[atual].nome)}</b> (poder ${fmt(pAtual)}).` : 'Escolha quem ocupa esta vaga.'} ${i < FRENTE ? 'Guerreiros e dragões aguentam melhor a frente.' : 'Magos, arqueiros e curandeiros rendem mais atrás.'}</p>
    <ul class="escolhas">
      ${atual ? `<li><button class="btn btn--sec btn--bloco btn--peq" data-acao="tirar">Deixar vaga vazia</button></li>` : ''}
      ${ids.map(id => {
        const h = HEROI[id], onde = S.equipe.indexOf(id), a = atributos(h, S.herois[id]);
        return `<li><button class="escolha${onde === i ? ' is-sel' : ''}" data-acao="escolher" data-id="${id}" data-rar="${h.rar}">
          ${retrato(aparenciaHeroi(h))}
          <span class="escolha__nome"><b>${esc(h.nome)}</b><small>${CLASSES[h.classe].nome} · ${NOME_RARIDADE[h.rar]} · ${'★'.repeat(S.herois[id])}${onde >= 0 ? (onde === i ? ' · nesta vaga' : ' · na equipe') : ''}</small>
            ${aAtual && onde !== i ? `<small>${icone('espada')} ${delta(a.atk, aAtual.atk)} &nbsp; ${icone('vida')} ${delta(a.hp, aAtual.hp)}</small>` : ''}</span>
          <span class="escolha__poder num">${fmt(poderHeroi(id))}${atual && onde !== i ? `<small>${delta(poderHeroi(id), pAtual)}</small>` : ''}</span>
        </button></li>`;
      }).join('')}
    </ul>`);
}
let MAX_ATR = null;
function maxAtributos() {
  if (!MAX_ATR) {
    MAX_ATR = { hp: 0, atk: 0, def: 0, spd: 0 };
    HEROIS.forEach(h => { const a = atributos(h, CONFIG.nivelMaximo); for (const k in MAX_ATR) MAX_ATR[k] = Math.max(MAX_ATR[k], a[k]); });
  }
  return MAX_ATR;
}
function modalDetalhe(id) {
  const h = HEROI[id], c = CLASSES[h.classe], meu = tenho(id);
  const nivel = S.herois[id] || 1, a = atributos(h, nivel), mx = maxAtributos();
  const onde = S.equipe.indexOf(id);
  const atr = (ic, nome, k) => `<div class="atributo"><span>${icone(ic)}${nome}</span><div class="barra barra--fina"><i style="width:${(a[k] / mx[k] * 100).toFixed(0)}%"></i></div><b>${fmt(a[k])}</b></div>`;
  const acoes = !meu
    ? `<div class="estado">${icone('cadeado')}<p>Ainda não está na guilda. Pode aparecer em qualquer invocação; o Portal Épico tem mais chance de heróis raros.</p><button class="btn btn--peq" data-acao="irInvocar">${icone('invocar')}Ir para Invocar</button></div>`
    : `<section class="pilha" style="gap:var(--e2)">
        <h3>${onde >= 0 ? `Na equipe · vaga ${onde + 1} (${onde < FRENTE ? 'frente' : 'trás'})` : 'Escalar na equipe'}</h3>
        <div class="mini-vagas">${S.equipe.map((eid, i) => `<button class="mini-vaga" data-acao="escalarEm" data-id="${id}" data-i="${i}" aria-label="Colocar na vaga ${i + 1}">
            ${eid ? boneco(aparenciaHeroi(HEROI[eid])) : icone('mais')}<span>${i < FRENTE ? 'Frente' : 'Trás'}</span></button>`).join('')}</div>
        ${onde >= 0 ? `<button class="btn btn--sec btn--peq" data-acao="tirarHeroi" data-id="${id}">Tirar da equipe</button>` : ''}
      </section>`;
  abrirModal(`${cabModal(esc(h.nome))}
    <div class="detalhe" data-rar="${h.rar}">
      <div class="detalhe__topo">
        ${meu ? `<div class="retrato" style="--cl:var(--cl-${h.classe})">${vivo(id, { anim: 'apresentacao', atraso: 160 })}</div>` : retrato(aparenciaHeroi(h), 'is-bloq')}
        <div class="detalhe__nome">
          ${h.titulo ? `<span class="suave">${esc(h.titulo)}</span>` : ''}
          <div class="linha">${seloRar(h.rar)}${seloClasse(h.classe)}</div>
          ${meu ? `<div class="linha">${estrelas(nivel)}<span class="mini suave">Nível ${nivel}/${CONFIG.nivelMaximo}</span></div>
            <span class="mini suave">${nivel < CONFIG.nivelMaximo ? 'Mais 1 cópia na invocação sobe o nível.' : 'Nível máximo: cópias viram moedas.'}</span>
            <span class="hcard__poder">${icone('raio')}Poder ${fmt(poder(a))}</span>` : '<span class="mini suave">Atributos no nível 1</span>'}
        </div>
      </div>
      ${meu ? `<div class="previa" role="group" aria-label="Ver animação">
        <span class="mini suave">Ver em ação:</span>
        <button class="chip" data-acao="verAnim" data-anim="${ANIM_ATAQUE[h.classe]}">${icone('espada')}Ataque</button>
        <button class="chip" data-acao="verAnim" data-anim="${ANIM_HAB[h.classe]}">${icone('raio')}${c.hab.nome}</button>
        <button class="chip" data-acao="verAnim" data-anim="vitoria">${icone('trofeu')}Vitória</button>
      </div>` : ''}
      <div class="atributos">
        ${atr('vida', 'Vida', 'hp')}${atr('espada', 'Ataque', 'atk')}${atr('defesa', 'Defesa', 'def')}${atr('velocidade', 'Velocidade', 'spd')}
      </div>
      <div class="habilidade" style="--cl:var(--cl-${h.classe})"><span class="habilidade__ic">${icone(ICONE_CLASSE[h.classe])}</span><div><b>Ataque normal</b><p>${c.normal}</p></div></div>
      <div class="habilidade" style="--cl:var(--cl-${h.classe})"><span class="habilidade__ic">${icone('raio')}</span><div><b>${c.hab.nome}</b><p>${c.hab.desc}</p></div></div>
      <p class="suave mini">${c.papel}</p>
      ${acoes}
    </div>`);
}
function fechar(id) {
  document.getElementById(id).hidden = true;
  if (['batalha', 'revelar', 'modal'].every(x => document.getElementById(x).hidden)) document.body.classList.remove('travado');
}

// =====================================================================
// Ações
// =====================================================================
function colocarNaVaga(id, i) {
  const onde = S.equipe.indexOf(id);
  if (onde >= 0) S.equipe[onde] = S.equipe[i];
  S.equipe[i] = id;
  salvar();
}
const ACOES = {
  aba: d => irPara(d.aba),
  ir: d => { if (d.sub) subBatalha = d.sub; irPara(d.aba); },
  subBatalha: d => { subBatalha = d.v; render(); },
  filtroClasse: d => { filtro.classe = d.v; render(); },
  soMeus: () => { filtro.meus = !filtro.meus; render(); },
  limparFiltros: () => { Object.assign(filtro, { classe: 'todos', rar: 'todas', ordem: 'poder', meus: false }); render(); },

  criar: () => {
    const nome = document.getElementById('c-nome').value.trim();
    if (nome.length < 3) return toast('Dê um nome à guilda (mínimo 3 letras).');
    const ids = novoJogo(nome);
    render();
    mostrarRevelacao(ids.map(id => ({ id, selo: '<span class="selo selo--ok selo-canto">Novo</span>' })), 'Seus primeiros heróis');
  },

  batalharFase: () => {
    if (!S.equipe.some(Boolean)) return toast('Coloque pelo menos um herói na equipe.');
    const fase = S.fase;
    const sim = simularBatalha(minhaEquipe(), timeInimigo(fase, 'fase-' + fase), hashTexto('b' + Date.now()));
    const venceu = sim.vencedor === 0;
    const recompensa = concluirBatalha({ tipo: 'campanha', faseEq: fase, venceu, premio: venceu ? premioFase(fase) : 30, sim });
    if (venceu) {
      S.fase++;
      recompensa.extra = ehChefe(fase) ? `Chefe derrotado! Fase ${S.fase} liberada.` : `Fase ${S.fase} liberada.`;
      recompensa.proxima = true;
    } else {
      recompensa.extra = 'Dica: suba o nível dos heróis ou troque quem fica na frente.';
    }
    registrar('Campanha', `Fase ${fase} · ${regiaoDa(fase)}`, venceu);
    salvar();
    assistir({ sim, recompensa, titulo: `Fase ${fase} · ${regiaoDa(fase)}`, regiao: regiaoDa(fase),
      nomeInimigo: ehChefe(fase) ? `Chefe · Fase ${fase}` : `Fase ${fase}` });
  },
  batalharDesafio: d => {
    garantirDia();
    const i = Number(d.i);
    if (S.diario.feitos[i]) return;
    if (!S.equipe.some(Boolean)) return toast('Coloque pelo menos um herói na equipe.');
    const { d: dif, faseEq, time } = desafiosDoDia()[i];
    const sim = simularBatalha(minhaEquipe(), time, hashTexto('d' + Date.now() + i));
    const venceu = sim.vencedor === 0;
    const recompensa = concluirBatalha({ tipo: 'desafio', faseEq, venceu, premio: premioDesafio(faseEq, dif, venceu), sim });
    S.diario.feitos[i] = { venceu };
    registrar('Desafio', dif.nome, venceu);
    salvar();
    assistir({ sim, recompensa, titulo: `Desafio do dia · ${dif.nome}`, regiao: regiaoDa(faseEq), nomeInimigo: `Desafio ${dif.nome}` });
  },
  vel: (d, el) => {
    if (!B) return;
    Campo.velocidade(Number(d.v));
    document.querySelectorAll('#bacoes .chip').forEach(b => b.classList.toggle('is-sel', b === el));
  },
  pular: () => finalizar(),
  fecharBatalha: () => fecharBatalha(),
  proximaFase: () => { fecharBatalha(); ACOES.batalharFase(); },
  ajustarEquipe: () => { fecharBatalha(); irPara('equipe'); },

  coletarMissao: d => {
    const m = S.missoes.lista[Number(d.i)];
    if (!m || m.coletada || m.prog < m.meta) return;
    m.coletada = true;
    S.moedas += m.premio;
    const xp = ganharXp(XP_MISSAO);
    salvar(); render();
    toast(xp.niveis.length ? `Missão concluída! Nível ${S.nivel} alcançado.` : `Missão concluída: +${m.premio} moedas e ${XP_MISSAO} XP.`);
  },

  invocar: d => {
    const inv = INVOCACOES.find(x => x.id === d.id);
    if (S.moedas < inv.preco) return toast('Moedas insuficientes.');
    S.moedas -= inv.preco;
    const itens = receber(invocar(inv));
    progresso('invocar', inv.qtd);
    salvar();
    render();
    mostrarRevelacao(itens, inv.nome);
  },
  virar: (d, el) => {
    if (el.classList.contains('is-revelada')) return;
    el.classList.add('is-revelada');
    Palco.agir(el.querySelector('canvas.vivo'), 'entrada');
    conferirRevelacao();
  },
  revelarTodas: () => {
    document.querySelectorAll('#revelar .virar:not(.is-revelada)').forEach((b, i) => {
      b.classList.add('is-revelada');
      Palco.agir(b.querySelector('canvas.vivo'), 'entrada', i * 140);
    });
    conferirRevelacao();
  },
  verAnim: d => Palco.agir(document.querySelector('#modal canvas.vivo'), d.anim),
  fecharRevelar: () => { fechar('revelar'); render(); },
  irInvocar: () => { fechar('modal'); irPara('invocar'); },

  melhorEquipe: () => { comTransicao(() => { S.equipe = melhorEquipe(S.herois); salvar(); render(); }); toast('Melhor equipe montada.'); },
  vaga: d => modalVaga(Number(d.i)),
  escolher: d => { comTransicao(() => { colocarNaVaga(Number(d.id), vagaAtual); vagaAtual = null; fechar('modal'); render(); }); },
  tirar: () => { comTransicao(() => { S.equipe[vagaAtual] = null; vagaAtual = null; salvar(); fechar('modal'); render(); }); },
  detalhe: d => modalDetalhe(Number(d.id)),
  escalarEm: d => { comTransicao(() => { colocarNaVaga(Number(d.id), Number(d.i)); render(); }); modalDetalhe(Number(d.id)); toast('Equipe atualizada.'); },
  tirarHeroi: d => { const i = S.equipe.indexOf(Number(d.id)); if (i >= 0) S.equipe[i] = null; salvar(); render(); modalDetalhe(Number(d.id)); },
  fecharModal: () => { vagaAtual = null; fechar('modal'); if (aba === 'equipe') render(); },

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
  if (el && !el.disabled && ACOES[el.dataset.acao]) ACOES[el.dataset.acao](el.dataset, el);
  else if (e.target.id === 'modal') ACOES.fecharModal();
});
document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.filtro;
  if (k) { filtro[k] = e.target.value; render(); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('modal').hidden) ACOES.fecharModal();
  else if (!document.getElementById('revelar').hidden && document.querySelector('#racoes [data-acao="fecharRevelar"]')) ACOES.fecharRevelar();
});

document.title = CONFIG.nome + ' · RPG de batalha de heróis';
render();

// Sincroniza com a nuvem: fica o save mais recente
Nuvem.iniciar(aplicarRemoto).then(remoto => {
  if (remoto && remoto.v === 1 && (!S || (remoto.atualizado || 0) > (S.atualizado || 0))) {
    S = migrar(remoto); salvarLocal(); render();
  } else if (S) Nuvem.enviar();
  if (aba === 'guilda') render();
});
