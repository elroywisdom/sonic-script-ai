'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { 
  Mic, 
  Scissors, 
  Film, 
  ArrowLeft, 
  Lock, 
  Trash2, 
  Loader2, 
  MoreVertical, 
  Pencil, 
  X 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ProjectDetail {
  id: string;
  title: string;
  description?: string;
  project_type: string;
  aspect_ratio: string;
}

export default function ProjectStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const [project, setProject] = useState<ProjectDetail | null>(null);

  // Modals & Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setMenuOpen(false);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const fetchProject = () => {
    if (projectId) {
      apiFetch<ProjectDetail>(`/projects/${projectId}`).then((res) => {
        if (res.success && res.data) {
          setProject(res.data);
          setEditTitle(res.data.title);
          setEditDescription(res.data.description || '');
        }
      });
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    try {
      setSavingEdit(true);
      setEditError(null);
      const res = await apiFetch<any>(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
        }),
      });

      if (res.success) {
        setProject((prev) => prev ? { ...prev, title: editTitle.trim(), description: editDescription.trim() } : prev);
        setShowEditModal(false);
      } else {
        setEditError(res.error || 'Failed to update project details');
      }
    } catch (err: any) {
      setEditError(err.message || 'An error occurred');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const res = await apiFetch(`/projects/${projectId}`, {
      method: 'DELETE',
    });
    setDeleting(false);
    if (res.success) {
      router.push('/projects');
    } else {
      setDeleteError(res.error || 'Failed to delete project. Please try again.');
    }
  };

  const isSpeech = pathname.includes('/speech');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Studio Header & Breadcrumbs */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3 sm:pb-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#00D4B4] transition mb-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
          </Link>
          <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate">
            {project?.title || "Project Studio"}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mode Switcher Tabs (Desktop Only - cleanly hidden on mobile to avoid clutter) */}
          <div className="hidden md:flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] gap-1">
            {/* Active: Speech & Transcript */}
            <Link
              href={`/projects/${projectId}/speech`}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
                isSpeech
                  ? "bg-[#00D4B4] text-[#0D0D0D] shadow-[0_0_15px_rgba(0,212,180,0.3)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Mic className="w-3.5 h-3.5" /> Speech &amp; Transcript
            </Link>

            {/* Locked: Viral Shorts */}
            <div
              className="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 text-zinc-500 bg-white/[0.02] cursor-not-allowed opacity-50 select-none"
              title="Viral Shorts is currently locked in active development"
            >
              <Scissors className="w-3.5 h-3.5 opacity-60" />
              <span>Viral Shorts</span>
              <span className="text-[8px] uppercase tracking-wider font-mono px-1 py-0.5 rounded bg-white/5 text-zinc-400 flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            </div>

            {/* Locked: AI Film Studio */}
            <div
              className="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 text-zinc-500 bg-white/[0.02] cursor-not-allowed opacity-50 select-none"
              title="AI Film Studio is currently locked in active development"
            >
              <Film className="w-3.5 h-3.5 opacity-60" />
              <span>AI Film Studio</span>
              <span className="text-[8px] uppercase tracking-wider font-mono px-1 py-0.5 rounded bg-white/5 text-zinc-400 flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            </div>
          </div>

          {/* Claude-Style Three-Dots Project Options Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              title="Project options"
              className={`p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl border border-white/[0.08] transition ${
                menuOpen ? 'bg-white/10 text-white' : ''
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div 
                className="absolute right-0 top-10 z-50 w-44 rounded-xl bg-[#1a1b1e] border border-white/10 shadow-2xl p-1.5 text-xs text-zinc-200 animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(true);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition text-left"
                >
                  <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Edit details</span>
                </button>

                <div className="my-1 border-t border-white/[0.08]" />

                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(true);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Delete project</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>{children}</div>

      {/* Edit Details Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#121316] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-medium text-white">Edit project details</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Project name</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Sonic AI Podcast"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Description (optional)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a brief description..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editTitle.trim()}
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-medium rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121316] rounded-2xl border border-red-500/30 w-full max-w-md p-6 shadow-2xl space-y-5 relative animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">Delete Project</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-semibold">"{project?.title || 'this project'}"</span>? All audio recordings, stems, and generated transcripts will be permanently removed.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
