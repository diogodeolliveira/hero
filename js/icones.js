'use strict';

// ===== Ícones (desenhos próprios, traço de 2px em grade 24×24) =====
const ICONES = {
  inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  batalha: '<path d="M4 4l9 9M4 4h4M4 4v4"/><path d="M20 4l-9 9M20 4h-4M20 4v4"/><path d="M7 15l2 2-3 3-2-2zM17 15l-2 2 3 3 2-2z"/>',
  equipe: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M15.5 14.6c2.9-.3 5.5 1.5 5.5 4.4"/>',
  herois: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/><path d="M10 7.5l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L7 9.8l2-.3z"/>',
  invocar: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  xp: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  missao: '<path d="M7 3h10v18H7z"/><path d="M10 8h4M10 12h4"/><path d="M9.5 16l1.5 1.5 3-3"/>',
  presente: '<rect x="3.5" y="9" width="17" height="11" rx="1"/><path d="M2.5 9h19M12 9v11"/><path d="M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zM12 9c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>',
  espada: '<path d="M14.5 3.5H20v5.5L9 20l-5-5z"/><path d="M6 13l5 5M3 21l3-3"/>',
  vida: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  defesa: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  velocidade: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  voltar: '<path d="M15 5l-7 7 7 7"/>',
  cadeado: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11"/><path d="M12 13v4M8.5 20h7M9.5 17h5v3h-5z"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  filtro: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
  ordenar: '<path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M17 20V4M13.5 7.5L17 4l3.5 3.5"/>',
  troca: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
  mapa: '<path d="M3.5 6l5.5-2 6 2 5.5-2v14l-5.5 2-6-2-5.5 2z"/><path d="M9 4v14M15 6v14"/>',
  caveira: '<path d="M5 11a7 7 0 0 1 14 0v3.5l-2 1.5v3H7v-3l-2-1.5z"/><circle cx="9.3" cy="11.5" r="1.6"/><circle cx="14.7" cy="11.5" r="1.6"/><path d="M11 19v-2M13 19v-2"/>',
  nuvem: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6 3.8 3.8 0 0 1-.4 7.4z"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  coroa: '<path d="M3.5 8l4.5 4 4-6.5 4 6.5 4.5-4-1.8 10.5H5.3z"/>',
  raio: '<path d="M12 3.5l1.8 5.4 5.7.1-4.6 3.4 1.7 5.5L12 14.6l-4.6 3.3 1.7-5.5L4.5 9l5.7-.1z"/>',
  cajado: '<path d="M7 21L15.5 8.5"/><circle cx="17" cy="6.5" r="2.8"/><path d="M20.5 2.5v2M22 4h-2M4.5 9v2M5.5 10h-2"/>',
  arco: '<path d="M6 3c8 3 8 15 0 18"/><path d="M6 3v18"/><path d="M4 12h15M19 12l-3-2.5M19 12l-3 2.5"/>',
  chama: '<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.6 3-5.6 3.5-9.3 2 1.2 3 3 3 4.6 1-.8 1.7-2.2 1.7-3.6 2.8 2 4.8 4.8 4.8 8.3 0 3.5-2.5 6.2-6.5 6.2z"/>',
  cruz: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>',
};
const ICONE_CLASSE = { guerreiro: 'espada', mago: 'cajado', arqueiro: 'arco', dragao: 'chama', curandeiro: 'cruz' };
function icone(nome, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
}
