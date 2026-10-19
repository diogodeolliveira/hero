'use strict';

// ===== Configuração geral =====
const CONFIG = {
  nome: 'Hero',
  moedasIniciais: 1200,
  nivelMaximo: 5,
  chaveSave: 'hero-save-v1',
};

// ===== Utilidades =====
function criarRng(seed) { // mulberry32: mesmo seed -> mesma sequência
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function escolher(r, lista) { return lista[Math.floor(r() * lista.length)]; }
function limitar(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ===== Classes =====
// base = atributos de um herói comum no nível 1
const CLASSES = {
  guerreiro: {
    nome: 'Guerreiro', cor: '#e2553f', papel: 'Linha de frente: muita vida e defesa.',
    base: { hp: 1200, atk: 90, def: 60, spd: 90 },
    normal: 'Golpe de espada: 100% no inimigo da frente.',
    hab: { nome: 'Grito de guerra', desc: 'A cada 3 turnos: golpe de 130% e escudo de 20% da vida.' },
  },
  mago: {
    nome: 'Mago', cor: '#8b6cff', papel: 'Dano em área, mas é frágil.',
    base: { hp: 700, atk: 130, def: 25, spd: 100 },
    normal: 'Raio arcano: 100% em um inimigo aleatório.',
    hab: { nome: 'Chuva de fogo', desc: 'A cada 3 turnos: 70% em todos os inimigos.' },
  },
  arqueiro: {
    nome: 'Arqueiro', cor: '#3fbf6f', papel: 'Rápido. Mira sempre no inimigo mais fraco.',
    base: { hp: 800, atk: 140, def: 30, spd: 115 },
    normal: 'Flecha: 100% no inimigo com menos vida.',
    hab: { nome: 'Tiro certeiro', desc: 'A cada 3 turnos: 230% no inimigo com menos vida.' },
  },
  dragao: {
    nome: 'Dragão', cor: '#f08a24', papel: 'Raro e poderoso. Lento, mas devastador.',
    base: { hp: 1500, atk: 150, def: 50, spd: 80 },
    normal: 'Mordida: 110% no inimigo da frente.',
    hab: { nome: 'Sopro de fogo', desc: 'A cada 3 turnos: 90% em todos os inimigos.' },
  },
  curandeiro: { // 5ª classe provisória — trocar quando a definição chegar
    nome: 'Curandeiro', cor: '#4fc3f7', papel: 'Mantém a equipe de pé.',
    base: { hp: 800, atk: 100, def: 35, spd: 105 },
    normal: 'Cura 150% no aliado mais ferido (ou ataca 70% se ninguém precisar).',
    hab: { nome: 'Bênção', desc: 'A cada 3 turnos: cura todos os aliados em 80%.' },
  },
};
const ORDEM_CLASSES = ['guerreiro', 'mago', 'arqueiro', 'dragao', 'curandeiro'];

// ===== Raridades =====
const RARIDADES = ['comum', 'raro', 'epico', 'lendario'];
const NOME_RARIDADE = { comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' };
const MULT_RARIDADE = { comum: 1, raro: 1.18, epico: 1.38, lendario: 1.62 };
const VALOR_MAXIMO = { comum: 150, raro: 300, epico: 700, lendario: 1500 }; // repetido no nível máximo vira moeda

// ===== Heróis (todos originais) =====
const ELENCO = {
  guerreiro: [['Bram', 'comum'], ['Hilda', 'comum'], ['Rurik', 'comum'], ['Tessa', 'comum'],
    ['Garran', 'raro'], ['Brenna', 'raro'], ['Varek', 'raro'],
    ['Kaela', 'epico', 'Lâmina Rubra'], ['Torvald', 'epico', 'Muralha do Norte'],
    ['Isolde', 'lendario', 'Rainha de Aço']],
  mago: [['Orin', 'comum'], ['Mireth', 'comum'], ['Calder', 'comum'], ['Sabela', 'comum'],
    ['Quillon', 'raro'], ['Thessa', 'raro'], ['Morvin', 'raro'],
    ['Zephyra', 'epico', 'Tecelã de Tempestades'], ['Elandra', 'epico', 'Chama Azul'],
    ['Ysolde', 'lendario', 'Arquimaga Eterna']],
  arqueiro: [['Wren', 'comum'], ['Fennic', 'comum'], ['Nyra', 'comum'], ['Tamsin', 'comum'],
    ['Corwin', 'raro'], ['Kestrel', 'raro'], ['Aeris', 'raro'],
    ['Sylas', 'epico', 'Olho de Falcão'], ['Lyra', 'epico', 'Flecha Lunar'],
    ['Ravena', 'lendario', 'Caçadora do Crepúsculo']],
  dragao: [['Pyrelis', 'raro'], ['Zirruth', 'raro'],
    ['Ombrakh', 'epico', 'Sombra Alada'], ['Kaelthar', 'epico', 'Escama de Brasa'],
    ['Vorthyss', 'lendario', 'Senhor das Cinzas'], ['Ignarax', 'lendario', 'Coração de Vulcão']],
  curandeiro: [['Aldo', 'comum'], ['Mirela', 'comum'], ['Tobias', 'comum'], ['Ilya', 'comum'],
    ['Benedita', 'raro'], ['Amara', 'raro'], ['Elun', 'raro'],
    ['Solenne', 'epico', 'Luz da Aurora'], ['Cassiel', 'epico', 'Mão Serena'],
    ['Seraphine', 'lendario', 'Voz dos Céus']],
};

// Ritmo: vida, ataque e defesa crescem inteiros; velocidade cresce só 30%
function escalar(base, mult, r) {
  const v = () => (r ? 0.92 + r() * 0.16 : 1);
  return {
    hp: Math.round(base.hp * mult * v()),
    atk: Math.round(base.atk * mult * v()),
    def: Math.round(base.def * mult * v()),
    spd: Math.round(base.spd * (1 + (mult - 1) * 0.3) * v()),
  };
}

const HEROIS = (function gerar() {
  const r = criarRng(20261018);
  const lista = [];
  ORDEM_CLASSES.forEach(classe => {
    ELENCO[classe].forEach(([nome, rar, titulo]) => {
      lista.push({ id: lista.length + 1, nome, titulo: titulo || '', classe, rar,
        ...escalar(CLASSES[classe].base, MULT_RARIDADE[rar], r) });
    });
  });
  return lista;
})();
const HEROI = Object.fromEntries(HEROIS.map(h => [h.id, h]));
const POR_RARIDADE = Object.fromEntries(RARIDADES.map(r => [r, HEROIS.filter(h => h.rar === r)]));

// ===== Inimigos (monstros originais) =====
const MONSTROS = {
  guerreiro: ['Orc Brutamontes', 'Esqueleto Guerreiro', 'Troll da Ponte', 'Golem de Pedra'],
  mago: ['Xamã Goblin', 'Bruxa do Pântano', 'Lich Menor'],
  arqueiro: ['Goblin Arqueiro', 'Caçador Sombrio', 'Kobold Atirador'],
  dragao: ['Wyrm Jovem', 'Dragão das Cinzas', 'Serpe de Gelo'],
  curandeiro: ['Cultista Sombrio', 'Druida Corrompido'],
};
const REGIOES = ['Floresta Sussurrante', 'Pântano Cinzento', 'Minas Esquecidas', 'Picos Gelados', 'Ruínas de Obsidiana', 'Vulcão Adormecido'];

// ===== Desafios do dia =====
const DIFICULDADES = [
  { id: 'facil', nome: 'Fácil', delta: -2, mult: 1 },
  { id: 'medio', nome: 'Médio', delta: 1, mult: 1.5 },
  { id: 'dificil', nome: 'Difícil', delta: 4, mult: 2.2 },
];

// ===== Invocações =====
const INVOCACOES = [
  { id: 'simples', nome: 'Invocação Simples', preco: 250, qtd: 1, garantia: null,
    pesos: { comum: 0.6, raro: 0.3, epico: 0.08, lendario: 0.02 }, desc: '1 herói' },
  { id: 'grupo', nome: 'Invocação em Grupo', preco: 1100, qtd: 5, garantia: 'raro',
    pesos: { comum: 0.6, raro: 0.3, epico: 0.08, lendario: 0.02 }, desc: '5 heróis, 1 raro ou melhor garantido' },
  { id: 'portal', nome: 'Portal Épico', preco: 2800, qtd: 5, garantia: 'epico',
    pesos: { comum: 0.25, raro: 0.45, epico: 0.24, lendario: 0.06 }, desc: '5 heróis, 1 épico ou melhor garantido' },
];
