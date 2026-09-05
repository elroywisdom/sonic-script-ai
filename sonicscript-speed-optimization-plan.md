# SonicScript AI — Speed Optimization Plan (Zero-Budget)

**Branch workflow:** build on `dev`, deploy a preview for testing, validate against real files, then merge to `main`. Do not touch `main` directly.

**Constraint that shapes every decision below:** everything must run on free tiers. No Vercel Pro, no Vercel Blob, no paid Groq/DeepSeek tier. Prefer browser-native APIs (zero cost, zero vendor) over any hosted service.

---

## 0. Context

Current pipeline (see `README.md`): browser extracts audio (Web Audio API `decodeAudioData`, with an 8x-speed `<video>` element fallback for files that fail primary decode) → resample to 16kHz mono WAV → cache in IndexedDB → chunk into ~2-minute / ~3.66MB pieces to fit Vercel's 4.5MB function payload limit → `/api/transcribe` (Groq `whisper-large-v3`) → `/api/refine` (DeepSeek or Groq Llama).

Bottlenecks, in order of impact:
1. Fallback extraction is bound to real-time playback (8x), not compute speed.
2. IndexedDB write cost scales badly with blob size (structured clone overhead).
3. Raw WAV chunks are 3-5x larger than they need to be, forcing many small chunks.
4. Chunk size is capped at ~4MB because of Vercel's function payload limit, not Groq's actual 25MB file limit.
5. Transcription and refine likely run sequentially instead of pipelined/parallel.

---

## 1. Phase 1 — Client-side extraction rewrite (`lib/extractAudio.ts`)

**Goal:** stop extraction time from scaling with playback duration.

- Replace the `<video>` element / `ScriptProcessorNode` 8x fallback path with the **WebCodecs API** (`AudioDecoder`), run inside a **dedicated Worker**.
- Pair it with a lightweight demuxer (e.g. `mp4box.js`) to pull encoded audio packets directly out of the MP4/MOV/WebM container — do not decode video frames at all.
- Keep the existing `AudioContext.decodeAudioData()` path as the primary attempt for small/simple files; only invoke the WebCodecs path as the fallback (same trigger condition as today), since WebCodecs setup has more overhead for trivial files.
- Everything in this phase is a browser-native API. Zero cost, zero new dependencies besides the demuxer library (free, MIT-licensed).

**Acceptance criteria:** a 60+ minute `.mov` screen recording that currently takes ~7-8 minutes to extract (per the 8x-realtime math) completes extraction in well under a minute, verified with a `console.time` benchmark left in place for now.

---

## 2. Phase 2 — Cache layer: IndexedDB → OPFS (`lib/audioCache.ts`)

**Goal:** cut write/read latency for large blobs.

- Replace IndexedDB blob storage with the **Origin Private File System** (`navigator.storage.getDirectory()`), using `createSyncAccessHandle()` inside a Worker for synchronous, positional read/write.
- Keep the existing cache key scheme (`filename_filesize_lastModified`).
- OPFS is supported in current Chrome, Edge, Firefox, and Safari — no compatibility fallback needed, but keep IndexedDB as a fallback for any browser that fails the OPFS feature check.

**Acceptance criteria:** writing a 100MB extracted-audio buffer to cache should complete in well under 200ms (OPFS benchmarks show ~90ms vs ~850ms for the equivalent IndexedDB write).

---

## 3. Phase 3 — Compress before upload

**Goal:** shrink chunk payloads so fewer, larger chunks are needed.

