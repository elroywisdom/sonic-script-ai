'use client';

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Upload, 
  Sparkles, 
  HelpCircle, 
  FileText, 
  Loader2, 
  Check, 
  Copy, 
  Search, 
  Share2, 
  Twitter, 
  Linkedin, 
  Video, 
  Download, 
  BookOpen, 
  RefreshCw, 
  Clock, 
  ChevronDown, 
  Instagram, 
  Youtube, 
  Send, 
  Plus, 
  CheckCircle2, 
  ArrowLeft, 
  FileAudio, 
  ChevronRight, 
  LayoutGrid, 
  Mic,
  Play,
  Pause,
  RotateCcw,
  Pencil
} from "lucide-react";
import { apiFetch, apiUpload } from "@/lib/api";
import { extractAudioChunks } from "@/lib/extractAudio";
import { exportAsMarkdown, exportAsDoc, exportAsPdf, exportAsTxt, downloadFile } from "@/lib/exportTranscript";

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface SocialContent {
  twitter_thread?: string | string[];
  linkedin_post?: string | string[];
  instagram_caption?: string | string[];
  tiktok_hook?: string | string[];
  youtube_description?: string | string[];
  threads_post?: string | string[];
  summary?: string;
  [key: string]: any;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  filename: string;
  transcript: string;
  segments: Segment[];
  word_count: number;
  duration: number;
  created_at: string;
  polished_text?: string;
  socials?: SocialContent;
  quiz_questions?: QuizQuestion[];
}

