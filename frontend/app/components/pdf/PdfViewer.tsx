'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PdfViewerProps {
  file: File | null;
  onTextSelect: (text: string, page: number) => void;
  selectedText?: string;
  highlightedPage?: number | null;
}

// Create a separate component that will be dynamically loaded
function PdfViewerInner({ 
  file, 
  onTextSelect, 
  selectedText,
  highlightedPage 
}: PdfViewerProps) {
  const [Document, setDocument] = useState<any>(null);
  const [Page, setPage] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load react-pdf dynamically on client side only
  useEffect(() => {
    const loadPdfComponents = async () => {
      try {
        // Import react-pdf
        const pdfModule = await import('react-pdf');
        
        // Set worker
        pdfModule.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfModule.pdfjs.version}/build/pdf.worker.min.mjs`;
        
        // Import CSS
        await import('react-pdf/dist/Page/AnnotationLayer.css');
        await import('react-pdf/dist/Page/TextLayer.css');
        
        setDocument(() => pdfModule.Document);
        setPage(() => pdfModule.Page);
        setPdfLoaded(true);
      } catch (error) {
        console.error('Failed to load PDF components:', error);
      }
    };

    loadPdfComponents();
  }, []);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      onTextSelect(text, currentPage);
    }
  }, [currentPage, onTextSelect]);

  // Listen for text selection
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseup', handleTextSelection);
      return () => container.removeEventListener('mouseup', handleTextSelection);
    }
  }, [handleTextSelection]);

  // Scroll to highlighted page
  useEffect(() => {
    if (highlightedPage && highlightedPage !== currentPage) {
      setCurrentPage(highlightedPage);
    }
  }, [highlightedPage, currentPage]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900/50 rounded-xl">
        <p className="text-slate-500">No PDF loaded</p>
      </div>
    );
  }

  if (!pdfLoaded || !Document || !Page) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900/50 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading PDF viewer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <span className="text-sm font-medium text-slate-300">
            Page {currentPage} of {numPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <span className="text-sm text-slate-400 w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={() => setScale(s => Math.min(2, s + 0.25))}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Selected Text Indicator */}
      {selectedText && (
        <div className="mx-4 mt-3 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400 font-medium">Selected:</span>
            <span className="text-xs text-slate-300 truncate">
              "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
            </span>
          </div>
        </div>
      )}

      {/* PDF Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center"
        style={{ 
          userSelect: 'text',
          WebkitUserSelect: 'text'
        }}
      >
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={null}
          className="flex flex-col items-center gap-4"
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            className={`shadow-2xl rounded-lg overflow-hidden ${
              highlightedPage === currentPage ? 'ring-2 ring-cyan-400' : ''
            }`}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Page Thumbnails (Mini Navigation) */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 border-t border-slate-700/50 overflow-x-auto">
        {Array.from({ length: Math.min(numPages, 10) }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`
              min-w-[32px] h-8 rounded-lg text-xs font-medium transition-all
              ${currentPage === page 
                ? 'bg-cyan-500 text-white' 
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'}
            `}
          >
            {page}
          </button>
        ))}
        {numPages > 10 && (
          <span className="text-xs text-slate-500">
            ...and {numPages - 10} more
          </span>
        )}
      </div>
    </div>
  );
}

// Wrapper component that only renders on client
export function PdfViewer(props: PdfViewerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900/50 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading PDF viewer...</p>
        </div>
      </div>
    );
  }

  return <PdfViewerInner {...props} />;
}
