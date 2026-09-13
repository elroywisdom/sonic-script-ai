# Sonic AI — System Architecture & Technical Specification

> **Document Status:** Active / Source of Truth  
> **Target Audience:** Backend Engineers, Full-Stack Developers, DevOps, AI Engineers  
> **Related Document:** [SONIC_AI_CONCEPT_NOTE.md](file:///Users/user/Library/Mobile%20Documents/com~apple~CloudDocs/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/sonic-script/SONIC_AI_CONCEPT_NOTE.md)

---

## 1. System Topology & Infrastructure Overview

Sonic AI moves beyond serverless runtime limitations (Vercel’s 4.5MB payload cap and 60-second function timeout) by adopting a **hybrid decoupled architecture**:

- **Frontend / Client Experience:** Next.js 14 (React 18, Tailwind CSS, Web Audio API, IndexedDB caching).
- **Core Application API:** High-throughput Go (Fiber v2) or Node (Fastify), built on a 4-Layer Clean Architecture.
- **Data Persistence:** PostgreSQL 16 managed via Ent ORM (or Drizzle/Prisma) with automated schema-as-code migrations.
- **Caching & Job Queue:** Redis 7 powering atomic rate-limiting, job queuing (via `hibiken/asynq` or `BullMQ`), and pub/sub.
- **Media Object Storage:** Cloudflare R2 (S3-compatible, zero egress fees) for raw videos, audio chunks, thumbnails, and rendered MP4 files.
- **Heavy Media & AI Workers:** Dedicated background worker nodes running FFmpeg, Remotion, and AI orchestrators.
- **Deployment & Hosting:** Self-hosted via **Coolify** on a VPS (Hetzner / DigitalOcean / AWS EC2) containerized with Docker Compose.

```
                                  ┌───────────────────────────────┐
                                  │      Sonic AI Next.js UI      │
                                  │  (Web Audio Demux + Dashboards)│
                                  └───────────────┬───────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │ 1. Direct Presigned Upload (Chunks/Videos)      │ 2. REST / SSE (JWT Auth)
                         ▼                                                 ▼
          ┌───────────────────────────────┐               ┌─────────────────────────────────┐
          │     Cloudflare R2 Storage     │               │        Sonic AI Core API        │
          │   (Raw Media, Clips, Audio)   │               │   (Go Fiber / 4-Layer Arch)     │
          └──────────────┬────────────────┘               └────────────────┬────────────────┘
                         │                                                 │
                         │                                ┌────────────────┴────────────────┐
                         │                                ▼                                 ▼
                         │                 ┌─────────────────────────────┐   ┌─────────────────────────────┐
                         │                 │   PostgreSQL 16 (Ent ORM)   │   │       Redis 7 Cluster       │
                         │                 │  • Users & Workspaces       │   │  • Job Queue (Asynq/BullMQ) │
                         │                 │  • Projects & Assets        │   │  • Rate Limiting Counters   │
                         │                 │  • Credit Wallets & Ledger  │   │  • Real-time SSE Pub/Sub    │
                         │                 │  • Transcripts & Storyboards│   │  • Session Cache            │
                         │                 └──────────────┬──────────────┘   └──────────────┬──────────────┘
                         │                                │                                 │
                         │                                └────────────────┬────────────────┘
                         │                                                 │
                         │                                                 ▼ (Pulls Jobs)
                         │                                  ┌─────────────────────────────┐
                         │                                  │   Async Media & AI Worker   │
                         │                                  │        Pipeline Nodes       │
                         └──────────────────────────────────┤  • Groq Whisper STT         │
                                                            │  • LLM Refine & Scripts     │
                                                            │  • FFmpeg 9:16 Re-frame     │
                                                            │  • Runway / Kling / Luma    │
                                                            │  • ElevenLabs Voiceover     │
                                                            └─────────────────────────────┘
```

---

## 2. 4-Layer Clean Architecture

Borrowing directly from the proven Getly Global API blueprint, every feature inside the Sonic AI backend adheres strictly to the **4-Layer Architecture**. No layer may bypass another.

```
HTTP Request / Inbound Webhook
    ↓
┌─────────────────────────────────────────────────────────┐
│  1. HANDLER (delivery/http/handler/)                    │
│  • Parses JSON / Multipart request                      │
│  • Validates input structs using validator tags         │
│  • Extracts userID & workspaceID from JWT Locals        │
│  • Calls Use Case                                       │
│  • Returns uniform JSON response & HTTP status codes    │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. USE CASE (usecase/)                                 │
│  • All domain business logic & orchestration            │
│  • Enforces credit balance check & reservation          │
│  • Creates Job records & dispatches queue tasks         │
│  • Publishes domain events to the Event Bus             │
│  • Returns typed DTOs (never raw database entities)     │
└──────────┬──────────────────────────┬───────────────────┘
           ↓                          ↓
┌──────────────────────┐   ┌──────────────────────────────┐
│  3. REPOSITORY       │   │  4. SERVICE LAYER            │
│  (repository/)       │   │  (internal/service/...)      │
│  • Database queries  │   │  • External AI API clients   │
│  • Ent ORM methods   │   │  • Groq / DeepSeek / Claude  │
│  • Pure data access  │   │  • Runway / Kling / Luma     │
│  • ACID transactions │   │  • Stripe / Paystack rails   │
└──────────┬───────────┘   │  • Cloudflare R2 client      │
           ↓               └──────────────┬───────────────┘
     PostgreSQL 16                        ↓
     (Relational DB)            External SaaS / AI Models
```

### The Golden Rules of Separation

| Action                                            | Proper Layer                      | Forbidden In               |
| ------------------------------------------------- | --------------------------------- | -------------------------- |
| Request Body Parsing & HTTP Status Codes          | **Handler**                       | Use Case, Repository       |
| User Identity (`user_id`, `workspace_id`)         | **Extracted in Handler from JWT** | Request Body               |
| Credit Verification & Pre-Flight Holds            | **Use Case**                      | Handler, Repository        |
| Raw SQL / ORM Queries                             | **Repository**                    | Handler, Use Case          |
| Calling AI Provider APIs (Groq, Runway, Stripe)   | **Service Layer**                 | Handler, Use Case (direct) |
| Uniform Output Shape (`{ success, data, error }`) | **Handler** via responses helper  | Inline `c.JSON`            |

---

## 3. Database Schema Design (PostgreSQL + Ent ORM)

All entities inherit from `TimeMixin` (providing immutable `created_at` and auto-updated `updated_at`). All primary keys use `UUIDv4`.

```
               ┌────────────────┐
               │      User      │
               └───────┬────────┘
                       │ 1:N
                       ▼
               ┌────────────────┐          1:1          ┌────────────────┐
               │   Workspace    ├──────────────────────►│  CreditWallet  │
               └───────┬────────┘                       └───────┬────────┘
                       │ 1:N                                    │ 1:N
                       ▼                                        ▼
               ┌────────────────┐                       ┌───────────────────┐
               │    Project     │                       │ CreditTransaction │
               └───────┬────────┘                       └───────────────────┘
                       │
       ┌───────────────┼──────────────────────────────┐
       │ 1:N           │ 1:N                          │ 1:N
       ▼               ▼                              ▼
┌──────────────┐ ┌──────────────┐             ┌────────────────┐
│  MediaAsset  │ │ PipelineJob  │             │   Storyboard   │
└──────────────┘ └──────────────┘             └───────┬────────┘
                                                      │ 1:N
                                                      ▼
                                              ┌────────────────┐
                                              │   VideoScene   │
                                              └────────────────┘
```

### 3.1 Entity Definitions (Go Ent Schema Blueprint)

#### A. Workspace & User

```go
// ent/schema/workspace.go
type Workspace struct { ent.Schema }
func (Workspace) Fields() []ent.Field {
    return []ent.Field{
        field.UUID("id", uuid.UUID{}).Default(uuid.New).Unique(),
        field.String("name").NotEmpty(),
        field.String("slug").Unique(),
        field.Enum("plan").Values("free", "creator", "pro", "studio").Default("free"),
        field.UUID("owner_id", uuid.UUID{}),
    }
}
func (Workspace) Edges() []ent.Edge {
    return []ent.Edge{
        edge.To("projects", Project.Type),
        edge.To("wallet", CreditWallet.Type).Unique(),
        edge.From("members", User.Type).Ref("workspaces"),
    }
}
```

#### B. Projects (The Core Creative Root)

```go
// ent/schema/project.go
type Project struct { ent.Schema }
func (Project) Fields() []ent.Field {
    return []ent.Field{
        field.UUID("id", uuid.UUID{}).Default(uuid.New).Unique(),
        field.UUID("workspace_id", uuid.UUID{}),
        field.String("title").NotEmpty(),
        field.Text("description").Optional(),
        field.Enum("project_type").Values(
            "speech_transcription",
            "viral_shorts",
            "generative_film",
            "mixed_media",
        ).Default("speech_transcription"),
        field.String("aspect_ratio").Default("16:9"), // 16:9, 9:16, 1:1
        field.JSON("settings", map[string]interface{}{}).Optional(),
    }
}
func (Project) Edges() []ent.Edge {
    return []ent.Edge{
        edge.From("workspace", Workspace.Type).Ref("projects").Field("workspace_id").Unique().Required(),
        edge.To("assets", MediaAsset.Type),
        edge.To("jobs", PipelineJob.Type),
        edge.To("transcripts", Transcript.Type),
        edge.To("storyboards", Storyboard.Type),
        edge.To("reels", ReelClip.Type),
    }
}
```

#### C. Media Asset (Storage & Metadata)

```go
// ent/schema/media_asset.go
type MediaAsset struct { ent.Schema }
func (MediaAsset) Fields() []ent.Field {
    return []ent.Field{
        field.UUID("id", uuid.UUID{}).Default(uuid.New).Unique(),
        field.UUID("project_id", uuid.UUID{}),
        field.String("filename"),
        field.String("r2_key"),           // Cloudflare R2 Object Key
        field.String("storage_url"),       // CDN / Presigned URL
        field.Enum("asset_type").Values("video", "audio", "image", "subtitles"),
        field.Int64("size_bytes"),
        field.Float("duration_sec").Optional(),
        field.String("mime_type"),
        field.JSON("metadata", map[string]interface{}{}).Optional(),
    }
}
```

#### D. Credit Wallet & Immutable Ledger

```go
// ent/schema/credit_wallet.go
type CreditWallet struct { ent.Schema }
func (CreditWallet) Fields() []ent.Field {
    return []ent.Field{
        field.UUID("id", uuid.UUID{}).Default(uuid.New).Unique(),
        field.UUID("workspace_id", uuid.UUID{}).Unique(),
        field.Int64("balance_credits").Default(0), // Atomic integer
        field.Int64("reserved_credits").Default(0), // Hold for in-flight jobs
    }
}

// ent/schema/credit_transaction.go
type CreditTransaction struct { ent.Schema }
func (CreditTransaction) Fields() []ent.Field {
    return []ent.Field{
        field.UUID("id", uuid.UUID{}).Default(uuid.New).Unique(),
        field.UUID("wallet_id", uuid.UUID{}),
        field.Int64("amount"), // Positive for credits added, negative for deducted
        field.Enum("type").Values("purchase", "deduction", "refund", "grant", "bonus"),
        field.String("reason"),
        field.String("reference_id").Optional(), // Stripe checkout session, job_id, etc.
        field.String("idempotency_key").Unique(),
    }
}
```

#### E. Pipeline Jobs (Asynchronous Tracking)

```go
// ent/schema/pipeline_job.go
type PipelineJob struct { ent.Schema }
func (PipelineJob) Fields() []ent.Field {
    return []ent.Field{
        field.UUID("id", uuid.UUID{}).Default(uuid.New).Unique(),
        field.UUID("project_id", uuid.UUID{}),
        field.UUID("user_id", uuid.UUID{}),
        field.Enum("type").Values(
            "transcription",
            "transcript_polish",
            "social_repurpose",
            "reel_highlight_detect",
            "reel_render_burn",
            "video_gen_scene",
            "voice_synthesis",
            "film_final_render",
        ),
        field.Enum("status").Values("pending", "processing", "completed", "failed", "cancelled").Default("pending"),
        field.Int("progress_percent").Default(0),
        field.Int64("cost_credits").Default(0),
        field.String("model_provider").Optional(), // e.g. "groq", "runway", "kling", "deepseek"
        field.String("model_name").Optional(),     // e.g. "gen3a_turbo", "kling-1.5"
        field.JSON("input_payload", map[string]interface{}{}),
        field.JSON("output_payload", map[string]interface{}{}).Optional(),
        field.String("error_message").Optional(),
    }
}
```

---

## 4. The Pluggable Model Engine (Provider Pattern)

To allow adding video, audio, and language models seamlessly without modifying existing business logic, all external providers implement standardized interfaces.

### 4.1 Speech-to-Text Interface (`TranscriberService`)

```go
type TranscribeInput struct {
    AudioStream  io.Reader
    Filename     string
    Language     string
    Prompt       string
    OffsetSec    float64
}

type TranscribeResult struct {
    RawText      string
    Language     string
    DurationSec  float64
    Segments     []TranscriptSegment
    Provider     string
}

type TranscriberService interface {
    Transcribe(ctx context.Context, input TranscribeInput) (*TranscribeResult, error)
    ProviderName() string
}
```

_Adapters:_ `GroqWhisperService`, `DeepgramNovaService`, `OpenAIWhisperService`.

### 4.2 Large Language Model Interface (`LLMService`)

```go
type PromptMessage struct {
    Role    string `json:"role"` // system, user, assistant
    Content string `json:"content"`
}

type LLMCompletionInput struct {
    Messages       []PromptMessage
    Temperature    float64
    ResponseFormat string // "text" or "json"
}

type LLMService interface {
    Complete(ctx context.Context, input LLMCompletionInput) (string, error)
    ProviderName() string
}
```

_Adapters:_ `DeepSeekChatService`, `GroqLlamaService`, `AnthropicClaudeService`, `OpenAIGPTService`.

### 4.3 Generative Video Model Interface (`VideoGenService`)

```go
type VideoGenInput struct {
    Prompt            string
    NegativePrompt    string
    ReferenceImageURL string   // For Image-to-Video
    DurationSeconds   int      // 5s, 10s
    AspectRatio       string   // "16:9", "9:16", "1:1"
    CameraMotion      string   // pan_left, zoom_in, orbit
    Seed              int64
}

type VideoGenJobResult struct {
    ExternalJobID string
    Status        string // queued, rendering, ready, failed
    Progress      int
    VideoURL      string
    ErrorMessage  string
}

type VideoGenService interface {
    SubmitGeneration(ctx context.Context, input VideoGenInput) (*VideoGenJobResult, error)
    CheckStatus(ctx context.Context, externalJobID string) (*VideoGenJobResult, error)
    CancelGeneration(ctx context.Context, externalJobID string) error
    ProviderName() string
}
```

_Adapters:_ `RunwayGen3Service`, `KlingAIService`, `LumaDreamService`, `SoraService`, `OpenWanVideoService`.

### 4.4 Voice Synthesis Interface (`VoiceService`)

```go
type VoiceSynthesisInput struct {
    Text       string
    VoiceID    string
    Stability  float64
    Similarity float64
}

type VoiceService interface {
    Synthesize(ctx context.Context, input VoiceSynthesisInput) ([]byte, error)
    ProviderName() string
}
```

_Adapters:_ `ElevenLabsService`, `CartesiaService`, `OpenAITTSService`.

---

## 5. Async Task Orchestration & Worker Queue

Heavy tasks (transcribing 1-hour audio files, detecting viral video hooks, rendering 9:16 re-framed video with FFmpeg, and polling AI video generators) are never processed inside synchronous HTTP requests.

### 5.1 The Job Lifecycle

```
Client HTTP Request
       │
       ▼
[ Handler ] ── Validates request
       │
       ▼
[ UseCase ] ── 1. Atomic Check & Reserve Credits in Wallet
            ── 2. Inserts PipelineJob in DB (Status: "pending")
            ── 3. Enqueues Task to Redis (Asynq / BullMQ)
            ── 4. Returns immediate response: { job_id: "...", status: "pending" }
       │
       ▼
[ Redis Queue ] (Task: "video:generate" or "transcribe:audio")
       │
       ▼
[ Dedicated Worker Node ]
       │ ── Updates DB (Status: "processing", Progress: 10%)
       │ ── Broadcasts progress via Redis Pub/Sub ──► Client SSE / WebSocket
       │ ── Calls External AI Provider / Runs FFmpeg
       │ ── Uploads final output to Cloudflare R2
       │ ── On Success:
       │       • Commits credit reserve into CreditTransaction
       │       • Updates Job status = "completed"
       │       • Emits Event: "job.completed"
       │ ── On Failure:
       │       • Releases reserved credits back to user
       │       • Updates Job status = "failed" with error details
```

### 5.2 Real-time Progress Delivery (Server-Sent Events)

The client connects once to:
`GET /api/v1/projects/:id/events` (SSE Stream)
When any job updates its progress percentage in Redis, the SSE handler streams an instant JSON event to the frontend:

```json
{
  "event": "job_progress",
  "data": {
    "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "processing",
    "progress_percent": 65,
    "step_description": "Burning kinetic subtitles onto 9:16 clip..."
  }
}
```

---

## 6. Fintech-Grade Credit Ledger Implementation

To guarantee zero race conditions, double spending, or lost credits, Sonic AI applies **atomic database transactions**:

```go
func (uc *CreditUseCase) DeductCreditsAtomic(
    ctx context.Context,
    workspaceID uuid.UUID,
    amount int64,
    reason string,
    idempotencyKey string,
) error {
    tx, err := uc.db.Tx(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // 1. Check idempotency: Return nil if transaction already processed
    exists, _ := tx.CreditTransaction.Query().
        Where(credittransaction.IdempotencyKey(idempotencyKey)).
        Exist(ctx)
    if exists {
        return nil
    }

    // 2. Lock wallet row with SELECT FOR UPDATE
    wallet, err := tx.CreditWallet.Query().
        Where(creditwallet.WorkspaceID(workspaceID)).
        ForUpdate().
        Only(ctx)
    if err != nil {
        return fmt.Errorf("wallet not found: %w", err)
    }

    // 3. Verify sufficient balance
    if wallet.BalanceCredits < amount {
        return errors.New("insufficient credit balance")
    }

    // 4. Update wallet balance atomically
    _, err = tx.CreditWallet.UpdateOne(wallet).
        SetBalanceCredits(wallet.BalanceCredits - amount).
        Save(ctx)
    if err != nil {
        return err
    }

    // 5. Append immutable audit transaction
    _, err = tx.CreditTransaction.Create().
        SetWalletID(wallet.ID).
        SetAmount(-amount).
        SetType("deduction").
        SetReason(reason).
        SetIdempotencyKey(idempotencyKey).
        Save(ctx)
    if err != nil {
        return err
    }

    return tx.Commit()
}
```

---

## 7. Storage Architecture & Direct Ingestion Pipeline

To bypass server memory bottlenecks and handle 4K videos without crashing:

1. **Presigned Upload URLs:** The client requests a direct S3 presigned PUT URL from the backend (`GET /api/v1/projects/:id/upload-url?filename=clip.mp4`).
2. **Direct Browser Upload to R2:** The client uploads the file directly to Cloudflare R2 over HTTPS.
3. **Webhook / Completion Notification:** Once uploaded, the client posts `{ r2_key: "..." }` to trigger the processing pipeline.
4. **Zero Egress Fees:** Cloudflare R2 does not charge egress fees when workers download files for transcription or rendering.

---

## 8. Deployment Strategy (Coolify + Docker)

Sonic AI packages its backend, worker, database, and cache into lightweight, production-grade Docker containers orchestrated via Coolify.

### 8.1 Docker Compose Specification (`docker-compose.prod.yml`)

```yaml
version: "3.8"

services:
  sonic_api:
    build:
      context: .
      dockerfile: Dockerfile.api
    restart: always
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgres://postgres:${DB_PASSWORD}@sonic_postgres:5432/sonic_ai?sslmode=disable
      - REDIS_URL=sonic_redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - R2_BUCKET=${R2_BUCKET}
      - R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
      - R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
      - R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
    ports:
      - "8080:8080"
    depends_on:
      - sonic_postgres
      - sonic_redis

  sonic_worker:
    build:
      context: .
      dockerfile: Dockerfile.worker # Includes FFmpeg & multimedia libraries
    restart: always
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgres://postgres:${DB_PASSWORD}@sonic_postgres:5432/sonic_ai?sslmode=disable
      - REDIS_URL=sonic_redis:6379
      - GROQ_API_KEY=${GROQ_API_KEY}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - RUNWAY_API_KEY=${RUNWAY_API_KEY}
      - KLING_API_KEY=${KLING_API_KEY}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
    depends_on:
      - sonic_postgres
      - sonic_redis

  sonic_postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_DB=sonic_ai
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - sonic_pg_data:/var/lib/postgresql/data

  sonic_redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - sonic_redis_data:/data

volumes:
  sonic_pg_data:
  sonic_redis_data:
```

---

## 9. API Surface Specification

All endpoints are prefixed with `/api/v1/` and return the unified response contract:
`{ "success": true, "message": "...", "data": { ... } }`

### 9.1 Authentication & Workspace Routes

- `POST /api/v1/auth/register` — Register user & create default workspace + credit wallet
- `POST /api/v1/auth/login` — Login and receive JWT access/refresh tokens
- `GET  /api/v1/workspaces/current` — Get workspace metadata & credit balance
- `POST /api/v1/billing/checkout` — Generate Stripe / Paystack checkout session for credits
- `POST /api/v1/webhooks/stripe` — Inbound payment webhook (idempotent credit funding)

### 9.2 Project & Asset Routes

- `GET    /api/v1/projects` — List user projects (paginated, filterable by type)
- `POST   /api/v1/projects` — Create new project
- `GET    /api/v1/projects/:id` — Get project details, assets, transcripts, and outputs
- `DELETE /api/v1/projects/:id` — Delete project & cleanup R2 assets
- `POST   /api/v1/projects/:id/upload-url` — Get presigned Cloudflare R2 upload URL
- `POST   /api/v1/projects/:id/assets` — Register uploaded asset metadata

### 9.3 Speech & Transcription Engine

- `POST /api/v1/projects/:id/transcribe` — Submit audio/video for speech transcription
- `POST /api/v1/projects/:id/refine` — Generate polished script with timestamps & formatting
- `POST /api/v1/projects/:id/repurpose` — Generate social captions (X, LinkedIn, TikTok)
- `POST /api/v1/projects/:id/quiz` — Generate 5-question comprehension quiz

### 9.4 Viral Shorts & Reel Studio

- `POST /api/v1/projects/:id/shorts/detect-hooks` — AI highlight detection
- `POST /api/v1/projects/:id/shorts/render-clip` — Render 9:16 re-frame + kinetic captions
- `GET  /api/v1/projects/:id/shorts` — List generated clips

### 9.5 AI Video Filmmaking & Generative Studio

- `POST /api/v1/projects/:id/film/script-to-scenes` — LLM director generates scene list
- `POST /api/v1/projects/:id/film/generate-scene` — Generate video scene (Runway, Kling, Luma)
- `POST /api/v1/projects/:id/film/generate-voiceover` — Synthesize voice track
- `POST /api/v1/projects/:id/film/render-master` — Stitch scenes, transitions, and audio
- `GET  /api/v1/projects/:id/jobs/:job_id` — Check job status
- `GET  /api/v1/projects/:id/events` — Real-time Server-Sent Events (SSE) stream
