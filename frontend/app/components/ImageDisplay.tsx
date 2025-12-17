'use client';

import { useState } from 'react';

interface ImageDisplayProps {
  imageUrl: string;
}

// Skeleton component with shimmer animation
function ImageSkeleton() {
  return (
    <div className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden bg-slate-800/50 border border-slate-700/50">
      {/* Base skeleton background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800" />
      
      {/* Shimmer effect - animated gradient that moves across */}
      <div 
        className="absolute inset-0 -translate-x-full animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        }}
      />
      
      {/* Placeholder content inside skeleton */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
        {/* Image icon placeholder */}
        <div className="w-20 h-20 rounded-2xl bg-slate-700/50 flex items-center justify-center">
          <svg 
            className="w-10 h-10 text-slate-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </div>
        
        {/* Loading text and progress indicator */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-slate-400">Generating image...</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        
        {/* Fake progress bar */}
        <div className="w-48 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-progress"
          />
        </div>
      </div>
    </div>
  );
}

export function ImageDisplay({ imageUrl }: ImageDisplayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      {/* Skeleton while loading */}
      {isLoading && !error && <ImageSkeleton />}
      
      {/* Image Container - hidden while loading, shown when ready */}
      <div 
        className={`relative rounded-xl overflow-hidden bg-slate-800/50 border border-slate-700/50
                   transition-opacity duration-500
                   ${isLoading ? 'opacity-0 absolute' : 'opacity-100'}
                   ${isExpanded ? 'fixed inset-4 z-50 flex items-center justify-center bg-black/90' : ''}`}
        onClick={() => !isExpanded && !isLoading && setIsExpanded(true)}
      >
        {error ? (
          <div className="p-8 flex flex-col items-center justify-center text-slate-400">
            <svg className="w-12 h-12 mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Failed to load image</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt="AI Generated"
            className={`${isExpanded ? 'max-h-full max-w-full object-contain' : 'w-full max-w-md cursor-pointer hover:opacity-90 transition-opacity'}`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError(true);
            }}
          />
        )}

        {/* Close button for expanded view */}
        {isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-white 
                       hover:bg-slate-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Action buttons */}
      {!isExpanded && !error && !isLoading && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 
                       bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Expand
          </button>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 
                       bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open
          </a>
        </div>
      )}

      {/* Backdrop for expanded view */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/80 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
