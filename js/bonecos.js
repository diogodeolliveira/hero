'use strict';

// ===== Bonecos: personagens desenhados em SVG (originais) =====
// viewBox 0 0 100 120. Cada herói tem aparência fixa derivada do id.

const PELES = ['#f6d2b4', '#eab38b', '#c98c5f', '#8f5a3a', '#5e3a26'];
const CABELOS = ['#2a1b12', '#5a3520', '#a8652d', '#e0c068', '#c94d2a', '#ece8e0', '#3b3a4a'];
const ROUPAS = {
  guerreiro: ['#c8402e', '#a8322a', '#d4553a', '#8f2f3c'],
  mago: ['#6a4fd6', '#4f3fb0', '#8a4fd6', '#3f56c8'],
  arqueiro: ['#2f9e5a', '#3c7d3a', '#5a8f2f', '#2e7f6e'],
  curandeiro: ['#3fa9e0', '#4fc3f7', '#5aa0d8', '#38b6c9'],
  dragao: ['#e8562f', '#7b4fd6', '#2f9e8f', '#3a3a4a', '#c23b5a', '#d9a521'],
};

// clareia (f > 0) ou escurece (f < 0) uma cor #rrggbb
function tom(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const canal = s => {
    const c = (n >> s) & 255;
    return Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
  };
  return '#' + [16, 8, 0].map(s => canal(s).toString(16).padStart(2, '0')).join('');
}

function aparenciaHeroi(h) {
  const r = criarRng(h.id * 7919 + 13);
  const roupas = ROUPAS[h.classe];
  const nobre = h.rar === 'epico' || h.rar === 'lendario';
  const cabelo = h.classe === 'mago' && r() < 0.35 ? '#ece8e0' : escolher(r, CABELOS);
  return {
    classe: h.classe,
    pele: escolher(r, PELES),
    cabelo,
    estilo: Math.floor(r() * 3), // 0 curto, 1 longo, 2 espetado
    barba: r() < (h.classe === 'mago' ? 0.5 : 0.25),
    chifres: r() < 0.3, // elmo com chifres (guerreiro)
    cor: h.classe === 'dragao' ? (h.rar === 'lendario' && r() < 0.5 ? '#d9a521' : escolher(r, roupas)) : escolher(r, roupas),
    trim: h.rar === 'lendario' ? '#f2c14e' : h.rar === 'epico' ? '#d7b46a' : null,
    capa: nobre,
    olho: null,
    rar: h.rar,
    rosto: r() < 0.4, // guerreiro com elmo aberto (mostra o rosto)
  };
}

const APARENCIA_MONSTRO = {
  'Orc Brutamontes': { pele: '#6aa84f', presas: true, cor: '#5a4636', metal: '#9a6b45' },
  'Esqueleto Guerreiro': { pele: '#e8e2d0', cor: '#4a4a52', metal: '#5a5f6e' },
  'Troll da Ponte': { pele: '#7d8f6a', presas: true, cor: '#4f4030', metal: '#6f7d5c' },
  'Golem de Pedra': { pele: '#9a968e', cor: '#5f5b55', metal: '#8f8a80' },
  'Xamã Goblin': { pele: '#93b545', cor: '#5b3f6e' },
  'Bruxa do Pântano': { pele: '#a3c49a', cor: '#3c4f3a' },
  'Lich Menor': { pele: '#d8d4e6', cor: '#2f2a4a' },
  'Goblin Arqueiro': { pele: '#93b545', cor: '#4f5a2f' },
  'Caçador Sombrio': { pele: '#6f6a80', cor: '#2a2638' },
  'Kobold Atirador': { pele: '#b5733f', presas: true, cor: '#5a3f2a' },
  'Cultista Sombrio': { pele: '#cfc2b0', cor: '#5a1f2a' },
  'Druida Corrompido': { pele: '#8fa07a', cor: '#3f3a24' },
  'Wyrm Jovem': { cor: '#4f8f3a' },
  'Dragão das Cinzas': { cor: '#4a4550' },
  'Serpe de Gelo': { cor: '#6fb7d9' },
};
function aparenciaMonstro(nome, classe) {
  const m = APARENCIA_MONSTRO[nome] || { pele: '#7d8f6a', cor: '#4a3f3a' };
  return { classe, pele: m.pele || '#7d8f6a', cabelo: '#2a2a2a', estilo: 2, barba: false, chifres: classe === 'guerreiro',
    cor: m.cor, trim: null, capa: false, olho: '#ff4a3d', presas: !!m.presas, monstro: true, metal: m.metal || null };
}

