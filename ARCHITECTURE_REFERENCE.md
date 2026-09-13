# Getly Global API — Backend Architecture Reference

> **Purpose:** This document is a complete, agent-readable reference for how the Getly
> Global API backend is architected. Use this as the blueprint when building a new
> scalable Go backend from scratch. Every decision here is battle-tested and intentional.

---

## Table of Contents

1. [What Kind of Platform This Is](#1-what-kind-of-platform-this-is)
2. [Technology Stack](#2-technology-stack)
3. [Project Layout](#3-project-layout)
4. [Application Bootstrap](#4-application-bootstrap)
5. [The App Dependency Container](#5-the-app-dependency-container)
6. [The 4-Layer Architecture](#6-the-4-layer-architecture)
7. [The Golden Rule — What Goes Where](#7-the-golden-rule--what-goes-where)
8. [Feature Folder Structure](#8-feature-folder-structure)
9. [Full Code Pattern — Layer by Layer](#9-full-code-pattern--layer-by-layer)
10. [Database — Ent ORM](#10-database--ent-orm)
11. [DB Schema Design Decisions](#11-db-schema-design-decisions)
12. [Redis Usage](#12-redis-usage)
13. [Authentication & JWT Strategy](#13-authentication--jwt-strategy)
14. [Middleware Stack](#14-middleware-stack)
15. [Event Bus & Notification System](#15-event-bus--notification-system)
16. [External Service Layer](#16-external-service-layer)
17. [API Surface Design](#17-api-surface-design)
18. [Error Handling Rules](#18-error-handling-rules)
19. [i18n & Localisation](#19-i18n--localisation)
20. [Hosting & Deployment](#20-hosting--deployment)
21. [Environment Variables](#21-environment-variables)
22. [Naming Conventions](#22-naming-conventions)
23. [Hard Rules — Never Break These](#23-hard-rules--never-break-these)

---

## 1. What Kind of Platform This Is

Getly Global API is a **fintech backend** built in Go. It serves two types of clients:

- **End users** (consumers) — auth, KYC, USDC wallets, payments, transfers
- **Admins** (back-office) — user management, integration config, account controls

It integrates with multiple external financial rails:
- **Circle** — USDC wallets and blockchain transfers
- **Sumsub** — KYC / identity verification
- **Stripe** — USD card issuance, payment links, payouts (planned branch)
- **Safe Haven MFB** — NGN bank sub-accounts, NGN card issuance, local transfers (planned)

The backend is intentionally split into two namespaced APIs sharing the same process:
- `/api/v1/*` — client-facing
- `/api/v1/admin/*` — admin panel
- `/api/v1/webhooks/*` — inbound provider callbacks

---

## 2. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Language** | Go 1.25 | Compiled, fast, excellent concurrency, strong stdlib |
| **HTTP Framework** | Fiber v2 (gofiber.io) | Express-like DX, built on fasthttp, very low overhead |
| **ORM** | Ent (entgo.io) | Type-safe schema-as-code, auto-migration, powerful query builder |
| **Database** | PostgreSQL 16 | Relational, ACID, excellent JSON support |
| **Cache** | Redis 7 | Session/token storage, rate-limit counters |
| **Auth** | JWT (golang-jwt/jwt/v5) | Stateless, typed token claims |
| **Email** | Resend (resend-go/v3) | Template-based transactional email |
| **KYC** | Sumsub (custom HTTP client) | Identity verification with webhook callbacks |
| **Wallets** | Circle USDC API (custom) | Programmable USDC wallets on-chain |
| **File Storage** | Cloudinary (cloudinary-go/v2) | Profile images, document uploads |
| **OAuth** | Google (golang.org/x/oauth2) | Social sign-in |
| **Validation** | go-playground/validator v10 | Struct-tag-based request validation |
| **Event Bus** | asaskevich/eventbus | In-process pub/sub for async side-effects |
| **i18n** | Custom locales/ + internal package | Multi-language error messages |
| **Live Reload** | Air (.air.toml) | Hot-reload in development |
| **Containerisation** | Docker + Docker Compose | Consistent environments |
| **Hosting** | Coolify (self-hosted) | Self-managed PaaS on a VPS |

---

## 3. Project Layout

```
getly-global-api/
├── main.go                        # Entry point — composition root only
├── go.mod / go.sum                # Module dependencies
├── Dockerfile                     # Multi-stage build (builder + alpine runtime)
├── .air.toml                      # Live reload config for development
├── .env.example                   # All env vars documented
├── countries.json / states.json   # Seed data loaded at startup
├── locales/                       # i18n translation files
│
├── docker-compose/
│   ├── docker-compose.dev.yml     # Coolify production-like stack
│   └── docker-compose.local.yml  # Minimal local dev stack
│
├── ent/                           # Generated ORM code (never edit manually)
│   ├── schema/                    # YOU EDIT THIS — entity definitions
│   │   ├── user.go
│   │   ├── wallet.go
│   │   └── ...                    # 32 entities total
│   ├── migrate/                   # Auto-generated migration runner
│   └── *.go                       # Generated client, query, mutation files
│
└── internal/
    ├── config/                    # Bootstrap: DB, Redis, Fiber, i18n wiring
    │   ├── app.go                 # Fiber + CORS + DB + Redis setup
    │   └── config.go              # InitApp() — returns server + App container
    ├── api_client/                # Client-facing API (/api/v1/*)
    │   ├── routes.go              # Registers all client route groups
    │   ├── auth/                  # Auth feature module
    │   ├── wallet/                # Wallet feature module
    │   └── reference/             # Reference data (countries, services)
    ├── api_admin/                 # Admin API (/api/v1/admin/*)
    │   ├── routes.go
    │   ├── auth/                  # Admin magic-link auth
    │   ├── accounts/              # User account management
    │   └── integrations/          # Provider/service/utility config
    ├── webhook/                   # Inbound webhooks (/api/v1/webhooks/*)
    ├── middleware/
    │   ├── jwt.go                 # JWT validation middleware
    │   ├── rate_limiter.go        # Rate limiting
    │   └── locale.go              # Accept-Language resolver
    ├── events/
    │   ├── bus.go                 # Event bus type alias
    │   └── event.go               # EventType constants + payload structs
    ├── notification/
    │   ├── notification.go        # NotificationService — subscribes to events
    │   ├── email_notification.go  # EmailNotifier interface + Resend impl
    │   └── real_time_notification.go # RealtimeNotifier interface (noop stub)
    ├── service/                   # External API wrappers
    │   ├── mail/resend/           # Resend email service
    │   ├── kyc/sumsub/            # Sumsub KYC service
    │   ├── usdc/                  # Circle USDC service
    │   └── files/                 # Cloudinary file service
    ├── shared/                    # Cross-cutting DB helpers
    │   ├── shared.go              # SharedService interface
    │   ├── shared_impl.go         # Constructor
    │   ├── magic_links.go         # Magic link token helpers
    │   ├── otps.go                # OTP create/verify/consume
    │   ├── refresh_tokens.go      # JWT refresh token rotation
    │   └── ent_errors.go          # Ent error → HTTP-friendly mapping
    ├── i18n/                      # Translation loader + Translator type
    ├── db/seeder/                 # Seed runner (super-admin, countries, etc.)
    └── utils/                     # Tracer, JWT signing/verify, validators
```

---

## 4. Application Bootstrap

`main.go` is **only a composition root** — it wires things together and starts the server. No logic lives there.

```go
func main() {
    server, app, closer := config.InitApp()

    client.InitializeApiRoutes(server, app)      // /api/v1/*
    admin.InitializeApiRoutes(server, app)        // /api/v1/admin/*
    webhook.InitializeWebhookRoutes(server, app)  // /api/v1/webhooks/*

    closer.Close()
    server.Listen(":" + port)
}
```

**`config.InitApp()`** does all the heavy lifting in order:

```
1. godotenv.Load()                  → load .env (skipped in production/development)
2. loggerConfig()                   → create file or stdout tracer
3. fiber.New()                      → create HTTP server
4. recover middleware               → catch panics, log stack trace
5. appConfigurations()              → apply CORS + request logger
6. databseConfigs()                 → ent.Open("postgres", DATABASE_URL)
                                       + client.Schema.Create()  — AUTO-MIGRATION
7. redisConfig()                    → redis.NewClient() + Ping()
8. i18n.New("locales")              → load translation files
9. events.NewBus()                  → create in-process event bus
10. shared.NewSharedService(db)     → cross-cutting DB helpers
11. resend.NewResendMailService()   → email provider (nil if no API key)
12. notification.NewNotificationService()
    notifier.RegisterListeners(bus) → subscribe to all events
13. seeder.Seed(ctx, db)            → seed super-admin + reference data
14. middleware.LocaleResolver()     → inject translator into request context
```

---

## 5. The App Dependency Container

The `App` struct is a **single shared dependency container** passed to every route registration function. It is created once at startup and never modified.

```go
type App struct {
    DB         *ent.Client          // Postgres via Ent ORM
    Redis      *redis.Client        // Redis cache/sessions
    Bus        events.Bus           // In-process event bus
    Tracer     utils.Tracer         // Structured logger
    Shared     shared.SharedService // Cross-cutting DB helpers
    Translator *i18n.Translator     // i18n translations
}
```

**Why this pattern?**
- Zero global variables — everything is explicitly injected
- Easy to test — swap any dependency with a mock
- All route groups only extract what they need from `App`

---

## 6. The 4-Layer Architecture

Every feature module follows exactly **four layers**. No layer may skip another.

```
HTTP Request
    ↓
┌─────────────────────────────────────────────────────────┐
│  HANDLER (delivery/http/handler/)                        │
│  • Parse request body                                    │
│  • Validate struct                                       │
│  • Extract userID from JWT context                       │
│  • Call use case                                         │
│  • Return JSON response                                  │
│  • Decide HTTP status codes                              │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  USE CASE (usecase/)                                     │
│  • All business logic lives here                         │
│  • Orchestrates repository + service calls               │
│  • Publishes events to the bus                           │
│  • Returns typed DTOs, never raw Ent entities            │
│  • Never references HTTP, net/http, or fiber             │
└──────────┬──────────────────────────┬───────────────────┘
           ↓                          ↓
┌──────────────────────┐   ┌──────────────────────────────┐
│  REPOSITORY           │   │  SERVICE                      │
│  (repository/)        │   │  (internal/service/...)       │
│  • Ent queries only   │   │  • External API calls only    │
│  • No logic           │   │  • No business logic          │
│  • Returns Ent types  │   │  • Returns typed result structs│
└──────────┬────────────┘   └──────────────┬───────────────┘
           ↓                               ↓
      PostgreSQL                   Circle / Sumsub /
      (via Ent ORM)                Stripe / Cloudinary
```

---

## 7. The Golden Rule — What Goes Where

| Thing | Where it lives | Never in |
|---|---|---|
| JSON body parsing | Handler | Use case, repository |
| HTTP status codes | Handler | Use case, repository |
| Request validation | Handler (via DTOs) | Use case, repository |
| userID extraction | Handler (from JWT c.Locals) | Request body |
| Business rules | Use case | Handler, repository |
| External API calls | Use case via Service layer | Handler, repository directly |
| DB queries | Repository | Handler, use case |
| External service calls | service/ only | Anywhere else |
| Validation tags | DTOs | Anywhere else |
| Event publishing | Use case | Handler, repository |
| Response shape | utils/responses.go | Inline in handlers |
| Error messages | Plain errors.New in use case | HTTP codes |

---

## 8. Feature Folder Structure

Every new feature gets exactly this folder structure — no more, no less:

```
internal/api_client/[feature]/
    delivery/
        http/
            handler/
                handler.go         ← interface ONLY (one method per route)
                handler_Impl.go    ← implementation
            routes.go              ← route registration + middleware
    dtos/
        dtos.go                    ← request + response structs
    repository/
        [entity]_repo.go           ← interface + input structs
        ent_[entity].go            ← Ent query implementation
    usecase/
        [feature].go               ← interface ONLY
        [feature]_impl.go          ← implementation
```

The `routes.go` at the feature level is responsible for:
1. Creating the repository
2. Creating the use case (injecting the repo)
3. Creating the handler (injecting the use case)
4. Registering routes with appropriate middleware

---

## 9. Full Code Pattern — Layer by Layer

### DTOs (`dtos/dtos.go`)

```go
// RegisterRequest — inbound payload for user registration
type RegisterRequest struct {
    Email    string `json:"email"    validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
    Name     string `json:"name"     validate:"required"`
}

// RegisterResponse — outbound to client after registration
type RegisterResponse struct {
    ID        string `json:"id"`
    Email     string `json:"email"`
    Token     string `json:"token"`
    CreatedAt string `json:"created_at"`
}
```

Rules:
- All JSON keys are snake_case
- Required fields always have `validate:"required"`
- Optional fields use `validate:"omitempty,..."`
- No business logic, no DB types, no Ent types in DTOs

---

### Use Case Interface (`usecase/auth.go`)

```go
type AuthUseCase interface {
    Register(ctx context.Context, req dtos.RegisterRequest) (*dtos.RegisterResponse, error)
    Login(ctx context.Context, req dtos.LoginRequest) (*dtos.LoginResponse, error)
    // One method per endpoint
}
```

---

### Use Case Implementation (`usecase/auth_impl.go`)

```go
type authUseCaseImpl struct {
    repo repository.UserRepository
    app  *config.App
    kyc  kyc.KYCService
}

func NewAuthUsecase(repo repository.UserRepository, app *config.App, kyc kyc.KYCService) AuthUseCase {
    return &authUseCaseImpl{repo: repo, app: app, kyc: kyc}
}

func (uc *authUseCaseImpl) Register(ctx context.Context, req dtos.RegisterRequest) (*dtos.RegisterResponse, error) {
    // 1. Precondition checks
    existing, _ := uc.repo.GetByEmail(ctx, req.Email)
    if existing != nil {
        return nil, errors.New("email already registered")
    }

    // 2. Business logic (hash password, generate OTP, etc.)
    hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return nil, errors.New("failed to process credentials")
    }

    // 3. Persist via repository
    user, err := uc.repo.Create(ctx, repository.CreateUserInput{
        Email:    req.Email,
        Password: string(hashed),
        Name:     req.Name,
    })
    if err != nil {
        return nil, errors.New("failed to create user")
    }

    // 4. Publish event — async, does not block response
    uc.app.Bus.Publish(string(events.EventUserCreated), events.UserCreatedPayload{
        Email: user.Email,
        Name:  req.Name,
        OTP:   generatedOTP,
    })

    // 5. Return DTO — NEVER return raw Ent entity
    return &dtos.RegisterResponse{
        ID:        user.ID.String(),
        Email:     user.Email,
        CreatedAt: user.CreatedAt.Format(time.RFC3339),
    }, nil
}
```

Rules:
- Return `(*ResponseDTO, error)` — never return raw Ent entities
- All errors are plain `errors.New("...")` — handler decides HTTP status
- Do not log inside use cases

---

### Repository Interface (`repository/user_repo.go`)

```go
// CreateUserInput — typed input for create operations (never pass raw DTOs to repo)
type CreateUserInput struct {
    Email    string
    Password string
    Name     string
}

type UserRepository interface {
    Create(ctx context.Context, input CreateUserInput) (*ent.User, error)
    GetByEmail(ctx context.Context, email string) (*ent.User, error)
    GetByID(ctx context.Context, id uuid.UUID) (*ent.User, error)
}
```

Rules:
- Input structs prevent DTOs leaking into the repository layer
- Methods return Ent types — never DTOs
- No business logic here, just DB operations

---

### Repository Implementation (`repository/ent_user.go`)

```go
type entUserRepo struct {
    client *ent.Client
}

func NewEntUserRepo(client *ent.Client) UserRepository {
    return &entUserRepo{client: client}
}

func (r *entUserRepo) Create(ctx context.Context, input CreateUserInput) (*ent.User, error) {
    return r.client.User.
        Create().
        SetEmail(input.Email).
        SetPassword(input.Password).
        Save(ctx)
}

func (r *entUserRepo) GetByEmail(ctx context.Context, email string) (*ent.User, error) {
    return r.client.User.
        Query().
        Where(user.Email(email)).
        Only(ctx)
}
```

No conditionals, no business rules — Ent queries only.

---

### Handler Interface (`delivery/http/handler/handler.go`)

```go
type AuthHandler interface {
    RegisterHandler(c *fiber.Ctx) error
    LoginHandler(c *fiber.Ctx) error
    // One method per route
}
```

---

### Handler Implementation (`delivery/http/handler/handler_Impl.go`)

```go
type authHandlerImpl struct {
    useCase usecase.AuthUseCase
}

func NewAuthHandler(uc usecase.AuthUseCase) AuthHandler {
    return &authHandlerImpl{useCase: uc}
}

func (h *authHandlerImpl) RegisterHandler(c *fiber.Ctx) error {
    // 1. Parse body
    var req dtos.RegisterRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid request body")
    }

    // 2. Validate
    if err := utils.ValidateStruct(req); err != nil {
        return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, err.Error())
    }

    // 3. Call use case
    result, err := h.useCase.Register(c.Context(), req)
    if err != nil {
        return utils.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
    }

    // 4. Respond
    return utils.SuccessResponse(c, fiber.StatusCreated, "registration successful", result)
}
```

Rules:
- Always extract userID from `c.Locals` — never from request body
- Always parse body before validating
- Never write business logic or DB calls here
- HTTP status codes are decided here, not in the use case

---

### Route Registration (`delivery/http/routes.go`)

```go
func RegisterAuthRoutes(router fiber.Router, app *config.App) {
    // Wire dependencies here — all in one place
    repo := repository.NewEntUserRepo(app.DB)
    kycService := sumsub.NewSumsubService()
    uc := usecase.NewAuthUsecase(repo, app, kycService)
    h := handler.NewAuthHandler(uc)

    group := router.Group("auth")

    // Public routes — rate-limited
    public := group.Group("/")
    public.Use(middleware.AuthRateLimiter())
    public.Post("register", h.RegisterHandler)
    public.Post("login", h.LoginHandler)

    // Protected routes — JWT required
    group.Post("set-profile", middleware.CheckJwtToken("auth"), h.SetProfileHandler)
    group.Post("set-passcode", middleware.CheckJwtToken("auth"), h.SetPasscodeHandler)
}
```

---

## 10. Database — Ent ORM

### Why Ent?
- **Schema as code** — define entities in Go, never write SQL migrations manually
- **Type-safe queries** — no raw strings, compiler catches type errors
- **Auto-migration** — `client.Schema.Create()` on startup handles all DDL
- **Code generation** — run `go generate ./ent` to regenerate after schema changes

### Schema Definition Pattern

```go
// ent/schema/user.go
type User struct {
    ent.Schema
}

func (User) Mixin() []ent.Mixin {
    return []ent.Mixin{
        TimeMixin{}, // adds created_at, updated_at to every entity
    }
}

func (User) Fields() []ent.Field {
    return []ent.Field{
        field.UUID("id", uuid.UUID{}).Default(uuid.New).Unique(),
        field.String("email").MaxLen(254).Unique(),
        field.String("password").Sensitive(), // masked in Ent logs
        field.Enum("status").Values("active", "suspended", "pending").Default("pending"),
    }
}

func (User) Edges() []ent.Edge {
    return []ent.Edge{
        edge.To("profile", UserProfile.Type).Unique(), // One-to-One
        edge.To("wallets", Wallet.Type),               // One-to-Many
        edge.To("refresh_tokens", RefreshToken.Type),
    }
}
```

### TimeMixin — Used on All Entities

```go
// ent/schema/time_mixin.go
type TimeMixin struct {
    mixin.Schema
}

func (TimeMixin) Fields() []ent.Field {
    return []ent.Field{
        field.Time("created_at").Default(time.Now).Immutable(),
        field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
    }
}
```

### Auto-Migration on Startup

```go
// config/app.go — runs every time the server starts
if err := client.Schema.Create(
    context.Background(),
    migrate.WithDropIndex(true),
); err != nil {
    log.Fatalf("failed creating schema resources: %v", err)
}
```

> `WithDropIndex(true)` drops and recreates indexes on startup. Safe for development.
> In production, consider using Atlas migrations (Ent's migration versioning tool).

### Querying with Ent

```go
// Create
user, err := client.User.Create().
    SetEmail("user@example.com").
    SetPassword(hashedPwd).
    Save(ctx)

// Read one (errors if 0 or more than 1 result)
user, err := client.User.Query().
    Where(user.Email("user@example.com")).
    Only(ctx)

// Read with eager-loaded edges
user, err := client.User.Query().
    Where(user.ID(id)).
    WithProfile().
    WithWallets().
    Only(ctx)

// Update
err = client.User.UpdateOne(user).
    SetStatus("suspended").
    Exec(ctx)

// Ent-specific error checks
if ent.IsNotFound(err) {
    return nil, errors.New("user not found")
}
if ent.IsConstraintError(err) {
    return nil, errors.New("duplicate entry")
}
```

---

## 11. DB Schema Design Decisions

| Decision | Rule |
|---|---|
| All IDs | UUIDs (github.com/google/uuid) — never auto-increment integers |
| All timestamps | Via TimeMixin — always created_at + updated_at |
| All entities | Use mixins for shared fields — never copy-paste fields |
| State machine | A dedicated status or step field — one source of truth |
| External refs | Always store provider-returned IDs (sumsub_applicant_id, circle_wallet_id, etc.) |
| Sensitive fields | Mark with .Sensitive() — masked in Ent logs |
| Reference data | Countries, states, services are seeded once — read-only at runtime |

---

## 12. Redis Usage

Redis is used for:

| Use Case | Key Pattern | TTL |
|---|---|---|
| Rate limiting (auth routes) | rate_limit:{ip}:{endpoint} | Rolling window |
| OTP / verification tokens | Via DB (user_otp table) | Set on record |
| Refresh token store | Via DB (refresh_token table) | Set on record |
| Session caching (future) | session:{user_id} | Configurable |

Redis connection is established on startup and **pinged** to confirm availability. If it fails, the server refuses to start.

```go
client := redis.NewClient(&redis.Options{
    Addr:     os.Getenv("REDIS_URL"),
    Password: os.Getenv("REDIS_PASSWORD"),
    DB:       0,
})
if err := client.Ping(ctx).Err(); err != nil {
    log.Fatalf("Failed connecting to Redis: %v", err)
}
```

---

## 13. Authentication & JWT Strategy

### Token Type System

JWTs carry a `token_type` claim that controls access to different route groups:

| Token Type | Issued When | Unlocks |
|---|---|---|
| `auth` | After successful login | Standard authenticated user routes |
| `user_kyc` | After email verified, before KYC complete | KYC session creation and check |
| `user_rejected` | When KYC is rejected | Allow KYC re-attempt |
| `admin` | Admin magic-link sign-in | All /api/v1/admin/* routes |

### JWT Middleware

```go
// Single type check
middleware.CheckJwtToken("auth")

// Accept any of multiple types
middleware.CheckJwtTokenAny("user_kyc", "user_rejected")
```

The middleware:
1. Reads `Authorization: Bearer <token>` header
2. Verifies signature and expiry
3. Checks `token_type` claim matches required type(s)
4. Injects claims into `c.Locals("user", claims)`

Handlers extract the user ID from context — never from the request body:
```go
claims := c.Locals("user").(map[string]interface{})
userID := claims["user_id"].(string)
```

### Admin Auth — Magic Links

Admins do not use passwords. They authenticate via **email magic links**:
1. Admin requests link → system generates a time-limited signed token
2. Email sent with link → admin clicks → token validated → `admin` JWT issued

This keeps admin credentials off the internet entirely.

---

## 14. Middleware Stack

Applied in this exact order per request:

```
1. Recover         → panic → log stack trace → 500 (never crash process)
2. CORS            → whitelist allowed origins, allow credentials
3. Logger          → log every request (method, path, status, latency)
4. LocaleResolver  → read Accept-Language → inject Translator into ctx.Locals("t")
5. Rate Limiter    → applied per-group (public auth routes only)
6. JWT Middleware  → applied per-group (all protected routes)
```

### Rate Limiter

```go
func AuthRateLimiter() fiber.Handler {
    return limiter.New(limiter.Config{
        Max:        10,              // 10 requests
        Expiration: 1 * time.Minute, // per minute
        KeyGenerator: func(c *fiber.Ctx) string {
            return c.IP()            // keyed per client IP
        },
    })
}
```

### Locale Middleware

```go
func LocaleResolver(translator *i18n.Translator) fiber.Handler {
    return func(c *fiber.Ctx) error {
        lang := c.Get("Accept-Language", "en")
        t := translator.ForLocale(lang)
        c.Locals("t", t)
        return c.Next()
    }
}
```

---

## 15. Event Bus & Notification System

### Why an Event Bus?

Decouples side-effects (emails, notifications) from business logic. The use case publishes an event and returns immediately — it does not wait for the email to send.

```
Use Case → bus.Publish("user.created", payload)
                    ↓  (async, same process)
         NotificationService.onUserCreated()
                    ↓
           email.Send(to, payload, template)
                    ↓
              Resend API call
```

### Defining Events

```go
// internal/events/event.go
type EventType string

const (
    EventUserCreated          EventType = "user.created"
    EventPasswordReset        EventType = "password.reset"
    EventAdminCreated         EventType = "admin.created"
    EventPasscodeReset        EventType = "passcode.reset"
    EventUserAccountSuspended EventType = "user.account_suspended"
)

// Each event has a typed payload struct
type UserCreatedPayload struct {
    Email string `json:"email"`
    Name  string `json:"name"`
    OTP   string `json:"otp"`
}
```

### Notification Service

```go
// internal/notification/notification.go
type NotificationService struct {
    email    EmailNotifier     // Resend or Noop
    realtime RealtimeNotifier  // WebSocket stub (not yet implemented)
}

func (n *NotificationService) RegisterListeners(bus eventbus.Bus) {
    bus.Subscribe(string(events.EventUserCreated), n.onUserCreated)
    bus.Subscribe(string(events.EventPasswordReset), n.onPasswordReset)
    // ... all events
}

func (n *NotificationService) onUserCreated(payload events.UserCreatedPayload) {
    n.email.Send(payload.Email, payload, events.EventUserCreated)
}
```

### Graceful Noop Pattern

If `RESEND_API_KEY` is not set, the system uses a `NoopEmailNotifier` so the server starts without crashing:

```go
if mailService != nil {
    emailNotifier = notification.NewResendEmailNotifier(mailService)
} else {
    emailNotifier = notification.NoopEmailNotifier{} // silent no-op
}
```

---

## 16. External Service Layer

### The Rule

External APIs are **only called from `internal/service/`**. Never from handlers or repositories.

### Service Interface Pattern

```go
// internal/service/kyc/sumsub/sumsub.go
type KYCService interface {
    CreateApplicant(ctx context.Context, input CreateApplicantInput) (*ApplicantResult, error)
    GetApplicantStatus(ctx context.Context, applicantID string) (*StatusResult, error)
    GenerateAccessToken(ctx context.Context, applicantID string) (*TokenResult, error)
}
```

### Service Rules

1. Services return **typed result structs** — never `map[string]interface{}` or raw HTTP responses
2. Services return `(result, error)` — never swallow errors
3. If a provider returns a reference ID, always include it in the result struct
4. Services never call each other — only use cases orchestrate across services
5. Email methods are fire-and-forget — use cases do not block on email delivery

### Service Integrations (Current + Planned)

| Service File | External Provider | Handles |
|---|---|---|
| service/kyc/sumsub/ | Sumsub | KYC identity verification + SDK sessions |
| service/usdc/ | Circle API | USDC wallet creation, transfers, balance |
| service/mail/resend/ | Resend | Transactional email delivery |
| service/files/ | Cloudinary | File/image upload + URL generation |
| service/stripe.go (planned) | Stripe Connect | USD cards, payouts, payment links |
| service/sudo.go (planned) | Safe Haven MFB | NGN sub-accounts, NGN cards, transfers |

### Multi-Rail Pattern (Stripe USD + Safe Haven NGN)

When building a dual-currency platform:

```
Operation          Rail          Service File
USD card issuance  → Stripe     → service/stripe.go
NGN card issuance  → Safe Haven → service/sudo.go
USD payouts        → Stripe     → service/stripe.go
NGN transfers      → Safe Haven → service/sudo.go
KYB (BVN/NIN)      → Safe Haven → service/sudo.go
USD payment links  → Stripe     → service/stripe.go
NGN checkout       → Safe Haven → service/sudo.go
```

Never cross the rails. USD operations go through Stripe. NGN operations go through Safe Haven.

---

## 17. API Surface Design

### URL Structure

```
/api/v1/                         ← client API version prefix
/api/v1/auth/register            ← kebab-case paths
/api/v1/wallet/create            ← noun-first, action-second
/api/v1/admin/                   ← admin namespace
/api/v1/admin/auth/              ← namespaced sub-groups
/api/v1/admin/integrations/      ← protected by admin JWT
/api/v1/webhooks/                ← inbound provider callbacks
```

### Health Checks

Each API group has its own health check:
```
GET /api/v1/health-check         → "V1 Server is running!..."
GET /api/v1/admin/health-check   → "Admin server is running!..."
```

### Unified Response Shape

All responses use a unified shape via `utils/responses.go`. Never write inline `c.JSON(...)` with a custom shape.

```json
// Success
{
  "success": true,
  "message": "registration successful",
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "email already registered"
}
```

---

## 18. Error Handling Rules

```go
// Use case — plain English, no HTTP context
return nil, errors.New("email already registered")

// With wrapping for external service failures
return nil, fmt.Errorf("circle wallet creation failed: %w", err)

// Handler — maps errors to HTTP status codes
result, err := h.useCase.Register(c.Context(), req)
if err != nil {
    return utils.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
}

// Repository — check Ent-specific errors
if ent.IsNotFound(err) {
    return nil, errors.New("record not found")
}
if ent.IsConstraintError(err) {
    return nil, errors.New("duplicate entry")
}
```

Never:
- Swallow errors silently (log and return nil)
- Expose raw provider error messages to clients
- Return zero-value structs with nil errors

---

## 19. i18n & Localisation

All user-facing strings (especially middleware error messages) are translatable.

```
locales/
    en.json
    fr.json
    ...
```

```go
// Translator injected by LocaleResolver middleware
t := c.Locals("t").(*i18n.Translator)
message := t.T("middleware.missing_auth_header")
// → "Authorization header is missing"
```

Use cases return plain English strings. Translation happens only at the handler/middleware boundary.

---

## 20. Hosting & Deployment

### Local Development

```bash
# 1. Copy and fill env vars
cp .env.example .env

# 2. Start Postgres + Redis via Docker
docker-compose -f docker-compose/docker-compose.local.yml up -d

# 3. Run with live reload
air

# 4. Or run directly
go run main.go
# Serves on :3333 by default
```

The server **auto-migrates the database schema** on every startup — no separate migration command needed in development.

### Production — Self-Hosted via Coolify

The entire stack runs as Docker containers on a **VPS managed by Coolify** (self-hosted PaaS):

```yaml
# docker-compose/docker-compose.dev.yml
services:
  backend:
    build:
      context: ${COOLIFY_SOURCE_DIR:-.}  # Coolify injects source dir
      dockerfile: Dockerfile
  getly_global_dev_db:
    image: postgres:16
    volumes:
      - getly_global_db_dev_data:/var/lib/postgresql/data  # persistent disk
  getly_global_dev_redis:
    image: redis:7-alpine
```

- All secrets are set as environment variables in the Coolify dashboard
- PostgreSQL data persists in named Docker volumes on the VPS disk
- The API binary is compiled inside Docker (multi-stage) — tiny final Alpine image

### Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Build
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o main ./main.go

# Stage 2: Runtime (tiny image — no Go toolchain)
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/locales ./locales/
CMD ["./main"]
```

---

## 21. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ENVIRONMENT` | Yes | `local` / `development` / `production` |
| `INTERNAL_PORT` | No | Server port, defaults to `3333` |
| `DATABASE_URL` | Yes | `postgres://user:pass@host:5432/dbname?sslmode=disable` |
| `REDIS_URL` | Yes | `localhost:6379` |
| `REDIS_PASSWORD` | No | Redis password |
| `JWT_SECRET` | Yes | Secret for signing all JWTs |
| `ADMIN_EMAIL` | No | Super-admin email for seeder |
| `ADMIN_URL` | No | Admin frontend URL (for magic link emails) |
| `SUMSUB_APP_TOKEN` | No | Sumsub app token |
| `SUMSUB_SECRET_KEY` | No | Sumsub secret key |
| `SUMSUB_API_URL` | No | Sumsub base URL |
| `CIRCLE_API_KEY` | No | Circle API key |
| `CIRCLE_API_URL` | No | Circle base URL |
| `CIRCLE_ENTITY_SECRET` | No | Hex-encoded entity secret |
| `CIRCLE_BLOCKCHAIN_NETWORK` | No | e.g. `ARC-TESTNET` |
| `RESEND_API_KEY` | No | Resend key (email disabled if absent) |
| `MAIL_FROM` | No | From address for outgoing emails |
| `CLOUDINARY_URL` | No | `cloudinary://key:secret@cloud_name` |

---

## 22. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| JSON keys | snake_case | "first_name", "created_at" |
| Route paths | kebab-case | /set-profile, /verify-email |
| Go structs | PascalCase | UserCreatedPayload |
| Go variables | camelCase | authHandler, userRepo |
| Constructor functions | New[Thing] | NewAuthHandler(...) |
| Interface files | [feature].go / handler.go | auth.go, handler.go |
| Implementation files | [feature]_impl.go / handler_Impl.go | auth_impl.go |
| Ent query files | ent_[entity].go | ent_user.go |
| Repository interfaces | [Entity]Repository | UserRepository |
| Use case interfaces | [Feature]UseCase | AuthUseCase |

---

## 23. Hard Rules — Never Break These

1. **Never use raw SQL.** All DB operations go through the Ent client.
2. **Never return raw Ent types from use case to handler.** Map to DTOs first.
3. **Never call external APIs from handlers or repositories.** Only from use cases via the service layer.
4. **userID always comes from JWT context** (`c.Locals`), never from the request body.
5. **HTTP status codes are decided by handlers** — use cases return `(*DTO, error)` only.
6. **All responses go through `utils/responses.go`** — never write inline `c.JSON(...)`.
7. **Always parse body before validating. Always validate before calling the use case.**
8. **Never swallow errors.** If something fails, return it up the call stack.
9. **Always store provider-returned reference IDs** (Stripe account ID, Sumsub applicant ID, Circle wallet ID).
10. **Public routes get rate limiting. Protected routes get JWT middleware at group level**, not per-handler.
11. **Never add new external dependencies** to `go.mod` without a deliberate decision.
12. **Every new feature gets exactly the 4-layer folder structure.** No shortcuts, no skip layers.

---

*Distilled from the Getly Global API source code and .context/ documentation.
Use as a blueprint — swap the external providers, keep the architecture.*
