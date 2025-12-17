'use client';

import { useState, useCallback } from 'react';
import { usePdf } from '../../hooks/usePdf';
import { PdfUploader } from './PdfUploader';
import { PdfViewer } from './PdfViewer';
import { PdfChat } from './PdfChat';
import { Citation } from '../../types/pdf';

export function PdfContainer() {
  const {
    document,
    isUploading,
    uploadError,
    messages,
    isQuerying,
    selectedText,
    selectedPage,
    uploadPdf,
    queryPdf,
    clearDocument,
    handleTextSelection,
    setSelectedText,
  } = usePdf();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [highlightedPage, setHighlightedPage] = useState<number | null>(null);

  // Handle file upload
  const handleUpload = useCallback(async (file: File) => {
    setUploadedFile(file);
    await uploadPdf(file);
  }, [uploadPdf]);

  // Handle citation click - navigate to source
  const handleCitationClick = useCallback((citation: Citation) => {
    setHighlightedPage(citation.pageNumber);
  }, []);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedText('');
  }, [setSelectedText]);

  // Reset everything
  const handleReset = useCallback(() => {
    clearDocument();
    setUploadedFile(null);
    setHighlightedPage(null);
  }, [clearDocument]);

  // Show uploader if no document
  if (!document) {
    return (
      <div className="h-full">
        <PdfUploader
          onUpload={handleUpload}
          isUploading={isUploading}
          error={uploadError}
        />
      </div>
    );
  }

  // Show split view with PDF + Chat
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 
                         flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-[300px]">
              {document.name}
            </h2>
            <p className="text-xs text-slate-400">
              {document.pages} pages • {document.chunks} chunks
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 
                    hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">New PDF</span>
        </button>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer - Left Side */}
        <div className="flex-1 min-w-0 p-4 border-r border-slate-700/50">
          <PdfViewer
            file={uploadedFile}
            onTextSelect={handleTextSelection}
            selectedText={selectedText}
            highlightedPage={highlightedPage}
          />
        </div>

        {/* Chat - Right Side */}
        <div className="w-[400px] min-w-[350px] max-w-[500px] flex-shrink-0 p-4">
          <PdfChat
            messages={messages}
            isQuerying={isQuerying}
            selectedText={selectedText}
            onSendMessage={queryPdf}
            onCitationClick={handleCitationClick}
            onClearSelection={handleClearSelection}
          />
        </div>
      </div>
    </div>
  );
}

