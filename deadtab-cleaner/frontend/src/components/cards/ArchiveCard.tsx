import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive } from '../../types';

interface ArchiveCardProps {
  archive: Archive;
  onDelete: (id: string) => void;
}

export default function ArchiveCard({ archive, onDelete }: ArchiveCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const note = archive.notes && archive.notes.length > 0 ? archive.notes[0] : null;

  const truncateSummary = (text: string) => {
    if (!text) return 'No summary generated yet.';
    return text.length > 120 ? text.slice(0, 117) + '...' : text;
  };

  const getRelativeTime = (dateString: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = (new Date(dateString).getTime() - new Date().getTime()) / 1000;
    
    if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second');
    if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  };

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${archive.domain || ''}&sz=64`;

  return (
    <>
      <div className="glass-card flex flex-col h-full bg-white/50 hover:bg-slate-100/80 transition-colors group">
        <div className="p-5 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <img 
              src={faviconUrl} 
              alt="" 
              className="w-8 h-8 rounded mt-1 bg-white/10" 
              onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEwIDEzczIgLTEuNSAyIC0zLjVWN20wIDBoNHYyLjVjMCAyLjUgMiAzLjQgMiAzLjRoLTgiLz48L3N2Zz4='; }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-slate-900 font-bold leading-tight truncate" title={archive.title}>
                {archive.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                <span className="truncate max-w-[150px]">{archive.domain}</span>
                <span>•</span>
                <span>{getRelativeTime(archive.archivedAt)}</span>
              </div>
            </div>
          </div>

          {/* AI Info */}
          <div className="flex-1 mb-4">
            {note?.intentTag && (
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-300/50 text-slate-700 mb-2">
                {note.intentTag}
              </span>
            )}
            <p className="text-sm text-slate-700 line-clamp-2" title={note?.summary || ''}>
              {truncateSummary(note?.summary || '')}
            </p>
          </div>

          {/* Footer Tags */}
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {note?.topicTags?.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="px-2 py-1 rounded-md text-xs bg-slate-100 border border-slate-200 text-slate-700">
                #{tag}
              </span>
            ))}
            {note?.topicTags && note.topicTags.length > 3 && (
              <span className="px-2 py-1 rounded-md text-xs bg-slate-100 border border-slate-200 text-slate-600">
                +{note.topicTags.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="border-t border-slate-200/50 p-3 bg-transparent/30 flex justify-between items-center gap-2">
          <Link 
            to={`/archive/${archive.id}`} 
            className="text-xs text-slate-600 hover:text-slate-700 px-2 py-1.5 rounded min-h-[44px] flex items-center"
          >
            View Details
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(true)}
              className="px-3 min-h-[44px] rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-400/10 transition-colors"
            >
              Delete
            </button>
            <a
              href={archive.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-3 min-h-[44px] flex items-center justify-center text-xs"
            >
              Re-open ↗
            </a>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent/80 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-6 bg-white/80">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Archive?</h3>
            <p className="text-sm text-slate-700 mb-6">
              This will permanently delete the AI notes and archive record for "{archive.title}". This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDelete(archive.id);
                  setShowConfirm(false);
                }}
                className="btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
