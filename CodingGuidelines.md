# Coding Guidelines

## Multi-Sport Tournament Management Platform

### 1. Language & Versions
- **Backend:** Node.js (v20.x LTS) with TypeScript (v5.x)
- **Frontend:** React (v18.x) with TypeScript (v5.x)
- **Database:** PostgreSQL (v15+)
- **Cache/Broker:** Redis (v7+)
- **Real‑time:** WebSocket via Socket.IO (v4.x) or native WebSocket server
- **Infrastructure:** Docker (v24+), Docker‑Compose for local dev, Kubernetes (optional for prod)

### 2. Repository Structure
```
/src
  /backend          # NestJS (or Express) API
    /src
      /controllers
      /services
      /dtos
      /entities
      /middleware
      /utils
      /config
      /tests
  /frontend         # React SPA
    /src
      /components
      /hooks
      /pages
      /services   (API client)
      /styles
      /utils
      /tests
  /shared           # Type‑shared interfaces, enums, constants
/infra
  /docker
  /k8s (optional)
  /scripts
/docs
/tests
  /unit
  /integration
  /e2e
```

### 3. Code Style
- **Formatter:** Prettier (2.x) with `.prettierrc`
- **Linter:** ESLint (8.x) with plugins:
  - `@typescript-eslint`
  - `eslint-plugin-react`
  - `eslint-plugin-react-hooks`
  - `eslint-import-resolver-typescript`
