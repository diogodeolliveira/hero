'use strict';

// ===== Campo de batalha em pixel art (câmera de cima, levemente inclinada) =====
// A batalha já vem calculada (simularBatalha). Aqui os personagens andam, atacam
// e reagem seguindo os eventos, um por um.
const Campo = (function () {
  let C = null;

  const SW = 28, SH = 34;           // tamanho do boneco no mundo (pixels "grandes")
  const VEL_ANDAR = 0.085;          // pixels do mundo por ms
  const FORMACAO = [                // u: 0 = lado aliado, 1 = lado inimigo · v: posição lateral
    { u: 0.31, v: 0.33 }, { u: 0.31, v: 0.67 },
    { u: 0.11, v: 0.16 }, { u: 0.11, v: 0.5 }, { u: 0.11, v: 0.84 },
  ];

  const TERRENOS = {
    'Floresta Sussurrante': { faixas: ['#3f8f3a', '#46993f'], ruido: ['#357a31', '#56a84b', '#4a9c42'], deco: 'floresta' },
    'Pântano Cinzento': { faixas: ['#4f6b45', '#56744b'], ruido: ['#425a3a', '#62805a', '#4b6642'], deco: 'pantano' },
    'Minas Esquecidas': { faixas: ['#7a5f45', '#82664a'], ruido: ['#6a523c', '#8f7458', '#755a41'], deco: 'minas' },
    'Picos Gelados': { faixas: ['#dfe9f2', '#e7eff6'], ruido: ['#c9d8e6', '#f6fbff', '#d3e1ec'], deco: 'gelo' },
    'Ruínas de Obsidiana': { faixas: ['#4a4258', '#51495f'], ruido: ['#3e374b', '#5e5570', '#463f53'], deco: 'ruinas' },
    'Vulcão Adormecido': { faixas: ['#4a2f2a', '#523430'], ruido: ['#3c2622', '#5e3d36', '#45302b'], deco: 'vulcao' },
  };

  // ---------- sprites ----------
  function carregarImagem(svg) {
    return new Promise((ok, falha) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = falha;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  function novoCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function silhueta(src, cor) {
    const c = novoCanvas(src.width, src.height), x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = cor;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  // Rasteriza o SVG em baixa resolução, corta o semitransparente (borda de pixel) e põe contorno
  function prepararQuadro(img, w, h) {
    const base = novoCanvas(w, h), bx = base.getContext('2d');
    bx.drawImage(img, 0, 0, w, h);
    try {
      const d = bx.getImageData(0, 0, w, h);
      for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
      bx.putImageData(d, 0, 0);
    } catch (e) { /* navegador bloqueou leitura de pixels: fica suavizado */ }
    const c = novoCanvas(w + 2, h + 2), x = c.getContext('2d');
    const contorno = silhueta(base, '#140f1f');
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) x.drawImage(contorno, dx, dy);
    x.drawImage(base, 1, 1);
    let cinza = c;
    try {
      cinza = novoCanvas(c.width, c.height);
      const cx = cinza.getContext('2d');
      cx.drawImage(c, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) * 0.75;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = l;
      }
      cx.putImageData(d, 0, 0);
    } catch (e) { cinza = c; }
    return { normal: c, flash: silhueta(c, '#ffffff'), cinza };
  }
  // Sprites de pixel art (js/sprites.js) + versões de flash (dano) e cinza (caído)
  function variantes(c) {
    let cinza = c;
    try {
      cinza = novoCanvas(c.width, c.height);
      const cx = cinza.getContext('2d');
      cx.drawImage(c, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) * 0.75;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = l;
      }
      cx.putImageData(d, 0, 0);
    } catch (e) { cinza = c; }
    return { normal: c, flash: silhueta(c, '#ffffff'), cinza };
  }
  async function spritesDe(u) {
    const q = Sprites.quadros(u.ap);
    return { parado: variantes(q.parado), a: variantes(q.a), b: variantes(q.b), w: q.parado.width, h: q.parado.height };
  }

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

  // ---------- relógio do jogo (respeita a velocidade) ----------
  function esperar(ms) { return new Promise(ok => C.esperas.push({ ate: C.relogio + ms, ok })); }

  // ---------- início ----------
  async function iniciar({ sim, regiao, aoFim }) {
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
    C = { sim, aoFim, W, H, s, dpr, horizontal, ctx: cv.getContext('2d'), hx: hud.getContext('2d'),
      relogio: 0, vel: 1, esperas: [], particulas: [], efeitos: [], textos: [], U: {}, ativo: true, parar: false, idx: 0, ultimo: performance.now() };
    C.ctx.imageSmoothingEnabled = false;
    C.terreno = desenharTerreno(W, H, regiao, r, horizontal);

    const pos = (u, v) => horizontal
      ? { x: W * (0.08 + 0.84 * u), y: H * (0.2 + 0.7 * v) }
      : { x: W * (0.13 + 0.74 * v), y: H * (0.95 - 0.8 * u) };
    const sprites = await Promise.all(sim.inicio.map(spritesDe));
    if (!C || C.sim !== sim) return; // fechou antes de carregar
    sim.inicio.forEach((u, i) => {
      const f = FORMACAO[u.vaga];
      const p = pos(u.lado ? 1 - f.u : f.u, u.lado && horizontal ? f.v : (u.lado ? 1 - f.v : f.v));
      p.x += (r() - 0.5) * 6; p.y += (r() - 0.5) * 4;
      C.U[u.uid] = { ...u, x: p.x, y: p.y, hpVis: u.hp, hpReal: u.hp, escudo: 0, dir: horizontal ? (u.lado ? -1 : 1) : 1,
        destino: null, flash: 0, investida: null, rotulo: 0, morto: false, morteT: 0, turnos: 0, spr: sprites[i] };
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
    await esperar(700);
    for (const ev of meu.sim.eventos) {
      if (C !== meu || meu.parar) return;
      await animarEvento(ev);
    }
    if (C !== meu || meu.parar) return;
    await esperar(700);
    if (C === meu && !meu.parar) meu.aoFim();
  }

  function andarAte(a, t) {
    const dx = a.x - t.x, dy = a.y - t.y, d = Math.hypot(dx, dy) || 1;
    if (d < 16) return Promise.resolve();
    const alcance = 11 + (t.chefe ? 4 : 0);
    const lateral = (Math.random() - 0.5) * 6;
    return new Promise(ok => {
      a.destino = { x: t.x + dx / d * alcance - dy / d * lateral, y: t.y + dy / d * alcance * 0.7 + dx / d * lateral, ok };
    });
  }
  async function golpe(a, t, forte) {
    const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy) || 1;
    a.investida = { dx: dx / d * 5, dy: dy / d * 5, ate: C.relogio + 180 };
    if (Math.abs(dx) > 1) a.dir = dx > 0 ? 1 : -1;
    await esperar(90);
    C.efeitos.push({ tipo: 'corte', x: t.x, y: t.y - t.spr.h * 0.5, ini: C.relogio, dur: 220, forte });
    await esperar(90);
  }
  function projetil(a, t, tipo) {
    const x0 = a.x + a.dir * 6, y0 = a.y - a.spr.h * 0.55, x1 = t.x, y1 = t.y - t.spr.h * 0.5;
    const vel = { flecha: 0.24, flechaForte: 0.3, raio: 0.17, luz: 0.13, sagrado: 0.15, fogo: 0.15 }[tipo];
    if (Math.abs(x1 - x0) > 1) a.dir = x1 > x0 ? 1 : -1;
    a.investida = { dx: 0, dy: -2, ate: C.relogio + 160 };
    return new Promise(ok => C.efeitos.push({ tipo: 'proj', subtipo: tipo, x0, y0, x1, y1, ini: C.relogio, dur: Math.hypot(x1 - x0, y1 - y0) / vel, ok }));
  }
  function explosao(x, y, cores, n = 14, forca = 0.05) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, v = Math.random() * forca;
      C.particulas.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 0.02, vida: 300 + Math.random() * 300, cor: escolher(Math.random, cores), t: 0 });
    }
  }
  function subir(x, y, cores, n = 10) {
    for (let i = 0; i < n; i++) C.particulas.push({ x: x + (Math.random() - 0.5) * 12, y: y - Math.random() * 6, vx: 0, vy: -0.025 - Math.random() * 0.02, vida: 500 + Math.random() * 300, cor: escolher(Math.random, cores), t: 0 });
  }

  async function animarEvento(ev) {
    const a = C.U[ev.ator];
    const alvos = ev.alvos.map(x => ({ ...x, u: C.U[x.uid] }));
    const alvo = alvos[0] && alvos[0].u;
    const cura = alvos.some(x => x.cura);
    C.turno = (C.turno || 0) + 1;
    a.turnos++;
    marcarAtor(a);
    narrar(ev, a, alvo, cura);
    if (ev.hab) a.rotulo = C.relogio + 1300;

    switch (a.classe) {
      case 'guerreiro':
        await andarAte(a, alvo); if (C.parar) return;
        if (ev.hab) C.efeitos.push({ tipo: 'onda', x: a.x, y: a.y - 4, ini: C.relogio, dur: 420, cor: '#ffe08a' });
        await golpe(a, alvo, !!ev.hab);
        break;
      case 'dragao':
        if (ev.hab) {
          a.investida = { dx: 0, dy: -3, ate: C.relogio + 500 };
          const meio = alvos.reduce((m, x) => ({ x: m.x + x.u.x / alvos.length, y: m.y + x.u.y / alvos.length }), { x: 0, y: 0 });
          if (Math.abs(meio.x - a.x) > 1) a.dir = meio.x > a.x ? 1 : -1;
          C.efeitos.push({ tipo: 'sopro', a, alvo: meio, ini: C.relogio, dur: 600 });
          await esperar(600);
          alvos.forEach(x => explosao(x.u.x, x.u.y - 10, ['#ff7a1a', '#ffd34d', '#ff3b1f']));
        } else {
          await andarAte(a, alvo); if (C.parar) return;
          await golpe(a, alvo, false);
        }
        break;
      case 'mago':
        if (ev.hab) {
          a.investida = { dx: 0, dy: -3, ate: C.relogio + 400 };
          await Promise.all(alvos.map((x, i) => esperar(i * 90).then(() => new Promise(ok =>
            C.efeitos.push({ tipo: 'proj', subtipo: 'fogo', x0: x.u.x + 10, y0: x.u.y - 70, x1: x.u.x, y1: x.u.y - 8, ini: C.relogio, dur: 380, ok })))));
          alvos.forEach(x => explosao(x.u.x, x.u.y - 8, ['#ff7a1a', '#ffd34d', '#ff3b1f']));
        } else {
          await projetil(a, alvo, 'raio');
          explosao(alvo.x, alvo.y - 14, ['#b89cff', '#ffffff', '#8b6cff'], 8);
        }
        break;
      case 'arqueiro':
        await projetil(a, alvo, ev.hab ? 'flechaForte' : 'flecha');
        if (ev.hab) explosao(alvo.x, alvo.y - 14, ['#ffffff', '#c6f0ff', '#5fd38d'], 12);
        break;
      case 'curandeiro':
        if (ev.hab) {
          a.investida = { dx: 0, dy: -3, ate: C.relogio + 400 };
          alvos.forEach(x => C.efeitos.push({ tipo: 'coluna', x: x.u.x, y: x.u.y, ini: C.relogio, dur: 600 }));
          await esperar(350);
          alvos.forEach(x => subir(x.u.x, x.u.y - 6, ['#7dffb0', '#ffe08a', '#ffffff']));
        } else if (cura) {
          await projetil(a, alvo, 'luz');
          subir(alvo.x, alvo.y - 6, ['#7dffb0', '#ffe08a', '#ffffff'], 8);
        } else {
          await projetil(a, alvo, 'sagrado');
          explosao(alvo.x, alvo.y - 14, ['#ffe08a', '#ffffff'], 8);
        }
        break;
    }
    if (C.parar) return;
    aplicar(ev, alvos);
    narrarMortes(alvos);
    await esperar(ev.hab ? 420 : 260);
  }

  function aplicar(ev, alvos) {
    if (ev._feito) return;
    ev._feito = true;
    C.idx++;
    for (const x of alvos) {
      const u = x.u;
      u.hpReal = x.hp; u.escudo = x.escudo;
      if (x.cura) { texto(u, '+' + x.cura, 'cura'); continue; }
      u.flash = C.relogio + 110;
      texto(u, x.crit ? x.dano + '!' : String(x.dano), x.crit ? 'crit' : 'dano');
      if (x.morreu) { u.morto = true; u.morteT = C.relogio; }
    }
    if (ev.escudoAtor) C.U[ev.ator].escudo = ev.escudoAtor;
    atualizarPlacar();
    atualizarElenco();
  }
  function texto(u, txt, tipo) { C.textos.push({ x: u.x + (Math.random() - 0.5) * 6, y: u.y - u.spr.h, txt, tipo, ini: C.relogio }); }

  // ---------- narração e placar ----------
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
    if (t) t.textContent = 'Turno ' + (C.turno || 0);
  }

  // Painéis das equipes (fora do canvas): vida e carga da habilidade (a cada 3 turnos)
  function marcarAtor(a) {
    document.querySelectorAll('.eb.is-age').forEach(el => el.classList.remove('is-age'));
    const el = document.getElementById('eb-' + a.uid);
    if (el) el.classList.add('is-age');
  }
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
    const dt = Math.min(50, agora - C.ultimo) * C.vel;
    C.ultimo = agora;
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
      if (u.destino) {
        const dx = u.destino.x - u.x, dy = u.destino.y - u.y, d = Math.hypot(dx, dy);
        const passo = VEL_ANDAR * (u.classe === 'dragao' ? 0.85 : 1) * dt;
        if (Math.abs(dx) > 0.5) u.dir = dx > 0 ? 1 : -1;
        if (d <= passo) { u.x = u.destino.x; u.y = u.destino.y; const ok = u.destino.ok; u.destino = null; ok(); }
        else { u.x += dx / d * passo; u.y += dy / d * passo; }
      }
      u.hpVis += (u.hpReal - u.hpVis) * Math.min(1, dt / 160);
    }
    for (const p of C.particulas) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.00006 * dt; }
    C.particulas = C.particulas.filter(p => p.t < p.vida);
    for (const e of C.efeitos) {
      if (e.tipo === 'proj' && !e.fim && C.relogio - e.ini >= e.dur) { e.fim = true; e.ok(); }
      if (e.tipo === 'proj' && !e.fim) {
        const k = (C.relogio - e.ini) / e.dur;
        const x = e.x0 + (e.x1 - e.x0) * k, y = e.y0 + (e.y1 - e.y0) * k;
        const rastro = { fogo: ['#ff7a1a', '#ffd34d'], raio: ['#b89cff', '#8b6cff'], luz: ['#7dffb0', '#ffe08a'], sagrado: ['#ffe08a', '#ffffff'] }[e.subtipo];
        if (rastro && Math.random() < 0.7) C.particulas.push({ x, y, vx: 0, vy: 0, vida: 220, cor: escolher(Math.random, rastro), t: 0 });
      }
      if (e.tipo === 'sopro' && C.relogio - e.ini < e.dur) {
        const a = e.a, bx = a.x + a.dir * 8, by = a.y - a.spr.h * 0.55;
        for (let i = 0; i < 3; i++) {
          const dx = e.alvo.x - bx + (Math.random() - 0.5) * 40, dy = e.alvo.y - 10 - by + (Math.random() - 0.5) * 30, d = Math.hypot(dx, dy) || 1;
          const v = 0.12 + Math.random() * 0.05;
          C.particulas.push({ x: bx, y: by, vx: dx / d * v, vy: dy / d * v, vida: d / v, cor: escolher(Math.random, ['#ff7a1a', '#ffd34d', '#ff3b1f', '#fff1b0']), t: 0, grande: true });
        }
      }
    }
    C.efeitos = C.efeitos.filter(e => C.relogio - e.ini < (e.dur + 50) || (e.tipo === 'proj' && !e.fim));
    C.textos = C.textos.filter(t => C.relogio - t.ini < 1000);
  }

  function desenhar() {
    const x = C.ctx, W = C.W, H = C.H;
    x.drawImage(C.terreno, 0, 0);
    const unidades = Object.values(C.U).sort((p, q) => (p.morto === q.morto ? p.y - q.y : p.morto ? -1 : 1));

    // colunas de luz ficam atrás dos personagens
    for (const e of C.efeitos) if (e.tipo === 'coluna') {
      const k = (C.relogio - e.ini) / e.dur;
      x.globalAlpha = Math.max(0, 0.5 * (1 - k));
      x.fillStyle = '#b6ffd0';
      x.fillRect(Math.round(e.x - 5), 0, 10, Math.round(e.y));
      x.globalAlpha = 1;
    }

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
      } else if (e.tipo === 'corte') {
        x.strokeStyle = e.forte ? '#ffe08a' : '#ffffff';
        x.globalAlpha = 1 - k;
        x.lineWidth = 1;
        x.beginPath(); x.arc(Math.round(e.x), Math.round(e.y), 6 + k * 4, -2.4 + k, -0.6 + k); x.stroke();
        x.globalAlpha = 1;
      } else if (e.tipo === 'onda') {
        x.strokeStyle = e.cor; x.globalAlpha = 1 - k; x.lineWidth = 1;
        x.beginPath(); x.ellipse(Math.round(e.x), Math.round(e.y), 4 + k * 22, 2 + k * 11, 0, 0, 7); x.stroke();
        x.globalAlpha = 1;
      }
    }
    for (const p of C.particulas) {
      x.globalAlpha = Math.max(0, 1 - p.t / p.vida);
      x.fillStyle = p.cor;
      const s = p.grande ? 2 : 1;
      x.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    x.globalAlpha = 1;
    desenharHud();
  }

  function desenharUnidade(x, u) {
    const spr = u.spr;
    const andando = !!u.destino;
    let ox = 0, oy = 0;
    if (u.investida && C.relogio < u.investida.ate) {
      const k = 1 - (u.investida.ate - C.relogio) / 180;
      const f = Math.sin(Math.max(0, Math.min(1, k)) * Math.PI);
      ox = u.investida.dx * f; oy = u.investida.dy * f;
    }
    const px = Math.round(u.x + ox), py = Math.round(u.y + oy);
    if (u.morto) {
      // caído: deitado e sem cor
      const k = Math.min(1, (C.relogio - u.morteT) / 300);
      x.save();
      x.globalAlpha = 1 - 0.35 * k;
      x.translate(px, py - 3);
      x.rotate(u.dir * (Math.PI / 2) * k);
      x.drawImage(k < 1 ? spr.parado.normal : spr.parado.cinza, -Math.round(spr.w / 2), -spr.h + 3);
      x.restore();
      return;
    }
    // sombra
    x.fillStyle = 'rgba(0,0,0,.28)';
    x.beginPath(); x.ellipse(px, py, Math.round(spr.w * 0.32), 2.5, 0, 0, 7); x.fill();
    const quadro = andando ? (Math.floor(C.relogio / 130) % 2 ? spr.a : spr.b) : spr.parado;
    const respira = andando ? (Math.floor(C.relogio / 130) % 2) : (Math.sin(C.relogio / 380 + u.uid) > 0.6 ? 1 : 0);
    const img = C.relogio < u.flash ? quadro.flash : quadro.normal;
    x.save();
    x.translate(px, py - respira);
    if (u.dir < 0) x.scale(-1, 1);
    x.drawImage(img, -Math.round(spr.w / 2), -spr.h + 2);
    x.restore();
    // escudo
    if (u.escudo > 0) {
      x.strokeStyle = 'rgba(200,235,255,.75)'; x.lineWidth = 1;
      x.beginPath(); x.ellipse(px, py - spr.h / 2, spr.w / 2 + 1, spr.h / 2 + 1, 0, 0, 7); x.stroke();
    }
    // barra de vida
    const bw = u.chefe ? 22 : 16, bx = px - bw / 2, by = py - spr.h - 3;
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
      const txt = u.nome;
      h.font = `700 ${Math.round(11 * C.dpr)}px Inter, sans-serif`;
      const w = h.measureText(txt).width + 10 * C.dpr, hh = 16 * C.dpr;
      const cx = u.x * k, cy = (u.y - u.spr.h - 6) * k - hh;
      h.fillStyle = 'rgba(16,12,28,.92)';
      h.fillRect(cx - w / 2, cy, w, hh);
      h.fillStyle = u.lado ? '#ff5b4a' : '#f2c14e';
      h.fillRect(cx - w / 2, cy + hh - 2 * C.dpr, w, 2 * C.dpr);
      h.fillStyle = '#fff';
      h.fillText(txt, cx, cy + hh - 5 * C.dpr);
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
      aplicar(ev, ev.alvos.map(x => ({ ...x, u: C.U[x.uid] })));
    }
    for (const u of Object.values(C.U)) { u.hpVis = u.hpReal; if (u.destino) { u.destino = null; } }
    C.textos = [];
    document.querySelectorAll('.eb.is-age').forEach(el => el.classList.remove('is-age'));
    atualizarElenco();
  }
  function parar() { if (C) { C.ativo = false; C.parar = true; } C = null; }

  return { iniciar, velocidade, pular, parar, cenaUrl };
})();
