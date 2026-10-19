# Memória do projeto Hero

Decisões tomadas, regras do jogo e o porquê de cada escolha. Atualize sempre que algo mudar, para que qualquer sessão futura (sua ou do Claude) saiba o contexto.

---

## Visão

- **Nome:** Hero
- **Gênero:** RPG de coleção com **batalha automática**. O jogador não controla a luta; a estratégia está em **quais heróis entram** e **onde ficam** (frente ou trás).
- **Plataforma:** navegador, pensado para celular primeiro.
- **Origem:** começou com a ideia de recriar o Futnex (manager de futebol com figurinhas). Aproveitamos a estrutura (coleção, pacotes, escalação, jogos do dia) e trocamos o tema para fantasia. Nada do Futnex foi copiado: nome, arte, textos e código são originais.

## Classes (raças)

| Classe | Papel | Habilidade (a cada 3 turnos) |
|---|---|---|
| Guerreiro | Linha de frente, muita vida e defesa | Grito de guerra: golpe 130% + escudo de 20% da vida |
| Mago | Dano em área, frágil | Chuva de fogo: 70% em todos |
| Arqueiro | Rápido, mira no mais fraco | Tiro certeiro: 230% no inimigo com menos vida |
| Dragão | Raro (só raro, épico e lendário), lento e forte | Sopro de fogo: 90% em todos |
| Curandeiro | Suporte, **provisório** | Bênção: cura todos em 80% |

> ⚠️ O usuário falou em 5 raças, mas citou só 4 (Mago, Guerreiro, Arqueiro, Dragão). O Curandeiro foi escolhido como 5ª **até a definição oficial**.

## Regras da batalha

- Cada unidade tem **Vida, Ataque, Defesa e Velocidade**.
- Ordem dos turnos: barra de ação que enche conforme a velocidade (quem é mais rápido age mais vezes).
- Dano = `ataque × multiplicador × 2,2 × 100 / (100 + defesa)`, com variação de ±10%.
- Crítico: 12% de chance, dano ×1,6.
- Ataques corpo a corpo (Guerreiro, Dragão) miram primeiro a **frente** inimiga (vagas 1–2).
- Limite de 300 ações; se acabar, vence quem tem mais vida proporcional.
- A batalha é **calculada inteira antes** e a tela só reproduz. O prêmio é salvo antes da animação, então fechar a página no meio não dá para trapacear.

## Progressão

- **Raridade** multiplica os atributos: Comum ×1 · Raro ×1,18 · Épico ×1,38 · Lendário ×1,62.
- **Nível 1–5:** cada nível +12% (velocidade cresce só 30% disso). Herói repetido sobe 1 nível; no nível 5 vira moeda.
- **Campanha:** força dos inimigos = `0,70 × 1,035^(fase − 1)`. Chefe (dragão) a cada 5 fases, com prêmio em dobro.
  - Curva escolhida por simulação (200 batalhas por ponto): time inicial vence ~96% na fase 1 e ~50% no chefe da fase 5; time lendário nível 5 passa da fase 25.
  - A primeira curva testada (0,78 × 1,075) era difícil demais: 1% de vitória na fase 5.
- **Desafios do dia:** 3 por dia, nível relativo à fase atual (−2, +1, +4).
- Moedas iniciais: 1.200 (dá para uma Invocação em Grupo logo no começo).

## Decisões técnicas

- HTML + CSS + JavaScript puro, **sem build** e sem framework: abre direto com dois cliques no `index.html`.
- Scripts clássicos (não módulos), para funcionar também em `file://`.
- Save em `localStorage`, na chave `hero-save-v1`.
- Heróis gerados com **semente fixa**: a mesma lista sempre, em qualquer aparelho.
- Arquivos:
  - `js/dados.js`: configuração, classes, heróis, monstros, invocações (**é aqui que se ajusta o conteúdo**)
  - `js/motor.js`: regras puras (atributos, batalha, invocação, prêmios)
  - `js/app.js`: telas, save e animação da batalha
  - `css/estilo.css`: visual (cores em variáveis no `:root`)

## Bonecos (personagens)

- **Pixel art desenhado à mão** em `js/sprites.js`: cada classe tem um molde (grade de letras), e cada letra é um material com 3 tons (metal, tecido, couro, pele). A paleta de cada herói recolore o molde, e o contorno escuro é automático.
- Peças por cima do molde: elmo fechado ou aberto, chifres, presas, escudo, espada, barba, cajados, arco, aljava, asas, cauda, coroa.
- Caminhada: o mesmo molde com o pé esquerdo ou o direito levantado.
- `tools/galeria.html` mostra todos os sprites ampliados, para revisar a arte.
- Referências de estilo do usuário ficam em `personagens/` (fora do git, porque são imagens de terceiros). Servem só de inspiração; nada foi copiado.
- (Antes eram desenhos SVG; `js/bonecos.js` ainda guarda a aparência de cada herói e monstro.)
- A aparência de cada herói (pele, cabelo, barba, cor da roupa, elmo com chifre) sai de uma semente baseada no **id**: é sempre a mesma.
- Épico e lendário ganham capa e detalhes dourados; dragões lendários podem ser dourados.
- Monstros usam o mesmo corpo da classe, com pele própria (orc verde, esqueleto osso etc.) e olhos vermelhos (`APARENCIA_MONSTRO`).

