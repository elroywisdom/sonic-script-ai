# SonicScript AI — Agent Build PRD
**Project Type:** Full-Stack Web App (Antigravity Agent Workspace)
**Version:** 2.0 — Enhanced for Agent Execution

---

## 1. Project Summary

Build **SonicScript AI** — a lean, fast, production-ready web tool that takes a video file, strips its audio, transcribes it using Groq's Whisper-Large-v3 (free tier), and polishes the transcript using DeepSeek's chat API. The result is a clean, readable, properly punctuated script ready for captions, blog posts, show notes, or documentation.

**Target user:** Content creators, podcasters, journalists, and developers who regularly work with video or voice recordings and need accurate, readable transcripts fast.

**Primary constraint:** Must deploy free on Vercel. No heavy server binaries. All media processing should leverage the browser's Web Audio API to stay within Vercel's 25MB payload limit.

---

## 2. Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend + Backend | Next.js 14 (App Router) | File-based routing, server actions, streaming responses |
| Styling | Tailwind CSS | Rapid utility-based layout |
| Audio Extraction | Browser Web Audio API | Zero server cost, no FFmpeg binary needed |
| Transcription | Groq Cloud API — `whisper-large-v3` | Free tier, extremely fast, OpenAI-compatible |
| Refinement | DeepSeek API — `deepseek-chat` | Affordable, strong instruction-following for text editing |
| Deployment | Vercel Free Tier | Serverless-ready, zero config |

---

## 3. Environment Variables

Create a `.env.local` file at the project root with the following:

```env
GROQ_API_KEY=your_groq_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

> **Agent Note:** Never expose these keys client-side. Both API calls must live exclusively inside `/app/api/` route handlers. Do not import or reference these variables in any component file.

---

## 4. File & Folder Structure

The agent must scaffold the following structure:

```
sonicscript-ai/
├── app/
│   ├── layout.tsx                  # Root layout with metadata + font imports
│   ├── page.tsx                    # Main UI page (upload + result workspace)
│   ├── globals.css                 # Tailwind base + any custom CSS variables
│   └── api/
│       ├── transcribe/
│       │   └── route.ts            # Endpoint 1: Accepts audio blob → Groq Whisper
│       └── refine/
│           └── route.ts            # Endpoint 2: Raw text → DeepSeek polished output
├── components/
│   ├── UploadZone.tsx              # Drag-and-drop video upload with state
│   ├── StatusStepper.tsx           # Step-by-step progress indicator
│   └── TranscriptWorkspace.tsx     # Split-panel: raw vs polished transcript
├── lib/
│   └── extractAudio.ts             # Browser-side Web Audio extraction utility
├── public/                         # Static assets
├── .env.local                      # API keys (gitignored)
├── next.config.js                  # Next.js config (increase body size limit)
├── tailwind.config.ts
└── package.json
```

---

## 5. Functional Requirements

### 5.1 Upload Zone (`components/UploadZone.tsx`)

- Accept drag-and-drop OR click-to-browse input
- Accepted formats: `.mp4`, `.mov`, `.avi`, `.webm`
- Client-side size guard: warn (don't block) files above 100MB — audio extraction may take longer
- On file select, immediately show the filename and a "Start Processing" button
- Clicking "Start Processing" triggers the full pipeline in sequence

### 5.2 Audio Extraction (`lib/extractAudio.ts`)

- Runs entirely in the browser using the Web Audio API
- Decode the video file into an `AudioBuffer`
- Re-encode to WAV or MP3 (mono, 16kHz sample rate) using a `ScriptProcessorNode` or `OfflineAudioContext`
- Export as a `Blob` to pass to `/api/transcribe`
- This must complete before any API call is made

> **Agent Note:** Do not use FFmpeg, `fluent-ffmpeg`, or any binary on the server. The Vercel serverless environment does not reliably support native binaries. All audio work happens in the browser.

### 5.3 Processing Status Stepper (`components/StatusStepper.tsx`)

Show the user exactly where they are in the pipeline. Use a simple horizontal or vertical step indicator with these states:

```
[1] Extracting Audio   →   [2] Transcribing   →   [3] Polishing   →   [4] Done
```

- Each step transitions visually (e.g., spinner → checkmark)
- If a step fails, it shows an error state with a plain-English message and a "Try again" option
- Do not auto-dismiss errors

### 5.4 API Route — Transcribe (`app/api/transcribe/route.ts`)

**Method:** `POST`
**Input:** `FormData` with key `audio` (the extracted audio Blob from the browser)

**Logic:**
1. Read the audio blob from the request
2. Forward it to Groq's transcription endpoint:
   - URL: `https://api.groq.com/openai/v1/audio/transcriptions`
   - Model: `whisper-large-v3`
   - Use `multipart/form-data`
   - Include `Authorization: Bearer ${process.env.GROQ_API_KEY}`
3. Return `{ rawTranscript: string }` as JSON

**Error handling:**
- If Groq returns a non-200, return a structured error: `{ error: "Transcription failed", detail: <groq error message> }`
- Log errors server-side, never expose raw stack traces to the client

