# Missões do Hero

Lista de tarefas do projeto. Marque `[x]` quando concluir e mova para **Concluídas** com a data.

Legenda de prioridade: 🔴 alta · 🟡 média · 🟢 baixa

---

## Em andamento

- [ ] 🔴 **Definir a 5ª raça/classe.** Hoje é *Curandeiro* (provisório). Se mudar, editar `CLASSES` e `ELENCO` em `js/dados.js` e o `case` correspondente em `agir()` no `js/motor.js`.
- [ ] 🔴 **Testar no celular.** Abrir pelo navegador do iPhone e anotar o que ficou ruim (tamanho dos toques, velocidade da batalha, leitura).
- [ ] 🔴 **Ligar o Supabase.** Criar o projeto, rodar `supabase/migrations/0001_saves.sql`, ativar login anônimo e preencher `js/config-supabase.js` (passo a passo no README).
- [ ] 🔴 **Publicar na Vercel.** Importar o repositório `diogodeolliveira/Hero` em vercel.com/new e depois colocar a URL da Vercel em Supabase → Auth → Site URL.

## Próximas

### Jogabilidade
- [ ] 🟡 Equilibrar classes depois de jogar algumas horas (Arqueiro e Mago podem estar fortes demais).
- [ ] 🟡 Vantagem entre classes (ex.: Arqueiro forte contra Mago, Guerreiro forte contra Arqueiro).
- [ ] 🟡 Bônus de equipe: 2+ heróis da mesma classe dão um extra.
- [ ] 🟡 Mais habilidades: veneno, atordoar, provocar (forçar o inimigo a atacar o Guerreiro).
- [ ] 🟢 Equipamentos (arma, armadura, amuleto).
- [ ] 🟢 Modo PvP assíncrono: lutar contra a equipe salva de outro jogador.

### Progressão e economia
- [ ] 🟡 Recompensa diária por login.
- [ ] 🟡 Missões diárias dentro do jogo (ex.: "vença 3 batalhas").
- [ ] 🟢 Conquistas.
- [ ] 🟢 Balancear preço das invocações após testes.

### Visual e som
- [ ] 🟡 Placar de líderes (maior fase alcançada) usando o Supabase.
- [ ] 🟡 Batalha validada no servidor (Edge Function) para evitar trapaça; hoje quem calcula é o navegador.
- [ ] 🟢 Animações nos bonecos (respirar, atacar com a arma, cair).
- [ ] 🟡 Efeitos de habilidade diferentes por classe (fogo, flecha, luz).
- [ ] 🟢 Sons e música.
- [ ] 🟢 Tela de vitória mais caprichada.

### Técnico
- [ ] 🟡 Transformar em PWA (instalar no celular, funcionar offline).
- [ ] 🟡 Publicar online (Netlify, GitHub Pages ou similar).
- [ ] 🟢 Conta e save na nuvem (hoje o save fica só no navegador).
- [ ] 🟢 Versão do save e migração quando o formato mudar.

---

## Concluídas

- [x] 2026-10-18 · Protótipo jogável: coleção com 46 heróis, 5 classes, 4 raridades e níveis 1–5.
- [x] 2026-10-18 · Batalha automática com barra de ação por velocidade, habilidade a cada 3 turnos, críticos, escudo e cura.
- [x] 2026-10-18 · Campanha com fases, regiões e chefe a cada 5 fases.
- [x] 2026-10-18 · Três desafios por dia (Fácil, Médio, Difícil).
- [x] 2026-10-18 · Invocações (Simples, Grupo, Portal Épico), com repetido subindo nível.
- [x] 2026-10-18 · Equipe com frente (2) e trás (3) e botão "Montar melhor equipe".
- [x] 2026-10-18 · Curva de dificuldade ajustada por simulação (ver MEMORIA.md).
- [x] 2026-10-18 · Bonecos: personagem desenhado para cada classe, com aparência única por herói; monstros também desenhados.
- [x] 2026-10-18 · Código do save na nuvem (Supabase): conta anônima automática, vincular e-mail e entrar em outro aparelho.
- [x] 2026-10-18 · Repositório no GitHub: github.com/diogodeolliveira/Hero.
- [x] 2026-10-18 · Personagens refeitos em pixel art desenhado à mão (moldes por classe, sombra e brilho, contorno); monstros com armaduras próprias.
- [x] 2026-10-18 · Campo de batalha em pixel art com câmera de cima: personagens andam, atacam, disparam flechas e magias, caem; cenário muda por região; placar e narração.