## Campo de batalha

- `js/campo.js` desenha a batalha num `<canvas>` em baixa resolução, ampliado com `image-rendering: pixelated`. Esse é o "jeitão" pixel art.
- Os bonecos SVG viram sprites: rasterizados em 28×34, com borda de pixel cortada (alfa > 110), contorno escuro e versões de flash branco (dano) e cinza (caído). São 3 quadros (parado e 2 de passo) para a caminhada.
- Câmera de cima, levemente inclinada. No celular em pé, os aliados ficam embaixo e os inimigos em cima; na tela larga, aliados à esquerda.
- Corpo a corpo (Guerreiro, Dragão) **anda até o alvo**; à distância (Arqueiro, Mago, Curandeiro) dispara projétil. Área: chuva de fogo, sopro, colunas de luz.
- Números e nomes ficam numa segunda camada de alta resolução, para continuar nítidos.
- Cenário gerado por região (`TERRENOS`): floresta, pântano, minas, gelo, ruínas, vulcão.
- Inspiração de câmera e estilo: tela de partida do Futnex. A arte é toda nossa.

## Interface (redesign de 2026-10-18)

- Inspiração de organização: Futnex (cena com personagens, botão principal grande, um só destaque de cor, navegação fixa). A identidade é própria: fantasia, roxo escuro e grafite com dourado para progresso e raridade.
- **Sistema de design** em `css/estilo.css`, dividido em seções: tokens (`--c-*` cores, `--e1..e7` espaçamento, `--r1..r4` raios, `--t-*` tipos), componentes (`.btn` e variantes, `.card`, `.selo`, `.barra`, `.chip`, `.seg`, `.estado`, `.retrato`, `.hcard`, `.modal`, dica `[data-dica]`), telas, batalha, camadas e responsivo.
- Raridade padronizada com `data-rar="comum|raro|epico|lendario"`, que define `--rar`; a cor da classe vem de `--cl-<classe>`.
- Ícones próprios em `js/icones.js` (`icone(nome)`), traço de 2px; `ICONE_CLASSE` liga cada classe ao seu ícone.
- Navegação: barra inferior no celular e abas no topo a partir de 960px. A Guilda (perfil e conta) fica no botão de avatar.
- **Progressão nova:**
  - XP e nível da guilda: `xpBatalha` por batalha, `xpParaProximo(n) = 100 + (n − 1) × 50`, e cada nível dá `150 + n × 50` moedas.
  - 3 missões diárias (`missoesDoDia`): sempre "vencer 3", mais 2 sorteadas pelo dia. Medem coisas reais da batalha (`resumoBatalha`: habilidades usadas, monstros derrotados).
- Saves antigos ganham `xp`, `nivel` e `missoes` em `migrar()`, sem perder nada.
- A batalha continua automática: os painéis mostram vida e **carga da habilidade** (turnos % 3), dados que já existiam na simulação. Não há ações manuais.
- Invocação: regras, custos e chances iguais aos de antes; só a apresentação mudou (vitrine, tabela de chances, destaque da melhor carta).

## Servidor e publicação

- **Supabase** guarda o save: tabela `saves` (um registro JSON por jogador), protegida por RLS (cada um só lê e grava o próprio).
- Todo jogador entra com **conta anônima** automática; na Guilda pode **vincular e-mail** (link mágico) para não perder o progresso e jogar em outro aparelho.
- Ao abrir o jogo, vale o save **mais recente** entre o do aparelho e o da nuvem (campo `atualizado`).
- Sem `js/config-supabase.js` preenchido o jogo funciona só com save local.
- ⚠️ Limitação: a batalha é calculada no navegador, então um jogador técnico consegue editar o próprio save. Aceitável no protótipo; o caminho para resolver é validar no servidor (Edge Function).
- **GitHub:** github.com/diogodeolliveira/Hero (branch `main`).
- **Vercel:** site estático, sem build, publicado direto do GitHub a cada push.

## Diário

- **2026-10-18:** protótipo criado. Nome definido: Hero. Classes: Mago, Guerreiro, Arqueiro, Dragão + Curandeiro provisório.
- **2026-10-18:** bonecos no lugar dos símbolos; save na nuvem com Supabase; código enviado ao GitHub.
