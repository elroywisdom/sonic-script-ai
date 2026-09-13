'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FolderPlus, 
  Trash2, 
  Loader2, 
  X, 
  Search,
  ArrowUpDown,
  Plus,
  MoreVertical,
  Pin,
  Pencil,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Project {
  id: string;
  title: string;
  description?: string;
  project_type: 'speech_transcription' | 'viral_shorts' | 'generative_film' | 'mixed_media';
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter & View
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Claude-style Card Actions State
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Edit details modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete project modal
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Load pinned & archived from localStorage
  useEffect(() => {
    try {
      const savedPins = localStorage.getItem('sonic_pinned_projects');
      if (savedPins) setPinnedIds(JSON.parse(savedPins));

      const savedArchives = localStorage.getItem('sonic_archived_projects');
      if (savedArchives) setArchivedIds(JSON.parse(savedArchives));
    } catch (e) {}
  }, []);

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      localStorage.setItem('sonic_pinned_projects', JSON.stringify(next));
      return next;
    });
  };

  const toggleArchive = (id: string) => {
    setArchivedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      localStorage.setItem('sonic_archived_projects', JSON.stringify(next));
      return next;
    });
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<any>('/projects');
      if (res.success) {
        if (Array.isArray(res.data)) {
          setProjects(res.data);
        } else if (res.data && Array.isArray(res.data.projects)) {
          setProjects(res.data.projects);
        } else {
          setProjects([]);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      setError(null);
      const res = await apiFetch<any>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          project_type: 'speech_transcription',
        }),
      });

      if (res.success) {
        setTitle('');
        setDescription('');
        setModalOpen(false);
        fetchProjects();
      } else {
        setError(res.error || 'Failed to create project');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editTitle.trim()) return;

    try {
      setSavingEdit(true);
      setEditError(null);
      const res = await apiFetch<any>(`/projects/${editingProject.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
        }),
      });

      if (res.success) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id
              ? { ...p, title: editTitle.trim(), description: editDescription.trim() }
              : p
          )
        );
        setEditingProject(null);
      } else {
        setEditError(res.error || 'Failed to update project');
      }
    } catch (err: any) {
      setEditError(err.message || 'An error occurred');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await apiFetch<any>(`/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
        setPinnedIds((prev) => prev.filter((id) => id !== projectToDelete.id));
        setArchivedIds((prev) => prev.filter((id) => id !== projectToDelete.id));
        setProjectToDelete(null);
      } else {
        setDeleteError(res.error || 'Failed to delete project');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'An error occurred during deletion');
    } finally {
      setDeleting(false);
    }
  };

  const getSubpath = (type: string) => {
    if (type === 'viral_shorts') return 'shorts';
    if (type === 'generative_film') return 'film';
    return 'speech';
  };

  // Natural Claude-style date format (e.g. "21 hours ago", "yesterday", "2 days ago", "Aug 19")
  const formatClaudeDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffHours < 1) return 'just now';
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 14) return '7 days ago';

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'recently';
    }
  };

  // Filter & Sort: Pinned float to top, followed by date sort
  const visibleProjects = projects.filter((p) => {
    const isArchived = archivedIds.includes(p.id);
    return showArchived ? isArchived : !isArchived;
  });

  const filteredProjects = visibleProjects
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Claude-Style Clean Header */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-normal text-white tracking-tight">Projects</h1>
          {archivedIds.length > 0 && (
            <button
              onClick={() => setShowArchived((prev) => !prev)}
              className={`text-xs px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 ${
                showArchived
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white'
              }`}
            >
              <Archive className="w-3 h-3" />
              <span>{showArchived ? 'Viewing Archived' : `Archived (${archivedIds.length})`}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="bg-white/[0.04] border border-white/[0.08] hover:border-white/20 focus:border-white/30 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition w-36 sm:w-56"
            />
          </div>

          {/* Sort Button */}
          <button
            onClick={() => setSortAsc((prev) => !prev)}
            title={sortAsc ? "Sort newest first" : "Sort oldest first"}
            className="p-2 rounded-xl border border-white/[0.08] hover:border-white/20 bg-white/[0.04] text-zinc-400 hover:text-white transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* New Project Button (Claude-Style crisp white pill) */}
          <button
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-medium rounded-xl transition shadow-sm flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> New project
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 min-h-[140px] animate-pulse flex flex-col justify-between"
            >
              <div>
                <div className="h-5 bg-white/10 rounded w-1/2 mb-3" />
                <div className="h-3 bg-white/5 rounded w-3/4" />
              </div>
              <div className="h-3 bg-white/5 rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className="rounded-2xl p-12 text-center max-w-md mx-auto border border-dashed border-white/10 my-16">
          <h3 className="text-base font-medium text-white">No projects yet</h3>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Create your first project to transcribe audio, extract insights, and generate summaries.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-6 px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl transition shadow inline-flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" /> New project
          </button>
        </div>
      )}

      {/* No Search Match State */}
      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="p-12 text-center text-zinc-500 space-y-1">
          <p className="text-sm font-medium text-zinc-400">
            {showArchived ? 'No archived projects found' : 'No matching projects'}
          </p>
          <p className="text-xs text-zinc-500">
            {showArchived 
              ? 'You have not archived any projects yet.' 
              : `No project titles or descriptions match "${searchQuery}".`}
          </p>
        </div>
      )}

      {/* Claude-Style 2-Column Clean Cards Grid */}
      {!loading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p) => {
            const subpath = getSubpath(p.project_type);
            const isPinned = pinnedIds.includes(p.id);
            const isArchived = archivedIds.includes(p.id);
            const isMenuOpen = activeMenuId === p.id;

            return (
              <div
                key={p.id}
                className="group relative rounded-2xl border border-white/[0.08] hover:border-white/20 bg-[#121316]/50 hover:bg-[#16171b]/80 transition-all p-5 sm:p-6 min-h-[140px] flex flex-col justify-between"
              >
                {/* Clickable Card Link for Navigation */}
                <Link
                  href={`/projects/${p.id}/${subpath}`}
                  className="absolute inset-0 z-0 rounded-2xl"
                  title={`Open ${p.title}`}
                />

                <div className="relative z-10 pointer-events-none">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <h3 className="text-base font-medium text-white group-hover:text-zinc-100 transition truncate">
                        {p.title}
                      </h3>
                      {/* Claude-style Pin Outline Icon when pinned */}
                      {isPinned && (
                        <Pin className="w-3.5 h-3.5 text-zinc-400 -rotate-45 shrink-0" />
                      )}
                    </div>
                    
                    {/* Claude-Style Three-Dots Menu Button */}
                    <div className="relative shrink-0 pointer-events-auto">
                      <button
                        type="button"
                        title="More options"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveMenuId((prev) => (prev === p.id ? null : p.id));
                        }}
                        className={`p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition ${
                          isMenuOpen ? 'opacity-100 bg-white/10 text-white' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Claude Popover Menu */}
                      {isMenuOpen && (
                        <div 
                          className="absolute right-0 top-8 z-50 w-44 rounded-xl bg-[#1a1b1e] border border-white/10 shadow-2xl p-1.5 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          {/* Pin / Unpin */}
                          <button
                            type="button"
                            onClick={() => {
                              togglePin(p.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition text-left"
                          >
                            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-[#00D4B4] -rotate-45' : 'text-zinc-400'}`} />
                            <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                          </button>

                          {/* Edit details */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProject(p);
                              setEditTitle(p.title);
                              setEditDescription(p.description || '');
                              setEditError(null);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition text-left"
                          >
                            <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Edit details</span>
                          </button>

                          {/* Divider */}
                          <div className="my-1 border-t border-white/[0.08]" />

                          {/* Archive / Unarchive */}
                          <button
                            type="button"
                            onClick={() => {
                              toggleArchive(p.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition text-left"
                          >
                            {isArchived ? (
                              <>
                                <ArchiveRestore className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Unarchive</span>
                              </>
                            ) : (
                              <>
                                <Archive className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Archive</span>
                              </>
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setProjectToDelete(p);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {p.description ? (
                    <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed font-normal">
                      {p.description}
                    </p>
                  ) : (
                    <div className="h-4" />
                  )}
                </div>

                {/* Relative timestamp matching Claude */}
                <div className="pt-3 text-xs text-zinc-500 font-normal relative z-10 pointer-events-none flex items-center justify-between">
                  <span>{formatClaudeDate(p.created_at)}</span>
                  {isArchived && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                      Archived
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Details Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#121316] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-medium text-white">Edit project details</h3>
              <button
                onClick={() => setEditingProject(null)}
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
                  placeholder="e.g. Venture Valley Podcast"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Description (optional)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a brief description or notes for this project..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
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

      {/* Claude-Inspired Clean New Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#121316] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-medium text-white">Create project</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Project name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Investor Call, Papandu Podcast"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a brief description or instructions..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !title.trim()}
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-medium rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create project</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-[#121316] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-medium text-white">Delete project?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete <span className="text-white font-semibold">"{projectToDelete.title}"</span>? This will permanently delete all associated recordings, transcripts, and insights. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-medium rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete project</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
