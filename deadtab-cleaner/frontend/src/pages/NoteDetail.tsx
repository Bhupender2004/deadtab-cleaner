import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchArchive, deleteArchive } from '../lib/api';

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['archive', id],
    queryFn: () => fetchArchive(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteArchive,
    onSuccess: () => {
      toast.success('Archive deleted');
      navigate('/archive');
    },
    onError: () => {
      toast.error('Failed to delete archive');
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-accent"></div>
      </div>
    );
  }

  if (isError || !data?.archive) {
    return (
      <div className="glass-card p-6 border-red-900/50 bg-red-950/20 text-red-200">
        Archive not found or access denied.
        <div className="mt-4">
          <Link to="/archive" className="btn-secondary inline-flex">Back to Archive</Link>
        </div>
      </div>
    );
  }

  const archive = data.archive;
  const note = archive.notes && archive.notes.length > 0 ? archive.notes[0] : null;

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${archive.domain || ''}&sz=64`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Link to="/archive" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-2 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Archive
      </Link>

      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 bg-white/40 border-b border-slate-200/50">
          <div className="flex items-start gap-4">
            <img 
              src={faviconUrl} 
              alt="" 
              className="w-10 h-10 rounded bg-white/10 flex-shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2 leading-snug">
                {archive.title}
              </h1>
              <a 
                href={archive.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-sm break-all group flex items-start gap-1 max-w-[90%]"
              >
                <span>{archive.url}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* AI Note Content */}
        <div className="p-6 md:p-8 space-y-8">
          {(!note || !note.summary) ? (
            <div className="text-center py-10 text-slate-400 italic">
              AI note is currently being generated or failed to process.
            </div>
          ) : (
            <>
              {/* Intent */}
              {note.intentTag && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Why you opened this</h3>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-accent/10 border border-purple-accent/30 text-purple-light text-sm font-medium">
                    🎯 {note.intentTag}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">AI Summary</h3>
                <p className="text-slate-700 leading-relaxed text-lg bg-transparent/30 p-5 rounded-xl border border-slate-300">
                  {note.summary}
                </p>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/50">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Topic Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {note.topicTags?.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Estimated Read Time</h3>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    ⏱️ {Math.ceil((note.readTimeSeconds || 0) / 60)} min read ({note.readTimeSeconds}s)
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-transparent/50 border-t border-slate-200/50 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            Archived on {new Date(archive.archivedAt).toLocaleString()}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={() => {
                if(window.confirm('Delete this archive permanently?')) {
                  deleteMutation.mutate(id!);
                }
              }}
              className="px-4 min-h-[44px] text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
            <a 
              href={archive.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-primary min-h-[44px] flex-1 sm:flex-none"
            >
              Re-open Tab
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
