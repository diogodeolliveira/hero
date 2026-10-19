'use strict';

// =====================================================================
// Animação dos personagens
// ---------------------------------------------------------------------
// Cada personagem é um esqueleto de partes (js/sprites.js). Aqui calculamos,
// a cada quadro, a pose de cada parte a partir do ESTADO do personagem:
//
//   repouso  respiração, balanço de capa/cabelo/chapéu, gestos ocasionais
//   andar    passada, balanço da arma, capa ao vento (corrida no avanço)
//   ação     golpe · grito · mordida · sopro · disparo · conjurar · bênção
//   reação   dano · defesa · cura  (somam por cima da ação, sem cancelá-la)
//   final    vitória · derrota · cansaço (vida baixa)
//   UI       entrada (invocação) · apresentação (equipe, detalhes)
//
// Regras de pixel art: deslocamentos sempre em pixels inteiros; giros são
// desenhados na resolução nativa e só depois ampliados (sem borrar).
// =====================================================================
const Anim = (function () {
  const PARTES = ['tronco', 'cabeca', 'cabelo', 'chapeu', 'aureola', 'arma', 'escudo', 'capa', 'costas',
    'pernaE', 'pernaD', 'asaE', 'asaD', 'cauda'];

  // Duração de cada animação (ms) e o instante do impacto (fração) usado pela batalha
  const DUR = {
    golpe: 420, grito: 680, mordida: 460, sopro: 1000, disparo: 560, disparoForte: 820,
    conjurar: 520, conjurarForte: 900, bencao: 1000,
    dano: 320, defesa: 320, cura: 600,
    entrada: 1300, apresentacao: 700, vitoria: 1600,
  };
  const IMPACTO = {
    golpe: 0.5, grito: 0.66, mordida: 0.52, sopro: 0.3, disparo: 0.55, disparoForte: 0.62,
    conjurar: 0.5, conjurarForte: 0.55, bencao: 0.35,
  };

  // ---------- curvas ----------
  const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const suave = t => { t = lim(t); return t * t * (3 - 2 * t); };   // acelera e desacelera
  const sai = t => { t = lim(t); return 1 - Math.pow(1 - t, 3); };  // rápido → lento
  const entra = t => { t = lim(t); return t * t * t; };             // lento → rápido
  const sino = t => Math.sin(Math.PI * lim(t));                      // 0 → 1 → 0
  function quica(t) {                                                // queda com quique
    t = lim(t);
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  }
  const px = v => Math.round(v);

  function nova() {
    const P = { sx: 1, sy: 1, salto: 0 };
    for (const n of PARTES) P[n] = { dx: 0, dy: 0, rot: 0 };
    return P;
  }
  const asas = (P, v) => { P.asaE.rot += v; P.asaD.rot -= v; };   // v > 0 ergue as duas
  // Erguer a arma: ela sobe e inclina PARA FORA do corpo (girar para trás cruzaria o rosto)
  function erguer(P, classe, F, a) {
    switch (classe) {
      case 'guerreiro': P.arma.rot += F * 0.3 * a; P.arma.dy -= px(2 * a); P.escudo.dy -= px(a); break;
      case 'mago': P.arma.rot += F * 0.12 * a; P.arma.dy -= px(3 * a); break;
      case 'curandeiro': P.arma.dy -= px(4 * a); P.aureola.dy -= px(a); break;
      case 'arqueiro': P.arma.dy -= px(4 * a); P.arma.dx += px(F * a); break;
      case 'dragao': asas(P, 0.5 * a); P.cabeca.dy -= px(a); break;
    }
  }
  // Arma abaixada (cansaço, derrota)
  function abaixar(P, classe, F, a) {
    switch (classe) {
      case 'guerreiro': P.arma.rot += F * 2.3 * a; P.escudo.dy += px(2 * a); break;
      case 'mago': case 'curandeiro': P.arma.rot += F * 0.4 * a; P.arma.dy += px(a); break;
      case 'arqueiro': P.arma.rot += -F * 0.35 * a; P.arma.dy += px(2 * a); break;
    }
  }

  // ---------- repouso ----------
  function repouso(P, e, F, onda) {
    if (e.classe === 'dragao') {
      const w = onda(760);
      asas(P, 0.16 * w);
      P.salto = -px(2.5 + 1.5 * onda(760, -190));       // paira, sobe quando a asa desce
      P.cauda.rot = 0.14 * onda(1500);
      P.cabeca.dy = onda(1500, 300) > 0.6 ? 1 : 0;
      return;
    }
    const r = onda(1800) > 0.3 ? 1 : 0;                  // respiração: o peito desce 1 px
    P.tronco.dy = r;
    P.cabeca.dy = Math.max(0, (onda(1800, -220) > 0.3 ? 1 : 0) - r);   // a cabeça acompanha atrasada
    P.arma.rot = 0.05 * onda(2600, 400);
    P.capa.rot = 0.035 * onda(2900, 700);
    P.cabelo.rot = 0.05 * onda(2300, 500);
    P.chapeu.rot = 0.06 * onda(2500, 250);
    P.aureola.dy = onda(1500) > 0 ? -1 : 0;
    if (e.classe === 'mago' || e.classe === 'curandeiro') P.salto = onda(2400) > 0.55 ? -1 : 0; // levitação leve
  }
  // Gestos ocasionais, cada personagem no seu tempo (evita bonecos sincronizados)
  function gesto(P, e, F, k) {
    const s = sino(k);
    switch (e.classe) {
      case 'guerreiro': erguer(P, 'guerreiro', F, s); break;                                // ergue a espada e o escudo
      case 'mago': P.arma.dy -= px(2 * s); P.cabeca.rot -= F * 0.07 * s; break;             // ergue o cajado e olha
      case 'arqueiro': P.arma.dx += px(F * s); P.cabeca.rot += F * 0.08 * s; break;         // confere o arco
      case 'curandeiro': P.cabeca.dy += px(s); P.aureola.dy -= px(2 * s); break;            // breve prece
      case 'dragao': P.cabeca.dy -= px(s); asas(P, 0.3 * s); break;                         // espreguiça
    }
  }
  function cansado(P, e, F, onda) {
    if (e.classe === 'dragao') { P.salto = Math.min(0, P.salto + 2); asas(P, -0.18); P.cabeca.dy += 1; return; }
    P.tronco.dy = 1 + (onda(900) > 0 ? 1 : 0);          // respiração curta e pesada
    P.cabeca.dy += 1;
    abaixar(P, e.classe, F, e.classe === 'guerreiro' ? 1 : 0.7);   // arma baixa
    P.salto = 0;
  }
  function postura(P, e, F) {                            // guarda com escudo erguido
    P.escudo.dx += F * 2; P.escudo.dy -= 1; P.arma.rot += F * 0.12;
  }

  // ---------- andar ----------
  function andar(P, e, F, onda) {
    if (e.classe === 'dragao') {
      const w = onda(e.corrida ? 220 : 300);
      P.asaE.rot = 0.42 * w; P.asaD.rot = -0.42 * w;
      P.salto = -px(4 + 2 * onda(e.corrida ? 220 : 300, -60));
      P.pernaE.dy = -1; P.pernaD.dy = -1;
      P.tronco.rot = F * 0.08;
      return;
    }
    const p = onda(e.corrida ? 300 : 460);
    P.pernaE.dy = -px(Math.max(0, p) * 2);
    P.pernaD.dy = -px(Math.max(0, -p) * 2);
    P.pernaE.dx = px(p); P.pernaD.dx = -px(p);
    P.tronco.dy = Math.abs(p) > 0.75 ? -1 : 0;
    P.cabeca.dy = 0;
    P.tronco.rot = F * (e.corrida ? 0.1 : 0.04);
    P.arma.rot = e.classe === 'guerreiro' ? F * (0.12 + 0.08 * p) : 0.1 * p;
    P.escudo.dy = px(-p);
    P.capa.dx = -F; P.capa.rot = -F * 0.05 + 0.04 * p;
    P.chapeu.rot = -F * 0.1; P.cabelo.rot = -F * 0.06;
    P.salto = 0;
  }

  // ---------- ações (k vai de 0 a 1) ----------
  function golpe(k, P, F, alcance = 1.75) {
    if (k < 0.42) {                                       // antecipação: ergue a arma e recua o corpo
      const a = suave(k / 0.42);
      P.arma.rot = -F * 0.15 * a; P.arma.dy -= px(a); P.tronco.dy -= px(a);
      P.tronco.dx = -F * a; P.tronco.rot = -F * 0.08 * a; P.escudo.dx = -F * a;
    } else if (k < 0.56) {                                // golpe: rápido e largo
      const a = entra((k - 0.42) / 0.14);
      P.arma.rot = F * (-0.15 + (alcance + 0.15) * a); P.arma.dy -= px(1 - a);
      P.tronco.dx = F * (-1 + 4 * a); P.tronco.rot = F * (-0.08 + 0.22 * a);
      P.pernaD.dx = px(F * 2 * a); P.pernaE.dx = px(-F * a);
    } else {                                              // acompanhamento e volta: devagar
      const a = sai((k - 0.56) / 0.44);
      P.arma.rot = F * alcance * (1 - a); P.tronco.dx = F * 3 * (1 - a); P.tronco.rot = F * 0.14 * (1 - a);
      P.pernaD.dx = px(F * 2 * (1 - a)); P.pernaE.dx = px(-F * (1 - a));
    }
  }
  function arco(k, P, F, e, solta, forte) {
    if (k < solta) {                                      // puxa a corda e mira
      const a = suave(k / solta);
      P.arma.dx = px(F * 2 * a); P.tronco.dx = px(-F * a); P.tronco.rot = -F * 0.08 * a; P.cabeca.rot = F * 0.05 * a;
      P.pernaE.dx = px(F * a);
      if (forte && a > 0.7) P.tronco.dy += Math.floor(e.t / 50) % 2;   // tremor de quem segura o tiro
    } else if (k < solta + 0.12) {                        // solta: coice
      const a = sai((k - solta) / 0.12);
      P.arma.dx = px(F * (2 - 4 * a)); P.tronco.dx = px(-F * (1 + a)); P.pernaE.dx = px(F);
    } else {
      const a = suave((k - solta - 0.12) / (1 - solta - 0.12));
      P.arma.dx = px(-F * 2 * (1 - a)); P.tronco.dx = px(-F * 2 * (1 - a));
    }
  }
  const ACOES = {
    golpe(k, P, F) { golpe(k, P, F); },
    grito(k, P, F, e) {
      if (k < 0.3) {                                      // brado: espada e escudo ao alto, cabeça para trás
        const a = suave(k / 0.3);
        erguer(P, 'guerreiro', F, a); P.escudo.dy -= px(a); P.cabeca.rot = -F * 0.12 * a; P.salto -= px(2 * a);
        if (a > 0.8) P.tronco.dx = Math.floor(e.t / 40) % 2;
      } else {
        golpe(0.42 + 0.58 * ((k - 0.3) / 0.7), P, F, 2.1);
        P.salto -= px(2 * (1 - lim((k - 0.3) / 0.1)));
      }
    },
    mordida(k, P) {
      if (k < 0.45) {
        const a = suave(k / 0.45);
        P.tronco.dx = -2 * a; P.cabeca.dy -= px(2 * a); P.salto -= px(3 * a); asas(P, 0.35 * a);
      } else if (k < 0.58) {
        const a = entra((k - 0.45) / 0.13);
        P.tronco.dx = -2 + 6 * a; P.cabeca.dy += px(-2 + 3 * a); P.salto += px(3 * a); asas(P, 0.35 - 0.6 * a);
      } else {
        const a = sai((k - 0.58) / 0.42);
        P.tronco.dx = 4 * (1 - a); P.cabeca.dy += px(1 - a); asas(P, -0.25 * (1 - a));
      }
    },
    sopro(k, P, F, e) {
      if (k < 0.3) {                                      // inspira: recua, ergue a cabeça e as asas
        const a = suave(k / 0.3);
        P.tronco.dx = -2 * a; P.cabeca.dy -= px(2 * a); P.salto -= px(3 * a); asas(P, 0.5 * a);
      } else if (k < 0.85) {                              // fogo: projeta o corpo e treme
        P.tronco.dx = 1 + (Math.floor(e.t / 45) % 2); P.cabeca.dy += 1; P.salto -= 1;
        asas(P, 0.15 + 0.1 * Math.sin(e.t / 40));
      } else {
        const a = sai((k - 0.85) / 0.15);
        P.tronco.dx = 1 - a; P.cabeca.dy += px(1 - a);
      }
    },
    disparo(k, P, F, e) { arco(k, P, F, e, IMPACTO.disparo, false); },
    disparoForte(k, P, F, e) { arco(k, P, F, e, IMPACTO.disparoForte, true); },
    conjurar(k, P, F) {
      if (k < 0.5) {                                      // concentra: cajado sobe e inclina para trás
        const a = suave(k / 0.5);
        P.arma.dy -= px(3 * a); P.arma.rot = -F * 0.35 * a; P.cabeca.rot = -F * 0.05 * a; P.salto -= px(a);
      } else if (k < 0.62) {                              // lança: estocada à frente
        const a = entra((k - 0.5) / 0.12);
        P.arma.dy -= px(3 * (1 - a)); P.arma.rot = F * (-0.35 + 0.9 * a); P.arma.dx = px(F * 2 * a); P.tronco.dx = px(F * a); P.salto -= 1;
      } else {
        const a = sai((k - 0.62) / 0.38);
        P.arma.rot = F * 0.55 * (1 - a); P.arma.dx = px(F * 2 * (1 - a)); P.tronco.dx = px(F * (1 - a)); P.salto -= px(1 - a);
      }
    },
    conjurarForte(k, P, F, e) {
      if (k < 0.55) {                                     // levita e reúne poder
        const a = suave(k / 0.55);
        P.salto -= px(4 * a); P.arma.dy -= px(5 * a); P.arma.rot = -F * 0.2 * a;
        P.cabeca.rot = -F * 0.1 * a; P.chapeu.rot -= F * 0.15 * a; P.capa.rot -= 0.1 * a;
        if (a > 0.8) P.arma.dx = Math.floor(e.t / 50) % 2;
      } else if (k < 0.7) {
        const a = entra((k - 0.55) / 0.15);
        P.salto -= px(4 - 2 * a); P.arma.dy -= px(5 * (1 - a)); P.arma.rot = F * (-0.2 + 0.85 * a);
        P.arma.dx = px(F * 2 * a); P.tronco.dx = px(F * a);
      } else {
        const a = sai((k - 0.7) / 0.3);
        P.salto -= px(2 * (1 - a)); P.arma.rot = F * 0.65 * (1 - a); P.arma.dx = px(F * 2 * (1 - a));
      }
    },
    bencao(k, P, F, e) {
      if (k < 0.35) {
        const a = suave(k / 0.35);
        P.arma.dy -= px(6 * a); P.salto -= px(2 * a); P.aureola.dy -= px(2 * a); P.cabeca.rot = -F * 0.08 * a;
      } else if (k < 0.8) {
        P.arma.dy -= 6; P.salto -= 2 + (Math.sin(e.t / 160) > 0 ? 1 : 0); P.aureola.dy -= 2; P.cabeca.rot = -F * 0.08;
      } else {
        const a = sai((k - 0.8) / 0.2);
        P.arma.dy -= px(6 * (1 - a)); P.salto -= px(2 * (1 - a)); P.aureola.dy -= px(2 * (1 - a));
      }
    },
    entrada(k, P, F, e) {                                 // invocação: desce do alto, aterrissa e se apresenta
      if (k < 0.35) {
        P.salto = -px(58 * (1 - entra(k / 0.35)));       // começa fora do quadro
        if (e.classe === 'dragao') asas(P, 0.5 * Math.sin(e.t / 60));
        P.pernaE.dy = -1; P.pernaD.dy = -1;
      } else if (k < 0.45) {
        const a = (k - 0.35) / 0.1;                       // aterrissagem
        P.sy = a < 0.5 ? 0.88 : 0.95; P.sx = a < 0.5 ? 1.1 : 1.04;
        P.tronco.dy += 1;
      } else {
        const a = (k - 0.45) / 0.55;
        apresentacao(a, P, F, e);
      }
    },
    apresentacao(k, P, F, e) { apresentacao(k, P, F, e); },
    vitoria(k, P, F, e) { vitoria(P, F, e); },
  };
  function apresentacao(k, P, F, e) {
    P.salto -= px(4 * sino(k / 0.45));
    if (e.classe === 'dragao') { asas(P, 0.45 * sino(k / 0.6)); P.cabeca.dy -= px(sino(k / 0.6)); return; }
    erguer(P, e.classe, F, sino(k / 0.75));
    P.cabeca.rot -= F * 0.06 * sino(k);
  }
  function vitoria(P, F, e) {
    const per = 760, f = ((e.t + e.sem * 700) % per) / per, j = sino(f);
    if (e.classe === 'dragao') {
      P.salto = -px(6 + 3 * j);
      const w = 0.45 * Math.sin(e.t / 70); P.asaE.rot = w; P.asaD.rot = -w;
      P.cabeca.dy = -1;
      return;
    }
    P.salto = -px(5 * j);
    erguer(P, e.classe, F, 0.8 + 0.2 * j);
    P.cabeca.rot = -F * 0.06;
    P.capa.rot = 0.08 * Math.sin(e.t / 120);
    if (j > 0.3) { P.pernaE.dy = -1; P.pernaD.dy = -1; }
    if (j < 0.08) { P.sy = 0.92; P.sx = 1.06; }            // aterrissagem
  }
  function derrota(P, F, e, onda) {
    if (e.classe === 'dragao') { P.salto = 0; asas(P, -0.25); P.cabeca.dy = 2; return; }
    P.tronco.dy = 2 + (onda(700) > 0 ? 1 : 0);
    P.cabeca.dy = 1; P.cabeca.rot = F * 0.15;
    abaixar(P, e.classe, F, 1); P.salto = 0;
  }

  // ---------- reações (somam por cima) ----------
  const REACOES = {
    dano(k, P, F, l) {
      const q = 1 - sai(k);
      P.tronco.dx += px(l * 2 * q); P.cabeca.dx += px(l * q);
      P.cabeca.rot += l * 0.14 * q; P.arma.rot += l * 0.12 * q;
      asas(P, -0.2 * q);
      if (k < 0.18) { P.sx = 1.08; P.sy = 0.93; }
    },
    defesa(k, P, F, l) {
      const q = 1 - sai(k);
      P.escudo.dx += px(-l * 2 * q) + F * 2; P.escudo.dy -= 1;
      P.tronco.dx += px(l * q); P.arma.rot += F * 0.1 * q;
    },
    cura(k, P) { P.salto -= px(2 * sino(k)); P.aureola.dy -= px(sino(k)); },
  };

  // ---------- pose final ----------
  // e = { classe, sem, t, calmo, andando, corrida, acao, reacao, escudo, cansado, vitoria, derrota }
  function pose(e) {
    const P = nova();
    const F = e.classe === 'arqueiro' ? -1 : 1;          // lado da arma (o arco fica na outra mão)
    const tt = e.t + (e.sem || 0) * 9000;
    const onda = (per, d = 0) => Math.sin((tt + d) / per * Math.PI * 2);
    const agindo = e.acao && ACOES[e.acao.nome];
    if (!e.calmo) {
      repouso(P, e, F, onda);
      const ciclo = 6500 + (e.sem || 0) * 4000, tc = (e.t + (e.sem || 0) * 5000) % ciclo;
      if (tc < 800 && !e.andando && !agindo && !e.vitoria && !e.derrota) gesto(P, e, F, tc / 800);
      if (e.cansado) cansado(P, e, F, onda);
      if (e.escudo && e.classe === 'guerreiro' && !e.andando) postura(P, e, F);
      if (e.andando) andar(P, e, F, onda);
    }
    if (agindo) ACOES[e.acao.nome](lim((e.t - e.acao.t0) / e.acao.dur), P, F, e);
    else if (e.vitoria) vitoria(P, F, e);
    else if (e.derrota) derrota(P, F, e, onda);
    if (e.reacao && REACOES[e.reacao.nome]) REACOES[e.reacao.nome](lim((e.t - e.reacao.t0) / e.reacao.dur), P, F, e.reacao.lado || -F);
    return P;
  }

  return { pose, DUR, IMPACTO, quica, nova };
})();

