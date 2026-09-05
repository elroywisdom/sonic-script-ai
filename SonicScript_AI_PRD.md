# SonicScript AI — Technical Specifications & PRD
**Project Type:** Full-Stack Web App (Next.js 14 App Router)
**Version:** 3.0 — Enhanced for Production Execution & Offline Resilience

---

## 1. Project Summary

**SonicScript AI** is a lean, fast, production-ready web tool that takes video recordings (.mp4, .mov, .avi, .webm) and audio files (.mp3, .wav, .m4a, .aac, .flac, .ogg), extracts audio client-side in the browser, transcribes it using Groq's `whisper-large-v3`, and polishes the transcript using DeepSeek's `deepseek-chat` (or Groq Llama 3.3). The platform also generates interactive 5-question comprehension quizzes and social media captions.

---

## 2. Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Frontend + Backend | Next.js 14 (App Router) | File-based routing, server actions, API handlers |
| Styling | Tailwind CSS | Utility-based dark glassmorphism UI |
| Audio Extraction | Browser Web Audio API + HTML5 Video | Zero server cost, hardware 8x speed demuxing |
| Offline Cache | Native IndexedDB | Offline persistence across reloads |
| Transcription | Groq Cloud API — `whisper-large-v3` | Free tier, ultra-fast speech recognition |
| Refinement & Intelligence | DeepSeek API (`deepseek-chat`) / Groq (`llama-3.3-70b-versatile`) | Transcript polishing, quizzes, captions |
| Deployment | Vercel Free Tier | Serverless-ready |

---

## 3. Architecture & Key Workflows

### 3.1 Audio Extraction Pipeline (`lib/extractAudio.ts`)
- Runs 100% client-side in the browser using Web Audio API.
- Primary path: Fast in-memory `decodeAudioData()`.
- Fallback path: HTML5 `<video>` element stream playback at `8.0x` speed with `preservesPitch = false`.
- Resamples audio to 16kHz mono 16-bit PCM WAV.
- Slices audio buffers into 2-minute chunks (< 4MB each) to stay under Vercel's 4.5MB serverless payload limit.

### 3.2 IndexedDB Caching (`lib/audioCache.ts`)
- Stores audio chunks and completed transcripts locally in `SonicScriptCacheDB`.
- Enables instant resumption of transcription without re-extracting video files.

### 3.3 API Route Suite (`app/api/`)
- `POST /api/transcribe`: Audio chunk -> Groq Whisper transcription.
- `POST /api/refine`: Raw STT text -> DeepSeek polished script.
- `POST /api/quiz`: Transcript -> 5 multiple-choice questions.
- `POST /api/captions`: Transcript -> Social media posts.
