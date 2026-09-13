# Sonic AI — Concept Note & Product Source of Truth

> **Document Status:** Active / Source of Truth  
> **Target Audience:** Founding Team, Product Architects, Engineers, AI Model Integrators  
> **Classification:** Confidential & Strategic Blueprint  
> **Evolution:** From _SonicScript_ (audio utility) to _Sonic AI_ (comprehensive multi-modal AI media creation studio)

---

## Executive Summary

**Sonic AI** is a next-generation, project-centric **Multi-Modal AI Creative & Media Studio**.

While it began as **SonicScript**—an ultra-fast, client-side audio extraction and transcription engine—the strategic destiny of the platform is to serve as the unified operating system for modern digital creators, filmmakers, marketers, and educators.

Sonic AI bridges the gap between **raw media input** (video/audio recordings) and **high-impact creative output** (polished scripts, viral TikTok/Reels clips, educational quizzes, multi-platform captions, and full AI-generated video films).

To support this expansive vision without technical debt, Sonic AI adopts a **battle-tested, scalable system architecture** inspired by high-throughput, ACID-compliant fintech systems (modeled after the _Getly Global API_ blueprint). This guarantees:

1. **First-class Project Hierarchy:** Every asset, run, model prompt, and clip is organized in collaborative projects.
2. **Fintech-Grade Credit Ledger:** Usage, video generation compute, and transcription time are tracked via atomic, double-entry virtual credit wallets.
3. **Pluggable Model Architecture:** Zero-friction addition of new generative video models (Runway, Kling, Luma, Sora, Wan 2.1), speech models, and LLMs.
4. **Decoupled Asynchronous Processing:** Moving beyond serverless execution ceilings (eliminating 4.5MB payload caps and 60s timeouts) via a dedicated async pipeline engine.

---

## 1. Product Vision & Core Philosophy

### 1.1 The Market Opportunity

Modern content creation is fragmented:

- Creators record long podcasts, webinars, or footage.
- They bounce across 4 to 6 disparate tools: one for transcription, another for clipping shorts, another for generating AI B-roll or AI video scenes, another for writing social posts, and another for voiceovers.
- Existing tools charge separate expensive subscriptions and run on brittle, monolithic backends that break when processing large video files.

### 1.2 The Sonic AI Mission

**Sonic AI turns one creative seed into an entire multimedia universe.**
Whether the user starts with:

- **A raw video/audio file** (e.g., a 1-hour interview), OR
- **A text prompt / concept** (e.g., "A cinematic sci-fi trailer set in Neo-Tokyo"),

Sonic AI provides the end-to-end studio pipeline to analyze, transcribe, slice, reframe, animate, synthesize voices, and generate AI video scenes—all inside a single, unified workspace.

---

## 2. Core Pillars & Product Modules

```
                               ┌──────────────────────────────────────────────┐
                               │                 SONIC AI                     │
                               │        Unified Multi-Modal Studio            │
                               └──────────────────────┬───────────────────────┘
                                                      │
         ┌────────────────────────┬───────────────────┴────────────────┬────────────────────────┐
         ▼                        ▼                                    ▼                        ▼
  [ Pillar 1: Speech ]    [ Pillar 2: Shorts ]                 [ Pillar 3: AI Video ]   [ Pillar 4: Platform ]
  • Client-side Demux     • Highlight / Hook Detection         • Scene Scriptwriting    • Project Hierarchy
  • Groq Whisper STT      • 9:16 Smart Re-framing              • Pluggable Gen-Video    • Fintech Credit Ledger
  • LLM Transcript Polish • Kinetic Animated Subtitles         • Multi-Shot Storyboard  • Async Queue Workers
  • Social Repurposing    • Auto B-Roll & SFX                  • AI Voice Synthesis     • Self-Hosted Docker/VPS
```

### Pillar 1: Speech & Content Intelligence (SonicScript Core)

