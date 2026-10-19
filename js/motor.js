'use strict';

// ===== Força dos heróis =====
function multNivel(nivel) { return 1 + 0.12 * (nivel - 1); }
function atributos(heroi, nivel) {
  const m = multNivel(nivel);
  return { hp: Math.round(heroi.hp * m), atk: Math.round(heroi.atk * m), def: Math.round(heroi.def * m),
    spd: Math.round(heroi.spd * (1 + (m - 1) * 0.3)) };
}
function poder(a) { return Math.round(a.hp * 0.15 + a.atk * 2.2 + a.def * 2 + a.spd * 0.8); }

// Equipe: 5 vagas. 0 e 1 = frente (recebem os golpes corpo a corpo), 2 a 4 = trás.
const VAGAS = 5;
const FRENTE = 2;
const PRIORIDADE_FRENTE = { guerreiro: 3, dragao: 2, curandeiro: 0, mago: 0, arqueiro: 0 };

function melhorEquipe(herois) { // herois: { id: nivel }
  const ids = Object.keys(herois).map(Number)
    .sort((a, b) => poder(atributos(HEROI[b], herois[b])) - poder(atributos(HEROI[a], herois[a])))
    .slice(0, VAGAS);
  ids.sort((a, b) => PRIORIDADE_FRENTE[HEROI[b].classe] - PRIORIDADE_FRENTE[HEROI[a].classe]
    || atributos(HEROI[b], herois[b]).hp - atributos(HEROI[a], herois[a]).hp);
  while (ids.length < VAGAS) ids.push(null);
  return ids;
}

// ===== Times inimigos =====
// Curva testada em simulação: time inicial ganha ~96% na fase 1 e ~50% no chefe da fase 5
function multFase(fase) { return 0.70 * Math.pow(1.035, fase - 1); }
function ehChefe(fase) { return fase % 5 === 0; }
function regiaoDa(fase) { return REGIOES[Math.floor((fase - 1) / 5) % REGIOES.length]; }

function timeInimigo(fase, semente) {
  const r = criarRng(hashTexto(semente));
  const chefe = ehChefe(fase);
  const comp = [
    'guerreiro',
    chefe ? 'dragao' : 'guerreiro',
    escolher(r, ['mago', 'arqueiro']),
    escolher(r, ['mago', 'arqueiro', 'arqueiro']),
    fase >= 3 ? escolher(r, ['curandeiro', 'mago', 'arqueiro']) : escolher(r, ['mago', 'arqueiro']),
  ];
  return comp.map(classe => {
    const m = multFase(fase) * (chefe && classe === 'dragao' ? 1.25 : 1);
    const nome = escolher(r, MONSTROS[classe]);
    return { nome, classe, monstro: true, chefe: chefe && classe === 'dragao', ap: aparenciaMonstro(nome, classe),
      ...escalar(CLASSES[classe].base, m, r) };
  });
}
function poderTime(time) { return time.reduce((s, u) => s + (u ? poder(u) : 0), 0); }

// ===== Batalha automática =====
// Calcula a batalha inteira de uma vez; a tela só reproduz os eventos.
function simularBatalha(timeA, timeB, seed) {
  const r = criarRng(seed);
  const U = [];
  [timeA, timeB].forEach((time, lado) => time.forEach((b, vaga) => {
    if (b) U.push({ ...b, uid: U.length, lado, vaga, hpMax: b.hp, escudo: 0, carga: r() * 300, turnos: 0 });
  }));
  const inicio = U.map(u => ({ ...u }));
  const vivos = lado => U.filter(u => u.lado === lado && u.hp > 0);
  const eventos = [];
  let vencedor = null;

  for (let n = 0; n < 300 && vencedor === null; n++) {
    // quem enche a barra de ação primeiro age
    const ativos = U.filter(u => u.hp > 0);
    let ator = ativos[0], falta = Infinity;
    for (const u of ativos) { const t = (1000 - u.carga) / u.spd; if (t < falta) { falta = t; ator = u; } }
    for (const u of ativos) u.carga += u.spd * falta;
    ator.carga = 0;
    ator.turnos++;
    eventos.push(agir(ator, ator.turnos % 3 === 0, U, r));
    if (!vivos(1).length) vencedor = 0;
    else if (!vivos(0).length) vencedor = 1;
  }
  if (vencedor === null) { // tempo esgotado: vence quem tem mais vida proporcional
    const pct = lado => U.filter(u => u.lado === lado).reduce((s, u) => s + u.hp / u.hpMax, 0);
    vencedor = pct(0) >= pct(1) ? 0 : 1;
  }
  return { inicio, eventos, vencedor };
}

