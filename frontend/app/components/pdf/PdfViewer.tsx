'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PdfViewerProps {
  file: File | null;
  onTextSelect: (text: string, page: number) => void;
  selectedText?: string;
  highlightedPage?: number | null;
  highlightedText?: string | null;
}

// Create a separate component that will be dynamically loaded
function PdfViewerInner({ 
  file, 
  onTextSelect, 
  selectedText,
  highlightedPage,
  highlightedText
}: PdfViewerProps) {
  const [Document, setDocument] = useState<any>(null);
  const [Page, setPage] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Load react-pdf dynamically on client side only
  useEffect(() => {
    const loadPdfComponents = async () => {
      try {
        const pdfModule = await import('react-pdf');
        pdfModule.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfModule.pdfjs.version}/build/pdf.worker.min.mjs`;
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

  // Detect which page is currently visible based on scroll position
  const handleScroll = useCallback(() => {
    if (!containerRef.current || numPages === 0) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestPage = 1;
    let closestDistance = Infinity;

    pageRefs.current.forEach((element, pageNum) => {
      const rect = element.getBoundingClientRect();
      const pageCenter = rect.top + rect.height / 2;
      const distance = Math.abs(pageCenter - containerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = pageNum;
      }
    });

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
    }
  }, [numPages, currentPage]);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Handle text selection - detect which page the selection is from
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      // Try to find which page the selection is from
      const anchorNode = selection?.anchorNode;
      if (anchorNode) {
        let element: HTMLElement | null = anchorNode.nodeType === Node.ELEMENT_NODE 
          ? anchorNode as HTMLElement 
          : anchorNode.parentElement;
        
        while (element && !element.hasAttribute('data-page-number')) {
          element = element.parentElement;
        }
        
        const pageNum = element?.getAttribute('data-page-number');
        const selectedPageNum = pageNum ? parseInt(pageNum) : currentPage;
        onTextSelect(text, selectedPageNum);
      } else {
        onTextSelect(text, currentPage);
      }
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
    if (highlightedPage && highlightedPage >= 1 && highlightedPage <= numPages) {
      const pageElement = pageRefs.current.get(highlightedPage);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedPage, numPages]);

  // Highlight text in PDF when highlightedText changes
  useEffect(() => {
    if (!highlightedText || !containerRef.current) return;

    const highlightTimeout = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      // Clear any existing highlights
      container.querySelectorAll('.source-highlight').forEach(el => {
        el.classList.remove('source-highlight');
      });

      // Find text in the highlighted page first, then search all pages
      const targetPage = highlightedPage || currentPage;
      const pageElement = pageRefs.current.get(targetPage);
      const searchContainer = pageElement || container;

      const textLayers = searchContainer.querySelectorAll('.react-pdf__Page__textContent');
      if (textLayers.length === 0) {
        console.log('Text layer not found, retrying...');
        return;
      }

      // Normalize text for comparison - be more lenient
      const normalizeText = (text: string) => 
        text.toLowerCase().replace(/\s+/g, ' ').trim();

      const highlightNormalized = normalizeText(highlightedText);
      
      // Extract meaningful words (longer words are more unique)
      const allWords = highlightNormalized.split(' ').filter(w => w.length > 0);
      const uniqueWords = allWords.filter(w => w.length > 4).slice(0, 10);
      const shortWords = allWords.filter(w => w.length > 2 && w.length <= 4).slice(0, 5);
      const keywords = [...uniqueWords, ...shortWords];

      if (keywords.length === 0) {
        // Fallback: use first few words
        keywords.push(...allWords.slice(0, 5));
      }

      let bestMatchStart = -1;
      let bestMatchEnd = -1;
      let bestMatchScore = 0;
      let bestSpans: NodeListOf<HTMLSpanElement> | null = null;
      let bestTextLayer: Element | null = null;

      textLayers.forEach(textLayer => {
        const spans = textLayer.querySelectorAll('span');
        if (spans.length === 0) return;

        // Strategy 1: Try to find consecutive matching spans
        const windowSizes = [15, 10, 8, 5]; // Try different window sizes
        
        for (const windowSize of windowSizes) {
          for (let i = 0; i < spans.length; i++) {
            let windowText = '';
            const endIdx = Math.min(i + windowSize, spans.length);
            
            for (let j = i; j < endIdx; j++) {
              windowText += ' ' + (spans[j].textContent || '');
            }
            windowText = normalizeText(windowText);

            // Score based on keyword matches
            let score = 0;
            let consecutiveMatches = 0;
            
            for (const keyword of keywords) {
              if (windowText.includes(keyword)) {
                score += keyword.length > 5 ? 3 : 1; // Longer words worth more
                consecutiveMatches++;
              }
            }

            // Bonus for matching many keywords
            if (consecutiveMatches >= 3) score += consecutiveMatches * 2;

            // Check if this is better than previous best
            const threshold = Math.max(2, keywords.length * 0.2);
            if (score > bestMatchScore && score >= threshold) {
              bestMatchScore = score;
              bestMatchStart = i;
              bestMatchEnd = endIdx;
              bestSpans = spans;
              bestTextLayer = textLayer;
            }
          }
          
          // If we found a good match, stop trying smaller windows
          if (bestMatchScore > keywords.length * 0.5) break;
        }
      });

      // Apply highlight if found
      if (bestMatchStart >= 0 && bestSpans) {
        // Highlight the matching spans
        for (let i = bestMatchStart; i < bestMatchEnd; i++) {
          if (bestSpans[i]) {
            bestSpans[i].classList.add('source-highlight');
          }
        }
        
        // Scroll to the highlighted area
        if (bestSpans[bestMatchStart]) {
          bestSpans[bestMatchStart].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        console.log(`Highlighted ${bestMatchEnd - bestMatchStart} spans with score ${bestMatchScore}`);
      } else {
        // Fallback: highlight the first few spans of the target page
        console.log('No text match found, highlighting page area');
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 600); // Slightly faster response

    return () => clearTimeout(highlightTimeout);
  }, [highlightedText, highlightedPage, currentPage]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  // Store ref for each page
  const setPageRef = (pageNum: number) => (element: HTMLDivElement | null) => {
    if (element) {
      pageRefs.current.set(pageNum, element);
    } else {
      pageRefs.current.delete(pageNum);
    }
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
        {/* Page Indicator */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-medium text-slate-300">
            Page {currentPage} of {numPages}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
            title="Zoom out"
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
            title="Zoom in"
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

      {/* PDF Content - Scrollable with all pages */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
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
          className="flex flex-col items-center gap-6"
        >
          {/* Render ALL pages for continuous scrolling */}
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
            <div
              key={pageNum}
              ref={setPageRef(pageNum)}
              data-page-number={pageNum}
              className="relative"
            >
              {/* Page number label */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-700/80 rounded text-xs text-slate-300">
                Page {pageNum}
              </div>
              <Page
                pageNumber={pageNum}
                scale={scale}
                className={`shadow-2xl rounded-lg overflow-hidden ${
                  highlightedPage === pageNum ? 'ring-2 ring-cyan-400' : ''
                }`}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          ))}
        </Document>
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
