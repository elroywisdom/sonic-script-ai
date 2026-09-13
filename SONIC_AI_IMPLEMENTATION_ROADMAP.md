# Sonic AI — Implementation Roadmap & Migration Guide

> **Document Status:** Active Planning Document  
> **Purpose:** Step-by-step engineering roadmap to transition SonicScript AI from a single-page transcription utility into the scalable, project-centric **Sonic AI Multi-Modal Studio**.

---

## Phase 1: Data Model, Projects & Credit Infrastructure (Weeks 1–3)

### Goal
Establish PostgreSQL persistence, User/Workspace authentication, Project management, and the Fintech-grade Credit Ledger.

### Deliverables
1. **Database Schema Deployment:**
   - Initialize PostgreSQL 16 database.
   - Deploy Ent ORM (or Prisma/Drizzle) schemas: `Users`, `Workspaces`, `Projects`, `MediaAssets`, `CreditWallets`, `CreditTransactions`, `PipelineJobs`.
2. **Authentication & Multi-Tenancy:**
   - Implement JWT authentication with token types (`auth`, `admin`).
   - Automatically create a default Personal Workspace and a Credit Wallet with 50 free starter credits upon registration.
3. **Project Management Core:**
   - Implement `/api/v1/projects` endpoints: Create, List, View, Delete projects.
   - Allow setting project type (`speech_transcription`, `viral_shorts`, `generative_film`, `mixed_media`).
4. **Credit Ledger Engine:**
   - Atomic credit reservation and deduction logic (`SELECT FOR UPDATE` + immutable transaction log).
   - Stripe / Paystack credit top-up checkout with signed webhook handling.
5. **Frontend Workspace Integration:**
   - Add Project Dashboard (Project Grid, "New Project" modal, Credit balance pill in header).

---

## Phase 2: Decoupled Backend & Queue Architecture (Weeks 3–5)

### Goal
Move away from Vercel's 4.5MB payload and 60-second execution limits by establishing the Docker/Coolify worker pipeline.

### Deliverables
1. **Containerized API & Worker Setup:**
   - Multi-stage Dockerfile for the API server (Go Fiber or Node Fastify).
   - Worker Dockerfile with FFmpeg pre-installed for media manipulation.
   - Redis 7 cluster deployment with Asynq / BullMQ.
2. **Direct Storage Pipeline:**
   - Cloudflare R2 presigned PUT URLs for zero-memory upload bottlenecks.
   - Retain client-side Web Audio extraction for ultra-fast audio uploads.
3. **Asynchronous Transcription & Refinement:**
   - Refactor `app/api/transcribe` and `app/api/refine` from synchronous serverless routes into queued background jobs.
   - Implement Server-Sent Events (SSE) `/api/v1/projects/:id/events` for real-time live progress in the frontend.

---

## Phase 3: Viral Shorts & Reel Studio (Weeks 5–8)

### Goal
Empower creators to turn long videos/podcasts into 9:16 vertical viral shorts with kinetic subtitles.

### Deliverables
1. **AI Highlight & Hook Detection Engine:**
   - LLM analyzes full transcript, timing, sentiment, and speaker turns to identify 30–60 second viral segments.
2. **Video Audio-Visual Re-Framing:**
   - FFmpeg cropping pipeline (16:9 landscape to 9:16 portrait).
   - Speaker face-detection centering (or split-screen layout for 2-speaker podcasts).
3. **Kinetic Subtitle Renderer:**
   - Hormozi-style animated word-by-word highlighted captions.
   - Custom fonts, colors, stroke borders, and emoji insertion.
4. **Interactive Shorts Editor:**
   - Clip previewer in the project dashboard.
   - One-click export to 1080x1920 MP4 stored directly in Cloudflare R2.

---

## Phase 4: Generative Video & AI Filmmaking Studio (Weeks 8–12)

### Goal
Introduce prompt-to-film creation with pluggable state-of-the-art video generation models.

### Deliverables
1. **Pluggable Video Provider Adapters:**
   - Implement `VideoGenService` interface for:
     - Runway Gen-3 Alpha
     - Kling AI (1.5 / 2.0)
     - Luma Dream Machine
     - Open-source video generation models (Wan 2.1 / CogVideo).
2. **Script-to-Storyboard Director:**
   - Multi-scene storyboard generator (Script, shot descriptions, camera motion prompts).
3. **AI Voiceover & Soundscape Engine:**
   - ElevenLabs / Cartesia TTS integration for scene character dialogue.
   - Background score and ambient sound effect alignment.
4. **Timeline Assembler & Master Render:**
   - Automated FFmpeg timeline concatenation: scenes + voiceover + transitions = final master film.