// ----- partes comuns -----
const SOMBRA = '<ellipse cx="50" cy="113" rx="24" ry="4.5" fill="#000" opacity=".35"/>';
// passo: 0 parado, 1 pé esquerdo levantado, -1 pé direito levantado (quadros da caminhada)
function pe(a, lado) { return (lado === 'e' ? a.passo > 0 : a.passo < 0) ? -3 : 0; }
function pernas(cor, a) {
  return `<rect x="39" y="${94 + pe(a, 'e')}" width="9" height="16" rx="3" fill="${cor}"/><rect x="52" y="${94 + pe(a, 'd')}" width="9" height="16" rx="3" fill="${cor}"/>`;
}
function maos(pele, esq = [30, 90], dir = [70, 90]) {
  return `<circle cx="${esq[0]}" cy="${esq[1]}" r="4.6" fill="${pele}"/><circle cx="${dir[0]}" cy="${dir[1]}" r="4.6" fill="${pele}"/>`;
}
function rosto(a) {
  const olho = a.olho || '#1a1428';
  return `<circle cx="29.5" cy="49" r="4" fill="${tom(a.pele, -0.1)}"/><circle cx="70.5" cy="49" r="4" fill="${tom(a.pele, -0.1)}"/>
    <circle cx="50" cy="46" r="21" fill="${a.pele}"/>
    <ellipse cx="42" cy="49" rx="2.8" ry="3.6" fill="${olho}"/><ellipse cx="58" cy="49" rx="2.8" ry="3.6" fill="${olho}"/>
    ${a.monstro ? '' : '<circle cx="43" cy="47.6" r="1" fill="#fff"/><circle cx="59" cy="47.6" r="1" fill="#fff"/>'}
    ${a.monstro ? '' : `<ellipse cx="36.5" cy="55" rx="3.5" ry="2" fill="#ff7b7b" opacity=".25"/><ellipse cx="63.5" cy="55" rx="3.5" ry="2" fill="#ff7b7b" opacity=".25"/>`}
    ${a.barba ? `<path d="M33 51 Q35 72 50 74 Q65 72 67 51 Q60 61 50 61 Q40 61 33 51Z" fill="${a.cabelo}"/>` : ''}
    <path d="M46 57.5 q4 3 8 0" stroke="${a.barba ? tom(a.cabelo, -0.4) : '#5a2a20'}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${a.presas ? '<path d="M44.5 58 l1.6-4.5 1.6 4.5z M52.3 58 l1.6-4.5 1.6 4.5z" fill="#fffbe8"/>' : ''}`;
}
function cabelo(a, comFranja = true) {
  const c = a.cabelo;
  const longo = a.estilo === 1 ? `<path d="M29 44 Q27 62 31 70 L37 70 Q34 58 35 46Z M71 44 Q73 62 69 70 L63 70 Q66 58 65 46Z" fill="${c}"/>` : '';
  const topo = a.estilo === 2
    ? `<path d="M29 46 L31 30 L37 34 L40 22 L46 30 L50 19 L54 30 L60 22 L63 34 L69 30 L71 46 Q64 35 50 35 Q36 35 29 46Z" fill="${c}"/>`
    : `<path d="M29 46 Q29 24 50 24 Q71 24 71 46 Q66 34 52 34 Q44 39 36 37 Q31 40 29 46Z" fill="${c}"/>`;
  return longo + (comFranja ? topo : '');
}
function capa(cor, trim) {
  return `<path d="M35 68 L24 108 Q50 114 76 108 L65 68Z" fill="${tom(cor, -0.35)}"/>${trim ? `<path d="M24 108 Q50 114 76 108 L75.4 105 Q50 111 24.6 105Z" fill="${trim}"/>` : ''}`;
}

