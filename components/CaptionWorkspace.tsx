'use client';

import { useState } from 'react';

export interface YouTubeCaptions {
  titles: string[];
  description: string;
  tags: string[];
}

export interface InstagramCaptions {
  caption: string;
  hashtags: string[];
}

export interface LinkedInCaptions {
  post: string;
  hashtags: string[];
}

export interface WhatsAppCaptions {
  message: string;
}

export interface TikTokCaptions {
  caption: string;
  hooks: string[];
  hashtags: string[];
}

export interface CaptionData {
  youtube: YouTubeCaptions;
  instagram: InstagramCaptions;
  linkedin: LinkedInCaptions;
  whatsapp: WhatsAppCaptions;
  tiktok: TikTokCaptions;
}

interface CaptionWorkspaceProps {
  data: CaptionData;
  onClose: () => void;
}

type Platform = 'youtube' | 'instagram' | 'linkedin' | 'whatsapp' | 'tiktok';

export default function CaptionWorkspace({ data, onClose }: CaptionWorkspaceProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>('youtube');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyText = async (text: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    }
  };

  const generateMarkdown = () => {
    let md = `# SonicScript AI - Social Media Content Pack\n\n`;

    // YouTube
    md += `## 🎥 YouTube Video Details\n\n`;
    md += `### Suggested Titles:\n`;
    data.youtube.titles.forEach((t, i) => {
      md += `${i + 1}. ${t}\n`;
    });
    md += `\n### Video Description:\n\`\`\`text\n${data.youtube.description}\n\`\`\`\n\n`;
    md += `### Video Tags:\n${data.youtube.tags.join(', ')}\n\n`;
    md += `---\n\n`;

    // Instagram
    md += `## 📸 Instagram Post\n\n`;
    md += `\`\`\`text\n${data.instagram.caption}\n\n`;
    md += `${data.instagram.hashtags.join(' ')}\n\`\`\`\n\n`;
    md += `---\n\n`;

    // LinkedIn
    md += `## 💼 LinkedIn Post\n\n`;
    md += `\`\`\`text\n${data.linkedin.post}\n\n`;
    md += `${data.linkedin.hashtags.join(' ')}\n\`\`\`\n\n`;
    md += `---\n\n`;

    // WhatsApp
    md += `## 💬 WhatsApp Broadcast Message\n\n`;
    md += `\`\`\`text\n${data.whatsapp.message}\n\`\`\`\n\n`;
    md += `---\n\n`;

    // TikTok
    md += `## 🎵 TikTok / Reels Video Details\n\n`;
    md += `### Snappy Caption:\n\`\`\`text\n${data.tiktok.caption}\n\`\`\`\n\n`;
    md += `### Video Hook Suggestions:\n`;
    data.tiktok.hooks.forEach((h, i) => {
      md += `- "${h}"\n`;
    });
    md += `\n### TikTok Hashtags:\n${data.tiktok.hashtags.join(' ')}\n`;

    return md;
  };

  const handleDownloadMarkdown = () => {
    const mdContent = generateMarkdown();
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `social-pack-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl space-y-6 animate-fade-in relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
      {/* Glow backgrounds */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-purple-500/5 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-muted-foreground border-b border-white/5 pb-3 relative z-10">
        <span className="tracking-wider">SOCIAL MEDIA POST GENERATOR</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadMarkdown}
            className="hover:text-accent text-white/50 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded text-[10px]"
          >
            Download Pack (.md)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-white/5 relative z-10 gap-1 sm:gap-2">
        {/* YouTube Tab */}
        <button
          onClick={() => setActivePlatform('youtube')}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all duration-300 ${
            activePlatform === 'youtube'
              ? 'border-red-500 text-red-500 bg-red-500/5'
              : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.386.507 9.386.507s7.517 0 9.389-.507a3.002 3.002 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          YouTube
        </button>

        {/* Instagram Tab */}
        <button
          onClick={() => setActivePlatform('instagram')}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all duration-300 ${
            activePlatform === 'instagram'
              ? 'border-pink-500 text-pink-500 bg-pink-500/5'
              : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
          </svg>
          Instagram
        </button>

        {/* LinkedIn Tab */}
        <button
          onClick={() => setActivePlatform('linkedin')}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all duration-300 ${
            activePlatform === 'linkedin'
              ? 'border-blue-500 text-blue-500 bg-blue-500/5'
              : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
          LinkedIn
        </button>

        {/* WhatsApp Tab */}
        <button
          onClick={() => setActivePlatform('whatsapp')}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all duration-300 ${
            activePlatform === 'whatsapp'
              ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
              : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/>
          </svg>
          WhatsApp
        </button>

        {/* TikTok Tab */}
        <button
          onClick={() => setActivePlatform('tiktok')}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all duration-300 ${
            activePlatform === 'tiktok'
              ? 'border-teal-400 text-teal-400 bg-teal-400/5'
              : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.03 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.52-4.06-1.39-.77-.57-1.39-1.34-1.82-2.23-.02 1.37-.17 2.73-.24 4.09-.2 3.14-2.18 6.13-5.26 7.12-3.14 1.07-6.96.14-9.01-2.52C-.07 12.35-.61 8.09 1.42 5.05c1.86-2.77 5.56-4.11 8.82-3.23.01 1.34 0 2.69-.01 4.03-1.89-.47-3.99.16-5.07 1.77-1.25 1.83-.81 4.67 1.03 6.01 1.79 1.36 4.54 1 5.92-.8 1-.95 1.32-2.31 1.36-3.6.05-3.05.02-6.1.05-9.15.02-.02.02-.04.05-.06z"/>
          </svg>
          TikTok
        </button>
      </div>

      {/* Content Panels */}
      <div className="relative z-10 min-h-[350px] flex flex-col justify-between">
        {/* YouTube Workspace */}
        {activePlatform === 'youtube' && (
          <div className="space-y-5 animate-fade-in">
            {/* Titles */}
            <div className="space-y-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                Recommended Titles (High CTR)
              </span>
              <div className="space-y-2">
                {data.youtube.titles.map((title, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-3 bg-black/40 border border-white/5 rounded-lg group hover:border-red-500/20 transition-all duration-200"
                  >
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <button
                      onClick={() => handleCopyText(title, `yt-title-${i}`)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-red-400 font-mono text-[9px] text-muted-foreground transition-all duration-200 shrink-0"
                    >
                      {copiedSection === `yt-title-${i}` ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                  Video Description
                </span>
                <button
                  onClick={() => handleCopyText(data.youtube.description, 'yt-desc')}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-red-400 font-mono text-[9px] text-muted-foreground transition-all duration-200"
                >
                  {copiedSection === 'yt-desc' ? 'Copied Description ✓' : 'Copy Description'}
                </button>
              </div>
              <textarea
                readOnly
                value={data.youtube.description}
                className="scroller w-full h-[220px] p-4 bg-black/30 border border-white/5 rounded-xl font-mono text-sm text-white/90 leading-relaxed resize-none focus:outline-none focus:border-red-500/30 transition-all duration-300"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                  Tags & SEO Keywords
                </span>
                <button
                  onClick={() => handleCopyText(data.youtube.tags.join(', '), 'yt-tags')}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-red-400 font-mono text-[9px] text-muted-foreground transition-all duration-200"
                >
                  {copiedSection === 'yt-tags' ? 'Copied ✓' : 'Copy Tags'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 bg-black/20 border border-white/5 rounded-lg max-h-[100px] overflow-y-auto scroller">
                {data.youtube.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/15"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instagram Workspace */}
        {activePlatform === 'instagram' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                Instagram Caption
              </span>
              <button
                onClick={() =>
                  handleCopyText(
                    `${data.instagram.caption}\n\n${data.instagram.hashtags.join(' ')}`,
                    'ig-all'
                  )
                }
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-pink-400 font-mono text-[9px] text-muted-foreground transition-all duration-200"
              >
                {copiedSection === 'ig-all' ? 'Copied Post ✓' : 'Copy Post'}
              </button>
            </div>
            <textarea
              readOnly
              value={`${data.instagram.caption}\n\n${data.instagram.hashtags.join(' ')}`}
              className="scroller w-full h-[320px] p-4 bg-black/30 border border-white/5 rounded-xl font-mono text-sm text-white/90 leading-relaxed resize-none focus:outline-none focus:border-pink-500/30 transition-all duration-300"
            />
          </div>
        )}

        {/* LinkedIn Workspace */}
        {activePlatform === 'linkedin' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                LinkedIn Thought Leadership Post
              </span>
              <button
                onClick={() =>
                  handleCopyText(
                    `${data.linkedin.post}\n\n${data.linkedin.hashtags.join(' ')}`,
                    'li-all'
                  )
                }
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-blue-400 font-mono text-[9px] text-muted-foreground transition-all duration-200"
              >
                {copiedSection === 'li-all' ? 'Copied Post ✓' : 'Copy Post'}
              </button>
            </div>
            <textarea
              readOnly
              value={`${data.linkedin.post}\n\n${data.linkedin.hashtags.join(' ')}`}
              className="scroller w-full h-[320px] p-4 bg-black/30 border border-white/5 rounded-xl font-mono text-sm text-white/90 leading-relaxed resize-none focus:outline-none focus:border-blue-500/30 transition-all duration-300"
            />
          </div>
        )}

        {/* WhatsApp Workspace */}
        {activePlatform === 'whatsapp' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                WhatsApp Broadcast Message
              </span>
              <button
                onClick={() => handleCopyText(data.whatsapp.message, 'wa-all')}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-emerald-400 font-mono text-[9px] text-muted-foreground transition-all duration-200"
              >
                {copiedSection === 'wa-all' ? 'Copied Message ✓' : 'Copy Message'}
              </button>
            </div>
            <textarea
              readOnly
              value={data.whatsapp.message}
              className="scroller w-full h-[320px] p-4 bg-black/30 border border-white/5 rounded-xl font-mono text-sm text-white/90 leading-relaxed resize-none focus:outline-none focus:border-emerald-500/30 transition-all duration-300"
            />
          </div>
        )}

        {/* TikTok Workspace */}
        {activePlatform === 'tiktok' && (
          <div className="space-y-5 animate-fade-in">
            {/* Hooks */}
            <div className="space-y-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                Verbal Hook Suggestions (Short-form video openings)
              </span>
              <div className="space-y-2">
                {data.tiktok.hooks.map((hook, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-3 bg-black/40 border border-white/5 rounded-lg group hover:border-teal-400/20 transition-all duration-200"
                  >
                    <p className="text-sm font-medium text-foreground">&ldquo;{hook}&rdquo;</p>
                    <button
                      onClick={() => handleCopyText(hook, `tt-hook-${i}`)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-teal-400 font-mono text-[9px] text-muted-foreground transition-all duration-200 shrink-0"
                    >
                      {copiedSection === `tt-hook-${i}` ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                  TikTok Caption
                </span>
                <button
                  onClick={() =>
                    handleCopyText(
                      `${data.tiktok.caption}\n\n${data.tiktok.hashtags.join(' ')}`,
                      'tt-caption'
                    )
                  }
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-teal-400 font-mono text-[9px] text-muted-foreground transition-all duration-200"
                >
                  {copiedSection === 'tt-caption' ? 'Copied Caption ✓' : 'Copy Caption'}
                </button>
              </div>
              <textarea
                readOnly
                value={`${data.tiktok.caption}\n\n${data.tiktok.hashtags.join(' ')}`}
                className="scroller w-full h-[180px] p-4 bg-black/30 border border-white/5 rounded-xl font-mono text-sm text-white/90 leading-relaxed resize-none focus:outline-none focus:border-teal-400/30 transition-all duration-300"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="
              px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider
              bg-accent text-background hover:bg-accent/90 hover:shadow-[0_0_15px_rgba(0,212,180,0.3)]
              transition-all duration-200 active:scale-95
            "
          >
            Close Generator
          </button>
        </div>
      </div>
    </div>
  );
}
