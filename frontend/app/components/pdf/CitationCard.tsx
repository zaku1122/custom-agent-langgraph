'use client';

import { Citation } from '../../types/pdf';

interface CitationCardProps {
  citation: Citation;
  index: number;
  onClick?: () => void;
}

export function CitationCard({ citation, index, onClick }: CitationCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-slate-800/50 hover:bg-slate-700/50 
                 border border-slate-700/50 rounded-xl transition-all duration-200
                 hover:border-cyan-500/30 group"
    >
      <div className="flex items-start gap-3">
        {/* Citation Number */}
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-cyan-500/20 
                       flex items-center justify-center text-xs font-bold text-cyan-400">
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Page Number */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-cyan-400">
              Page {citation.pageNumber}
            </span>
            {citation.relevanceScore && citation.relevanceScore > 0.8 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                High relevance
              </span>
            )}
          </div>
          
          {/* Citation Text */}
          <p className="text-xs text-slate-400 line-clamp-2 group-hover:text-slate-300 transition-colors">
            "{citation.text}"
          </p>
        </div>

        {/* Arrow Icon */}
        <svg 
          className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

interface CitationListProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

export function CitationList({ citations, onCitationClick }: CitationListProps) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Sources ({citations.length})</span>
      </div>
      
      <div className="space-y-2">
        {citations.map((citation, index) => (
          <CitationCard
            key={citation.chunkId}
            citation={citation}
            index={index}
            onClick={() => onCitationClick?.(citation)}
          />
        ))}
      </div>
    </div>
  );
}