- After resampling to 16kHz mono, encode to **Opus** (via the browser's `MediaRecorder` with an Opus mime type, or a small WASM Opus encoder) at a speech-appropriate bitrate (~24-32kbps), or FLAC if lossless is preferred.
- Groq's transcription endpoint accepts Opus/Ogg and FLAC directly and resamples server-side regardless, so this only affects transfer size, not accuracy.
- Update `GROQ_MAX_BYTES` and the chunking logic in `extractAudio.ts` to reflect the new, larger effective chunk duration.

**Acceptance criteria:** a chunk that previously covered 2 minutes of audio at ~3.66MB should now cover 10+ minutes at a similar payload size.

---

## 4. Phase 4 — Bypass the 4.5MB function payload limit

**Goal:** stop sizing chunks around Vercel's request-body limit; size them around Groq's real 25MB file cap instead.

- Use **Cloudflare R2** (not Vercel Blob) for the intermediate audio storage: free tier is 10GB storage / 1M writes / 10M reads per month with zero egress fees, and it does not carry Vercel Hobby's non-commercial usage restriction.
  - **Note for the team:** Vercel's Hobby (free) plan is explicitly licensed for personal, non-commercial use. Since this tool is used internally at TM Labs, that's worth a conscious decision — either accept the risk on Hobby, or plan to move hosting to a plan that permits commercial use once budget allows. This is separate from the R2 recommendation below, which has no such restriction.
- Flow: client requests a presigned R2 upload URL from a small API route → client `PUT`s the compressed audio chunk(s) directly to R2 (never touches the Vercel function body limit) → `/api/transcribe` fetches the object from R2 server-side and forwards it to Groq.
- With this in place, chunk boundaries can be sized up to Groq's actual 25MB file limit instead of the current ~4MB, further cutting the number of round trips.

**Acceptance criteria:** a 2-hour file should need roughly 8-12 chunks end to end, down from ~60 today.

---

## 5. Phase 5 — Parallelize transcription, pipeline refine, and swap refine model

**Goal:** stop paying sequential round-trip latency for work that Groq itself does almost instantly.

- Change the transcribe loop from sequential `await` calls to a bounded concurrency pool (e.g. `p-limit`), capped just under Groq's free-tier Whisper limit of **20 requests/minute**.
- As each chunk's transcript returns, immediately kick off its `/api/refine` call rather than waiting for every chunk to finish transcribing first. Stitch refined text back together in chunk order.
- Switch `/api/refine` to use Groq's own `llama-3.3-70b-versatile` (already referenced as an option in the README) instead of DeepSeek, to keep the whole pipeline on free infrastructure. Watch the daily token cap (100,000 tokens/day on free tier) if usage grows — this is the one place volume could realistically bite.

**Acceptance criteria:** end-to-end wall-clock time from "upload complete" to "polished script ready" should drop substantially versus the current sequential implementation, independent of the extraction-speed work in Phases 1-3.

---

## 6. Phase 6 (fallback path, not primary) — whisper.cpp integration

**Do not use this as the default transcription backend for heavy files** — it is slower than Groq's cloud inference by a wide margin (WASM build runs ~2-3x real-time on CPU vs. Groq's ~200x real-time on LPU hardware). Its value here is specifically as a fallback, in two possible forms — pick based on what's realistic for the team:

- **Option A — client-side WASM fallback for short clips / offline mode:** integrate `examples/whisper.wasm` (or the `bindings/javascript` package) as a fallback path used only when (a) Groq's free-tier daily quota (2,000 requests/day, 28,800 audio-seconds/day) has been exhausted, or (b) a user explicitly wants fully local/offline processing for a short recording. Note the WASM build's own limits: capped at 120 seconds of audio per invocation and practically limited to the `tiny`/`base`/`small` models — so this is realistically for short clips, not full heavy-file processing, unless chunked in a loop (which will be slow — set expectations accordingly in the UI).
- **Option B — self-hosted `whisper-server` on spare compute:** if TM Labs has any always-on machine available (a free-tier VM such as Oracle Cloud's free ARM tier, an office machine, etc.), the repo's `examples/server` binary exposes a simple HTTP transcription API with GPU backend support (CUDA/Metal/Vulkan/WebGPU). This removes Groq's audio-duration quota ceiling entirely, at the cost of managing a persistent server — a deliberate departure from the "zero heavy server dependencies" principle in the current architecture, so treat this as an explicit, discussed tradeoff rather than a silent addition.

**Recommendation:** implement Option A only for now, gated behind quota-exhaustion detection (a 429 from Groq's transcribe endpoint). Leave Option B as a documented possibility, not a task, unless the team identifies actual spare compute to run it on.

---

## 7. Free-tier ceilings that no amount of engineering removes

Document these clearly for the team — they are hard limits, not bugs to fix:

- **Groq Whisper (free):** 20 requests/min, 2,000 requests/day, 7,200 audio-seconds/hour (2 hours), 28,800 audio-seconds/day (8 hours). A single 2-hour file already consumes the full hourly allowance.
- **Groq Llama 3.3 70B (free, used for refine):** 30 RPM, 1,000 requests/day, 12,000 TPM, 100,000 tokens/day.
- **Vercel Hobby:** 4.5MB function payload limit (bypassed via R2 per Phase 4), ~300-second function duration, non-commercial use license.
- **Cloudflare R2 free tier:** 10GB storage, 1M writes/month, 10M reads/month — plenty of headroom for transient chunk storage if objects are deleted after processing.

If daily audio volume across the team regularly exceeds ~8 hours, no client-side or infrastructure optimization gets around it — the next step at that point is either a paid Groq tier or self-hosted whisper.cpp (Phase 6, Option B), not more engineering on the free path.

---

## 8. Rollout checklist

- [ ] All work happens on `dev`; no direct commits to `main`.
- [ ] Deploy `dev` to a Vercel preview environment after each phase (or once all phases land, if the team prefers a single test pass).
- [ ] Test with at least three file sizes: a short clip (<5 min), a medium file (~30 min), and a heavy file (1.5-2+ hours), across at least one `.mp4` and one `.mov`.
- [ ] Confirm the R2 presigned-upload flow works end to end before removing the old direct-to-function upload path, so there's a fallback if R2 credentials aren't configured in preview.
- [ ] Confirm quota-exhaustion fallback (Phase 6, Option A) actually triggers on a simulated 429 before relying on it in production.
- [ ] Only merge to `main` after a heavy-file test completes successfully end to end on the preview deployment.
