'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';

// Supported file types
const SUPPORTED_TYPES: Record<string, { icon: string; label: string; color: string }> = {
  'application/pdf': { icon: '📄', label: 'PDF', color: 'from-red-500 to-orange-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', label: 'DOCX', color: 'from-blue-500 to-indigo-500' },
  'application/msword': { icon: '📝', label: 'DOC', color: 'from-blue-500 to-indigo-500' },
  'text/plain': { icon: '📃', label: 'TXT', color: 'from-slate-500 to-slate-600' },
  'text/markdown': { icon: '📃', label: 'MD', color: 'from-slate-500 to-slate-600' },
  'text/csv': { icon: '📊', label: 'CSV', color: 'from-green-500 to-emerald-500' },
  'application/csv': { icon: '📊', label: 'CSV', color: 'from-green-500 to-emerald-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📊', label: 'XLSX', color: 'from-green-500 to-emerald-500' },
  'application/vnd.ms-excel': { icon: '📊', label: 'XLS', color: 'from-green-500 to-emerald-500' },
  'image/png': { icon: '🖼️', label: 'PNG', color: 'from-purple-500 to-pink-500' },
  'image/jpeg': { icon: '🖼️', label: 'JPG', color: 'from-purple-500 to-pink-500' },
  'image/webp': { icon: '🖼️', label: 'WEBP', color: 'from-purple-500 to-pink-500' },
  'image/gif': { icon: '🖼️', label: 'GIF', color: 'from-purple-500 to-pink-500' },
};

const ACCEPT_STRING = '.pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.gif';

interface ChatInputProps {
  onSend: (message: string, file?: File) => void;
  isLoading: boolean;
  onStop: () => void;
  onFileAttach?: (file: File | null) => void;
  attachedFile?: File | null;
  selectedText?: string;
}

export function ChatInput({ 
  onSend, 
  isLoading, 
  onStop, 
  onFileAttach, 
  attachedFile,
  selectedText 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if ((message.trim() || attachedFile) && !isLoading) {
      onSend(message, attachedFile || undefined);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check by MIME type or extension (browsers sometimes report wrong MIME for CSV/XLSX)
      const ext = file.name.toLowerCase().split('.').pop();
      const supportedExtensions = ['pdf', 'docx', 'doc', 'txt', 'md', 'csv', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
      const isSupported = file.type in SUPPORTED_TYPES || (ext && supportedExtensions.includes(ext));
      
      if (isSupported) {
        onFileAttach?.(file);
      } else {
        alert(`Unsupported file type. Supported: PDF, DOCX, TXT, MD, CSV, XLSX, PNG, JPG, WEBP, GIF`);
      }
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    onFileAttach?.(null);
  };

  // Get file type info (check MIME type first, then extension)
  const getFileInfo = (file: File) => {
    if (file.type in SUPPORTED_TYPES) {
      return SUPPORTED_TYPES[file.type];
    }
    
    // Fallback to extension-based detection
    const ext = file.name.toLowerCase().split('.').pop();
    const extMap: Record<string, { icon: string; label: string; color: string }> = {
      'csv': { icon: '📊', label: 'CSV', color: 'from-green-500 to-emerald-500' },
      'xlsx': { icon: '📊', label: 'XLSX', color: 'from-green-500 to-emerald-500' },
      'xls': { icon: '📊', label: 'XLS', color: 'from-green-500 to-emerald-500' },
      'pdf': { icon: '📄', label: 'PDF', color: 'from-red-500 to-orange-500' },
      'docx': { icon: '📝', label: 'DOCX', color: 'from-blue-500 to-indigo-500' },
      'doc': { icon: '📝', label: 'DOC', color: 'from-blue-500 to-indigo-500' },
      'txt': { icon: '📃', label: 'TXT', color: 'from-slate-500 to-slate-600' },
      'md': { icon: '📃', label: 'MD', color: 'from-slate-500 to-slate-600' },
    };
    
    return extMap[ext || ''] || { icon: '📎', label: 'File', color: 'from-slate-500 to-slate-600' };
  };

  return (
    <div className="border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-lg px-4 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Selected Text from PDF */}
        {selectedText && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-xl border border-purple-500/30">
            <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-purple-400 font-medium">Ask about: </span>
              <span className="text-xs text-slate-300">
                "{selectedText.substring(0, 60)}{selectedText.length > 60 ? '...' : ''}"
              </span>
            </div>
          </div>
        )}

        {/* Attached File Preview */}
        {attachedFile && !selectedText && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getFileInfo(attachedFile).color} flex items-center justify-center text-lg`}>
              {getFileInfo(attachedFile).icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-200 truncate">{attachedFile.name}</p>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-700 text-slate-300">
                  {getFileInfo(attachedFile).label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {(attachedFile.size / 1024 / 1024).toFixed(2)} MB • 
                {attachedFile.type.startsWith('image/') 
                  ? ' Image will be analyzed with Vision AI'
                  : ' Document will be parsed for Q&A'}
              </p>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="relative flex items-end gap-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* File Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={`flex-shrink-0 w-12 h-12 rounded-xl border transition-all duration-200
                       flex items-center justify-center
                       ${attachedFile 
                         ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' 
                         : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}
                       disabled:opacity-50 disabled:cursor-not-allowed`}
            title={attachedFile ? 'Change file' : 'Attach file (PDF, DOCX, TXT, images)'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Input container */}
          <div className="flex-1 relative">
            <div className="relative bg-slate-800/70 rounded-2xl border border-slate-700/50 
                           focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 
                           transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedText 
                    ? "Ask about the selected text..." 
                    : attachedFile 
                      ? `Ask about the ${getFileInfo(attachedFile).label} file...`
                      : "Ask anything... (Shift+Enter for new line)"
                }
                disabled={isLoading}
                rows={1}
                className="w-full px-4 py-3 pr-12 bg-transparent text-slate-100 placeholder-slate-500 
                          resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
                          scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                style={{ maxHeight: '200px' }}
              />
              
              {/* Character count (optional, shows when typing) */}
              {message.length > 0 && (
                <span className="absolute right-3 bottom-3 text-xs text-slate-500">
                  {message.length}
                </span>
              )}
            </div>
          </div>

          {/* Send/Stop button */}
          {isLoading ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 
                        text-red-400 hover:bg-red-500/30 hover:border-red-500/50 
                        transition-all duration-200 flex items-center justify-center"
              title="Stop generation"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!message.trim() && !attachedFile}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 
                        text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 
                        hover:scale-105 active:scale-95 transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                        disabled:shadow-none flex items-center justify-center"
              title="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { label: '🔍 Search news', prompt: 'What are the latest AI news today?' },
            { label: '🎨 Generate image', prompt: 'Generate an image of a futuristic city at sunset' },
            { label: '💡 Explain', prompt: 'Explain quantum computing in simple terms' },
            { label: '📊 Create XLSX', prompt: 'Create an Excel file with sample employee data' },
            ...(attachedFile ? [{ label: `📄 Summarize ${getFileInfo(attachedFile).label}`, prompt: 'Summarize this document in detail' }] : []),
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => setMessage(item.prompt)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/50 
                        rounded-lg border border-slate-700/50 hover:border-slate-600/50 
                        hover:text-slate-300 hover:bg-slate-800 transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