- **Zero-Egress Audio Demuxing:** Retain SonicScript’s signature client-side Web Audio API + mp4box pipeline. Users demux gigabytes of video directly in the browser, uploading only lightweight 16kHz audio chunks.
- **Ultra-Fast Speech Recognition:** High-throughput transcription via Groq Whisper (`whisper-large-v3`), Deepgram, or local Whisper models.
- **Contextual Transcript Refinement:** Cleaning filler words, correcting technical terms, inserting paragraph breaks and timestamps via LLMs.
- **Derivative Repurposing:** Instant generation of executive summaries, multi-platform social captions (Twitter/X threads, LinkedIn posts, Instagram captions), and automated 5-question comprehension quizzes.

### Pillar 2: Viral Short & Reel Studio (Automated Repurposing)

- **Viral Hook Detection:** AI analyzes speech transcripts, cadence, sentiment, and laughter/energy spikes to automatically identify 30–60 second high-retention segments.
- **Smart 9:16 Video Re-Framing:** Intelligent speaker tracking and dynamic crop from 16:9 landscape to 9:16 vertical.
- **Kinetic Karaoke Subtitles:** Hormozi-style animated word-by-word highlighted captions, custom fonts, emojis, and dynamic pop animations rendered onto the video.
- **B-Roll & Visual Enhancer:** Automated insertion of thematic imagery, AI-generated inserts, or sound effects (woosh, bell, pop) synced to key speech cues.

### Pillar 3: AI Video Filmmaking & Generative Video Studio

- **Prompt-to-Film Workflow:** Users can create original video productions from scratch.
- **Scene-by-Scene Storyboarding:** LLM generates script, character descriptions, shot lists, camera movements, and lighting prompts.
- **Pluggable Multi-Model Video Generation:**
  - _Text-to-Video (T2V)_ and _Image-to-Video (I2V)_.
  - Pluggable support for cutting-edge foundation models:
    - **Runway Gen-3 Alpha**
    - **Kling AI (1.5 / 2.0)**
    - **Luma Dream Machine**
    - **OpenAI Sora**
    - **Open-source weights:** Wan 2.1, Hunyuan Video, CogVideoX.
- **Voiceover & Audio Synthesis:** Seamless integration with ElevenLabs, Cartesia, and OpenAI TTS for character voices, multi-speaker dialogue, and automatic audio ducking with background scores.
- **Timeline & Render Stitcher:** Combining generated scenes, voiceovers, and transitions into downloadable 4K/1080p MP4 master files.

### Pillar 4: Infrastructure, Projects & Credit Economics

- **Multi-Tenant Workspaces & Projects:** Strict hierarchical organization for assets and outputs.
- **Virtual Credit Wallet System:** Atomic credit tracking modeled on double-entry financial accounting.
- **Queue-First Execution Engine:** Asynchronous distributed task workers that eliminate Vercel serverless timeouts and payload ceilings.

---

## 3. Project-Centric Organizational Hierarchy

In Sonic AI, no generation or transcript exists in isolation. Everything is organized under **Workspaces** and **Projects**.

```
[ User Account ]
  └── [ Workspace ] (Personal or Team)
        ├── [ Credit Wallet ] (Ledger, Transactions, Subscriptions)
        └── [ Projects ]
              ├── Project Metadata (Title, Description, Tags, Aspect Ratio)
              ├── Media Assets (Raw Videos, Audio, Reference Images, Brand Assets)
              ├── Transcripts & Derived Scripts (Raw STT, Cleaned, Translations)
              ├── Viral Clips / Reels (Highlight Timestamps, Subtitle Styles, Rendered MP4s)
              ├── AI Film Storyboards (Scenes, Prompts, Generated Video Clips, Voice Tracks)
              └── Generation Jobs / History (Status, Model Used, Cost in Credits, Logs)
```

### Entity Roles & Boundaries:

