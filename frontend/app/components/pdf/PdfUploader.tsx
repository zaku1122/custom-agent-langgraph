'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface PdfUploaderProps {
  onUpload: (file: File) => Promise<any>;
  isUploading: boolean;
  error: string | null;
}

export function PdfUploader({ onUpload, isUploading, error }: PdfUploaderProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file && file.type === 'application/pdf') {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          relative w-full max-w-2xl p-12 rounded-2xl border-2 border-dashed
          transition-all duration-300 cursor-pointer
          ${isDragActive 
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.02]' 
            : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {/* Animated Background */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className={`
            absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5
            ${isDragActive ? 'animate-pulse' : ''}
          `} />
        </div>

        <div className="relative flex flex-col items-center gap-6">
          {/* Icon */}
          <div className={`
            w-24 h-24 rounded-2xl flex items-center justify-center
            transition-all duration-300
            ${isDragActive 
              ? 'bg-cyan-500/20 scale-110' 
              : 'bg-slate-700/50'}
          `}>
            {isUploading ? (
              <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg 
                className={`w-12 h-12 transition-colors ${isDragActive ? 'text-cyan-400' : 'text-slate-400'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
            )}
          </div>

          {/* Text */}
          <div className="text-center">
            <h3 className={`
              text-xl font-semibold mb-2 transition-colors
              ${isDragActive ? 'text-cyan-400' : 'text-slate-200'}
            `}>
              {isUploading 
                ? 'Processing PDF...' 
                : isDragActive 
                  ? 'Drop your PDF here' 
                  : 'Upload a PDF to chat with it'}
            </h3>
            <p className="text-slate-400 text-sm">
              {isUploading 
                ? 'Extracting text and preparing document...'
                : 'Drag and drop or click to browse'}
            </p>
          </div>

          {/* File Info */}
          {!isUploading && (
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                PDF only
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Max 50MB
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Features List */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
        {[
          { 
            icon: '💬', 
            title: 'Ask Questions',
            desc: 'Chat naturally about your PDF content' 
          },
          { 
            icon: '📍', 
            title: 'Get Citations',
            desc: 'See exactly where answers come from' 
          },
          { 
            icon: '✨', 
            title: 'Select Text',
            desc: 'Highlight sections to ask about them' 
          },
        ].map((feature, i) => (
          <div 
            key={i}
            className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 text-center"
          >
            <span className="text-2xl">{feature.icon}</span>
            <h4 className="mt-2 font-medium text-slate-200">{feature.title}</h4>
            <p className="mt-1 text-xs text-slate-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