export default function SpeechStudioPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Project Info
  const [projectTitle, setProjectTitle] = useState<string>("Project");
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Views: 'history' (TurboScribe table), 'studio' (workspace), 'upload' (dropzone)
  const [viewMode, setViewMode] = useState<'history' | 'studio' | 'upload'>('history');

  // History Files State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [fileSearch, setFileSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Active Session Working State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [extractProgress, setExtractProgress] = useState<number>(0);

  const [activeFilename, setActiveFilename] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [wordCount, setWordCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'raw' | 'polished' | 'socials' | 'quiz'>('raw');
  const [readerMode, setReaderMode] = useState<'document' | 'timeline'>('document');
  const [socialPlatformFilter, setSocialPlatformFilter] = useState<string>('all');

  // DeepSeek AI Deliverables for Active Session
  const [polishedText, setPolishedText] = useState<string>('');
  const [socials, setSocials] = useState<SocialContent | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // UI Interactive States
  const [loadingAction, setLoadingAction] = useState<'polish' | 'socials' | 'quiz' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Audio Playback & Scrubber State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Inline Transcript Editing State
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [editedTranscriptText, setEditedTranscriptText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to normalize social content & unpack stringified JSON
  const normalizeSocialContent = (data: any): SocialContent => {
    if (!data) return {};
    let parsed = { ...data };

    if (parsed.summary && typeof parsed.summary === 'string' && parsed.summary.trim().startsWith('{')) {
      try {
        const inner = JSON.parse(parsed.summary);
        parsed = { ...parsed, ...inner };
      } catch {}
    }

    return parsed;
  };

  // Helper to completely remove emojis for clean executive writing
  const cleanProfessionalText = (val: any): string => {
    if (!val) return '';
    let text = Array.isArray(val) ? val.join('\n\n') : String(val);

    try {
      text = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    } catch {
      text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gmu, '');
    }
    text = text.replace(/[ \t]{2,}/g, ' ');
    text = text.replace(/^\s*[-•*]\s*$/gm, '');
    return text.trim();
  };

  // Format seconds into clean duration (e.g. 18s, 2m 45s, 30m)
  const formatDurationClean = (sec: number): string => {
    if (!sec || sec <= 0) return '0s';
    const mins = Math.floor(sec / 60);
    const secs = Math.round(sec % 60);
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const formatUploadedDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Recently';
    }
  };

  const formatSeconds = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (projectId) {
      setInitialLoading(true);
      apiFetch<any>(`/projects/${projectId}`).then((res) => {
        setInitialLoading(false);
        if (res.success && res.data) {
          if (res.data.title) setProjectTitle(res.data.title);
          const s = res.data.settings || {};

          let items: HistoryItem[] = [];

          if (s.history && Array.isArray(s.history) && s.history.length > 0) {
            items = s.history;
          } else if (s.transcript) {
            const dur = s.segments && s.segments.length > 0 ? s.segments[s.segments.length - 1].end : 0;
            items = [{
              id: 'session_master_' + projectId.slice(0, 8),
              title: res.data.title ? `${res.data.title} Master Audio Track` : "Master Audio Track",
              filename: s.filename || (res.data.title ? `${res.data.title}.mp3` : "Audio_Master.mp3"),
              transcript: s.transcript,
              segments: s.segments || [],
              word_count: s.transcript.split(/\s+/).filter(Boolean).length,
              duration: dur,
              created_at: s.created_at || res.data.created_at || new Date().toISOString(),
              polished_text: s.polished_text || '',
              socials: normalizeSocialContent(s.socials),
              quiz_questions: s.quiz_questions || null,
            }];
          }

          setHistoryItems(items);

          if (items.length > 0) {
            setViewMode('history');
            loadSessionIntoStudio(items[0], false);
          } else {
            setViewMode('upload');
          }
        }
      });
    }
  }, [projectId]);

  const loadSessionIntoStudio = (item: HistoryItem, switchView = true) => {
    setActiveSessionId(item.id);
    setActiveFilename(item.title || item.filename);
    setTranscript(item.transcript || '');
    setSegments(item.segments || []);
    setWordCount(item.word_count || (item.transcript ? item.transcript.split(/\s+/).filter(Boolean).length : 0));
    setPolishedText(item.polished_text || '');
    setSocials(item.socials ? normalizeSocialContent(item.socials) : null);
    setQuizQuestions(item.quiz_questions || null);
    setUserAnswers({});
    setQuizSubmitted(false);

    if (switchView) {
      setViewMode('studio');
      setActiveTab('raw');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      handleProcess(file);
    }
  };

  const handleProcess = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setExtractProgress(10);
    setProcessingStatus('Analyzing media container...');

    try {
      let chunksToProcess: { blob: Blob; filename: string }[] = [];

      const isDirectAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name);
      if (isDirectAudio && file.size <= 20 * 1024 * 1024) {
        setExtractProgress(30);
        setProcessingStatus(`Audio file recognized (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);
        chunksToProcess = [{ blob: file, filename: file.name }];
      } else {
        setProcessingStatus(`Demuxing audio track locally (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);
        
        const extracted = await extractAudioChunks(file, (logMsg) => {
          setProcessingStatus(logMsg);
        });

        if (!extracted || extracted.length === 0) {
          throw new Error('Could not extract an audio track from this video file. Please check if the video has audio.');
        }

        chunksToProcess = extracted.map((c, i) => ({
          blob: c.blob,
          filename: c.filename || `audio_part_${i + 1}.wav`
        }));
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('sonic_token') : null;
      let combinedTranscript = '';
      const combinedSegments: Segment[] = [];
      let combinedWords = 0;

      for (let i = 0; i < chunksToProcess.length; i++) {
        const chunk = chunksToProcess[i];
        const pct = Math.round(((i + 1) / chunksToProcess.length) * 100);
        setExtractProgress(pct);
        setProcessingStatus(
          chunksToProcess.length > 1
            ? `Transcribing chunk ${i + 1}/${chunksToProcess.length}...`
            : `Transcribing audio (${(chunk.blob.size / (1024 * 1024)).toFixed(1)} MB)...`
        );

        const formData = new FormData();
        formData.append('file', chunk.blob, chunk.filename);

        const data = await apiUpload<any>(`/projects/${projectId}/transcribe`, formData);

        if (data.success && data.data) {
          combinedTranscript += (combinedTranscript ? ' ' : '') + data.data.full_text;
          
          if (Array.isArray(data.data.segments)) {
            const timeOffset = combinedSegments.length > 0 
              ? combinedSegments[combinedSegments.length - 1].end 
              : 0;
            
            data.data.segments.forEach((seg: any) => {
              combinedSegments.push({
                id: combinedSegments.length + 1,
                start: seg.start + timeOffset,
                end: seg.end + timeOffset,
                text: seg.text
              });
            });
          }

          combinedWords += (data.data.word_count || 0);
        } else {
          throw new Error(data.error || 'Failed transcribing chunk');
        }
      }

      const duration = combinedSegments.length > 0 ? combinedSegments[combinedSegments.length - 1].end : 0;
      const finalWords = combinedWords || combinedTranscript.split(/\s+/).filter(Boolean).length;

      const newSession: HistoryItem = {
        id: `session_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        filename: file.name,
        transcript: combinedTranscript,
        segments: combinedSegments,
        word_count: finalWords,
        duration: duration,
        created_at: new Date().toISOString(),
      };

      const updatedHistory = [newSession, ...historyItems];
      setHistoryItems(updatedHistory);
      loadSessionIntoStudio(newSession, true);

      setProcessingStatus('Transcription complete!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Processing failed. Please verify the audio file format.');
    } finally {
      setIsProcessing(false);
      setExtractProgress(0);
    }
  };

  const handlePolish = async () => {
    if (!transcript) return;
    setLoadingAction('polish');
    setError(null);

    const res = await apiFetch<any>(`/projects/${projectId}/polish`, {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });

    setLoadingAction(null);
    if (res.success && res.data?.polished_text) {
      const text = res.data.polished_text;
      setPolishedText(text);
      setActiveTab('polished');

      setHistoryItems((prev) =>
        prev.map((item) =>
          item.id === activeSessionId ? { ...item, polished_text: text } : item
        )
      );
    } else {
      setError(res.error || 'Failed to polish transcript');
    }
  };

  const handleSocials = async () => {
    if (!transcript) return;
    setLoadingAction('socials');
    setError(null);

    const res = await apiFetch<any>(`/projects/${projectId}/repurpose`, {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });

    setLoadingAction(null);
    if (res.success && res.data?.socials) {
      const normalized = normalizeSocialContent(res.data.socials);
      setSocials(normalized);
      setActiveTab('socials');

      setHistoryItems((prev) =>
        prev.map((item) =>
          item.id === activeSessionId ? { ...item, socials: normalized } : item
        )
      );
    } else {
      setError(res.error || 'Failed to generate social media copies');
    }
  };

  const handleQuiz = async () => {
    if (!transcript) return;
    setLoadingAction('quiz');
    setError(null);

    const res = await apiFetch<any>(`/projects/${projectId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });

    setLoadingAction(null);
    if (res.success && Array.isArray(res.data?.quiz)) {
      const q = res.data.quiz;
      setQuizQuestions(q);
      setUserAnswers({});
      setQuizSubmitted(false);
      setActiveTab('quiz');

      setHistoryItems((prev) =>
        prev.map((item) =>
          item.id === activeSessionId ? { ...item, quiz_questions: q } : item
        )
      );
    } else {
      setError(res.error || 'Failed to generate quiz');
    }
  };

  const handleExportSocialPack = () => {
    if (!socials) return;
    let pack = `# Social Media Intelligence Pack — ${activeFilename || projectTitle}\n\n`;
    pack += `Generated on: ${new Date().toLocaleDateString()}\n\n---\n\n`;

    if (socials.twitter_thread) {
      pack += `## Twitter / X Thread\n\n${cleanProfessionalText(socials.twitter_thread)}\n\n---\n\n`;
    }
    if (socials.linkedin_post) {
      pack += `## LinkedIn Executive Post\n\n${cleanProfessionalText(socials.linkedin_post)}\n\n---\n\n`;
    }
    if (socials.instagram_caption) {
      pack += `## Instagram Story & Caption\n\n${cleanProfessionalText(socials.instagram_caption)}\n\n---\n\n`;
    }
    if (socials.tiktok_hook) {
      pack += `## TikTok & Shorts Hooks\n\n${cleanProfessionalText(socials.tiktok_hook)}\n\n---\n\n`;
    }
    if (socials.youtube_description) {
      pack += `## YouTube Video SEO Description\n\n${cleanProfessionalText(socials.youtube_description)}\n\n---\n\n`;
    }
    if (socials.threads_post) {
      pack += `## Threads / Bluesky Micro-Post\n\n${cleanProfessionalText(socials.threads_post)}\n\n---\n\n`;
    }

    downloadFile(`${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_social_pack.md`, pack, 'text/markdown;charset=utf-8');
  };

  // Filter files by search query
  const filteredHistory = historyItems.filter((item) => {
    if (!fileSearch.trim()) return true;
    const q = fileSearch.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.filename && item.filename.toLowerCase().includes(q)) ||
      (item.transcript && item.transcript.toLowerCase().includes(q))
    );
  });

  const totalAudioDuration = segments.length > 0 ? segments[segments.length - 1].end : (historyItems[0]?.duration || 19);

  // Audio Playback Timer Effect
  useEffect(() => {
    const duration = totalAudioDuration || 19;
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackTime((prev) => {
          const next = prev + 0.1 * playbackRate;
          if (next >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 100);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, playbackRate, totalAudioDuration]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const seekTo = (seconds: number) => {
    const duration = totalAudioDuration || 19;
    const clamped = Math.max(0, Math.min(seconds, duration));
    setPlaybackTime(clamped);
  };


  // SKELETON LOADER
  if (initialLoading) {
    return (
      <div className="glass-card rounded-2xl border border-white/5 p-6 sm:p-8 animate-pulse space-y-4">
        <div className="h-6 sm:h-8 bg-white/5 rounded-xl w-1/3 sm:w-1/4" />
        <div className="h-48 sm:h-64 bg-white/5 rounded-xl" />
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: CLEAN TURBOSCRIBE-STYLE RECENT FILES (RESPONSIVE TABLE + MOBILE CARDS)
  // =========================================================================
  if (viewMode === 'history' && historyItems.length > 0) {
    const allSelected = historyItems.length > 0 && historyItems.every(i => selectedIds[i.id]);

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Main Clean Card Container (TurboScribe Style) */}
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-[#121214]">
          {/* Card Header Bar */}
          <div className="p-4 sm:p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00D4B4]/10 border border-[#00D4B4]/20 flex items-center justify-center text-[#00D4B4] shrink-0">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">Recent Files</h1>
            </div>

            {/* Right Tools: Responsive Search & Action Button */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="w-full sm:w-56 bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4B4]/50 transition"
                />
              </div>

              <button
                onClick={() => setViewMode('upload')}
                className="px-3.5 sm:px-4 py-2 bg-white hover:bg-white/90 text-black text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden xs:inline sm:inline">Transcribe Files</span>
                <span className="inline xs:hidden sm:hidden">Transcribe</span>
              </button>
            </div>
          </div>

          {/* 1. Desktop & Tablet View: Full Skimmable Table (hidden on small mobile) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-white/[0.01]">
                  <th className="py-3.5 pl-6 pr-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next: Record<string, boolean> = {};
                        historyItems.forEach(i => { next[i.id] = checked; });
                        setSelectedIds(next);
                      }}
                      className="rounded border-white/20 bg-black/40 text-[#00D4B4] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4 font-semibold">Name</th>
                  <th className="py-3.5 px-4 font-semibold">Uploaded</th>
                  <th className="py-3.5 px-4 font-semibold">Duration</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 pr-6 pl-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 text-xs">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No files match "{fileSearch}".
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => {
                    const isChecked = !!selectedIds[item.id];

                    return (
                      <tr
                        key={item.id}
                        onClick={() => loadSessionIntoStudio(item, true)}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      >
                        <td
                          className="py-4 pl-6 pr-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIds(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-white/20 bg-black/40 text-[#00D4B4] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-[#00D4B4] group-hover:border-[#00D4B4]/30 transition shrink-0">
                              <FileAudio className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-white group-hover:text-[#00D4B4] transition truncate block max-w-xs sm:max-w-md">
                                {item.title || item.filename}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {item.word_count || item.transcript.split(/\s+/).filter(Boolean).length} words
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-slate-400 whitespace-nowrap">
                          {formatUploadedDate(item.created_at)}
                        </td>

                        <td className="py-4 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {formatDurationClean(item.duration)}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Ready</span>
                          </span>
                        </td>

                        <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(item.transcript, `copy_${item.id}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                              title="Copy transcript"
                            >
                              {copiedKey === `copy_${item.id}` ? (
                                <Check className="w-3.5 h-3.5 text-[#00D4B4]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => loadSessionIntoStudio(item, true)}
                              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white text-slate-300 hover:text-black font-semibold text-xs transition flex items-center gap-1"
                            >
                              <span>Open</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 2. Mobile View: Touch-Optimized File Cards (visible on phones) */}
          <div className="block sm:hidden divide-y divide-white/5">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No files match "{fileSearch}".
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadSessionIntoStudio(item, true)}
                  className="p-4 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#00D4B4] shrink-0">
                        <FileAudio className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {item.title || item.filename}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {formatUploadedDate(item.created_at)}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded shrink-0">
                      {formatDurationClean(item.duration)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-slate-400 text-[10px]">
                        {item.word_count || item.transcript.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => copyToClipboard(item.transcript, `m_copy_${item.id}`)}
                        className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                        title="Copy transcript"
                      >
                        {copiedKey === `m_copy_${item.id}` ? (
                          <Check className="w-3 h-3 text-[#00D4B4]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        onClick={() => loadSessionIntoStudio(item, true)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-medium text-[11px] flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3 h-3 text-[#00D4B4]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Integrated Quick Dropzone to fill empty space and provide instant upload */}
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className="p-6 rounded-2xl border border-dashed border-white/10 hover:border-[#00D4B4]/40 hover:bg-[#00D4B4]/[0.02] transition cursor-pointer text-center space-y-2 bg-white/[0.01]"
          >
            <Upload className="w-5 h-5 text-[#00D4B4] mx-auto" />
            <div>
              <p className="text-xs font-medium text-white">Drop another audio or video file here</p>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">MP3, WAV, M4A, MP4, MOV, WEBM</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUDIO UPLOADER (Clean Mobile-Friendly Dropzone)
  // =========================================================================
  if (viewMode === 'upload') {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in py-2 sm:py-4">
        {historyItems.length > 0 && (
          <button
            onClick={() => setViewMode('history')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Files
          </button>
        )}

        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-5 sm:space-y-6 bg-[#121214]">
          <div className="text-center space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Transcribe Audio</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload audio or video files. Videos are demuxed into clean audio in your browser before Whisper transcription.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0] && !isProcessing) {
                const file = e.dataTransfer.files[0];
                setSelectedFile(file);
                handleProcess(file);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition cursor-pointer flex flex-col items-center justify-center min-h-[180px] sm:min-h-[200px] ${
              isProcessing
                ? 'border-[#00D4B4]/40 bg-[#00D4B4]/5 cursor-wait'
                : 'border-white/15 hover:border-[#00D4B4]/60 hover:bg-[#00D4B4]/[0.02]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {isProcessing ? (
              <div className="space-y-4 w-full max-w-sm">
                <Loader2 className="w-8 h-8 animate-spin text-[#00D4B4] mx-auto" />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-white">{processingStatus}</p>
                  <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/10">
                    <div
                      className="bg-[#00D4B4] h-full transition-all duration-300"
                      style={{ width: `${extractProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
                  <Upload className="w-6 h-6 text-[#00D4B4]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-white">Tap to upload audio or video file</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    MP3, WAV, M4A, MP4, MOV, WEBM
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: FULL AI STUDIO WORKSPACE (Responsive Dual-Panel)
  // =========================================================================
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Top Header & Breadcrumb (Single Compact Row on Mobile) */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setViewMode('history')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-[#00D4B4]/40 bg-white/5 text-xs font-semibold text-slate-300 hover:text-white transition shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00D4B4]" />
            <span>Files</span>
          </button>
          <span className="text-white font-medium text-xs truncate max-w-[130px] sm:max-w-[260px]">
            {activeFilename || "Session Master"}
          </span>
          <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded shrink-0">
            {formatDurationClean(totalAudioDuration)}
          </span>
        </div>

        <button
          onClick={() => setViewMode('upload')}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition shadow-sm flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Track</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Main Studio Dual Column Layout (Stacks naturally on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Left Column: AI Deliverables Navigator (Hidden on mobile to save vertical space; user uses tabs!) */}
        <div className="hidden lg:block space-y-4">
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-white/5 space-y-3 bg-[#121214]">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Sparkles className="w-4 h-4 text-[#00D4B4]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Deliverables</h3>
            </div>

            <div className="space-y-2.5">
              {/* Polish Deliverable Button */}
              <button
                disabled={loadingAction !== null}
                onClick={() => {
                  if (polishedText) {
                    setActiveTab('polished');
                  } else {
                    handlePolish();
                  }
                }}
                className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  activeTab === 'polished'
                    ? 'border-[#00D4B4] bg-[#00D4B4]/10'
                    : polishedText 
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' 
                    : 'border-white/10 hover:border-[#00D4B4]/40 bg-white/5 hover:bg-[#00D4B4]/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className={`w-4 h-4 ${polishedText ? 'text-emerald-400' : 'text-[#00D4B4]'}`} />
                  <div>
                    <h4 className="text-xs font-bold text-white">Executive Polish</h4>
                    <p className="text-[10px] text-slate-400">Zero filler, structured prose</p>
                  </div>
                </div>
                {loadingAction === 'polish' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00D4B4]" />
                ) : polishedText ? (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-[#00D4B4] bg-[#00D4B4]/10 px-2 py-0.5 rounded-md">Generate</span>
                )}
              </button>

              {/* Social Repurposing Deliverable Button */}
              <button
                disabled={loadingAction !== null}
                onClick={() => {
                  if (socials && Object.keys(socials).length > 0) {
                    setActiveTab('socials');
                  } else {
                    handleSocials();
                  }
                }}
                className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  activeTab === 'socials'
                    ? 'border-[#00D4B4] bg-[#00D4B4]/10'
                    : socials && Object.keys(socials).length > 0
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' 
                    : 'border-white/10 hover:border-[#00D4B4]/40 bg-white/5 hover:bg-[#00D4B4]/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className={`w-4 h-4 ${socials ? 'text-emerald-400' : 'text-[#00D4B4]'}`} />
                  <div>
                    <h4 className="text-xs font-bold text-white">Social Copies</h4>
                    <p className="text-[10px] text-slate-400">Zero-emoji executive copy</p>
                  </div>
                </div>
                {loadingAction === 'socials' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00D4B4]" />
                ) : socials && Object.keys(socials).length > 0 ? (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-[#00D4B4] bg-[#00D4B4]/10 px-2 py-0.5 rounded-md">Generate</span>
                )}
              </button>

              {/* Quiz Deliverable Button */}
              <button
                disabled={loadingAction !== null}
                onClick={() => {
                  if (quizQuestions) {
                    setActiveTab('quiz');
                  } else {
                    handleQuiz();
                  }
                }}
                className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  activeTab === 'quiz'
                    ? 'border-[#00D4B4] bg-[#00D4B4]/10'
                    : quizQuestions 
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' 
                    : 'border-white/10 hover:border-[#00D4B4]/40 bg-white/5 hover:bg-[#00D4B4]/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className={`w-4 h-4 ${quizQuestions ? 'text-emerald-400' : 'text-[#00D4B4]'}`} />
                  <div>
                    <h4 className="text-xs font-bold text-white">Retention Quiz</h4>
                    <p className="text-[10px] text-slate-400">Interactive comprehension test</p>
                  </div>
                </div>
                {loadingAction === 'quiz' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00D4B4]" />
                ) : quizQuestions ? (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-[#00D4B4] bg-[#00D4B4]/10 px-2 py-0.5 rounded-md">Generate</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Workspace */}
        <div className="lg:col-span-2 space-y-4">
          {/* Modern Audio Player Bar with Timestamp Scrubber & Rate */}
          <div className="p-3 sm:p-4 rounded-2xl border border-white/[0.08] bg-[#121316] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="w-9 h-9 rounded-xl bg-[#00D4B4] hover:bg-[#00e5c3] text-[#0D0D0D] flex items-center justify-center transition shadow-[0_0_15px_rgba(0,212,180,0.3)] shrink-0 active:scale-95"
                title={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => seekTo(Math.max(0, playbackTime - 5))}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                title="Rewind 5 seconds"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="font-mono text-xs text-zinc-400 select-none">
                <span className="text-white font-medium">{formatSeconds(playbackTime)}</span>
                <span className="mx-1 text-zinc-600">/</span>
                <span>{formatSeconds(totalAudioDuration || 19)}</span>
              </div>
            </div>

            {/* Scrubber Range Slider */}
            <div className="flex-1 sm:mx-3 flex items-center">
              <input
                type="range"
                min={0}
                max={totalAudioDuration || 19}
                step={0.1}
                value={playbackTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00D4B4] focus:outline-none"
              />
            </div>

            {/* Playback Speed Multiplier */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  const rates = [1, 1.25, 1.5, 2];
                  const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                  setPlaybackRate(next);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white border border-white/5 transition"
                title="Playback speed"
              >
                {playbackRate}x
              </button>
            </div>
          </div>

          {/* Workstation Top Navigation Tabs (Mobile Scrollable) */}
          <div className="glass-card relative z-30 p-2 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#121214] shadow-md">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'raw'
                    ? 'bg-[#00D4B4] text-[#0D0D0D] shadow-md shadow-[#00D4B4]/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Transcript</span>
              </button>

              <button
                onClick={() => {
                  if (!polishedText) handlePolish();
                  else setActiveTab('polished');
                }}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'polished'
                    ? 'bg-[#00D4B4] text-[#0D0D0D] shadow-md shadow-[#00D4B4]/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Polished</span>
                {polishedText && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>

              <button
                onClick={() => {
                  if (!socials) handleSocials();
                  else setActiveTab('socials');
                }}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'socials'
                    ? 'bg-[#00D4B4] text-[#0D0D0D] shadow-md shadow-[#00D4B4]/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Social Copies</span>
                {socials && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>

              <button
                onClick={() => {
                  if (!quizQuestions) handleQuiz();
                  else setActiveTab('quiz');
                }}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'quiz'
                    ? 'bg-[#00D4B4] text-[#0D0D0D] shadow-md shadow-[#00D4B4]/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Quiz</span>
                {quizQuestions && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            </div>

            {/* Global Export Menu */}
            <div className="relative self-end sm:self-auto shrink-0 z-40" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-[#00D4B4]" />
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#1a1b1e] border border-white/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-2 z-50 animate-in fade-in zoom-in-95 space-y-1 backdrop-blur-none">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                    Choose Format
                  </div>

                  <button
                    onClick={() => {
                      exportAsPdf(activeFilename || projectTitle, transcript, segments);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
                  >
                    <span>Print to PDF (.pdf)</span>
                    <span className="text-[10px] font-mono text-[#00D4B4]">PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      exportAsDoc(activeFilename || projectTitle, transcript, segments);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
                  >
                    <span>Word Document (.doc)</span>
                    <span className="text-[10px] font-mono text-blue-400">DOC</span>
                  </button>

                  <button
                    onClick={() => {
                      exportAsMarkdown(activeFilename || projectTitle, transcript, segments);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
                  >
                    <span>Markdown (.md)</span>
                    <span className="text-[10px] font-mono text-purple-400">MD</span>
                  </button>

                  <button
                    onClick={() => {
                      exportAsTxt(activeFilename || projectTitle, transcript);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
                  >
                    <span>Plain Text (.txt)</span>
                    <span className="text-[10px] font-mono text-slate-400">TXT</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TAB 1: RAW TRANSCRIPT */}
          {activeTab === 'raw' && (
            <div className="glass-card relative z-10 p-4 sm:p-6 rounded-2xl border border-white/5 space-y-4 bg-[#121214]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 text-xs">
                    <button
                      onClick={() => {
                        setIsEditingTranscript(false);
                        setReaderMode('document');
                      }}
                      className={`px-2.5 py-1 rounded-lg transition font-medium ${
                        readerMode === 'document' && !isEditingTranscript ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Doc
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingTranscript(false);
                        setReaderMode('timeline');
                      }}
                      className={`px-2.5 py-1 rounded-lg transition font-medium ${
                        readerMode === 'timeline' && !isEditingTranscript ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Timeline
                    </button>
                    <button
                      onClick={() => {
                        setEditedTranscriptText(transcript);
                        setIsEditingTranscript(!isEditingTranscript);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                        isEditingTranscript ? 'bg-[#00D4B4] text-black font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Edit transcript text"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    {wordCount}w &bull; {formatDurationClean(totalAudioDuration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-36 bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4B4]/50"
                    />
                  </div>

                  <button
                    onClick={() => copyToClipboard(transcript, 'raw')}
                    className="p-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-slate-300 hover:text-white transition shrink-0"
                    title="Copy full transcript"
                  >
                    {copiedKey === 'raw' ? <Check className="w-3.5 h-3.5 text-[#00D4B4]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="max-h-[480px] sm:max-h-[580px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                {isEditingTranscript ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedTranscriptText}
                      onChange={(e) => setEditedTranscriptText(e.target.value)}
                      rows={10}
                      className="w-full p-4 rounded-xl bg-black/50 border border-white/15 focus:border-[#00D4B4]/60 text-white text-xs sm:text-sm font-sans leading-relaxed resize-y focus:outline-none"
                      placeholder="Edit your transcript here..."
                    />
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-zinc-500 font-mono">
                        {editedTranscriptText.split(/\s+/).filter(Boolean).length} words
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingTranscript(false)}
                          className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTranscript(editedTranscriptText);
                            setWordCount(editedTranscriptText.split(/\s+/).filter(Boolean).length);
                            setHistoryItems((prev) =>
                              prev.map((item) =>
                                item.id === activeSessionId
                                  ? { ...item, transcript: editedTranscriptText }
                                  : item
                              )
                            );
                            setIsEditingTranscript(false);
                          }}
                          className="px-4 py-1.5 rounded-lg bg-[#00D4B4] hover:bg-[#00e5c3] text-black font-semibold transition shadow-sm"
                        >
                          Save changes
                        </button>
                      </div>
                    </div>
                  </div>
                ) : readerMode === 'document' ? (
                  <div className="text-slate-200 text-xs sm:text-sm leading-relaxed space-y-4 font-serif">
                    {transcript.split('\n').filter(Boolean).map((para, pIdx) => {
                      if (!searchQuery.trim()) {
                        return <p key={pIdx} className="leading-6 sm:leading-7">{para}</p>;
                      }
                      const parts = para.split(new RegExp(`(${searchQuery})`, 'gi'));
                      return (
                        <p key={pIdx} className="leading-6 sm:leading-7">
                          {parts.map((part, i) =>
                            part.toLowerCase() === searchQuery.toLowerCase() ? (
                              <mark key={i} className="bg-[#00D4B4]/30 text-white rounded px-1">{part}</mark>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 font-sans">
                    {segments.map((seg) => {
                      const matches = searchQuery.trim() && seg.text.toLowerCase().includes(searchQuery.toLowerCase());
                      const isActive = playbackTime >= seg.start && playbackTime <= seg.end;
                      return (
                        <div
                          key={seg.id}
                          onClick={() => seekTo(seg.start)}
                          className={`p-2.5 sm:p-3 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                            isActive
                              ? 'bg-[#00D4B4]/15 border-[#00D4B4]/60 shadow-[0_0_15px_rgba(0,212,180,0.15)] ring-1 ring-[#00D4B4]/30'
                              : matches
                              ? 'bg-[#00D4B4]/10 border-[#00D4B4]/30'
                              : 'bg-black/30 border-white/5 hover:border-white/20'
                          }`}
                        >
                          <span className={`text-[10px] sm:text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5 transition ${
                            isActive 
                              ? 'bg-[#00D4B4] text-black font-bold' 
                              : 'text-[#00D4B4] bg-[#00D4B4]/10'
                          }`}>
                            {formatSeconds(seg.start)} - {formatSeconds(seg.end)}
                          </span>
                          <p className={`text-xs leading-relaxed flex-1 transition ${isActive ? 'text-white font-medium' : 'text-slate-200'}`}>
                            {seg.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: POLISHED DOCUMENT */}
          {activeTab === 'polished' && (
            <div className="glass-card relative z-10 p-4 sm:p-6 rounded-2xl border border-white/5 space-y-4 bg-[#121214]">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#00D4B4]" />
                    Executive Polished Document
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(polishedText, 'polished')}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5"
                  >
                    {copiedKey === 'polished' ? <Check className="w-3.5 h-3.5 text-[#00D4B4]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={handlePolish}
                    disabled={loadingAction === 'polish'}
                    className="p-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-slate-300 hover:text-white transition"
                    title="Regenerate polish"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'polish' ? 'animate-spin text-[#00D4B4]' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingAction === 'polish' ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00D4B4] mx-auto" />
                  <p className="text-xs text-slate-400">Polishing transcript into clean executive document...</p>
                </div>
              ) : !polishedText ? (
                <div className="py-16 px-4 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#00D4B4]/10 border border-[#00D4B4]/20 flex items-center justify-center text-[#00D4B4] mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Executive Polish</h4>
                  <p className="text-xs text-zinc-400">
                    Transform raw speech into structured, publication-ready prose without filler words.
                  </p>
                  <button
                    onClick={handlePolish}
                    className="mt-2 px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl transition shadow inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#00D4B4]" />
                    <span>Generate Executive Polish (5 Credits)</span>
                  </button>
                </div>
              ) : (
                <div className="max-h-[480px] sm:max-h-[580px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar text-slate-200 text-xs sm:text-sm leading-relaxed space-y-4 font-serif">
                  {polishedText.split('\n\n').map((block, idx) => {
                    if (block.startsWith('#')) {
                      return <h4 key={idx} className="text-sm sm:text-base font-bold text-white font-sans mt-3">{block.replace(/^#+\s*/, '')}</h4>;
                    }
                    return <p key={idx} className="leading-6 sm:leading-7">{block}</p>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOCIAL MEDIA COPIES */}
          {activeTab === 'socials' && (
            <div className="glass-card relative z-10 p-4 sm:p-6 rounded-2xl border border-white/5 space-y-4 bg-[#121214]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#00D4B4]" />
                    Social Media Copies
                  </h3>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={handleExportSocialPack}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#00D4B4]/30 hover:border-[#00D4B4] bg-[#00D4B4]/10 text-xs font-semibold text-[#00D4B4] hover:bg-[#00D4B4] hover:text-[#0D0D0D] transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pack (.md)</span>
                  </button>

                  <button
                    onClick={handleSocials}
                    disabled={loadingAction === 'socials'}
                    className="p-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-slate-300 hover:text-white transition"
                    title="Regenerate social copies"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'socials' ? 'animate-spin text-[#00D4B4]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Responsive Platform Selector Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'twitter_thread', label: 'Twitter / X' },
                  { id: 'linkedin_post', label: 'LinkedIn' },
                  { id: 'instagram_caption', label: 'Instagram' },
                  { id: 'tiktok_hook', label: 'TikTok Hooks' },
                  { id: 'youtube_description', label: 'YouTube' },
                  { id: 'threads_post', label: 'Threads' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSocialPlatformFilter(p.id)}
                    className={`px-3 py-1 rounded-lg whitespace-nowrap transition font-medium shrink-0 ${
                      socialPlatformFilter === p.id
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {loadingAction === 'socials' ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00D4B4] mx-auto" />
                  <p className="text-xs text-slate-400">Generating clean executive copy...</p>
                </div>
              ) : !socials || Object.keys(socials).length === 0 ? (
                <div className="py-16 px-4 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#00D4B4]/10 border border-[#00D4B4]/20 flex items-center justify-center text-[#00D4B4] mx-auto">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Social Media Copies</h4>
                  <p className="text-xs text-zinc-400">
                    Repurpose this transcript into high-impact Twitter threads, LinkedIn posts, and Instagram captions.
                  </p>
                  <button
                    onClick={handleSocials}
                    className="mt-2 px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl transition shadow inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#00D4B4]" />
                    <span>Generate Social Copies (5 Credits)</span>
                  </button>
                </div>
              ) : (
                <div className="max-h-[480px] sm:max-h-[560px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar space-y-3 sm:space-y-4">
                  {/* Twitter / X Thread */}
                  {(socialPlatformFilter === 'all' || socialPlatformFilter === 'twitter_thread') && socials.twitter_thread && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <Twitter className="w-4 h-4 text-sky-400" /> Twitter / X Thread
                        </span>
                        <button
                          onClick={() => copyToClipboard(cleanProfessionalText(socials.twitter_thread), 'twitter')}
                          className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                          {copiedKey === 'twitter' ? <Check className="w-3 h-3 text-[#00D4B4]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'twitter' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed space-y-2">
                        {cleanProfessionalText(socials.twitter_thread)}
                      </div>
                    </div>
                  )}

                  {/* LinkedIn Post */}
                  {(socialPlatformFilter === 'all' || socialPlatformFilter === 'linkedin_post') && socials.linkedin_post && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <Linkedin className="w-4 h-4 text-blue-400" /> LinkedIn Executive Post
                        </span>
                        <button
                          onClick={() => copyToClipboard(cleanProfessionalText(socials.linkedin_post), 'linkedin')}
                          className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                          {copiedKey === 'linkedin' ? <Check className="w-3 h-3 text-[#00D4B4]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'linkedin' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {cleanProfessionalText(socials.linkedin_post)}
                      </div>
                    </div>
                  )}

                  {/* Instagram Story & Caption */}
                  {(socialPlatformFilter === 'all' || socialPlatformFilter === 'instagram_caption') && socials.instagram_caption && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-pink-400" /> Instagram Caption
                        </span>
                        <button
                          onClick={() => copyToClipboard(cleanProfessionalText(socials.instagram_caption), 'instagram')}
                          className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                          {copiedKey === 'instagram' ? <Check className="w-3 h-3 text-[#00D4B4]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'instagram' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {cleanProfessionalText(socials.instagram_caption)}
                      </div>
                    </div>
                  )}

                  {/* TikTok Hooks */}
                  {(socialPlatformFilter === 'all' || socialPlatformFilter === 'tiktok_hook') && socials.tiktok_hook && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <Video className="w-4 h-4 text-[#00D4B4]" /> TikTok & Shorts Hooks
                        </span>
                        <button
                          onClick={() => copyToClipboard(cleanProfessionalText(socials.tiktok_hook), 'tiktok')}
                          className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                          {copiedKey === 'tiktok' ? <Check className="w-3 h-3 text-[#00D4B4]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'tiktok' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {cleanProfessionalText(socials.tiktok_hook)}
                      </div>
                    </div>
                  )}

                  {/* YouTube SEO Description */}
                  {(socialPlatformFilter === 'all' || socialPlatformFilter === 'youtube_description') && socials.youtube_description && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <Youtube className="w-4 h-4 text-red-400" /> YouTube Description
                        </span>
                        <button
                          onClick={() => copyToClipboard(cleanProfessionalText(socials.youtube_description), 'youtube')}
                          className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                          {copiedKey === 'youtube' ? <Check className="w-3 h-3 text-[#00D4B4]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'youtube' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {cleanProfessionalText(socials.youtube_description)}
                      </div>
                    </div>
                  )}

                  {/* Threads */}
                  {(socialPlatformFilter === 'all' || socialPlatformFilter === 'threads_post') && socials.threads_post && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <Send className="w-4 h-4 text-slate-300" /> Threads Micro-Post
                        </span>
                        <button
                          onClick={() => copyToClipboard(cleanProfessionalText(socials.threads_post), 'threads')}
                          className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                          {copiedKey === 'threads' ? <Check className="w-3 h-3 text-[#00D4B4]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'threads' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {cleanProfessionalText(socials.threads_post)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RETENTION QUIZ */}
          {activeTab === 'quiz' && (
            <div className="glass-card relative z-10 p-4 sm:p-6 rounded-2xl border border-white/5 space-y-4 bg-[#121214]">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#00D4B4]" />
                    Retention Quiz
                  </h3>
                </div>

                <button
                  onClick={handleQuiz}
                  disabled={loadingAction === 'quiz'}
                  className="p-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-slate-300 hover:text-white transition"
                  title="Generate new quiz"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'quiz' ? 'animate-spin text-[#00D4B4]' : ''}`} />
                </button>
              </div>

              {loadingAction === 'quiz' ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00D4B4] mx-auto" />
                  <p className="text-xs text-slate-400">Generating quiz questions...</p>
                </div>
              ) : quizQuestions && quizQuestions.length > 0 ? (
                <div className="space-y-3.5 max-h-[480px] sm:max-h-[580px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                  {quizQuestions.map((q, qIdx) => {
                    const selectedOpt = userAnswers[qIdx];
                    return (
                      <div key={qIdx} className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/5 space-y-2.5">
                        <p className="text-xs font-bold text-white">
                          <span className="text-[#00D4B4] font-mono mr-1.5">Q{qIdx + 1}.</span>
                          {q.question}
                        </p>

                        <div className="space-y-1.5">
                          {q.options.map((opt, optIdx) => {
                            let btnStyle = 'border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/5';
                            if (quizSubmitted) {
                              if (optIdx === q.answer_index) {
                                btnStyle = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-semibold';
                              } else if (selectedOpt === optIdx) {
                                btnStyle = 'border-red-500/50 bg-red-500/10 text-red-300 line-through';
                              }
                            } else if (selectedOpt === optIdx) {
                              btnStyle = 'border-[#00D4B4]/50 bg-[#00D4B4]/10 text-white font-semibold';
                            }

                            return (
                              <button
                                key={optIdx}
                                disabled={quizSubmitted}
                                onClick={() => setUserAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                                className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {quizSubmitted && optIdx === q.answer_index && (
                                  <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && (
                          <p className="text-[11px] text-slate-400 pt-2 border-t border-white/5 italic">
                            <span className="text-[#00D4B4] not-italic font-semibold">Explanation: </span>
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    {!quizSubmitted ? (
                      <button
                        onClick={() => setQuizSubmitted(true)}
                        className="px-4 py-2 bg-white hover:bg-white/90 text-black text-xs font-bold rounded-xl transition shadow-sm"
                      >
                        Submit &amp; Grade
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <p className="text-xs font-mono text-white">
                          Score:{' '}
                          <span className="text-[#00D4B4] font-bold">
                            {quizQuestions.filter((q, i) => userAnswers[i] === q.answer_index).length}
                          </span>{' '}
                          / {quizQuestions.length}
                        </p>
                        <button
                          onClick={() => {
                            setUserAnswers({});
                            setQuizSubmitted(false);
                          }}
                          className="text-xs text-slate-400 hover:text-white underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <p className="text-xs text-slate-400">No quiz generated yet.</p>
                  <button
                    onClick={handleQuiz}
                    className="px-4 py-2 bg-white hover:bg-white/90 text-black text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    Generate Quiz
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