function inimigosDe(a, U) { return U.filter(u => u.lado !== a.lado && u.hp > 0); }
function aliadosDe(a, U) { return U.filter(u => u.lado === a.lado && u.hp > 0); }
function alvoFrente(a, U, r) {
  const ini = inimigosDe(a, U);
  const frente = ini.filter(u => u.vaga < FRENTE);
  return escolher(r, frente.length ? frente : ini);
}
function alvoFraco(a, U) { return inimigosDe(a, U).sort((x, y) => x.hp - y.hp)[0]; }

function bater(a, alvo, mult, r) {
  const crit = r() < 0.12;
  const dano = Math.max(1, Math.round(a.atk * mult * 2.2 * (100 / (100 + alvo.def)) * (0.9 + r() * 0.2) * (crit ? 1.6 : 1)));
  const absorvido = Math.min(alvo.escudo, dano);
  alvo.escudo -= absorvido;
  alvo.hp = Math.max(0, alvo.hp - (dano - absorvido));
  return { uid: alvo.uid, dano, crit, hp: alvo.hp, escudo: alvo.escudo, morreu: alvo.hp === 0 };
}
function curar(a, alvo, mult, r) {
  const cura = Math.round(a.atk * mult * (0.9 + r() * 0.2));
  alvo.hp = Math.min(alvo.hpMax, alvo.hp + cura);
  return { uid: alvo.uid, cura, hp: alvo.hp, escudo: alvo.escudo };
}

function agir(a, especial, U, r) {
  const ev = { ator: a.uid, hab: especial ? CLASSES[a.classe].hab.nome : null, alvos: [] };
  const todos = () => inimigosDe(a, U);
  switch (a.classe) {
    case 'guerreiro':
      ev.alvos.push(bater(a, alvoFrente(a, U, r), especial ? 1.3 : 1, r));
      if (especial) { a.escudo += Math.round(a.hpMax * 0.2); ev.escudoAtor = a.escudo; }
      break;
    case 'dragao':
      if (especial) ev.alvos = todos().map(t => bater(a, t, 0.9, r));
      else ev.alvos.push(bater(a, alvoFrente(a, U, r), 1.1, r));
      break;
    case 'mago':
      if (especial) ev.alvos = todos().map(t => bater(a, t, 0.7, r));
      else ev.alvos.push(bater(a, escolher(r, todos()), 1, r));
      break;
    case 'arqueiro':
      ev.alvos.push(bater(a, alvoFraco(a, U), especial ? 2.3 : 1, r));
      break;
    case 'curandeiro': {
      if (especial) { ev.alvos = aliadosDe(a, U).map(t => curar(a, t, 0.8, r)); break; }
      const ferido = aliadosDe(a, U).sort((x, y) => x.hp / x.hpMax - y.hp / y.hpMax)[0];
      if (ferido.hp / ferido.hpMax < 0.8) ev.alvos.push(curar(a, ferido, 1.5, r));
      else ev.alvos.push(bater(a, escolher(r, todos()), 0.7, r));
      break;
    }
  }
  return ev;
}

// ===== Invocações =====
function sortearRaridade(pesos, r) {
  let x = r();
  for (const rar of RARIDADES) { x -= pesos[rar]; if (x <= 0) return rar; }
  return 'comum';
}
function invocar(inv, r = Math.random) {
  const ids = [];
  for (let i = 0; i < inv.qtd; i++) ids.push(escolher(r, POR_RARIDADE[sortearRaridade(inv.pesos, r)]).id);
  if (inv.garantia) {
    const min = RARIDADES.indexOf(inv.garantia);
    if (!ids.some(id => RARIDADES.indexOf(HEROI[id].rar) >= min)) ids[ids.length - 1] = escolher(r, POR_RARIDADE[inv.garantia]).id;
  }
  return ids.sort((x, y) => RARIDADES.indexOf(HEROI[x].rar) - RARIDADES.indexOf(HEROI[y].rar)); // o melhor por último
}

// ===== Prêmios =====
function premioFase(fase) { return Math.round((150 + fase * 40) * (ehChefe(fase) ? 2 : 1)); }
function premioDesafio(faseEq, dif, venceu) { return Math.round((120 + faseEq * 25) * dif.mult * (venceu ? 1 : 0.2)); }
