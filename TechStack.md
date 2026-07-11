# Technology Stack

## Multi‑Sport Tournament Management Platform

| Layer | Technology | Version / Notes | Reasoning |
|-------|------------|-----------------|-----------|
| **Language** | TypeScript | 5.x | Static typing, great IDE support, shared types between FE/BE |
| **Backend Runtime** | Node.js | 20.x LTS | Mature ecosystem, good performance, works well with TS |
| **Backend Framework** | NestJS (or Express + class‑validator) | 10.x | Modular, built‑in DI, validation, testing utilities, microservice‑ready |
| **Frontend Framework** | React | 18.x | Component‑based, large ecosystem, hooks, concurrent mode |
| **UI Library** | Tailwind CSS + Headless UI | Latest | Utility‑first CSS, accessible primitives, low bundle size |
| **State Management** | React Query (TanStack Query) | Latest | Server state, caching, background updates; Zustand/Zustand for UI state if needed |
| **Form Handling** | React Hook Form + Zod | Latest | Minimal re‑renders, schema‑based validation |
| **Routing** | React Router v6 | Latest | Declarative routing, lazy loading |
| **WebSocket** | Socket.IO (client & server) | 4.x | Automatic reconnection, rooms, fallback to polling, Redis adapter for scaling |
| **State Sync (optional)** | Redis Pub/Sub via Socket.IO adapter | 7+ | Scale out Socket.IO across multiple nodes |
| **Database** | PostgreSQL | 15+ | Reliable, ACID, rich JSONB support, strong tooling |
| **ORM** | TypeORM (or MikroORM) | 0.3+ | TypeScript first, migrations, entities, relations |
| **Cache / Session Store** | Redis | 7+ | JWT refresh token store, WS adapter, API rate‑limiting cache |
| **Authentication** | JWT (access token 15 min, refresh token 7 days) + bcrypt | – | Stateless access, refresh token rotation, hashed storage |
| **Validation** | class‑validator / class‑transformer (backend) ; Zod (frontend) | – | Declarative DTO validation |
| **API Documentation** | Swagger/OpenAPI (@nestjs/swagger) | – | Auto‑generated UI, versioned |
| **Logging** | Winston (or pino) | – | Multiple transports, request‑ID correlation |
| **Testing** | Jest + TS‑Jest (unit) ; Supertest (API) ; Playwright (E2E) | – | Fast unit tests, contract tests, user‑flow validation |
| **Code Quality** | ESLint (with @typescript-eslint, react‑hooks) ; Prettier | – | Consistent style, auto‑format |
| **CI/CD** | GitHub Actions (or GitLab CI) | – | Lint, test, build Docker images, push to registry |
| **Containerization** | Docker | 24+ | Multi‑stage builds, non‑root user |
| **Orchestration (optional)** | Kubernetes (via Helm) or Docker‑Compose (dev) | – | Horizontal scaling, service discovery |
| **Observability** | Prometheus + Grafana (metrics) ; Loki or Elasticsearch (logs) ; Jaeger (tracing optional) | – | Observability stack |
| **Feature Flags** | LaunchDarkly / Unleash / custom config‑based | – | Gradual rollouts, kill switches |
| **Secrets Management** | AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault | – | No secrets in repo |
| **Static Asset Hosting** | CDN (CloudFront / Cloudflare) | – | Fast delivery of JS/CSS/images |
| **Domain & DNS** | Route 53 / Cloud DNS | – | Managed DNS, health checks |
| **SSL/TLS** | Let's Encrypt (cert‑manager) or cloud provider LB | – | Automated renewal |
| **CI Artifact Storage** | GitHub Packages / Docker Hub / GitLab Container Registry | – | Immutable image tags |
| **Monitoring & Alerting** | Prometheus Alertmanager ; PagerDuty / Opsgenie integration | – | Incident response |
| **Backup & DR** | Automated daily pg_dump / snapshots ; point‑in‑time recovery test quarterly | – | Data safety |
<!-- Keep the table concise; adjust versions as needed at project start -->


### Development Setup

1. **Clone repo**
   ```bash
   git clone <repo-url>
   cd tournament-platform
   ```
2. **Environment**
   - Create `.env` files for backend (`backend/.env`) and frontend (`.env.local` or `.env[.development]`).
   - Example variables: `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`, `REDIS_URL`, `JWT_SECRET`, `REFRESH_SECRET`.
3. **Install dependencies**
   ```bash
   # backend
   cd backend
   npm ci

   # frontend
   cd ../frontend
   npm ci
   ```
4. **Run migrations**
   ```bash
   npm run migration:run   # (or npm run typeorm migration:run)
   ```
5. **Start services**
   ```bash
   # backend (watch mode)
   npm run start:dev

   # frontend (dev server)
   npm run dev
   ```
6. **Run tests**
   ```bash
   # backend
   npm run test

   # frontend
   npm test
   ```
7. **Lint & format**
   ```bash
   npm run lint
   npm run format
   ```

### Production Deployment (Docker‑Compose example)

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${PG_USER}
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: ${PG_DATABASE}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning
    restart: unless-stopped

  api:
    build: ./backend
    env_file: .env
    depends_on:
      - postgres
      - redis
    ports:
      - "4000:4000"
    restart: unless-stopped

  web:
    build: ./frontend
    env_file: .env
    ports:
      - "3000:3000"
    restart: unless-stopped

volumes:
  pgdata:
```

*For Kubernetes, replace the above with a Helm chart; each service becomes a Deployment with appropriate Service, ConfigMap, and Secret resources.*

### Versioning Policy

- **API**: Increment major version (`/api/v2/...`) on breaking changes; minor version for backward‑compatible additions; patch for bug fixes.
- **Frontend**: Use semantic versioning for releases (`vX.Y.Z`); tag each production release.
- **Docker Images**: Tag with `git sha` and `semver` (e.g., `myorg/tournament-api:v1.2.3‑abcdef1`).

### Compliance & Security

- **OWASP Top 10**: Mitigated via helmet, input validation, parameterized queries, secure headers, CSP, and regular dependency scanning.
- **GDPR**: Provide data‑export and deletion endpoints; store personal data encrypted at rest (pgcrypto) if required.
- **Accessibility**: Aim for WCAG 2.1 AA; run axe‑core in CI; manual screen‑reader testing each sprint.

---

*This document captures the agreed‑upon technology stack as of **2026‑07‑11**. Adjust version numbers or swap components only after a formal Architecture Decision Record (ADR) review.*