# Arcadia — a full-stack arcade

A React/TypeScript arcade with Snake Evolved, Pong practice, authenticated online Pong, match history, offline practice, and global rankings. The original React/Supabase application and all 18 game implementations are preserved in `apps/legacy`; its data and cloud project are untouched.

## Quick start

Install Docker with Compose, then:

```sh
docker compose up --build
```

Open http://localhost:8080. Compose starts PostgreSQL and Redis, applies the checked-in migration, starts the API, and serves the built PWA through Nginx. Its credentials and HTTP cookie settings are **local development defaults**. Existing databases persist in named volumes.

For development, use Node 24 LTS:

```sh
npm ci
cp apps/api/.env.example apps/api/.env
# Replace JWT_SECRET in apps/api/.env with a random secret.
docker compose up -d postgres redis
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:5173. Use `localhost` consistently: the API validates the exact `Origin` of mutations. Vite proxies `/api` and `/socket.io` to port 3001. No account or backend is required for guest practice; accounts, synchronization, and online games require both data services.

## Monorepo

```text
apps/
  web/
    src/
      App.tsx                navigation, lazy routes, error boundary
      Hub.tsx                arcade library
      Account.tsx            register / login / Google entry point
      Profile.tsx            history and Recharts analytics
      Leaderboard.tsx        Top 100 + current rank
      Game.tsx               rules and mode selection
      games/{Snake,Pong}.tsx canvas renderers and input adapters
      api.ts                 React Query transport and account-bound sync
      state.ts               persisted Zustand preferences and practice queue
      styles.css             responsive light/dark design tokens
    vite.config.ts           React, Tailwind 4, PWA and local proxies
    tailwind.config.js       design-system entry point
  api/
    src/
      app.ts                 Express routes, validation and HTTP security
      auth.ts                signed JWT cookies + Redis session revocation
      security.ts            password hashing and UTC streak rules
      results.ts             idempotent result repository and ranking projection
      multiplayer.ts         authoritative Pong simulation and rooms
      db.ts                  Prisma/Redis adapters and logging
      config.ts              startup environment validation
      index.ts               dependency startup and graceful shutdown
    prisma/schema.prisma
    prisma/migrations/       checked-in initial PostgreSQL migration
  legacy/                    original standalone app and original lockfile
packages/
  engine/src/                pure Snake/Pong engines and unit tests
  shared/src/                Zod API contracts and TypeScript domain types
infra/nginx.conf
Dockerfile
docker-compose.yml
e2e/platform.spec.ts
.github/workflows/ci.yml
docs/IMPLEMENTATION.md
```

## Games

**Snake Evolved:** 60-second runs, fixed-step updates driven by requestAnimationFrame, obstacles, progressive speed, timed ghost wall wrapping, and speed boosts with doubled food points. Arrow/WASD, touch swipes and accessible direction buttons are supported. Space or Pause stops the simulation; hidden tabs pause automatically. Direction buffering prevents reversing through the snake; the old tail cell may be entered when it vacates.

**Pong After Hours:** 120 Hz physics independent of rendering, bounded paddle speed, angle-sensitive returns, increasing rally speed, a speed-limited practice AI, touch/pointer/keyboard input, and first-to-seven matches with a five-minute cap. Online players share a six-character room code. Socket.IO relays inputs and snapshots through an authoritative server; this is intentionally server-mediated rather than browser-to-browser trust.

## Authentication and persistence

Registration accepts a 3–24-character player name, email and 12–128-character password. Passwords use Node's salted scrypt and timing-safe comparisons. JWTs are restricted to HS256 with issuer/audience validation, expire in seven days, and reference revocable Redis sessions. Cookies are httpOnly and become Secure in production. SameSite=Lax plus exact Origin validation protects mutations against CSRF. Logout deletes the session; connected sockets recheck revocation once per second. User values render as text, never injected HTML.

Enable Google by setting `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the API environment. Register that exact callback URI in Google Cloud, enable the consent screen and add test users when applicable. OAuth uses a one-time Redis state record, a browser-bound cookie, PKCE and verified ID tokens. Existing password accounts are not silently linked by email. The Google button is hidden until configured; no client secret is sent to the browser.

PostgreSQL is the source of truth. Result writes lock the player row and use a unique `(userId, clientId)` constraint to make retries idempotent. Both online player results and XP updates commit in one transaction. Redis sorted sets are a rebuildable projection of cumulative ranked Pong points. They rebuild at startup and after a completed match; public rankings refresh every 30 seconds, and authenticated listeners also receive updates over Socket.IO.