- **Commit Messages:** Conventional Commits (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`)
- **Branching:** GitFlow‑like:
  - `main` – production
  - `develop` – integration
  - `feature/*` – new features
  - `bugfix/*` – fixes
  - `release/*` – release prep
  - `hotfix/*` – urgent prod fixes

### 4. TypeScript Rules
- Enable `strict: true` in `tsconfig.json`
- No `any` unless unavoidable; prefer `unknown` + type guard
- Use interfaces for shape, types for unions/tuples
- Export only what is needed; avoid barrel files (`index.ts`) for deep imports
- Prefer `readonly` for arrays/objects that shouldn’t mutate

### 5. Backend Specifics
- **Framework:** NestJS (recommended) or Express + class‑validator/class‑transformer
- **DI:** Use NestJS container; keep services thin, domain logic in services
- **Validation:** DTOs with class‑validator; enable global `ValidationPipe`
- **Error Handling:** Custom exception filters; return uniform JSON:
  ```json
  { "statusCode": number, "message": string, "error": string }
  ```
- **Logging:** Winston or pino (levels: error, warn, info, debug, verbose); attach request‑id middleware
- **Database:** TypeORM (or MikroORM); entities mirror DB schema; migrations via CLI; avoid raw SQL unless essential
- **Auth:** JWT (access 15 min, refresh 7 days); store refresh tokens hashed; Passport JWT strategy
- **Authz:** Role guards (`RolesGuard`) reading `role` from JWT
- **Rate Limiting:** Express‑rate‑limit or NestJS Throttler (per‑IP, per‑route)
- **WS Validation:** Socket.IO middleware + DTO validation
- **Env:** `.env` loaded via config service; never commit secrets
- **Testing:**
  - Unit: Jest + TS‑Jest (≥80% coverage on services/controllers)
  - Integration: Supertest for API endpoints
  - E2E: Playwright (or Cypress) for critical flows
- **Docs:** Swagger/OpenAPI via `@nestjs/swagger`; keep annotations up‑to‑date

### 6. Frontend Specifics
- **State:** React Query (TanStack Query) for server state; Zustand or Context for UI state
- **Styling:** Tailwind CSS v3 + Headless UI (accessible primitives); optional CSS modules
- **Components:** Prefer small, composable, pure components; avoid deep nesting
- **Forms:** React Hook Form + Zod/Yod validation
- **Routing:** React Router v6
- **WS Hook:** Custom `useSocket` wrapper with auto‑reconnect & back‑off
- **Error Boundaries:** Global fallback UI; log errors to Sentry/etc. in prod
- **Accessibility:** WCAG 2.1 AA; semantic HTML, ARIA labels, axe‑core in CI
- **Testing:**
  - Unit: Jest + React Testing Library (≥80% coverage)
  - Integration: RTL for user interactions
  - E2E: Playwright for key flows (login, tournament creation, score entry, live view)
- **Code Splitting:** Lazy‑load routes via `React.lazy` + `Suspend`; separate vendor bundle
- **Env Vars:** Prefix with `VITE_` (Vite) or `REACT_APP_` (CRA); never expose secrets
- **Linting:** Same ESLint config as backend, plus `react-hooks/exhaustive-deps`
- **
- **Formatting:** Prettier on save

### 7. Database Guidelines
- **Naming:** `snake_case` for tables/columns; `PascalCase` for TS entities
- **Indexes:** Add on FKs and columns used in WHERE/JOIN/ORDER
- **Migrations:** Keep reversible; never edit existing migrations
- **Seeding:** Seed only for dev/test; use factories (e.g., `@mikro-orm/seeder` or TypeORM factories)
- **Transactions:** Wrap related ops in a transaction; avoid long‑running txns
- **Soft Delete:** Prefer `deleted_at` timestamp over hard delete where appropriate
- **Enums:** Prefer PostgreSQL enum types; keep in sync with TS enums

### 8. API Design
- **RESTful:** Resource‑based nouns (`/tournaments`, `/teams`, `/matches`, `/scores`)
- **Versioning:** URL versioning (`/api/v1/...`); maintain at least one prior major version
- **Response Envelope:** `{ success: true, data: ..., meta?: {...} }` or error envelope as above
- **Pagination:** Cursor‑based (`limit` + `after`) for large lists; optional offset/limit for small sets
- **Filtering & Sorting:** Query params (`?status=active&sort=-createdAt`)
- **Content-Type:** `application/json` for all req/res
- **CORS:** Restrict to allowed origins (frontend dev/prod); never `*` in prod
- **Security:** Helmet.js, sanitize inputs, parameterized queries to avoid SQLi

### 9. Real‑Time Communication
- **Connection:** Socket.IO client with auto‑reconnect; server uses Redis adapter for multi‑instance
- **Events:** Namespace per sport or generic (`match:{id}`); use acknowledgments for critical updates
- **Payload:** Keep <1 KB; send deltas when possible
- **Security:** Verify JWT via handshake middleware; reject unauthenticated conns
- **Scalability:** Redis adapter enables horizontal scaling; no sticky sessions needed

### 10. DevOps & CI/CD
- **CI:** GitHub Actions (or GitLab CI) – lint, test, build Docker images on PR/merge
- **CD:** Deploy to staging on `develop` merge; production on `main` tag/release
- **Docker:** Multi‑stage builds; non‑root user; expose only needed ports
- **Orchestration (optional):** Helm charts for K8s; separate values for dev/stage/prod
- **Observability:** Prometheus + Grafana (metrics); Loki or Elasticsearch (logs); Jaeger (tracing optional)
- **Logging:** Centralized; correlate with request‑id
- **Env Vars:** Secret manager (AWS Secrets Manager, GCP Secret Manager, Vault) – never in repo
- **Backup:** Daily automated DB snapshots; test point‑in‑time recovery quarterly
- **Artifact Store:** GitHub Packages / Docker Hub / GitLab Container Registry with immutable tags

### 11. Security Checklist
- [ ] Run `npm audit` weekly; update dependencies
- [ ] Use `helmet` and `hpp` middleware
- [ ] Sanitize user‑generated content (DOMPurify on server if rendered)
- [ ] Enforce HTTPS; redirect HTTP → HTTPS
- [ ] Secure cookies: `SameSite=Strict`, `Secure`, `HttpOnly`
- [ ] Implement CSP headers
- [ ] Limit file uploads: size, MIME type, malware scan
- [ ] Never commit `.env` or secrets
- [ ] Use Renovate/Dependabot for automated dependency updates
- [ ] Conduct quarterly OWASP ZAP / dependency‑check scans

### 12. Quality Assurance
- **Code Review:** Minimum 2 approvals; verify adherence to guidelines, tests, docs
- **Testing Gates:** CI must pass lint, unit, integration before merge
- **Performance:** Load‑test critical WS endpoints with k6/Artillery; target <200 ms 95th‑pct latency
- **Accessibility:** Run axe‑core in CI; fail on any WCAG AA violation
- **Docs:** Keep Swagger UI up‑to‑date; update README with setup/run instructions
- **Versioning:** Tag releases with semver (`vMAJOR.MINOR.PATCH`)

### 13. Miscellaneous
- **TODO Comments:** Use `// TODO: JIRA-123`; review before merge
- **Logging Sensitive Data:** Never log passwords, tokens, PII; mask if needed
- **Internationalization:** Keep UI strings in `i18n/` JSON; use `react-i18next` or similar
- **Feature Flags:** Use LaunchDarkly/Unleash or simple config‑based flags for gradual rollout

---

*Follow these guidelines during development, code reviews, and CI/CD pipeline configuration to ensure a maintainable, secure, and high‑quality codebase.*