### 5.5 API Route — Refine (`app/api/refine/route.ts`)

**Method:** `POST`
**Input:** JSON body `{ rawTranscript: string }`

**Logic:**
1. Construct the DeepSeek API call:
   - URL: `https://api.deepseek.com/v1/chat/completions`
   - Model: `deepseek-chat`
   - Include `Authorization: Bearer ${process.env.DEEPSEEK_API_KEY}`
2. Use the system prompt below verbatim
3. Return `{ polishedTranscript: string }` as JSON

**System Prompt (paste exactly):**

```
You are an elite post-production transcript editor. Your task is to take raw, unpunctuated Speech-to-Text output and transform it into a professional, highly readable script.

Rules:
- Add correct punctuation and natural paragraph breaks.
- Correct clear phonetic transcription errors (tech terms, brand names, proper nouns).
- Preserve 100% of the speaker's original intent and voice. Do not rephrase, summarize, or rewrite unless a grammatical fix is required.
- Do not add commentary, headings, or meta-text.
- Return ONLY the cleaned transcript. Nothing else before or after it.
```

**Error handling:** Same pattern as `/api/transcribe` — structured JSON error, no raw exceptions.

### 5.6 Transcript Workspace (`components/TranscriptWorkspace.tsx`)

Renders after the pipeline completes. Layout:

```
┌──────────────────────────────┬──────────────────────────────┐
│   Raw Transcript             │   Polished Transcript        │
│   (Whisper output)           │   (DeepSeek output)          │
│                              │                              │
│   [scrollable textarea]      │   [scrollable textarea]      │
│                              │   [Copy to Clipboard] btn    │
└──────────────────────────────┴──────────────────────────────┘
```

- Both panels are scrollable, read-only `<textarea>` elements
- "Copy to Clipboard" copies the polished text and changes its label to "Copied ✓" for 2 seconds
- Add a "Process Another File" button below the workspace that resets all state to the initial upload view

---

## 6. State Management

Manage all state in `app/page.tsx` and pass down as props. No external state library needed. Use a `status` enum to drive the UI:

```ts
type AppStatus =
  | 'idle'           // Initial state, show upload zone
  | 'extracting'     // Web Audio API working
  | 'transcribing'   // Awaiting Groq response
  | 'refining'       // Awaiting DeepSeek response
  | 'done'           // Show transcript workspace
  | 'error'          // Show error with retry option
```

---

## 7. Next.js Config

Update `next.config.js` to allow larger API request bodies:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

module.exports = nextConfig;
```

---

## 8. UI Design Direction

- **Aesthetic:** Dark, minimal, high-contrast. Near-black background (`#0D0D0D`), white primary text, electric teal accent (`#00D4B4`) for active states and CTAs.
- **Typography:** Use `Inter` (Google Fonts) — clean, readable, no-nonsense. Monospace font (`JetBrains Mono` or `Fira Code`) for the transcript panels to reinforce the "output" context.
- **Upload Zone:** Dashed border, subtle hover glow in teal, centered icon + instruction text.
- **No decorative elements.** The tool is the UI. Keep margins generous and the layout breathable.

---

## 9. Verification Checklist (Agent Must Complete)

After scaffolding, the agent must verify each of these before marking the build done:

- [ ] `npm run dev` starts without errors or TypeScript complaints
- [ ] Navigating to `http://localhost:3000` renders the upload zone correctly
- [ ] Dragging a `.mp4` file onto the upload zone registers it and shows the filename
- [ ] Clicking "Start Processing" with a real file triggers the stepper and all three status states appear in sequence
- [ ] `/api/transcribe` returns a non-empty `rawTranscript` string for a valid audio input
- [ ] `/api/refine` returns a non-empty `polishedTranscript` string for a valid text input
- [ ] Both transcript panels render with real content after the pipeline completes
- [ ] "Copy to Clipboard" works and label changes temporarily to "Copied ✓"
- [ ] "Process Another File" resets state fully to the idle upload view
- [ ] No API keys appear anywhere in client-side code (`grep -r "GROQ\|DEEPSEEK" ./components ./app/page.tsx` returns nothing)
- [ ] Build passes: `npm run build` exits with no errors

---

## 10. Known Constraints & Agent Guardrails

| Constraint | Handling |
|---|---|
| Vercel 25MB serverless body limit | Audio blob extracted in-browser before upload |
| No native binaries on Vercel | Web Audio API only — no FFmpeg, no `fluent-ffmpeg` |
| API keys must stay server-only | Both API routes live in `/app/api/` only |
| Groq Whisper audio size limit (25MB) | Client-side extraction produces compressed mono audio well under this |
| DeepSeek context window | For very long transcripts (>30 min video), chunk the raw transcript into segments of ~4000 tokens and make sequential refinement calls, concatenating the results |

---

*Feed this PRD directly to your Antigravity agent. It contains everything needed to scaffold, code, and verify the full application.*
