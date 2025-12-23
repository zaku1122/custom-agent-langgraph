'use client';

import { useState, useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { PdfViewer } from './pdf/PdfViewer';

export function ChatContainer() {
  const { messages, isLoading, currentAgent, sendMessage, stopGeneration, clearMessages, clearCurrentDocument } = useChat();
  
  // File state (supports PDF, DOCX, TXT, CSV, XLSX, images)
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<number | null>(null); // Page where text was selected
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [highlightedPage, setHighlightedPage] = useState<number | null>(null);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);

  // Check if attached file is a PDF (for PDF viewer)
  const isPdf = attachedFile?.type === 'application/pdf';

  // Handle file attachment from ChatInput
  const handleFileAttach = useCallback((file: File | null) => {
    setAttachedFile(file);
    if (file && file.type === 'application/pdf') {
      setShowPdfViewer(true);
    } else {
      setShowPdfViewer(false);
      setSelectedText('');
      setSelectedPage(null);
    }
  }, []);

  // Handle text selection from PDF viewer - store both text AND page number
  const handleTextSelect = useCallback((text: string, page: number) => {
    setSelectedText(text);
    setSelectedPage(page); // Store the page where text was selected
  }, []);

  // Handle send with file and selected text
  const handleSend = useCallback((message: string, file?: File) => {
    sendMessage(message, file, selectedText, selectedPage ?? undefined);
    // Clear selected text and page after sending
    setSelectedText('');
    setSelectedPage(null);
  }, [sendMessage, selectedText, selectedPage]);

  // Close file/PDF viewer
  const handleCloseFile = useCallback(() => {
    setShowPdfViewer(false);
    setAttachedFile(null);
    setSelectedText('');
    setSelectedPage(null);
    setHighlightedPage(null);
    setHighlightedText(null);
    clearCurrentDocument(); // Clear stored document ID for queries
  }, [clearCurrentDocument]);

  // Handle page click from sources/citations (navigate PDF to that page and highlight text)
  const handlePageClick = useCallback((pageNumber: number, textToHighlight?: string) => {
    // If PDF viewer is not visible, show it
    if (isPdf && !showPdfViewer) {
      setShowPdfViewer(true);
    }
    // Set highlighted page to trigger navigation
    setHighlightedPage(pageNumber);
    // Set text to highlight (if provided)
    if (textToHighlight) {
      setHighlightedText(textToHighlight);
    }
    // Clear highlights after a delay
    setTimeout(() => {
      setHighlightedPage(null);
      setHighlightedText(null);
    }, 5000); // 5 seconds to read the highlighted text
  }, [isPdf, showPdfViewer]);

  // Get agent display info
  const getAgentInfo = () => {
    switch (currentAgent) {
      case 'search':
        return { label: 'Searching...', color: 'text-cyan-400' };
      case 'image':
        return { label: 'Generating image...', color: 'text-purple-400' };
      case 'pdf':
        return { label: 'Analyzing PDF...', color: 'text-orange-400' };
      case 'answer':
        return { label: 'Thinking...', color: 'text-emerald-400' };
      default:
        return { label: 'Processing...', color: 'text-slate-400' };
    }
  };

  const agentInfo = getAgentInfo();

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl blur opacity-50" />
              <div className="relative w-full h-full bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700/50">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">LangGraph Agent</h1>
              <p className="text-xs text-slate-500">Multi-Agent AI • Azure Powered</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* File indicator */}
            {attachedFile && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                isPdf ? 'bg-orange-500/20 border-orange-500/30' : 'bg-cyan-500/20 border-cyan-500/30'
              }`}>
                <svg className={`w-4 h-4 ${isPdf ? 'text-orange-400' : 'text-cyan-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className={`text-xs font-medium truncate max-w-[100px] ${isPdf ? 'text-orange-400' : 'text-cyan-400'}`}>
                  {attachedFile.name}
                </span>
                {isPdf && (
                  <button
                    onClick={() => setShowPdfViewer(!showPdfViewer)}
                    className="p-1 hover:bg-orange-500/20 rounded transition-colors"
                    title={showPdfViewer ? 'Hide PDF' : 'Show PDF'}
                  >
                    <svg className={`w-3 h-3 text-orange-400 transition-transform ${showPdfViewer ? 'rotate-180' : ''}`} 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={handleCloseFile}
                  className={`p-1 rounded transition-colors ${isPdf ? 'hover:bg-orange-500/20' : 'hover:bg-cyan-500/20'}`}
                  title="Remove file"
                >
                  <svg className={`w-3 h-3 ${isPdf ? 'text-orange-400' : 'text-cyan-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className={`text-xs ${isLoading ? agentInfo.color : 'text-slate-400'}`}>
                {isLoading ? agentInfo.label : 'Ready'}
              </span>
            </div>

            {/* Clear chat button */}
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                disabled={isLoading}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer (shown when PDF is attached and viewer is open) */}
        {attachedFile && isPdf && showPdfViewer && (
          <div className="w-1/2 max-w-[600px] border-r border-slate-700/50 flex flex-col">
            {/* PDF Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-slate-200 truncate">{attachedFile.name}</span>
              </div>
              <button
                onClick={handleCloseFile}
                className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Close PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Selected Text Indicator */}
            {selectedText && (
              <div className="mx-4 mt-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-purple-400 font-medium flex-shrink-0">Selected:</span>
                    <span className="text-xs text-slate-300 truncate">
                      "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedText('')}
                    className="p-1 hover:bg-slate-700/50 rounded transition-colors flex-shrink-0"
                  >
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden p-2">
              <PdfViewer
                file={attachedFile}
                onTextSelect={handleTextSelect}
                selectedText={selectedText}
                highlightedPage={highlightedPage}
                highlightedText={highlightedText}
              />
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Message list */}
          <MessageList 
            messages={messages} 
            isLoading={isLoading} 
            currentAgent={currentAgent}
            onPageClick={isPdf && attachedFile ? handlePageClick : undefined}
          />

          {/* Input area with file upload */}
          <ChatInput 
            onSend={handleSend} 
            isLoading={isLoading} 
            onStop={stopGeneration}
            onFileAttach={handleFileAttach}
            attachedFile={attachedFile}
            selectedText={selectedText}
          />
        </div>
      </div>
    </div>
  );
}
