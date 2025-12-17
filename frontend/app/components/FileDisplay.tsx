'use client';

import { FileResult } from '../types/chat';

interface FileDisplayProps {
  fileResult: FileResult;
}

export function FileDisplay({ fileResult }: FileDisplayProps) {
  const handleDownload = () => {
    // Convert base64 to blob
    const byteCharacters = atob(fileResult.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: fileResult.mimeType });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const { tablePreview, filename, description } = fileResult;

  return (
    <div className="space-y-4">
      {/* Header with description */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-slate-200">{filename}</p>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 
                     text-white rounded-lg font-medium shadow-lg shadow-emerald-500/25 
                     hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 
                     transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download XLSX
        </button>
      </div>

      {/* Table Preview */}
      {tablePreview && tablePreview.headers.length > 0 && (
        <div className="rounded-lg border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-2 bg-slate-800/70 border-b border-slate-700/50 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">
              Data Preview ({tablePreview.rows.length} rows shown)
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  {tablePreview.headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left font-semibold text-slate-300 border-b border-slate-700/50 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tablePreview.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`${rowIndex % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/30'} 
                                hover:bg-slate-700/30 transition-colors`}
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-2.5 text-slate-300 border-b border-slate-700/30 whitespace-nowrap"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {tablePreview.rows.length >= 10 && (
            <div className="px-4 py-2 bg-slate-800/50 text-xs text-slate-500 text-center border-t border-slate-700/50">
              Showing first 10 rows • Download file to see all data
            </div>
          )}
        </div>
      )}
    </div>
  );
}