1. **Workspace:** The billing and collaboration root. Holds the team members and the shared Credit Wallet.
2. **Project:** The creative workspace. Examples:
   - _"The AI Revolution Podcast — Episode 12"_ (Speech & Shorts project)
   - _"Cyberpunk 2099 Short Film Trailer"_ (Generative Film project)
   - _"Q3 Product Launch Promo"_ (Mixed Media project)
3. **Asset:** An immutable media file stored in Cloudflare R2 with metadata (duration, resolution, audio channels, mime type).
4. **Job / Task:** An asynchronous execution instance (e.g., `JobType: TRANSCRIPTION`, `JobType: REEL_CLIP_RENDER`, `JobType: VIDEO_GEN_SCENE`).

---

## 4. Architectural Lessons Borrowed from Getly Global API

Although Getly is a financial remittance platform and Sonic AI is a media platform, the **system design principles required for scale, payments, and data integrity are identical**:

| Getly Architecture Pattern                                            | How Sonic AI Adapts It                                                                                                                                   |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4-Layer Architecture** (`Handler → UseCase → Repository → Service`) | Clean separation between HTTP delivery, core creative business logic, DB storage, and external AI providers.                                             |
| **Ent ORM + PostgreSQL** (Schema-as-Code)                             | Type-safe entity modeling with automated schema migrations for Projects, Assets, Jobs, and Credits.                                                      |
| **Decoupled Event Bus** (`internal/events`)                           | Emits events on job status updates (`job.created`, `transcription.completed`, `render.finished`), firing notifications and webhooks asynchronously.      |
| **Virtual Wallet & Ledger**                                           | Credits are treated with the exact same rigor as fiat/crypto currency: double-entry ledger, balance checks before job dispatch, idempotent deductions.   |
| **Service Layer Provider Abstraction**                                | External services (Groq, Runway, Kling, Stripe, Resend) are wrapped in strict Go interfaces; switching or adding AI models never touches business logic. |
| **Coolify / Docker Deployment**                                       | Escapes serverless limitations (Vercel’s 4.5MB request limit and 60s timeout), allowing long video demuxing, heavy rendering, and streaming webhooks.    |
| **JWT Token Types & Group Middleware**                                | Scoped access controls (`auth`, `admin`, `api_key`) with user ID extracted strictly from middleware context.                                             |

---

## 5. Extensibility Blueprint: The Pluggable Model Engine

To prevent the platform from being locked into a single AI provider or becoming obsolete as new models launch, Sonic AI implements a **Provider Adapter Strategy**.

```
                           ┌───────────────────────────────┐
                           │      Sonic AI Pipeline Core   │
                           └──────────────┬────────────────┘
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          ▼                               ▼                               ▼
┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
│ TranscriberEngine │           │   LLMEngine       │           │  VideoGenEngine   │
│ (Interface)       │           │   (Interface)     │           │  (Interface)      │
└─────────┬─────────┘           └─────────┬─────────┘           └─────────┬─────────┘
          │                               │                               │
   ┌──────┴──────┐                 ┌──────┴──────┐                 ┌──────┴──────┐
   ▼             ▼                 ▼             ▼                 ▼             ▼
[ Groq ]    [ Deepgram ]      [ DeepSeek ]  [ Anthropic ]     [ Runway ]    [ Kling ]
[Whisper]   [ Nova-2 ]        [ Chat ]      [ Claude 3.5]     [ Gen-3 ]     [ 1.5 ]
                                                                   ▼             ▼
                                                              [ Luma Dream ] [ Open Sora/Wan ]
```

### The Rule of Model Agnosticism:

