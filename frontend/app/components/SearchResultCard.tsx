'use client';

import { SearchResult } from '../types/chat';

interface SearchResultCardProps {
  result: SearchResult;
  index: number;
}

export function SearchResultCard({ result, index }: SearchResultCardProps) {
  // Strip HTML tags from snippet
  const cleanSnippet = result.snippet.replace(/<[^>]*>/g, '');

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 
                 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all duration-300
                 hover:shadow-lg hover:shadow-cyan-500/10"
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 
                        flex items-center justify-center text-xs font-bold text-white">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-100 group-hover:text-cyan-400 
                        transition-colors line-clamp-2 mb-1">
            {result.title}
          </h4>
          <p className="text-sm text-slate-400 line-clamp-2 mb-2">
            {cleanSnippet}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="truncate max-w-[200px]">
              {new URL(result.url).hostname}
            </span>
            {result.date && (
              <>
                <span>•</span>
                <span>{new Date(result.date).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
        <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" 
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
}