function movimentoReduzido() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

// =====================================================================
// Palco: personagens vivos fora da batalha (início, equipe, detalhes,
// invocação). Um único laço de animação para todos, que pausa quem está
// fora da tela e para sozinho quando não há ninguém para animar.
// =====================================================================
const Palco = (function () {
  const ESC = 6;                         // resolução interna (o CSS ajusta o tamanho na tela)
  const itens = new Set();
  const visivel = new WeakMap();
  let raf = 0, obs = null;

  function aparenciaDe(el) {
    if (el.dataset.heroi) return aparenciaHeroi(HEROI[Number(el.dataset.heroi)]);
    if (el.dataset.monstro) { const [nome, classe] = el.dataset.monstro.split('|'); return aparenciaMonstro(nome, classe); }
    return null;
  }
  function observar(el) {
    if (!('IntersectionObserver' in window)) return;
    if (!obs) obs = new IntersectionObserver(lista => { for (const en of lista) visivel.set(en.target, en.isIntersecting); iniciar(); });
    obs.observe(el);
  }
  function montar(el) {
    const ap = aparenciaDe(el);
    if (!ap) return;
    const R = Sprites.rig(ap);
    const pad = { x: 7, topo: 12, base: 3 };
    const W = R.w + pad.x * 2, H = R.h + pad.topo + pad.base;
    el.width = W * ESC; el.height = H * ESC;
    const buf = document.createElement('canvas');
    buf.width = W; buf.height = H;
    const it = { el, ap, R, W, H, pad, buf, bx: buf.getContext('2d'), cx: el.getContext('2d'), sem: Math.random(), acao: null };
    if (el.dataset.anim) programar(it, el.dataset.anim, Number(el.dataset.atraso) || 0);
    itens.add(it);
    observar(el);
    desenhar(it, performance.now());
    iniciar();
  }
  function programar(it, nome, atraso = 0) {
    if (!Anim.DUR[nome]) return;
    it.acao = { nome, t0: performance.now() + atraso, dur: Anim.DUR[nome] };
  }
  function desenhar(it, agora) {
    const { bx, R, W, H, pad } = it;
    if (it.acao && agora - it.acao.t0 > it.acao.dur) it.acao = null;
    const calmo = movimentoReduzido();
    const P = Anim.pose({ classe: it.ap.classe, sem: it.sem, t: agora, calmo, acao: calmo ? null : it.acao });
    bx.clearRect(0, 0, W, H);
    const pe = H - pad.base;
    const altura = Math.max(0, -P.salto);
    bx.fillStyle = 'rgba(0,0,0,.32)';
    bx.beginPath();
    bx.ellipse(W / 2, pe, Math.max(3, R.w * 0.34 - altura * 0.35), 2, 0, 0, Math.PI * 2);
    bx.fill();
    Sprites.desenharRig(bx, R, P, { x: W / 2, y: pe, flip: 1 });
    const cx = it.cx;
    cx.imageSmoothingEnabled = false;
    cx.clearRect(0, 0, it.el.width, it.el.height);
    cx.drawImage(it.buf, 0, 0, it.el.width, it.el.height);
  }
  function quadro(agora) {
    raf = 0;
    for (const it of itens) {
      if (!it.el.isConnected) { itens.delete(it); if (obs) obs.unobserve(it.el); continue; }
      if (visivel.get(it.el) === false) continue;   // fora da tela: não gasta nada
      desenhar(it, agora);
    }
    iniciar();
  }
  function iniciar() {
    if (!raf && itens.size && !movimentoReduzido()) raf = requestAnimationFrame(quadro);
  }
  // Liga os <canvas class="vivo"> que ainda não estão animados
  function hidratar(raiz) {
    (raiz || document).querySelectorAll('canvas.vivo:not([data-pronto])').forEach(el => { el.dataset.pronto = '1'; montar(el); });
  }
  // Pede uma animação para um personagem do palco (ex.: 'apresentacao', 'entrada', 'golpe')
  function agir(el, nome, atraso = 0) {
    if (!el) return;
    for (const it of itens) if (it.el === el) { programar(it, nome, atraso); desenhar(it, performance.now()); }
    iniciar();
  }
  return { hidratar, agir };
})();
