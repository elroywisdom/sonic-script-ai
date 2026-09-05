# TM Labs SonicScript AI — Technical Architecture & Overview

**SonicScript AI** is a production-ready, full-stack AI web application that transforms video recordings and raw audio files into polished scripts, formatted markdown documentation, interactive quizzes, and social media captions.

---

## 1. High-Level Architecture Overview

```
 ┌────────────────────────┐
 │   Uploaded File        │  (Video: MP4, MOV, AVI, WebM | Audio: MP3, WAV, M4A, AAC)
 └───────────┬────────────┘
             │
             ▼
 ┌────────────────────────┐     Primary Decode Failed?
 │   Web Audio API        │ ────────────────────────────┐
 │   decodeAudioData()    │                             │
 └───────────┬────────────┘                             ▼
             │ Success                   ┌─────────────────────────────┐
             │                           │  HTML5 Video Element Stream │
             │                           │  8x Accelerated Capture     │
             │                           └──────────────┬──────────────┘
             ▼                                          │
 ┌──────────────────────────────────────────────────────┴──────────────┐
 │               Resample to 16kHz Mono 16-bit PCM WAV                 │
 └──────────────────────────────────┬──────────────────────────────────┘
                                    │
                                    ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │       IndexedDB Cache & 4MB Vercel Chunking (2-min segments)        │
 └──────────────────────────────────┬──────────────────────────────────┘
                                    │
                                    ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │   Serverless API Pipeline (/api/transcribe -> /api/refine)         │
 └──────────────────────────────────┬──────────────────────────────────┘
                                    │
                                    ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │      Executive Workspace (Polished Script, Quizzes, Captions)       │
 └─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Technical Pipelines

### 2.1 Resilient Browser Audio Extraction (`lib/extractAudio.ts`)
- **Zero Heavy Server Dependencies**: Audio extraction runs 100% client-side in the browser using the Web Audio API, eliminating the need for server-side FFmpeg WASM or native C binaries.
- **Dual-Engine Extraction Strategy**:
  1. **Primary Path**: Attempts fast `AudioContext.decodeAudioData(arrayBuffer)`.
  2. **Hardware-Accelerated Fallback Path**: If `decodeAudioData()` rejects (common with multi-gigabyte `.mov` screen recordings that exceed browser memory limits), the engine automatically switches to an offscreen HTML5 `<video>` element stream decoder.
- **8x Accelerated Capture Speed**: Fallback extraction streams video audio at `playbackRate = 8.0` with `preservesPitch = false`. A 117-minute recording extracts in **~14 minutes**.
- **Sample Rate Reconstruction**: Audio samples captured via `MediaElementAudioSourceNode` and `ScriptProcessorNode` set an effective sample rate of `audioContext.sampleRate / PLAYBACK_RATE`. `resampleToMono16kHz()` then resamples the buffer to 16kHz mono WAV, guaranteeing 100% normal pitch and audio fidelity.
- **Vercel Payload Chunking**: Audio files exceeding 4MB (`GROQ_MAX_BYTES`) are sliced into 2-minute segments (~3.66MB each), staying comfortably under Vercel's 4.5MB serverless payload limit.

---

### 2.2 Persistent IndexedDB Storage (`lib/audioCache.ts`)
- **Native Browser Database**: Uses IndexedDB (`SonicScriptCacheDB`) to store extracted audio `Blob` chunks and completed transcripts under a unique file signature key (`filename_filesize_lastModified`).
- **Instant Resume Across Reloads**: If a user refreshes the browser, closes a tab, or restarts the server, re-selecting the file loads pre-extracted chunks from disk in 0 seconds, allowing instant resumption of transcription.

---

### 2.3 Reassuring Processing Dashboard (`components/ProcessingDashboard.tsx`)
- **Visual Progress Bar**: Smooth percentage indicator (0% to 100%).
- **Estimated Time Remaining Counter**: Dynamic countdown calculated from media length and 8x processing metrics.
- **Rotating Tips**: Displays engaging copy every 6 seconds to keep users relaxed while waiting.
- **Collapsible Technical Logs**: Technical logs are tucked inside an optional **"View Technical Logs"** dropdown drawer.

---

### 2.4 Serverless App Router API Suite (`app/api/`)
- `POST /api/transcribe` ([`app/api/transcribe/route.ts`](file:///Users/user/Library/Mobile%20Documents/com~apple~CloudDocs/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/sonic-script/app/api/transcribe/route.ts)): Uploads 2-minute WAV chunks to Groq Cloud API (`whisper-large-v3`).
- `POST /api/refine` ([`app/api/refine/route.ts`](file:///Users/user/Library/Mobile%20Documents/com~apple~CloudDocs/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/sonic-script/app/api/refine/route.ts)): Sends raw STT text to DeepSeek Chat (`deepseek-chat`) or Groq (`llama-3.3-70b-versatile`) to add punctuation, paragraph breaks, and formatting.
- `POST /api/quiz` ([`app/api/quiz/route.ts`](file:///Users/user/Library/Mobile%20Documents/com~apple~CloudDocs/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/sonic-script/app/api/quiz/route.ts)): Formulates 5 multiple-choice comprehension questions with correct answers and explanations.
- `POST /api/captions` ([`app/api/captions/route.ts`](file:///Users/user/Library/Mobile%20Documents/com~apple~CloudDocs/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/sonic-script/app/api/captions/route.ts)): Generates Twitter threads, LinkedIn posts, executive summaries, and key takeaways.

---

### 2.5 Executive Result Workspace & STT Filtering ([`components/TranscriptWorkspace.tsx`](file:///Users/user/Library/Mobile%20Documents/com~apple~CloudDocs/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/sonic-script/components/TranscriptWorkspace.tsx))
- **Terminal Logs Hidden on Complete**: System logs hide automatically when processing finishes.
- **Tabbed Script Views**: Switch between **✨ Polished Script** (sans-serif formatting) and **🎙️ Raw Output with Timestamps**.
- **STT Hallucination Filter**: Automatically removes repetitive Whisper STT artifacts (e.g. `you [00:30] you`) from silent audio gaps.

---

## 3. Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 14 (App Router) | Serverless API routes & UI layout |
| Styling | Tailwind CSS | Utility-first glassmorphism design system |
| Audio Extraction | Browser Web Audio API + HTML5 Video | Zero server cost, hardware demuxing |
| Storage & Cache | Native IndexedDB | Offline persistence across reloads |
| Transcription | Groq API (`whisper-large-v3`) | Ultra-fast speech recognition |
| Refinement & Intelligence | DeepSeek API (`deepseek-chat`) / Groq (`llama-3.3-70b-versatile`) | Transcript polishing, quizzes, captions |
| Deployment | Vercel Free Tier | Zero-config serverless hosting |

---

## 4. Environment Setup

Create `.env.local` in the project root:

```env
GROQ_API_KEY=your_groq_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
```

Run locally:

```bash
rm -rf .next && npm run dev
```
