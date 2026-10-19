'use strict';

// ===== Sprites em pixel art (moldes desenhados à mão, todos originais) =====
// Cada molde é uma grade de letras; cada letra é um "material" que a paleta do herói colore.
//
//  .  vazio            _  apaga (em peças)        x  detalhe escuro
//  s z     pele / sombra da pele                  e  olho
//  c C     cabelo / sombra                        h  chifre
//  m M w   metal / sombra / brilho                n  metal bem escuro (fresta do elmo)
//  r R q   cor da classe / sombra / brilho        p P  barriga do dragão / sombra
//  l L     couro / sombra                         y  olho de dragão
//  g G     acabamento (bronze, prata ou ouro)     t  barra do manto (ouro nos nobres)
//  k K     capa / sombra (some se não tem capa)   a A  asa / sombra
//  d D     madeira / sombra                       f F  manto claro / sombra
//  b B     brilho mágico / núcleo

const Sprites = (function () {
  // ---------- moldes ----------
  const GUERREIRO = [
    '....................', //  0 (cabeça vem das peças)
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '.......MMMMMM.......', //  9 gorjal
    '...kwwmmmmmmmmMMk...', // 10 ombreiras
    '..kwwmmmrrrrmmmMMk..',
    '..kwmMmmrqrRmmMmMk..',
    '..kwmMmmrgrRmmMmMk..',
    '..kwmMmmgggGmmMmMk..',
    '..kwmMmmrgrRmmMmMk..',
    '..kwmLLLLggLLLLmMk..', // 16 cinto
    '..kssMmmrrrRmmMsSk..',
    '..kK.MmmrrrRmmM.Kk..',
    '..kK..MmmrRmmM..Kk..',
    '..kK...mmM..mmM.Kk..', // 20 pernas
    '..kK...wmM..wmM.Kk..',
    '...k...mmM..mmM..k..',
    '...k...mMM..mMM..k..',
    '...kk..mmM..mmM.kk..',
    '....kkkwmM..wmMkkk..',
    '......LLLL..LLLL....',
    '......LLLL..LLLL....',
  ];
  const ELMO_FECHADO = { x: 0, y: 0, rows: [
    '........rr..........',
    '.......rqrR.........',
    '......wwmmmmmM......',
    '.....wmmmmmmmmM.....',
    '.....wmmmmmmmmM.....',
    '.....mnnnnnnnnM.....',
    '.....mmmmnmmmMM.....',
    '.....mmmmnmmmMM.....',
    '......MmmmmmMM......',
  ] };
  const ELMO_ABERTO = { x: 0, y: 0, rows: [
    '....................',
    '....................',
    '......wwmmmmmM......',
    '.....wmmmmmmmmM.....',
    '.....mmmmmmmmmM.....',
    '.....msssssszzM.....',
    '.....mseszsezzM.....',
    '.....msssssszzM.....',
    '......MszzzzsMM.....',
  ] };
  const CHIFRES = { x: 2, y: 0, rows: [
    'h..............h',
    'hh............hh',
    '.hh..........hh.',
    '..h..........h..',
  ] };
  const PRESAS = { x: 7, y: 8, rows: ['w....w'] };
  const ESPADA = { x: 15, y: 2, rows: [
    '..w..', '..wM.', '..wM.', '..wM.', '..wM.', '..wM.', '..wM.', '..wM.',
    '..wM.', '..wM.', '..wM.', '..wM.', '..wM.', 'gGgGg', '..L..', '..L..', '..g..',
  ] };
  const ESCUDO = { x: 0, y: 11, rows: [
    'gggggg',
    'grqrrG',
    'grqgrG',
    'gggggG',
    'grrgrG',
    'grrgRG',
    'grrgRG',
    '.grRG.',
    '.gRRG.',
    '..gG..',
  ] };

  const MAGO = [
    '...........rR.......',
    '..........rrR.......',
    '.........rqrR.......',
    '........rqrrR.......',
    '.......rqrrrrR......',
    '......rggggggG......',
    '...rrqrrrrrrrrRR....',
    '......cssssssC......',
    '.....ccseszsezC.....',
    '.....csssssszzC.....',
    '.....ccssxxsszC.....',
    '......CssssszC......',
    '....rrrrrrrrrrRR....', // 12 ombros
    '...rrqrrrggrrrrRR...',
    '..rrqrrrrggrrrrRRR..',
    '..rqrRrrrggrrrRrRR..',
    '..ssRrrrrggrrrrRss..',
    '...RrrqrrggrrrrRR...',
    '...rrqrrrggrrrrRR...',
    '...rqrrrrggrrrrRR...',
    '..rrqrrrrggrrrrRRR..',
    '..rqrrrrrggrrrrRRR..',
    '..rqrrrrrggrrrrRRR..',
    '.rrqrrrrrggrrrrRRRR.',
    '.ttttttttttttttttTT.', // 24 barra
    '......LLL..LLL......',
    '.....LLLL..LLLL.....',
  ];
  const BARBA = { x: 5, y: 10, rows: [
    'cc.xx.cc',
    '.cccccc.',
    '..cccc..',
    '...cc...',
  ] };
  const CAJADO_MAGO = { x: 15, y: 1, rows: [
    '..bb.', '.bBBb', '.bBbb', '..bb.', '...d.', '...d.', '...d.', '...d.', '...d.', '...d.',
    '...d.', '...d.', '...d.', '...d.', '...D.', '...d.', '...d.', '...d.', '...d.', '...d.',
    '...d.', '...d.', '...d.', '...D.', '...D.',
  ] };

  const ARQUEIRO = [
    '.......rrrrrR.......',
    '......rqrrrrrR......',
    '.....rqrrrrrrrR.....',
    '.....rqccccccrR.....',
    '.....rcseszsezR.....',
    '.....rsssssszzR.....',
    '.....RrsssxxsrR.....',
    '......RrsssrRR......',
    '.....RRrrrrrrRR.....',
    '....rrqrrrrrrrRR....', //  9 capa curta
    '...rrqlllllllLrRR...',
    '...rqllLlllllLLrR...',
    '...rqlllllllllLrR...',
    '...rqlLLLLggLLLrR...',
    '...ssllllllllLLss...',
    '....RllllllllLLR....',
    '....RlllllllLLLR....',
    '.....LLLL..LLLL.....', // 17 pernas
    '.....llLL..llLL.....',
    '.....llLL..llLL.....',
    '.....llLL..llLL.....',
    '.....llLL..llLL.....',
    '.....DDDD..DDDD.....',
    '....DDDDD..DDDDD....',
  ];
  const ALJAVA = { x: 13, y: 6, atras: true, rows: [
    'w.w.', 'gwg.', 'dDd.', 'dDdD', 'dDdD', 'dDdD', '.dDD',
  ] };
  const ARCO = { x: 0, y: 4, rows: [
    '..dw', '.d.w', '.d.w', 'd..w', 'd..w', 'd..w', 'd..w', 'd..w', 'd..w', 'd..w',
    '.d.w', '.d.w', '..dw',
  ] };

  const CURANDEIRO = [
    '......gggggggg......',
    '....................',
    '.......ccccccC......',
    '......ccccccccC.....',
    '.....ccsscsscC......',
    '.....csessezsC......',
    '.....csssssszC......',
    '.....CcssxxsscC.....',
    '......CsssssCC......',
    '....ffffffffffFF....', //  9 ombros
    '...fffrffffffrfFF...',
    '..ffffrffffffrfFFF..',
    '..ffFfrffffffrFfFF..',
    '..ssFfrffggffrFfss..',
    '...FfrffffffrfFFF...',
    '...ffrffffffrfFFF...',
    '...ffrffffffrfFFF...',
    '..fffrffffffrfFFFF..',
    '..fffrffffffrfFFFF..',
    '..fffRffffffRfFFFF..',
    '.ffffffffffffffFFFF.',
    '.tttttttttttttttttT.', // 21 barra
    '......LLL..LLL......',
    '.....LLLL..LLLL.....',
  ];
  const CABELO_LONGO = { x: 4, y: 7, rows: [
    'c..........c', 'cc........cC', 'cc........CC', '.c........C.',
  ] };
  const CAJADO_CURA = { x: 15, y: 1, rows: [
    '..b..', '.bBb.', 'bBBBb', '.bBb.', '..b..', '..d..', '..d..', '..d..', '..d..', '..d..',
    '..d..', '..d..', '..d..', '..D..', '..d..', '..d..', '..d..', '..d..', '..d..', '..d..',
    '..D..', '..D..',
  ] };
  const SEM_AUREOLA = { x: 0, y: 0, rows: ['____________________'] };
  const CAPUZ_SOMBRIO = { x: 4, y: 1, rows: [
    '...RRRRRR...',
    '..RrrrrrrR..',
    '.RrrrrrrrrR.',
    '.Rr......rR.',
    '.R........R.',
    '.R........R.',
    '.R........R.',
  ] };

  const DRAGAO = [
    '........h..........h........',
    '........hh........hh........',
    '.........hrrrrrrrrh.........',
    '........rqrrrrrrrrRR........',
    '........rryxrrrrxyRR........',
    '........rrrrrrrrrrRR........',
    '.......rrppppppppppRR.......',
    '.......rpxpppppppxpRR.......',
    '........rpwpwpwpwpRR........',
    '.........RRrrrrrrRR.........',
    '.......rrrrrrrrrrrrRR.......',
    '......rrrpppppppppRRRR......',
    '.....rrrrpPppppPpprRRRR.....',
    '.....rrrppppppppppprRRR.....',
    '....wsrrpPppppppPpprRRsw....',
    '.....rrrppppppppppprRRR.....',
    '......rrpPppppppPpprRR......',
    '.......rrppppppppprRRR......',
    '......RRRrrrrrrrrrrRRR......',
    '.....RRRR..........RRRR.....', // 19 pés
    '.....wRwR..........RwRw.....',
  ];
  const ASA = [
    'R........',
    'RR.......',
    'RAR......',
    'RAAR.....',
    'RAaAR....',
    'RAaaAR...',
    'RAaaaAR..',
    'RaaAaaAR.',
    'RaaAaaaAR',
    'RaAaaAaaR',
    '.RaAaaAaR',
    '..RaAaAR.',
    '...RaAR..',
    '....RR...',
  ];
  const CAUDA = { x: 20, y: 11, atras: true, rows: [
    '......h.',
    '.....rR.',
    '....rR..',
    '...rR...',
    '..rR....',
  ] };
  const COROA = { x: 10, y: 0, rows: ['g.g.g.g.', 'gggggggg'] };

  const PERNAS = { guerreiro: 20, mago: 25, arqueiro: 17, curandeiro: 22, dragao: 19 };

  // Cada peça pertence a uma parte do esqueleto (camada animada)
  for (const p of [ELMO_FECHADO, ELMO_ABERTO, CHIFRES, PRESAS, BARBA, SEM_AUREOLA, CAPUZ_SOMBRIO, COROA]) p.camada = 'cabeca';
  CABELO_LONGO.camada = 'cabelo';
  ESPADA.camada = 'arma'; CAJADO_MAGO.camada = 'arma'; CAJADO_CURA.camada = 'arma'; ARCO.camada = 'arma';
  ESCUDO.camada = 'escudo'; ALJAVA.camada = 'costas'; CAUDA.camada = 'cauda';

  // ---------- montagem ----------
  function espelhar(rows) { return rows.map(l => l.split('').reverse().join('')); }
  function pecasDe(ap) {
    const p = [];
    switch (ap.classe) {
      case 'guerreiro': {
        const aberto = ap.monstro || ap.rosto;
        p.push(aberto ? ELMO_ABERTO : ELMO_FECHADO);
        if (ap.chifres) p.push(CHIFRES);
        if (ap.presas) p.push(PRESAS);
        p.push(ESCUDO, ESPADA);
        break;
      }
      case 'mago':
        if (ap.barba) p.push(BARBA);
        p.push(CAJADO_MAGO);
        break;
      case 'arqueiro':
        p.push(ALJAVA, ARCO);
        break;
      case 'curandeiro':
        if (ap.estilo === 1) p.push(CABELO_LONGO);
        if (ap.monstro) p.push(SEM_AUREOLA, CAPUZ_SOMBRIO);
        p.push(CAJADO_CURA);
        break;
      case 'dragao':
        p.push({ x: 0, y: 3, atras: true, rows: ASA, camada: 'asaE' }, { x: 19, y: 3, atras: true, rows: espelhar(ASA), camada: 'asaD' }, CAUDA);
        if (ap.trim === '#f2c14e') p.push(COROA);
        break;
    }
    return p;
  }
  const MOLDE = { guerreiro: GUERREIRO, mago: MAGO, arqueiro: ARQUEIRO, curandeiro: CURANDEIRO, dragao: DRAGAO };

  function grade(ap) {
    const base = MOLDE[ap.classe];
    const W = base[0].length, H = base.length;
    const g = base.map(l => l.padEnd(W, '.').slice(0, W).split(''));
    const pecas = pecasDe(ap);
    const aplicar = (pc, atras) => pc.rows.forEach((linha, dy) => linha.split('').forEach((ch, dx) => {
      const X = pc.x + dx, Y = pc.y + dy;
      if (ch === '.' || X < 0 || Y < 0 || X >= W || Y >= H) return;
      if (atras && g[Y][X] !== '.') return; // atrás do corpo: só onde está vazio
      g[Y][X] = ch === '_' ? '.' : ch;
    }));
    pecas.filter(pc => pc.atras).forEach(pc => aplicar(pc, true));
    pecas.filter(pc => !pc.atras).forEach(pc => aplicar(pc, false));
    return g;
  }

  // Quadros da caminhada: levanta o pé esquerdo (1) ou o direito (-1)
  function passo(g, classe, lado) {
    if (!lado) return g;
    const y0 = PERNAS[classe], H = g.length, W = g[0].length, meio = W / 2;
    const n = g.map(l => l.slice());
    for (let x = 0; x < W; x++) {
      if ((lado > 0) !== (x < meio)) continue;
      for (let y = y0; y < H; y++) n[y][x] = y + 1 < H ? g[y + 1][x] : '.';
    }
    return n;
  }

  function paletaDe(ap) {
    const nobre = !!ap.trim;
    const acento = ap.trim || (ap.rar === 'raro' ? '#cfd8e3' : '#c08a52');
    const metal = ap.metal || (ap.monstro ? '#7d7a76' : '#b9c2cf');
    const cor = ap.cor;
    const capa = ap.capa ? tom(cor, -0.42) : null;
    const manto = ap.monstro ? tom(cor, 0.12) : '#eef3fb';
    const brilho = ap.monstro ? '#b26cff' : nobre ? '#ffe08a' : ap.classe === 'curandeiro' ? '#ffe08a' : '#8fd8ff';
    return {
      s: ap.pele, z: tom(ap.pele, -0.22), e: ap.olho || '#1a1428', x: '#1a1428',
      c: ap.cabelo, C: tom(ap.cabelo, -0.32),
      m: metal, M: tom(metal, -0.3), w: tom(metal, 0.55), n: tom(metal, -0.62),
      r: cor, R: tom(cor, -0.32), q: tom(cor, 0.3),
      l: ap.monstro ? '#5e4a36' : '#8a5a33', L: ap.monstro ? '#3e3024' : '#5e3b20',
      g: acento, G: tom(acento, -0.35),
      k: capa, K: capa && tom(capa, -0.25),
      d: '#8a5a33', D: '#5e3b20',
      b: brilho, B: '#ffffff',
      f: manto, F: tom(manto, -0.2),
      t: nobre ? acento : tom(manto, -0.2),
      h: nobre ? acento : '#f1ead8',
      p: tom(cor, 0.45), P: tom(cor, 0.25),
      y: ap.monstro ? '#ff4a3d' : '#ffd34d',
      a: tom(cor, -0.12), A: tom(cor, -0.38),
    };
  }

  // Desenha a grade num canvas com contorno escuro de 1 pixel
  function desenhar(g, pal, escala = 1) {
    const H = g.length, W = g[0].length;
    const c = document.createElement('canvas');
    c.width = (W + 2) * escala; c.height = (H + 2) * escala;
    const x = c.getContext('2d');
    const cheio = (X, Y) => Y >= 0 && Y < H && X >= 0 && X < W && g[Y][X] !== '.' && pal[g[Y][X]];
    x.fillStyle = '#140f1f';
    for (let Y = -1; Y <= H; Y++) for (let X = -1; X <= W; X++) {
      if (cheio(X, Y)) continue;
      if (cheio(X - 1, Y) || cheio(X + 1, Y) || cheio(X, Y - 1) || cheio(X, Y + 1)) x.fillRect((X + 1) * escala, (Y + 1) * escala, escala, escala);
    }
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const cor = cheio(X, Y);
      if (!cor) continue;
      x.fillStyle = cor;
      x.fillRect((X + 1) * escala, (Y + 1) * escala, escala, escala);
    }
    return c;
  }
  function chave(ap) { return JSON.stringify(ap); }
  const cache = new Map();
  function quadros(ap) {
    const k = chave(ap);
    if (cache.has(k)) return cache.get(k);
    const g = grade(ap), pal = paletaDe(ap);
    const q = { parado: desenhar(g, pal), a: desenhar(passo(g, ap.classe, 1), pal), b: desenhar(passo(g, ap.classe, -1), pal) };
    cache.set(k, q);
    return q;
  }
  const urls = new Map();
  function url(ap) {
    const k = chave(ap);
    if (!urls.has(k)) urls.set(k, quadros(ap).parado.toDataURL());
    return urls.get(k);
  }
  // ---------- esqueleto por partes (animação) ----------
  // O mesmo desenho, separado em camadas: cada parte gira em torno da sua articulação.
  const CABECA_ATE = { guerreiro: 9, mago: 12, arqueiro: 9, curandeiro: 9, dragao: 10 };
  const PIVO_ARMA = { guerreiro: [17, 16], mago: [18, 16], arqueiro: [1, 10], curandeiro: [17, 13] };
  // Quem segue quem: a cabeça acompanha o tronco, o chapéu acompanha a cabeça...
  const PAI = { cabeca: 'tronco', arma: 'tronco', escudo: 'tronco', capa: 'tronco', costas: 'tronco', asaE: 'tronco', asaD: 'tronco', cauda: 'tronco', cabelo: 'cabeca', chapeu: 'cabeca', aureola: 'cabeca' };
  const ORDEM = {
    humano: ['capa', 'costas', 'pernaE', 'pernaD', 'tronco', 'cabelo', 'cabeca', 'chapeu', 'aureola', 'escudo', 'arma'],
    dragao: ['asaE', 'asaD', 'cauda', 'pernaE', 'pernaD', 'tronco', 'cabeca'],
  };
  // Partes que se soltam do corpo ganham contorno completo; as do corpo, só por fora
  const SOLTAS = new Set(['arma', 'escudo', 'aureola', 'asaE', 'asaD', 'cauda', 'costas']);

  function parteDoMolde(classe, ch, x, y, W) {
    if (ch === 'k' || ch === 'K') return 'capa';
    if (classe === 'mago' && y <= 5) return 'chapeu';
    if (classe === 'curandeiro' && y === 0) return 'aureola';
    if (y < CABECA_ATE[classe]) return 'cabeca';
    if (y >= PERNAS[classe]) return x < W / 2 ? 'pernaE' : 'pernaD';
    return 'tronco';
  }
  // Uma grade por parte; a peça por cima não apaga o que está embaixo (ex.: braço atrás do escudo)
  function partes(ap) {
    const base = MOLDE[ap.classe];
    const W = base[0].length, H = base.length;
    const L = {};
    const pintar = (n, x, y, ch) => {
      if (!L[n]) L[n] = Array.from({ length: H }, () => Array(W).fill('.'));
      L[n][y][x] = ch;
    };
    base.forEach((linha, y) => linha.padEnd(W, '.').slice(0, W).split('').forEach((ch, x) => {
      if (ch !== '.') pintar(parteDoMolde(ap.classe, ch, x, y, W), x, y, ch);
    }));
    for (const pc of pecasDe(ap)) pc.rows.forEach((linha, dy) => linha.split('').forEach((ch, dx) => {
      const X = pc.x + dx, Y = pc.y + dy;
      if (ch === '.' || X < 0 || Y < 0 || X >= W || Y >= H) return;
      if (ch === '_') { for (const n in L) L[n][Y][X] = '.'; return; }
      pintar(pc.camada || parteDoMolde(ap.classe, ch, X, Y, W), X, Y, ch);
    }));
    return { L, W, H };
  }
  function desenharParte(g, uniao, pal, W, H) {
    const meu = (X, Y) => Y >= 0 && Y < H && X >= 0 && X < W && g[Y][X] !== '.' && pal[g[Y][X]];
    let algum = false;
    for (let Y = 0; Y < H && !algum; Y++) for (let X = 0; X < W; X++) if (meu(X, Y)) { algum = true; break; }
    if (!algum) return null;
    const c = document.createElement('canvas');
    c.width = W + 2; c.height = H + 2;
    const x = c.getContext('2d');
    const cheio = uniao || meu;
    x.fillStyle = '#140f1f';
    for (let Y = -1; Y <= H; Y++) for (let X = -1; X <= W; X++) {
      if (cheio(X, Y)) continue;
      if (meu(X - 1, Y) || meu(X + 1, Y) || meu(X, Y - 1) || meu(X, Y + 1)) x.fillRect(X + 1, Y + 1, 1, 1);
    }
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const cor = meu(X, Y);
      if (cor) { x.fillStyle = cor; x.fillRect(X + 1, Y + 1, 1, 1); }
    }
    return c;
  }
  function tingir(src, cor) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = cor; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function acinzentar(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    try {
      const d = x.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) * 0.75;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = l;
      }
      x.putImageData(d, 0, 0);
    } catch (e) { /* sem leitura de pixels: fica colorido */ }
    return c;
  }
  const rigs = new Map();
  function rig(ap) {
    const k = chave(ap);
    if (rigs.has(k)) return rigs.get(k);
    const { L, W, H } = partes(ap);
    const pal = paletaDe(ap);
    const uniao = (X, Y) => Y >= 0 && Y < H && X >= 0 && X < W && Object.values(L).some(m => m[Y][X] !== '.' && pal[m[Y][X]]);
    const camadas = {};
    for (const n in L) {
      const cv = desenharParte(L[n], SOLTAS.has(n) ? null : uniao, pal, W, H);
      if (cv) camadas[n] = { cv, flash: tingir(cv, '#ffffff'), cinza: acinzentar(cv) };
    }
    const meio = W / 2, ca = CABECA_ATE[ap.classe], pe = PERNAS[ap.classe];
    const pivos = {
      tronco: [meio, pe], pernaE: [meio - 2, pe], pernaD: [meio + 2, pe],
      cabeca: [meio, ca], chapeu: [meio, 6], aureola: [meio, 0], cabelo: [meio, 7],
      capa: [meio, ca + 1], costas: [meio, ca + 1],
      arma: PIVO_ARMA[ap.classe] || [meio, ca], escudo: [3, 15],
      asaE: [8, 11], asaD: [W - 9, 11], cauda: [22, 15],
    };
    for (const n in pivos) pivos[n] = [pivos[n][0] + 1, pivos[n][1] + 1]; // +1: borda do contorno
    const R = { camadas, pivos, w: W + 2, h: H + 2, classe: ap.classe,
      ordem: ORDEM[ap.classe === 'dragao' ? 'dragao' : 'humano'].filter(n => camadas[n]) };
    rigs.set(k, R);
    return R;
  }
  // Aplica a transformação de uma parte e de todos os "pais" dela (articulações em cadeia)
  function articular(ctx, R, P, n) {
    if (PAI[n]) articular(ctx, R, P, PAI[n]);
    const pc = P[n];
    if (!pc) return;
    const [px, py] = R.pivos[n];
    ctx.translate(px + Math.round(pc.dx || 0), py + Math.round(pc.dy || 0));
    if (pc.rot) ctx.rotate(pc.rot);
    ctx.translate(-px, -py);
  }
  // Desenha o personagem numa pose. (x, y) = ponto dos pés no mundo.
  function desenharRig(ctx, R, P, o) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;   // giros e achatamentos sem borrar os pixels
    ctx.translate(Math.round(o.x), Math.round(o.y + (P.salto || 0)));
    if (o.giro) ctx.rotate(o.giro);
    if (o.flip < 0) ctx.scale(-1, 1);
    if (P.sx !== 1 || P.sy !== 1) ctx.scale(P.sx || 1, P.sy || 1);
    ctx.translate(-Math.round(R.w / 2), -R.h + 1);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    for (const n of R.ordem) {
      const L = R.camadas[n];
      ctx.save();
      articular(ctx, R, P, n);
      ctx.drawImage(o.cinza ? L.cinza : o.flash ? L.flash : L.cv, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  return { quadros, url, rig, desenharRig };
})();