Offline practice records remain bound to the account active when the game began. React Query submits queued records when connectivity returns; acknowledged IDs are removed. Guest history never uploads to another account. Local history and queues retain the latest 100 records. Server history returns the latest 100, while PostgreSQL keeps all matches. Practice scores are untrusted and unranked; only server-run online games award account XP. Guest practice XP is a device-local display, not competitive currency. Login streaks use UTC calendar days.

## Why this is production-ready — patterns and limits

This section describes the implemented production-oriented patterns, **not a certification that the platform is ready for unrestricted public traffic**:

- **Pure domain engines / adapters:** simulation is independent of React, network transports and rendering. Both server and practice client share the Pong engine.
- **Repository boundary:** result storage owns idempotency and account updates; the Redis ranking projection can be reconstructed from PostgreSQL.
- **Security boundaries:** untrusted solo scores cannot enter ranked play; Zod validates payloads, API/auth quotas use Redis, sockets bound payload size and event frequency, rooms expire, and one player cannot occupy multiple rooms.
- **Delivery:** strict TypeScript, lazy game and analytics routes, a reproducible lockfile, transactional migration, container health checks, PWA precaching, reduced-motion styling, and CI tests.
- **Failure states:** signed-out/offline practice works, failed sync is visible and retryable, rankings show errors instead of fake data, disconnected matches are abandoned without invented results.

Before public release, configure real secrets and HTTPS, test Google with your own credentials, establish backups and monitoring, run load/security/accessibility audits, and measure Lighthouse on the deployed build. **A 95+ Lighthouse score is a target, not an asserted result.** Browser/CI validation status is recorded in `docs/VALIDATION.md`.

Known limits: rooms live in one API process (100-room cap); deploy one replica until room ownership/sharding is implemented. An API restart aborts active games. Completed result writes retry while that process lives, but a process crash before PostgreSQL commit can lose that final result. There is no matchmaking, reconnect/resume protocol, email verification, password reset, account deletion UI, moderation, or anti-collusion system yet. New users start in the new PostgreSQL database; migration from Supabase requires a separate reviewed data migration. Remaining legacy games remain playable in the legacy application, not as silently rewritten games in this hub.

## Validation

```sh
npm run db:generate
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E runs require PostgreSQL and Redis and the API environment above. CI supplies fresh service databases and runs the migration before tests. Never point E2E at production; it creates test accounts and results. Unit tests cover physics consistency, collisions, reversal buffering, power-ups, hashing and streak boundaries.

## Deployment: Netlify + Railway / AWS

**Frontend:** `netlify.toml` is the repository-owned source of truth. Netlify installs from the root, runs `npm run build -w apps/web`, publishes `apps/web/dist`, caches hashed assets, and rewrites browser routes to the SPA. Connect Netlify to this GitHub repository with `main` as the production branch; every push then starts a production build and pull requests receive deploy previews. Until the API is deployed, `/api/*` returns an explicit 503 while guest games remain available.

After the API has a stable HTTPS domain, set `VITE_API_URL=https://api.example.com` in Netlify's production and deploy-preview environments. Trigger a rebuild after changing it. Socket.IO needs direct WebSocket support, so it connects to the API custom domain rather than a Netlify Function.

**API:** deploy the Dockerfile's `api` target to a long-lived Railway/AWS container with PostgreSQL and Redis in a private network. Set `NODE_ENV=production`, a random `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `WEB_ORIGIN` matching the frontend exactly, and the actual number of trusted proxy hops in `TRUST_PROXY`. Run `npm run db:migrate` as a release job before shifting traffic. Configure health checks at `/health`, WebSocket upgrades and idle timeouts above 75 seconds. Keep one API replica until room sharding exists.

Do not use unrelated default `netlify.app` / `railway.app` sites with Lax cookies: use same-site custom domains such as `app.example.com` and `api.example.com`. Never weaken cookie policy merely to make cross-site deployment work. Adapt the `connect-src` policy for the API domain when adding a Content Security Policy. Configure HTTPS, secret rotation, database backups and retention policies outside the repository. Netlify's Git integration owns frontend continuous deployment; Railway or AWS should deploy the API only after `Platform CI` passes.

## Original app

```sh
cd apps/legacy
npm ci
# Restore the original VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY configuration.
npm run dev
```

Its dependency versions and source remain the historical baseline, separate from the new platform's update policy.