1. **Unified Inputs and Outputs:** Every model category implements a standard Go interface. For example, `VideoGenEngine` accepts a standardized `VideoGenRequest{ Prompt, AspectRatio, DurationSec, ReferenceImageURL }` and returns a `VideoGenResponse{ RemoteURL, Seed, ProviderRefID }`.
2. **Dynamic Model Routing:** Admins or users can select their preferred model in the UI (e.g., _"Generate Scene with Kling 1.5"_ vs _"Generate Scene with Runway Gen-3"_). The use case resolves the corresponding adapter at runtime via a Model Registry.
3. **Graceful Fallbacks:** If a provider experiences rate limits or downtime (HTTP 429 / 503), the engine automatically cascades to the configured backup provider.

---

## 6. Credit Economics & Virtual Currency Ledger

To monetize sustainably while offering self-serve flexibility, Sonic AI implements a **Credit-based Resource Model**:

### 6.1 Resource Cost Matrix (Sample Model)

| Operation                              | Unit Metric               | Credit Cost |
| -------------------------------------- | ------------------------- | ----------- |
| **Audio Transcription (Standard)**     | Per 1 minute of audio     | 1 Credit    |
| **Transcript Polish & Social Pack**    | Per execution             | 2 Credits   |
| **Comprehension Quiz Generation**      | Per 5 questions           | 1 Credit    |
| **AI Viral Reel / Short Creation**     | Per 30–60s rendered clip  | 10 Credits  |
| **Dynamic Subtitle Burn & Re-framing** | Per rendered video minute | 5 Credits   |
| **AI Video Generation (Standard Gen)** | Per 5-second video clip   | 25 Credits  |
| **AI Video Generation (Cinematic HD)** | Per 5-second video clip   | 50 Credits  |
| **AI Voice Synthesis (ElevenLabs)**    | Per 1,000 characters      | 3 Credits   |

### 6.2 Financial Rigor Rules

1. **Pre-Flight Reserve:** Before dispatching an expensive AI task (e.g. 4 video scenes = 100 credits), the system places a temporary **hold/reserve** on the user's credit balance.
2. **Settle on Success:** When the worker confirms output generation, the reserve is committed as an immutable deduction in `credit_transactions`.
3. **Auto-Refund on Failure:** If an external model API fails after all retries, the reserve is immediately released back to the user with zero deduction.
4. **Idempotency Keys:** Every credit deduction requires a unique `idempotency_key` (e.g., `job_uuid`) to prevent double charges on network retries.

---

## 7. Roadmap & Product Phases

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Foundations & Monetization (Weeks 1–3)                                  │
│ • Database schema deployment (PostgreSQL + Ent ORM: Users, Projects, Credits)   │
│ • Docker + Coolify backend deployment (Go Fiber / Node Fastify)                  │
│ • User Authentication & Project Management CRUD                                  │
│ • Credit Wallet Ledger & Stripe / Paystack checkout + webhooks                   │
│ • Migrate current SonicScript features into Project Assets                       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Viral Shorts & Reel Studio (Weeks 4–6)                                  │
│ • Highlight & Hook detection AI pipeline                                         │
│ • Video audio-visual synchronization & 9:16 portrait re-framing                  │
│ • FFmpeg / Remotion kinetic animated subtitle rendering                          │
│ • Clip preview, trimming, and multi-clip export                                  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: AI Video Filmmaking & Generative Engine (Weeks 7–10)                    │
│ • Script-to-Storyboard multi-scene director interface                             │
│ • Video Generation Provider Adapters (Runway, Kling, Luma)                       │
│ • Voiceover synthesis (ElevenLabs / Cartesia) & audio timeline                   │
│ • Multi-scene video stitching and final MP4 render pipeline                      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Definition of Success

- **Creator Velocity:** A user can transform a 30-minute podcast into 5 viral, captioned 9:16 video shorts in under 3 minutes.
- **Filmmaker Empowerment:** A creator can produce a complete, multi-scene AI short film with consistent voiceovers and visuals entirely within Sonic AI.
- **Architectural Resilience:** Zero 4.5MB payload errors, zero serverless timeouts, atomic credit guarantees, and seamless onboarding of new AI models within 48 hours of release.
