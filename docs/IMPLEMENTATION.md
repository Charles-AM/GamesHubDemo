# Rebuild baseline and sequence

Baseline ee65447 already had React 19, Vite 8, Tailwind 4, Supabase and 18 game components (12 registered). The original app remains in apps/legacy; existing cloud data is untouched.

1. Create TypeScript workspaces and preserve the original app.
2. Build the responsive library, account UI and local practice queue.
3. Extract upgraded Snake and Pong engines and server-controlled online Pong.
4. Add PostgreSQL, Redis, authentication, Docker and CI.
5. Validate type safety, game rules, browser flows and document deployment limits.

Visual direction: ink-black surfaces, acid-lime accents, game-first navigation and a typographic library. Runtime claims require measured evidence; no unmeasured Lighthouse score or external deployment is implied.