// ----- classes -----
function bonecoGuerreiro(a) {
  const metal = a.monstro ? '#7d7a76' : '#b9c2cf';
  const metalEsc = tom(metal, -0.3);
  const trim = a.trim || tom(a.cor, 0.35);
  return `${a.capa ? capa(a.cor, a.trim) : ''}
    ${pernas('#3a3346', a)}
    <path d="M32 98 Q32 72 50 67 Q68 72 68 98Z" fill="${metal}"/>
    <path d="M43 72 h14 v24 l-7 4 l-7 -4z" fill="${a.cor}"/>
    <path d="M43 72 h14 v3 h-14z" fill="${trim}"/>
    <rect x="34" y="90" width="32" height="4" rx="1.5" fill="${metalEsc}"/>
    <ellipse cx="31" cy="80" rx="7" ry="8" fill="${metal}"/><ellipse cx="69" cy="80" rx="7" ry="8" fill="${metal}"/>
    <path d="M71 42 l3.5 -3 l3.5 3 v44 h-7z" fill="#e3e9f0"/><path d="M74.5 40 v46" stroke="#aab3c0" stroke-width="1"/>
    <rect x="66" y="85" width="17" height="4" rx="1.5" fill="${a.trim || '#6b5a3a'}"/><rect x="72.5" y="89" width="4" height="8" fill="#5a3d24"/>
    ${maos(a.pele, [30, 90], [74.5, 92])}
    ${rosto(a)}
    <path d="M28 47 Q28 22 50 22 Q72 22 72 47 L66 47 Q65 33 50 33 Q35 33 34 47Z" fill="${metal}"/>
    <path d="M28 45 L34 45 L35 59 L29 56Z M72 45 L66 45 L65 59 L71 56Z" fill="${metal}"/>
    <rect x="48.5" y="31" width="3" height="17" rx="1.2" fill="${metalEsc}"/>
    <path d="M30 38 Q50 30 70 38" stroke="${metalEsc}" stroke-width="2" fill="none"/>
    ${a.chifres
      ? `<path d="M31 32 Q18 26 20 12 Q26 24 35 26Z M69 32 Q82 26 80 12 Q74 24 65 26Z" fill="#f1ead8"/>`
      : `<path d="M50 23 Q55 8 67 11 Q58 14 55 25Z" fill="${a.cor}"/>`}
    <circle cx="27" cy="85" r="13" fill="${a.cor}" stroke="${a.trim || metal}" stroke-width="3"/>
    <path d="M27 77 v16 M19 85 h16" stroke="${trim}" stroke-width="2.4"/>
    <circle cx="27" cy="85" r="3" fill="${a.trim || metal}"/>`;
}
function bonecoMago(a) {
  const chapeu = tom(a.cor, -0.15);
  const trim = a.trim || tom(a.cor, 0.45);
  const brilho = a.monstro ? '#7dff6a' : a.trim ? '#ffe08a' : '#9fd8ff';
  return `${a.capa ? capa(a.cor, a.trim) : ''}
    <rect x="73" y="34" width="3.6" height="76" rx="1.6" fill="#7a5532"/>
    <circle cx="74.8" cy="31" r="10" fill="${brilho}" opacity=".3"/><circle cx="74.8" cy="31" r="5.6" fill="${brilho}"/><circle cx="73" cy="29.5" r="1.6" fill="#fff"/>
    <ellipse cx="42" cy="${109 + pe(a, 'e')}" rx="6" ry="3" fill="#2e2638"/><ellipse cx="58" cy="${109 + pe(a, 'd')}" rx="6" ry="3" fill="#2e2638"/>
    <path d="M31 108 Q33 72 50 67 Q67 72 69 108Z" fill="${a.cor}"/>
    <path d="M31.4 103 h37.2 l.4 5 h-38z" fill="${trim}"/>
    <path d="M50 70 v34" stroke="${trim}" stroke-width="2"/>
    <path d="M31 74 Q22 86 28 94 L36 90 Q34 82 38 76Z M69 74 Q78 86 74 94 L66 90 Q66 82 62 76Z" fill="${tom(a.cor, -0.2)}"/>
    ${maos(a.pele, [30, 92], [74.8, 88])}
    ${cabelo(a, false)}
    ${rosto(a)}
    <path d="M29 33 Q50 26 71 33 Q62 20 60 4 Q50 6 42 18 Q36 26 29 33Z" fill="${chapeu}"/>
    <path d="M60 4 Q70 6 72 14 Q66 9 60 8Z" fill="${chapeu}"/>
    <ellipse cx="50" cy="33" rx="27" ry="6" fill="${chapeu}"/>
    <path d="M31 30.5 Q50 26 69 30.5 L68 26.5 Q50 22 32 26.5Z" fill="${trim}"/>
    <path d="M52 13 l1.4 3.2 3.4.3-2.6 2.2.8 3.3-3-1.8-3 1.8.8-3.3-2.6-2.2 3.4-.3z" fill="${a.trim || '#ffe08a'}"/>`;
}
function bonecoArqueiro(a) {
  const capuz = tom(a.cor, -0.25);
  return `${a.capa ? capa(a.cor, a.trim) : ''}
    <g transform="rotate(18 64 76)"><rect x="60" y="60" width="9" height="28" rx="3" fill="#7a5532"/>
      <path d="M61 60 l2-7 2 7z M65 60 l2-8 2 8z" fill="#e8e0d0"/></g>
    ${pernas('#4a3524', a)}
    <path d="M33 98 Q33 72 50 67 Q67 72 67 98Z" fill="${a.cor}"/>
    <path d="M38 69 L50 84 L62 69" stroke="${tom(a.cor, 0.3)}" stroke-width="2.4" fill="none"/>
    <rect x="34" y="88" width="32" height="4" rx="1.5" fill="#6b4a2a"/><rect x="47.5" y="87.5" width="5" height="5" rx="1" fill="${a.trim || '#c9a35a'}"/>
    <ellipse cx="31.5" cy="81" rx="5.5" ry="8.5" fill="${tom(a.cor, -0.15)}"/><ellipse cx="68.5" cy="81" rx="5.5" ry="8.5" fill="${tom(a.cor, -0.15)}"/>
    <path d="M25 50 Q24 16 50 16 Q76 16 75 50 L72 66 L28 66Z" fill="${capuz}"/>
    ${rosto(a)}
    <path d="M28 48 Q29 25 50 25 Q71 25 72 48 Q66 33 50 33 Q34 33 28 48Z" fill="${capuz}"/>
    <path d="M35 43 Q40 35 50 35.5 Q45 39 43.5 45Z" fill="${a.cabelo}"/>
    ${a.trim ? `<path d="M28 48 Q29 25 50 25 Q71 25 72 48" stroke="${a.trim}" stroke-width="1.6" fill="none"/>` : ''}
    <path d="M24 56 Q6 84 24 112" fill="none" stroke="${a.trim || '#8a5a2b'}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M24 56 L24 112" stroke="#f0ece4" stroke-width="1"/>
    ${maos(a.pele, [22, 84], [68.5, 90])}`;
}
function bonecoCurandeiro(a) {
  const manto = a.monstro ? tom(a.cor, 0.1) : '#eef3fb';
  const brilho = a.monstro ? '#b26cff' : '#ffe08a';
  return `${a.capa ? capa(a.cor, a.trim) : ''}
    <rect x="73.5" y="30" width="3.6" height="80" rx="1.6" fill="${a.trim ? '#c9a35a' : '#8a6a44'}"/>
    <circle cx="75.3" cy="27" r="11" fill="${brilho}" opacity=".25"/>
    <path d="M72.8 17 h5 v6 h6 v5 h-6 v6 h-5 v-6 h-6 v-5 h6z" fill="${brilho}"/>
    <ellipse cx="42" cy="${109 + pe(a, 'e')}" rx="6" ry="3" fill="#6b5a4a"/><ellipse cx="58" cy="${109 + pe(a, 'd')}" rx="6" ry="3" fill="#6b5a4a"/>
    <path d="M31 108 Q33 72 50 67 Q67 72 69 108Z" fill="${manto}"/>
    <path d="M44 69 L41 108 h6 l1.5 -38z M56 69 l3 39 h-6 l-1.5 -38z" fill="${a.cor}"/>
    ${a.trim ? `<path d="M31.4 104 h37.2 l.4 4 h-38z" fill="${a.trim}"/>` : ''}
    <path d="M31 74 Q22 86 28 94 L36 90 Q34 82 38 76Z M69 74 Q78 86 74 94 L66 90 Q66 82 62 76Z" fill="${tom(manto, -0.08)}"/>
    ${maos(a.pele, [30, 92], [75.3, 88])}
    ${a.monstro
      ? `<path d="M26 50 Q25 18 50 18 Q75 18 74 50 L70 64 L30 64Z" fill="${tom(a.cor, -0.3)}"/>`
      : cabelo({ ...a, estilo: a.estilo === 2 ? 1 : a.estilo }, false)}
    ${rosto(a)}
    ${a.monstro
      ? `<path d="M28 48 Q29 25 50 25 Q71 25 72 48 Q66 33 50 33 Q34 33 28 48Z" fill="${tom(a.cor, -0.3)}"/>`
      : `${cabelo({ ...a, estilo: 0 })}<ellipse cx="50" cy="15" rx="14" ry="3.6" fill="none" stroke="#ffe08a" stroke-width="2.6"/>`}`;
}
function bonecoDragao(a) {
  const cor = a.cor;
  const escuro = tom(cor, -0.3);
  const barriga = tom(cor, 0.45);
  const chifre = a.trim || '#f1ead8';
  const olho = a.monstro ? '#ff4a3d' : '#ffd34d';
  const asa = `<path d="M38 74 Q18 40 4 52 Q14 58 9 68 Q20 68 19 78 Q28 76 32 86Z" fill="${escuro}"/>
    <path d="M36 74 Q20 50 8 54" stroke="${tom(cor, -0.45)}" stroke-width="1.6" fill="none"/>`;
  return `${asa}<g transform="translate(100 0) scale(-1 1)">${asa}</g>
    <path d="M64 100 Q88 106 92 88 Q94 80 87 84 Q85 97 66 93Z" fill="${cor}"/>
    <path d="M87 84 L96 74 L93 88Z" fill="${chifre}"/>
    <ellipse cx="38" cy="${108 + pe(a, 'e')}" rx="8" ry="4.5" fill="${escuro}"/><ellipse cx="62" cy="${108 + pe(a, 'd')}" rx="8" ry="4.5" fill="${escuro}"/>
    <path d="M32 109 l1.5 3 1.5-3 M37 110 l1.5 3 1.5-3 M60 110 l1.5 3 1.5-3 M65 109 l1.5 3 1.5-3" stroke="#fff" stroke-width="1.2" fill="none"/>
    <ellipse cx="50" cy="88" rx="22" ry="21" fill="${cor}"/>
    <ellipse cx="50" cy="92" rx="13" ry="15" fill="${barriga}"/>
    <path d="M40 86 h20 M39 92 h22 M40 98 h20" stroke="${tom(barriga, -0.15)}" stroke-width="1.4"/>
    <ellipse cx="31" cy="88" rx="6" ry="8" fill="${escuro}"/><ellipse cx="69" cy="88" rx="6" ry="8" fill="${escuro}"/>
    <path d="M33 34 Q22 16 30 4 Q34 18 42 27Z M67 34 Q78 16 70 4 Q66 18 58 27Z" fill="${chifre}"/>
    <path d="M44 26 l3-6 3 6 3-6 3 6" fill="${tom(cor, 0.2)}"/>
    <ellipse cx="50" cy="44" rx="22" ry="19" fill="${cor}"/>
    <ellipse cx="50" cy="57" rx="14.5" ry="10" fill="${barriga}"/>
    <ellipse cx="45" cy="55" rx="1.6" ry="2.2" fill="${escuro}"/><ellipse cx="55" cy="55" rx="1.6" ry="2.2" fill="${escuro}"/>
    <path d="M41 61 Q50 65 59 61" stroke="${escuro}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M44 61.6 l1.4 3 1.4-3 M53 61.6 l1.4 3 1.4-3" fill="#fff"/>
    <path d="M34 37 Q41 33 47 38 M66 37 Q59 33 53 38" stroke="${escuro}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="41" cy="43" rx="4.6" ry="5" fill="${olho}"/><ellipse cx="59" cy="43" rx="4.6" ry="5" fill="${olho}"/>
    <ellipse cx="41" cy="43" rx="1.3" ry="4" fill="#1a1428"/><ellipse cx="59" cy="43" rx="1.3" ry="4" fill="#1a1428"/>
    ${a.trim ? `<path d="M40 22 l3-8 4 6 3-9 3 9 4-6 3 8z" fill="${a.trim}"/>` : ''}`;
}

const DESENHO = { guerreiro: bonecoGuerreiro, mago: bonecoMago, arqueiro: bonecoArqueiro, curandeiro: bonecoCurandeiro, dragao: bonecoDragao };

// SVG completo (com xmlns) para virar imagem no campo de batalha; sem sombra, o campo desenha a dela
function bonecoSvg(ap, passo, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="${w}" height="${h}">${DESENHO[ap.classe]({ ...ap, passo })}</svg>`;
}

// Personagem em pixel art (js/sprites.js) como imagem para as telas
function boneco(ap, cls = '') {
  return `<img class="boneco sprite sp-${ap.classe} ${cls}" src="${Sprites.url(ap)}" alt="" draggable="false">`;
}
