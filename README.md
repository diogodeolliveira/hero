# Hero

RPG de coleção com batalha automática, feito para jogar no navegador do celular.
Invoque heróis, monte a equipe (2 na frente, 3 atrás) e assista à batalha acontecer sozinha.

**Classes:** Guerreiro, Mago, Arqueiro, Dragão e Curandeiro.

## Rodar no computador

Não precisa de build. Basta abrir o `index.html` no navegador, ou servir a pasta:

```bash
python -m http.server 8765
```

## Save na nuvem (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode `supabase/migrations/0001_saves.sql`.
3. Em **Authentication → Sign In / Providers**, ligue **Allow anonymous sign-ins**.
4. Em **Authentication → URL Configuration**, coloque o endereço do site (ex.: o da Vercel) em **Site URL**.
5. Copie **Project URL** e a chave **anon / publishable** para `js/config-supabase.js`.

Sem essa configuração o jogo funciona normalmente, salvando só no aparelho.

## Publicar (Vercel)

Importe este repositório em [vercel.com/new](https://vercel.com/new). Não há build: o framework é **Other** e as configurações ficam no padrão. Cada `git push` publica uma versão nova.

## Organização

- `docs/MISSOES.md`: tarefas feitas e pendentes
- `docs/MEMORIA.md`: regras do jogo e decisões
