'use strict';

// ===== Campo de batalha em pixel art (câmera de cima, levemente inclinada) =====
// A batalha já vem calculada (simularBatalha). Aqui os personagens se movem e
// reagem seguindo os eventos NA ORDEM REAL, sem alterar nada do resultado.
// Cada personagem é um esqueleto de partes animado por js/animacao.js.
const Campo = (function () {
  let C = null;

  const VEL_ANDAR = 0.085;     // pixels do mundo por ms (marcha de entrada)
  const VEL_AVANCO = 0.2;      // investida até o alvo
  const VEL_RECUO = 0.11;      // volta para a formação, de frente para o inimigo
  const FORMACAO = [           // u: 0 = lado aliado, 1 = lado inimigo · v: posição lateral
    { u: 0.31, v: 0.33 }, { u: 0.31, v: 0.67 },
    { u: 0.11, v: 0.16 }, { u: 0.11, v: 0.5 }, { u: 0.11, v: 0.84 },
  ];
  const FOGO = ['#ff7a1a', '#ffd34d', '#ff3b1f'];
  const COR_CARGA = {
    raio: ['#c9b5ff', '#8b6cff', '#ffffff'], fogo: ['#ffb347', '#ffd34d', '#ff7a1a'],
    luz: ['#7dffb0', '#ffe08a', '#ffffff'], sagrado: ['#fff1b0', '#ffe08a'], flechaForte: ['#c6f0ff', '#ffffff'],
  };

  const TERRENOS = {
    'Floresta Sussurrante': { faixas: ['#3f8f3a', '#46993f'], ruido: ['#357a31', '#56a84b', '#4a9c42'], deco: 'floresta', poeira: '#b9d39a' },
    'Pântano Cinzento': { faixas: ['#4f6b45', '#56744b'], ruido: ['#425a3a', '#62805a', '#4b6642'], deco: 'pantano', poeira: '#9fb08f' },
    'Minas Esquecidas': { faixas: ['#7a5f45', '#82664a'], ruido: ['#6a523c', '#8f7458', '#755a41'], deco: 'minas', poeira: '#c9b08e' },
    'Picos Gelados': { faixas: ['#dfe9f2', '#e7eff6'], ruido: ['#c9d8e6', '#f6fbff', '#d3e1ec'], deco: 'gelo', poeira: '#ffffff' },
    'Ruínas de Obsidiana': { faixas: ['#4a4258', '#51495f'], ruido: ['#3e374b', '#5e5570', '#463f53'], deco: 'ruinas', poeira: '#8d84a3' },
    'Vulcão Adormecido': { faixas: ['#4a2f2a', '#523430'], ruido: ['#3c2622', '#5e3d36', '#45302b'], deco: 'vulcao', poeira: '#8a6a5e' },
  };

  function novoCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ---------- terreno ----------
  function desenharTerreno(W, H, regiao, r, horizontal) {
    const t = TERRENOS[regiao] || TERRENOS['Floresta Sussurrante'];
    const c = novoCanvas(W, H), x = c.getContext('2d');
    const faixa = Math.max(10, Math.round((horizontal ? W : H) / 12));
    for (let i = 0; i * faixa < (horizontal ? W : H); i++) {
      x.fillStyle = t.faixas[i % 2];
      if (horizontal) x.fillRect(i * faixa, 0, faixa, H); else x.fillRect(0, i * faixa, W, faixa);
    }
    for (let i = 0; i < W * H / 9; i++) {
      x.fillStyle = escolher(r, t.ruido);
      x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1);
    }
    const borda = (n, f) => { for (let i = 0; i < n; i++) { const lado = Math.floor(r() * 4); const px = lado === 0 ? r() * 14 : lado === 1 ? W - r() * 14 : r() * W; const py = lado === 2 ? r() * 12 : lado === 3 ? H - r() * 10 : r() * H; f(Math.round(px), Math.round(py)); } };
    const solto = (n, f) => { for (let i = 0; i < n; i++) f(Math.round(r() * W), Math.round(r() * H)); };
    const pedra = (px, py, cor, s = 3) => { x.fillStyle = '#0003'; x.fillRect(px - s, py + 1, s * 2 + 1, 2); x.fillStyle = cor; x.fillRect(px - s, py - s + 1, s * 2, s); x.fillStyle = tom(cor, 0.25); x.fillRect(px - s + 1, py - s + 1, s - 1, 1); };
    const arbusto = (px, py, cor) => { x.fillStyle = '#0004'; x.fillRect(px - 5, py + 2, 11, 3); x.fillStyle = cor; x.fillRect(px - 5, py - 4, 11, 7); x.fillRect(px - 3, py - 7, 7, 3); x.fillStyle = tom(cor, 0.2); x.fillRect(px - 2, py - 6, 3, 2); };
    switch (t.deco) {
      case 'floresta':
        borda(Math.round((W + H) / 9), (a, b) => arbusto(a, b, escolher(r, ['#2d6b2a', '#327531', '#285f26'])));
        solto(Math.round(W * H / 500), (a, b) => { x.fillStyle = escolher(r, ['#f4e04d', '#ffffff', '#e86a92']); x.fillRect(a, b, 1, 1); });
        solto(6, (a, b) => pedra(a, b, '#8b8f86', 2));
        break;
      case 'pantano':
        solto(Math.round(W * H / 3500) + 3, (a, b) => { x.fillStyle = '#2f4a40'; x.beginPath(); x.ellipse(a, b, 9 + r() * 8, 4 + r() * 3, 0, 0, 7); x.fill(); x.fillStyle = '#3b5c50'; x.fillRect(a - 3, b - 1, 4, 1); });
        borda(Math.round((W + H) / 12), (a, b) => arbusto(a, b, '#3a5232'));
        break;
      case 'minas':
        solto(Math.round(W * H / 1200) + 6, (a, b) => pedra(a, b, escolher(r, ['#6d6a66', '#7d7974', '#5c5955']), 3 + Math.floor(r() * 2)));
        solto(5, (a, b) => { x.fillStyle = '#7fd6ff'; x.fillRect(a, b - 3, 2, 4); x.fillRect(a + 2, b - 1, 1, 2); x.fillStyle = '#c6f0ff'; x.fillRect(a, b - 3, 1, 1); });
        break;
      case 'gelo':
        solto(Math.round(W * H / 1600) + 4, (a, b) => pedra(a, b, '#a9c6dc', 3));
        borda(Math.round((W + H) / 12), (a, b) => arbusto(a, b, '#4f6f74'));
        solto(Math.round(W * H / 300), (a, b) => { x.fillStyle = '#ffffff'; x.fillRect(a, b, 1, 1); });
        break;
      case 'ruinas':
        for (let gy = 0; gy < H; gy += 12) for (let gx = (gy / 12) % 2 ? 6 : 0; gx < W; gx += 12) { x.fillStyle = '#3a3346'; x.fillRect(gx, gy, 12, 1); x.fillRect(gx, gy, 1, 12); }
        solto(6, (a, b) => { x.fillStyle = '#0004'; x.fillRect(a - 3, b, 9, 3); x.fillStyle = '#6e6680'; x.fillRect(a - 3, b - 10, 7, 11); x.fillStyle = '#857c99'; x.fillRect(a - 3, b - 11, 7, 2); });
        break;
      case 'vulcao':
        solto(Math.round(W * H / 2600) + 4, (a, b) => {
          let px = a, py = b; x.fillStyle = '#ff7a1a';
          for (let i = 0; i < 14; i++) { x.fillRect(px, py, 1, 1); px += Math.round(r() * 2 - 0.5); py += Math.round(r() * 2 - 1); }
        });
        solto(Math.round(W * H / 1800) + 4, (a, b) => pedra(a, b, '#2a1d1b', 3));
        break;
    }
    return c;
  }

  // ---------- relógio do jogo (respeita a velocidade e as pausas de impacto) ----------
  function esperar(ms) { return new Promise(ok => C.esperas.push({ ate: C.relogio + ms, ok })); }

  // ---------- início ----------
  function iniciar({ sim, regiao, aoFim }) {
    parar();
    const wrap = document.getElementById('bcampo');
    const cv = document.getElementById('campo'), hud = document.getElementById('campo-hud');
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const horizontal = cw > ch * 1.05;
    const s = Math.max(2, Math.round(cw / (horizontal ? 240 : 130)));
    const W = Math.floor(cw / s), H = Math.floor(ch / s);
    const dpr = window.devicePixelRatio || 1;
    cv.width = W; cv.height = H;
    cv.style.width = hud.style.width = W * s + 'px';
    cv.style.height = hud.style.height = H * s + 'px';
    hud.width = Math.round(W * s * dpr); hud.height = Math.round(H * s * dpr);

    const r = criarRng(hashTexto(regiao + sim.eventos.length));
    C = { sim, aoFim, W, H, s, dpr, horizontal, regiao, ctx: cv.getContext('2d'), hx: hud.getContext('2d'),
      relogio: 0, vel: 1, esperas: [], particulas: [], efeitos: [], textos: [], U: {}, ativo: true, parar: false,
      idx: 0, turno: 0, ultimo: performance.now(), pausaAte: 0, tremor: null, calmo: movimentoReduzido(),
      poeira: (TERRENOS[regiao] || TERRENOS['Floresta Sussurrante']).poeira };
    C.ctx.imageSmoothingEnabled = false;
    C.terreno = desenharTerreno(W, H, regiao, r, horizontal);

    const pos = (u, v) => horizontal
      ? { x: W * (0.08 + 0.84 * u), y: H * (0.2 + 0.7 * v) }
      : { x: W * (0.13 + 0.74 * v), y: H * (0.95 - 0.8 * u) };
    sim.inicio.forEach(u => {
      const f = FORMACAO[u.vaga];
      const casa = pos(u.lado ? 1 - f.u : f.u, u.lado && horizontal ? f.v : (u.lado ? 1 - f.v : f.v));
      casa.x += (r() - 0.5) * 6; casa.y += (r() - 0.5) * 4;
      const rig = Sprites.rig(u.ap);
      const dir = horizontal ? (u.lado ? -1 : 1) : 1;
      // Entrada: cada um começa alguns passos atrás e marcha até a formação
      const recuo = C.calmo ? 0 : 30;
      const ini = horizontal ? { x: casa.x - dir * recuo, y: casa.y } : { x: casa.x, y: casa.y + (u.lado ? -recuo : recuo) };
      C.U[u.uid] = { ...u, x: ini.x, y: ini.y, casa, dir, rig, spr: { w: rig.w, h: rig.h },
        hpVis: u.hp, hpReal: u.hp, escudo: 0, turnos: 0, sem: r(),
        destino: recuo ? { x: casa.x, y: casa.y, vel: VEL_ANDAR * (0.85 + r() * 0.3), ok: () => {} } : null,
        acao: null, reacao: null, flash: 0, rotulo: 0, morto: false, morteT: 0, vitoria: false, derrota: false, proxPoeira: 0 };
    });
    atualizarPlacar();
    atualizarElenco();
    const carregando = wrap.querySelector('.carregando');
    if (carregando) carregando.remove();
    requestAnimationFrame(quadro);
    rodar();
  }

  // ---------- roteiro: reproduz os eventos ----------
  async function rodar() {
    const meu = C;
    await esperar(750);
    for (const ev of meu.sim.eventos) {
      if (C !== meu || meu.parar) return;
      await animarEvento(ev, meu);
    }
    if (C !== meu || meu.parar) return;
    comemorar(meu);
    await esperar(1200);
    if (C === meu && !meu.parar) meu.aoFim();
  }
  function comemorar(c) {
    for (const u of Object.values(c.U)) {
      if (u.morto) continue;
      u.acao = null;
      if (u.lado === c.sim.vencedor) u.vitoria = true; else u.derrota = true;
    }
  }

  // ---------- movimento ----------
  function flipDe(u) { return u.dir * (u.classe === 'arqueiro' ? -1 : 1); }   // o arco fica na outra mão
  function virarPara(a, alvo) { const dx = alvo.x - a.x; if (Math.abs(dx) > 1) a.dir = dx > 0 ? 1 : -1; }
  function irPara(a, x, y, vel, recuo) { return new Promise(ok => { a.destino = { x, y, vel, recuo, ok }; }); }
  // Para AO LADO do alvo (nunca em cima dele), de frente para ele
  function avancar(a, t) {
    const lado = Math.sign(a.x - t.x) || (a.uid % 2 ? 1 : -1);
    const dist = 15 + (t.classe === 'dragao' ? 5 : 0) + (a.classe === 'dragao' ? 4 : 0);
    const x = t.x + lado * dist;
    const y = t.y + (C.horizontal ? (Math.random() - 0.5) * 4 : (a.lado ? -3 : 3));
    if (Math.hypot(a.x - x, a.y - y) < 3) { virarPara(a, t); return Promise.resolve(); }
    return irPara(a, x, y, VEL_AVANCO, false).then(() => virarPara(a, t));
  }
  function voltar(a) {
    if (a.morto) return;
    if (Math.hypot(a.x - a.casa.x, a.y - a.casa.y) < 2) return;
    irPara(a, a.casa.x, a.casa.y, VEL_RECUO, true);      // recua de frente para o inimigo
  }
  function centro(alvos) {
    return alvos.reduce((m, x) => ({ x: m.x + x.u.x / alvos.length, y: m.y + x.u.y / alvos.length }), { x: 0, y: 0 });
  }

  // ---------- animações e efeitos ----------
  // Dispara uma animação de ação e devolve em quantos ms acontece o impacto
  function fazer(a, nome) {
    a.acao = { nome, t0: C.relogio, dur: Anim.DUR[nome] };
    return Anim.DUR[nome] * (Anim.IMPACTO[nome] || 0.5);
  }
  function reagir(u, nome, atacante) {
    let lado = -1;                                        // para trás, no espaço do próprio boneco
    if (atacante && atacante !== u) lado = (Math.sign(u.x - atacante.x) || 1) * flipDe(u);
    u.reacao = { nome, t0: C.relogio, dur: Anim.DUR[nome], lado };
  }
  function pausar(ms) { if (!C.calmo) C.pausaAte = performance.now() + ms; }          // "hitstop" no impacto
  function tremer(forca, ms) { if (!C.calmo) C.tremor = { ate: C.relogio + ms, forca }; }
  function pontaDaArma(a) {
    if (a.classe === 'arqueiro') return { x: a.x + a.dir * 8, y: a.y - a.spr.h * 0.5 };
    return { x: a.x + a.dir * 7, y: a.y - a.spr.h * 0.92 };
  }
  function corte(a, t, forte, cor) {
    C.efeitos.push({ tipo: 'corte', x: t.x, y: t.y - t.spr.h * 0.5, ini: C.relogio, dur: 220, forte, cor, dir: a.dir });
    pausar(forte ? 70 : 40);
    if (forte) tremer(2, 180);
  }
  async function projetil(a, t, tipo) {
    const nome = { flecha: 'disparo', flechaForte: 'disparoForte', raio: 'conjurar', luz: 'conjurar', sagrado: 'conjurar' }[tipo];
    virarPara(a, t);
    const ate = fazer(a, nome);
    if (COR_CARGA[tipo]) C.efeitos.push({ tipo: 'carga', u: a, ini: C.relogio, dur: ate, cores: COR_CARGA[tipo] });
    if (a.classe === 'arqueiro') C.efeitos.push({ tipo: 'flechaArmada', u: a, ini: C.relogio, dur: ate });
    await esperar(ate);
    if (C.parar) return;
    const p = pontaDaArma(a);
    const x1 = t.x, y1 = t.y - t.spr.h * 0.5;
    const vel = { flecha: 0.24, flechaForte: 0.3, raio: 0.17, luz: 0.13, sagrado: 0.15 }[tipo];
    return new Promise(ok => C.efeitos.push({ tipo: 'proj', subtipo: tipo, x0: p.x, y0: p.y, x1, y1, ini: C.relogio, dur: Math.hypot(x1 - p.x, y1 - p.y) / vel, ok }));
  }
  function explosao(x, y, cores, n = 12, forca = 0.05) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, v = Math.random() * forca;
      C.particulas.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 0.02, vida: 300 + Math.random() * 300, cor: escolher(Math.random, cores), t: 0 });
    }
  }
  function subir(x, y, cores, n = 8) {
    for (let i = 0; i < n; i++) C.particulas.push({ x: x + (Math.random() - 0.5) * 12, y: y - Math.random() * 6, vx: 0, vy: -0.025 - Math.random() * 0.02, vida: 500 + Math.random() * 300, cor: escolher(Math.random, cores), t: 0 });
  }
  function poeira(x, y, n = 2) {
    if (C.calmo) return;
    for (let i = 0; i < n; i++) C.particulas.push({ x: x + (Math.random() - 0.5) * 6, y: y - Math.random() * 2, vx: (Math.random() - 0.5) * 0.02, vy: -0.008 - Math.random() * 0.01, vida: 260 + Math.random() * 200, cor: C.poeira, t: 0, chao: true });
  }

  async function animarEvento(ev, meu) {
    const a = C.U[ev.ator];
    const alvos = ev.alvos.map(x => ({ ...x, u: C.U[x.uid] }));
    const alvo = alvos[0] && alvos[0].u;
    const cura = alvos.some(x => x.cura);
    const parou = () => C !== meu || meu.parar;
    C.turno++;
    a.turnos++;
    marcarAtor(a);
    narrar(ev, a, alvo, cura);
    if (ev.hab) a.rotulo = C.relogio + 1400;

    switch (a.classe) {
      case 'guerreiro': {
        await avancar(a, alvo); if (parou()) return;
        virarPara(a, alvo);
        const nome = ev.hab ? 'grito' : 'golpe';
        const ate = fazer(a, nome);
        if (ev.hab) C.efeitos.push({ tipo: 'onda', x: a.x, y: a.y - 4, ini: C.relogio, dur: 520, cor: '#ffe08a' });
        await esperar(ate); if (parou()) return;
        corte(a, alvo, !!ev.hab);
        aplicar(ev, alvos, a);
        await esperar(Anim.DUR[nome] - ate); if (parou()) return;
        voltar(a);
        break;
      }
      case 'dragao':
        if (ev.hab) {
          const meio = centro(alvos);
          virarPara(a, meio);
          const ate = fazer(a, 'sopro');
          await esperar(ate); if (parou()) return;
          C.efeitos.push({ tipo: 'sopro', a, alvo: meio, ini: C.relogio, dur: 520 });
          await esperar(520); if (parou()) return;
          alvos.forEach(x => explosao(x.u.x, x.u.y - 10, FOGO));
          tremer(1, 220);
          aplicar(ev, alvos, a);
          await esperar(Math.max(0, Anim.DUR.sopro - ate - 520));
        } else {
          await avancar(a, alvo); if (parou()) return;
          virarPara(a, alvo);
          const ate = fazer(a, 'mordida');
          await esperar(ate); if (parou()) return;
          corte(a, alvo, false, '#ffd34d');
          aplicar(ev, alvos, a);
          await esperar(Anim.DUR.mordida - ate); if (parou()) return;
          voltar(a);
        }
        break;
      case 'mago':
        if (ev.hab) {
          const ate = fazer(a, 'conjurarForte');
          C.efeitos.push({ tipo: 'carga', u: a, ini: C.relogio, dur: ate, cores: COR_CARGA.fogo, forte: true });
          await esperar(ate); if (parou()) return;
          await Promise.all(alvos.map((x, i) => esperar(i * 90).then(() => new Promise(ok =>
            C.efeitos.push({ tipo: 'proj', subtipo: 'fogo', x0: x.u.x + 10, y0: x.u.y - 70, x1: x.u.x, y1: x.u.y - 8, ini: C.relogio, dur: 380, ok })))));
          if (parou()) return;
          alvos.forEach(x => explosao(x.u.x, x.u.y - 8, FOGO));
          tremer(1, 200);
          aplicar(ev, alvos, a);
          await esperar(220);
        } else {
          await projetil(a, alvo, 'raio'); if (parou()) return;
          explosao(alvo.x, alvo.y - 14, ['#b89cff', '#ffffff', '#8b6cff'], 8);
          aplicar(ev, alvos, a);
          await esperar(160);
        }
        break;
      case 'arqueiro':
        await projetil(a, alvo, ev.hab ? 'flechaForte' : 'flecha'); if (parou()) return;
        if (ev.hab) { explosao(alvo.x, alvo.y - 14, ['#ffffff', '#c6f0ff', '#5fd38d'], 10); pausar(60); }
        aplicar(ev, alvos, a);
        await esperar(160);
        break;
      case 'curandeiro':
        if (ev.hab) {
          const ate = fazer(a, 'bencao');
          C.efeitos.push({ tipo: 'carga', u: a, ini: C.relogio, dur: ate, cores: COR_CARGA.luz, forte: true });
          await esperar(ate); if (parou()) return;
          alvos.forEach(x => C.efeitos.push({ tipo: 'coluna', x: x.u.x, y: x.u.y, ini: C.relogio, dur: 600 }));
          await esperar(250); if (parou()) return;
          alvos.forEach(x => subir(x.u.x, x.u.y - 6, ['#7dffb0', '#ffe08a', '#ffffff']));
          aplicar(ev, alvos, a);
          await esperar(300);
        } else if (cura) {
          await projetil(a, alvo, 'luz'); if (parou()) return;
          subir(alvo.x, alvo.y - 6, ['#7dffb0', '#ffe08a', '#ffffff'], 8);
          aplicar(ev, alvos, a);
          await esperar(160);
        } else {
          await projetil(a, alvo, 'sagrado'); if (parou()) return;
          explosao(alvo.x, alvo.y - 14, ['#ffe08a', '#ffffff'], 8);
          aplicar(ev, alvos, a);
          await esperar(160);
        }
        break;
    }
    if (parou()) return;
    narrarMortes(alvos);
    await esperar(ev.hab ? 220 : 120);
  }

  // Aplica o resultado REAL do evento (vida, escudo, mortes) e dispara as reações
  function aplicar(ev, alvos, atacante) {
    if (ev._feito) return;
    ev._feito = true;
    C.idx++;
    for (const x of alvos) {
      const u = x.u;
      const tinhaEscudo = u.escudo > 0;
      u.hpReal = x.hp; u.escudo = x.escudo;
      if (x.cura) {
        texto(u, '+' + x.cura, 'cura');
        reagir(u, 'cura', atacante);
        C.efeitos.push({ tipo: 'anel', u, ini: C.relogio, dur: 520, cor: '#7dffb0' });
        continue;
      }
      u.flash = C.relogio + 90;
      texto(u, x.crit ? x.dano + '!' : String(x.dano), x.crit ? 'crit' : 'dano');
      reagir(u, tinhaEscudo ? 'defesa' : 'dano', atacante);
      if (tinhaEscudo) explosao(u.x + u.dir * 5, u.y - u.spr.h * 0.5, ['#ffffff', '#bfe6ff', '#8fd8ff'], 6, 0.04);
      if (x.crit) { pausar(80); tremer(2, 200); }
      if (x.morreu) { u.morto = true; u.morteT = C.relogio; u.acao = null; u.destino = null; }
    }
    if (ev.escudoAtor) {
      const a = C.U[ev.ator];
      a.escudo = ev.escudoAtor;
      C.efeitos.push({ tipo: 'anel', u: a, ini: C.relogio, dur: 620, cor: '#bfe6ff' });
    }
    atualizarPlacar();
    atualizarElenco();
  }
  function texto(u, txt, tipo) { C.textos.push({ x: u.x + (Math.random() - 0.5) * 6, y: u.y - u.spr.h, txt, tipo, ini: C.relogio }); }

  // ---------- narração, placar e painéis ----------
  function nomeHtml(u) { return `<b class="${u.lado ? 'n-ini' : 'n-ali'}">${esc(u.nome)}</b>`; }
  function narrar(ev, a, t, cura) {
    const A = nomeHtml(a), T = t ? nomeHtml(t) : '';
    const frases = {
      guerreiro: ev.hab ? `${A} solta o Grito de guerra e avança sobre ${T}!` : `${A} avança e golpeia ${T}.`,
      dragao: ev.hab ? `${A} enche o peito... Sopro de fogo!` : `${A} morde ${T}.`,
      mago: ev.hab ? `${A} invoca a Chuva de fogo sobre todos!` : `${A} lança um raio arcano em ${T}.`,
      arqueiro: ev.hab ? `${A} prende a respiração... Tiro certeiro em ${T}!` : `${A} mira em ${T} e dispara.`,
      curandeiro: ev.hab ? `${A} ergue o cajado e abençoa a equipe.` : cura ? `${A} cura ${T}.` : `${A} ataca ${T} com luz sagrada.`,
    };
    const el = document.getElementById('bnarra');
    if (el) el.innerHTML = frases[a.classe];
  }
  function narrarMortes(alvos) {
    const mortos = alvos.filter(x => x.morreu).map(x => nomeHtml(x.u));
    const el = document.getElementById('bnarra');
    if (mortos.length && el) el.innerHTML += ` <span class="n-morte">${mortos.join(', ')} caiu!</span>`;
  }
  function atualizarPlacar() {
    const vivos = l => Object.values(C.U).filter(u => u.lado === l && !u.morto).length;
    const a = document.getElementById('bvivos0'), b = document.getElementById('bvivos1'), t = document.getElementById('bturno');
    if (a) a.textContent = vivos(0);
    if (b) b.textContent = vivos(1);
    if (t) t.textContent = 'Turno ' + C.turno;
  }
  function marcarAtor(a) {
    document.querySelectorAll('.eb.is-age').forEach(el => el.classList.remove('is-age'));
    const el = document.getElementById('eb-' + a.uid);
    if (el) el.classList.add('is-age');
  }
  // Painéis das equipes: vida e carga da habilidade (a cada 3 turnos)
  function atualizarElenco() {
    for (const u of Object.values(C.U)) {
      const el = document.getElementById('eb-' + u.uid);
      if (!el) continue;
      el.querySelector('.barra > i').style.width = (Math.max(0, u.hpReal) / u.hpMax * 100) + '%';
      const carga = u.turnos % 3;
      const pips = el.querySelector('.eb__carga');
      pips.classList.toggle('is-cheia', carga === 2);
      pips.querySelectorAll('i').forEach((p, i) => p.classList.toggle('is-on', i < carga));
      el.classList.toggle('is-caido', u.morto);
    }
  }

  // Imagem do cenário de uma região (banners das telas)
  const cenas = new Map();
  function cenaUrl(regiao, W = 240, H = 120) {
    const k = regiao + W + 'x' + H;
    if (!cenas.has(k)) cenas.set(k, desenharTerreno(W, H, regiao, criarRng(hashTexto('cena-' + regiao)), true).toDataURL());
    return cenas.get(k);
  }

  // ---------- quadro a quadro ----------
  function quadro(agora) {
    if (!C || !C.ativo) return;
    let dt = Math.min(50, agora - C.ultimo) * C.vel;
    C.ultimo = agora;
    if (agora < C.pausaAte) dt = 0;                    // congela um instante no impacto
    C.relogio += dt;
    atualizar(dt);
    desenhar();
    const prontas = C.esperas.filter(e => e.ate <= C.relogio);
    C.esperas = C.esperas.filter(e => e.ate > C.relogio);
    prontas.forEach(e => e.ok());
    requestAnimationFrame(quadro);
  }
  function atualizar(dt) {
    for (const u of Object.values(C.U)) {
      if (u.destino && !u.morto) {
        const d0 = u.destino;
        const dx = d0.x - u.x, dy = d0.y - u.y, d = Math.hypot(dx, dy);
        const passo = d0.vel * (u.classe === 'dragao' ? 0.9 : 1) * dt;
        if (!d0.recuo && Math.abs(dx) > 0.5) u.dir = dx > 0 ? 1 : -1;
        if (C.relogio > u.proxPoeira && u.classe !== 'dragao' && dt > 0) {
          u.proxPoeira = C.relogio + (d0.vel >= VEL_AVANCO ? 80 : 150);
          poeira(u.x, u.y);
        }
        if (d <= passo) { u.x = d0.x; u.y = d0.y; u.destino = null; d0.ok(); }
        else { u.x += dx / d * passo; u.y += dy / d * passo; }
      }
      u.hpVis += (u.hpReal - u.hpVis) * Math.min(1, dt / 160);
      if (u.acao && C.relogio - u.acao.t0 > u.acao.dur) u.acao = null;
      if (u.reacao && C.relogio - u.reacao.t0 > u.reacao.dur) u.reacao = null;
    }
    for (const p of C.particulas) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.chao) p.vy += 0.00006 * dt; }
    C.particulas = C.particulas.filter(p => p.t < p.vida);
    for (const e of C.efeitos) {
      const ativo = C.relogio - e.ini < e.dur;
      if (e.tipo === 'proj' && !e.fim && !ativo) { e.fim = true; e.ok(); }
      if (e.tipo === 'proj' && !e.fim && dt > 0) {
        const k = (C.relogio - e.ini) / e.dur;
        const x = e.x0 + (e.x1 - e.x0) * k, y = e.y0 + (e.y1 - e.y0) * k;
        const rastro = { fogo: ['#ff7a1a', '#ffd34d'], raio: ['#b89cff', '#8b6cff'], luz: ['#7dffb0', '#ffe08a'], sagrado: ['#ffe08a', '#ffffff'], flechaForte: ['#c6f0ff'] }[e.subtipo];
        if (rastro && Math.random() < 0.7) C.particulas.push({ x, y, vx: 0, vy: 0, vida: 220, cor: escolher(Math.random, rastro), t: 0 });
      }
      // Energia se acumulando na ponta do cajado / do arco durante a preparação
      if (e.tipo === 'carga' && ativo && !e.u.morto && dt > 0 && Math.random() < (e.forte ? 0.9 : 0.55)) {
        const p = pontaDaArma(e.u), ang = Math.random() * Math.PI * 2, raio = e.forte ? 7 : 5;
        C.particulas.push({ x: p.x + Math.cos(ang) * raio, y: p.y + Math.sin(ang) * raio, vx: -Math.cos(ang) * 0.02, vy: -Math.sin(ang) * 0.02, vida: 260, cor: escolher(Math.random, e.cores), t: 0 });
      }
      if (e.tipo === 'sopro' && ativo && dt > 0) {
        const a = e.a, bx = a.x + a.dir * 8, by = a.y - a.spr.h * 0.55;
        for (let i = 0; i < 3; i++) {
          const dx = e.alvo.x - bx + (Math.random() - 0.5) * 40, dy = e.alvo.y - 10 - by + (Math.random() - 0.5) * 30, d = Math.hypot(dx, dy) || 1;
          const v = 0.12 + Math.random() * 0.05;
          C.particulas.push({ x: bx, y: by, vx: dx / d * v, vy: dy / d * v, vida: d / v, cor: escolher(Math.random, ['#ff7a1a', '#ffd34d', '#ff3b1f', '#fff1b0']), t: 0, grande: true });
        }
      }
    }
    C.efeitos = C.efeitos.filter(e => C.relogio - e.ini < (e.dur + 60) || (e.tipo === 'proj' && !e.fim));
    C.textos = C.textos.filter(t => C.relogio - t.ini < 1000);
  }

  function desenhar() {
    const x = C.ctx, W = C.W, H = C.H;
    x.save();
    x.fillStyle = '#0b0814';
    x.fillRect(0, 0, W, H);
    if (C.tremor && C.relogio < C.tremor.ate) {
      const f = C.tremor.forca;
      x.translate(Math.round((Math.random() - 0.5) * 2 * f), Math.round((Math.random() - 0.5) * 2 * f));
    }
    x.drawImage(C.terreno, 0, 0);
    const unidades = Object.values(C.U).sort((p, q) => (p.morto === q.morto ? p.y - q.y : p.morto ? -1 : 1));

    // colunas de luz e poeira ficam atrás dos personagens
    for (const e of C.efeitos) if (e.tipo === 'coluna') {
      const k = (C.relogio - e.ini) / e.dur;
      x.globalAlpha = Math.max(0, 0.5 * (1 - k));
      x.fillStyle = '#b6ffd0';
      x.fillRect(Math.round(e.x - 5), 0, 10, Math.round(e.y));
      x.globalAlpha = 1;
    }
    for (const p of C.particulas) if (p.chao) {
      x.globalAlpha = Math.max(0, 0.7 * (1 - p.t / p.vida));
      x.fillStyle = p.cor;
      x.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    x.globalAlpha = 1;

    for (const u of unidades) desenharUnidade(x, u);

    for (const e of C.efeitos) {
      const k = Math.min(1, (C.relogio - e.ini) / e.dur);
      if (e.tipo === 'proj' && !e.fim) {
        const px = Math.round(e.x0 + (e.x1 - e.x0) * k), py = Math.round(e.y0 + (e.y1 - e.y0) * k);
        if (e.subtipo === 'flecha' || e.subtipo === 'flechaForte') {
          const ang = Math.atan2(e.y1 - e.y0, e.x1 - e.x0), cx = Math.cos(ang), cy = Math.sin(ang);
          x.fillStyle = e.subtipo === 'flechaForte' ? '#c6f0ff' : '#e8dcc0';
          for (let i = 0; i < 7; i++) x.fillRect(Math.round(px - cx * i), Math.round(py - cy * i), 1, 1);
          x.fillStyle = '#ffffff'; x.fillRect(px, py, 2, 1);
          if (e.subtipo === 'flechaForte') { x.globalAlpha = 0.5; x.fillRect(px - 1, py - 1, 3, 3); x.globalAlpha = 1; }
        } else {
          const cor = { raio: '#c9b5ff', fogo: '#ffb347', luz: '#b6ffd0', sagrado: '#fff1b0' }[e.subtipo];
          const r = e.subtipo === 'fogo' ? 3 : 2;
          x.fillStyle = cor; x.fillRect(px - r, py - r + 1, r * 2, r * 2 - 2); x.fillRect(px - r + 1, py - r, r * 2 - 2, r * 2);
          x.fillStyle = '#ffffff'; x.fillRect(px - 1, py - 1, 1, 1);
        }
      } else if (e.tipo === 'flechaArmada' && !e.u.morto && k < 1) {
        // flecha encaixada no arco enquanto o arqueiro mira
        const a = e.u, p = pontaDaArma(a);
        x.fillStyle = '#e8dcc0';
        for (let i = 0; i < 6; i++) x.fillRect(Math.round(p.x - a.dir * i), Math.round(p.y), 1, 1);
        x.fillStyle = '#ffffff'; x.fillRect(Math.round(p.x + a.dir), Math.round(p.y), 1, 1);
      } else if (e.tipo === 'corte') {
        x.strokeStyle = e.cor || (e.forte ? '#ffe08a' : '#ffffff');
        x.globalAlpha = 1 - k;
        x.lineWidth = 1;
        x.beginPath();
        if (e.dir < 0) x.arc(Math.round(e.x), Math.round(e.y), 6 + k * 4, Math.PI + 0.6 - k, Math.PI + 2.4 - k);
        else x.arc(Math.round(e.x), Math.round(e.y), 6 + k * 4, -2.4 + k, -0.6 + k);
        x.stroke();
        x.globalAlpha = 1;
      } else if (e.tipo === 'onda') {
        x.strokeStyle = e.cor; x.globalAlpha = 1 - k; x.lineWidth = 1;
        x.beginPath(); x.ellipse(Math.round(e.x), Math.round(e.y), 4 + k * 22, 2 + k * 11, 0, 0, 7); x.stroke();
        x.globalAlpha = 1;
      } else if (e.tipo === 'anel' && !e.u.morto) {
        // anel discreto ao redor de quem recebeu cura ou escudo
        x.strokeStyle = e.cor; x.globalAlpha = 0.85 * (1 - k); x.lineWidth = 1;
        x.beginPath(); x.ellipse(Math.round(e.u.x), Math.round(e.u.y), 6 + k * 6, 2 + k * 2, 0, 0, 7); x.stroke();
        x.globalAlpha = 1;
      }
    }
    for (const p of C.particulas) {
      if (p.chao) continue;
      x.globalAlpha = Math.max(0, 1 - p.t / p.vida);
      x.fillStyle = p.cor;
      const s = p.grande ? 2 : 1;
      x.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    x.globalAlpha = 1;
    x.restore();
    desenharHud();
  }

  function estadoDe(u) {
    return {
      classe: u.classe, sem: u.sem, t: C.relogio, calmo: C.calmo,
      andando: !!u.destino, corrida: !!(u.destino && u.destino.vel >= VEL_AVANCO),
      acao: u.acao, reacao: u.reacao, escudo: u.escudo > 0,
      cansado: u.hpReal / u.hpMax < 0.25, vitoria: u.vitoria, derrota: u.derrota,
    };
  }
  function desenharUnidade(x, u) {
    const R = u.rig;
    const flip = flipDe(u);
    if (u.morto) {
      // pulinho, queda para trás com quique, e fica caído sem cor
      const k = (C.relogio - u.morteT) / 650;
      const P = Anim.pose({ classe: u.classe, sem: u.sem, t: C.relogio, calmo: true });
      P.arma.rot = flip * 0.9; P.cabeca.rot = flip * 0.15;
      let giro = 0;
      if (k < 0.22) P.salto = -Math.round(3 * Math.sin(Math.PI * k / 0.22));
      else giro = -u.dir * (Math.PI / 2) * Anim.quica((k - 0.22) / 0.55);
      if (!u.poeiraQueda && k > 0.5) { u.poeiraQueda = true; poeira(u.x, u.y, 6); }
      Sprites.desenharRig(x, R, P, { x: u.x, y: u.y - (giro ? 3 : 0), flip, giro,
        cinza: k > 0.85, flash: C.relogio < u.flash, alpha: k > 0.85 ? 0.8 : 1 });
      return;
    }
    const P = Anim.pose(estadoDe(u));
    const altura = Math.max(0, -P.salto);
    // sombra: encolhe quando o personagem sobe
    x.fillStyle = 'rgba(0,0,0,.28)';
    x.beginPath(); x.ellipse(Math.round(u.x), Math.round(u.y), Math.max(3, Math.round(R.w * 0.32 - altura * 0.4)), 2.5, 0, 0, 7); x.fill();
    Sprites.desenharRig(x, R, P, { x: u.x, y: u.y, flip, flash: C.relogio < u.flash });
    const topo = Math.round(u.y + P.salto) - R.h;
    // escudo: bolha que pulsa enquanto dura
    if (u.escudo > 0) {
      x.strokeStyle = 'rgba(200,235,255,' + (0.45 + 0.25 * Math.sin(C.relogio / 160)).toFixed(2) + ')';
      x.lineWidth = 1;
      x.beginPath(); x.ellipse(Math.round(u.x), Math.round(topo + R.h / 2), R.w / 2 + 1, R.h / 2 + 1, 0, 0, 7); x.stroke();
    }
    // barra de vida
    const bw = u.chefe ? 22 : 16, bx = Math.round(u.x - bw / 2), by = topo - 2;
    x.fillStyle = '#140f1f'; x.fillRect(bx - 1, by - 1, bw + 2, 4);
    x.fillStyle = '#3a3346'; x.fillRect(bx, by, bw, 2);
    const fr = Math.max(0, u.hpVis / u.hpMax);
    x.fillStyle = u.lado ? '#ff5b4a' : '#5fd38d';
    x.fillRect(bx, by, Math.round(bw * fr), 2);
    if (u.escudo > 0) { x.fillStyle = '#ffffff'; x.fillRect(bx, by, Math.max(1, Math.round(bw * Math.min(1, u.escudo / u.hpMax))), 1); }
  }

  // textos nítidos (números e nomes) numa camada de alta resolução
  function desenharHud() {
    const h = C.hx, k = C.s * C.dpr;
    h.clearRect(0, 0, h.canvas.width, h.canvas.height);
    h.textAlign = 'center';
    h.lineJoin = 'round';
    for (const u of Object.values(C.U)) {
      if (u.morto || C.relogio > u.rotulo) continue;
      h.font = `700 ${Math.round(11 * C.dpr)}px Inter, sans-serif`;
      const w = h.measureText(u.nome).width + 10 * C.dpr, hh = 16 * C.dpr;
      const cx = u.x * k, cy = (u.y - u.spr.h - 8) * k - hh;
      h.fillStyle = 'rgba(16,12,28,.92)';
      h.fillRect(cx - w / 2, cy, w, hh);
      h.fillStyle = u.lado ? '#ff5b4a' : '#f2c14e';
      h.fillRect(cx - w / 2, cy + hh - 2 * C.dpr, w, 2 * C.dpr);
      h.fillStyle = '#fff';
      h.fillText(u.nome, cx, cy + hh - 5 * C.dpr);
    }
    for (const t of C.textos) {
      const p = (C.relogio - t.ini) / 1000;
      const tam = (t.tipo === 'crit' ? 17 : 13) * C.dpr * (p < 0.12 ? 0.7 + p * 2.5 : 1);
      h.font = `800 ${Math.round(tam)}px Inter, sans-serif`;
      h.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.5) * 2);
      const cx = t.x * k, cy = (t.y - p * 14) * k;
      h.lineWidth = 3 * C.dpr; h.strokeStyle = '#140f1f';
      h.strokeText(t.txt, cx, cy);
      h.fillStyle = t.tipo === 'cura' ? '#7dffb0' : t.tipo === 'crit' ? '#ffd34d' : '#ffffff';
      h.fillText(t.txt, cx, cy);
    }
    h.globalAlpha = 1;
  }

  // ---------- controles ----------
  function velocidade(v) { if (C) C.vel = v; }
  // Aplica na hora todos os eventos que faltam (botão Pular)
  function pular() {
    if (!C) return;
    C.parar = true;
    for (const ev of C.sim.eventos) {
      if (ev._feito) continue;
      aplicar(ev, ev.alvos.map(x => ({ ...x, u: C.U[x.uid] })), C.U[ev.ator]);
    }
    for (const u of Object.values(C.U)) {
      u.hpVis = u.hpReal; u.destino = null; u.acao = null; u.reacao = null;
      if (!u.morto) { u.x = u.casa.x; u.y = u.casa.y; }
      else if (C.relogio - u.morteT < 700) { u.morteT = C.relogio - 700; u.poeiraQueda = true; }
    }
    comemorar(C);
    C.textos = []; C.pausaAte = 0; C.tremor = null;
    for (const e of C.efeitos) if (e.tipo === 'proj' && !e.fim) { e.fim = true; e.ok(); }
    C.efeitos = [];
    document.querySelectorAll('.eb.is-age').forEach(el => el.classList.remove('is-age'));
    atualizarElenco();
  }
  function parar() { if (C) { C.ativo = false; C.parar = true; } C = null; }

  return { iniciar, velocidade, pular, parar, cenaUrl };
})();
