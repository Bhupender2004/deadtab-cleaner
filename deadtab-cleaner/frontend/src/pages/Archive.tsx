import { useState, useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import { fetchArchives, deleteArchive } from '../lib/api';
import ArchiveCard from '../components/cards/ArchiveCard';
import { Archive } from '../types';

export default function ArchivePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('');
  
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['archives'],
    queryFn: async ({ pageParam = 1 }) => {
      return fetchArchives({ page: pageParam, limit: 20 });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteArchive,
    onSuccess: () => {
      toast.success('Archive deleted');
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      queryClient.invalidateQueries({ queryKey: ['habitScore'] });
    },
    onError: () => {
      toast.error('Failed to delete archive');
    }
  });

  // Flatten infinite pages into a single array
  const allArchives = useMemo(() => {
    return data?.pages.flatMap((page) => page.archives) || [];
  }, [data]);

  // Client-side Fuzzy Search & Filtering
  const filteredArchives = useMemo(() => {
    let result = allArchives;

    // Domain filter (exact match)
    if (domainFilter) {
      result = result.filter(a => a.domain === domainFilter);
    }

    // Fuzzy search using Fuse.js
    if (searchTerm.trim()) {
      const fuse = new Fuse(result, {
        keys: [
          'title',
          'url',
          'domain',
          'notes.summary',
          'notes.intentTag',
          'notes.topicTags'
        ],
        threshold: 0.3,
        includeScore: true,
      });
      result = fuse.search(searchTerm).map(res => res.item);
    }

    return result;
  }, [allArchives, searchTerm, domainFilter]);

  // Extract unique domains for the filter dropdown
  const uniqueDomains = useMemo(() => {
    const domains = new Set<string>();
    allArchives.forEach(a => {
      if (a.domain) domains.add(a.domain);
    });
    return Array.from(domains).sort();
  }, [allArchives]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-accent"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card p-6 border-red-900/50 bg-red-950/20 text-red-200">
        Failed to load archives. Please try again.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Archive</h1>
          <p className="text-slate-400 text-sm mt-1">Search and manage your dead tabs and AI notes.</p>
        </div>
      </header>

      {/* Filters & Search Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search titles, tags, summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input pl-10"
          />
        </div>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="glass-input sm:max-w-[#200px] text-sm appearance-none cursor-pointer"
        >
          <option value="">All Domains</option>
          {uniqueDomains.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filteredArchives.length === 0 ? (
          <div className="glass-card p-12 text-center border-dashed">
            <span className="text-4xl block mb-4">✨</span>
            <h3 className="text-lg font-bold text-white mb-2">No archives found</h3>
            <p className="text-slate-400 text-sm">
              {searchTerm || domainFilter ? "Try adjusting your search or filters." : "Your archive is empty. Let some tabs die!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredArchives.map((archive: Archive) => (
              <ArchiveCard 
                key={archive.id} 
                archive={archive} 
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load More Trigger */}
      {hasNextPage && !searchTerm && !domainFilter && (
        <div className="flex justify-center pt-8 pb-12">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="btn-secondary min-h-[44px] px-8"
          >
            {isFetchingNextPage ? 'Loading more...' : 'Load More Archives'}
          </button>
        </div>
      )}
    </div>
  );
}
