'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, Clock } from 'lucide-react';

export type FileType = 'tickets' | 'mappings' | 'pastTickets' | 'pastMappings';

interface FileUploadProps {
  onFileUpload: (file: File, type: FileType) => void;
  ticketsFile: File | null;
  mappingsFile: File | null;
  pastTicketsFile: File | null;
  pastMappingsFile: File | null;
  onRemoveFile: (type: FileType) => void;
}

export default function FileUpload({ 
  onFileUpload, 
  ticketsFile, 
  mappingsFile,
  pastTicketsFile,
  pastMappingsFile,
  onRemoveFile 
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState<FileType | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent, type: FileType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: FileType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        onFileUpload(file, type);
      }
    }
  }, [onFileUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: FileType) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0], type);
    }
    // Reset input
    e.target.value = '';
  }, [onFileUpload]);

  const UploadZone = ({ 
    type, 
    title, 
    description, 
    file, 
    required,
    isPast
  }: { 
    type: FileType; 
    title: string; 
    description: string; 
    file: File | null;
    required?: boolean;
    isPast?: boolean;
  }) => (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        {isPast && <Clock className="w-3.5 h-3.5 text-blue-400" />}
        <h3 className={`text-sm font-semibold ${isPast ? 'text-blue-300' : 'text-slate-200'}`}>{title}</h3>
        {required && <span className="text-xs text-amber-400 font-medium">Required</span>}
        {!required && <span className="text-xs text-slate-500 font-medium">Optional</span>}
      </div>
      
      {file ? (
        <div className={`relative border-2 ${isPast ? 'border-blue-500/50 bg-blue-500/10' : 'border-emerald-500/50 bg-emerald-500/10'} rounded-xl p-3`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${isPast ? 'bg-blue-500/20' : 'bg-emerald-500/20'} flex items-center justify-center`}>
              <CheckCircle2 className={`w-4 h-4 ${isPast ? 'text-blue-400' : 'text-emerald-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => onRemoveFile(type)}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      ) : (
        <label
          className={`
            relative block border-2 border-dashed rounded-xl p-6 cursor-pointer
            transition-all duration-200
            ${dragOver === type 
              ? 'border-cyan-400 bg-cyan-500/10' 
              : isPast
                ? 'border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/5'
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
            }
          `}
          onDragOver={(e) => handleDragOver(e, type)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, type)}
        >
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, type)}
            className="sr-only"
          />
          <div className="flex flex-col items-center text-center">
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center mb-3
              ${dragOver === type ? 'bg-cyan-500/20' : isPast ? 'bg-blue-500/10' : 'bg-slate-700/50'}
            `}>
              {dragOver === type ? (
                <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
              ) : (
                <Upload className={`w-6 h-6 ${isPast ? 'text-blue-400' : 'text-slate-400'}`} />
              )}
            </div>
            <p className={`text-sm ${isPast ? 'text-blue-300' : 'text-slate-300'} mb-1`}>
              {dragOver === type ? 'Drop your file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </label>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* This Week's Files */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">This Week&apos;s Data</h4>
        <div className="flex gap-4">
          <UploadZone
            type="tickets"
            title="HS Export"
            description="Contains ticket data with Experience ID"
            file={ticketsFile}
            required
          />
          <UploadZone
            type="mappings"
            title="QC App Export"
            description="Contains reviewer/product info"
            file={mappingsFile}
          />
        </div>
      </div>

      {/* Past Data Files */}
      <div>
        <h4 className="text-xs font-semibold text-blue-400/70 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Past Data (for comparison)
        </h4>
        <div className="flex gap-4">
          <UploadZone
            type="pastTickets"
            title="Past HS Export"
            description="Previous period's ticket data"
            file={pastTicketsFile}
            isPast
          />
          <UploadZone
            type="pastMappings"
            title="Past QC App Export"
            description="Previous period's mappings"
            file={pastMappingsFile}
            isPast
          />
        </div>
      </div>
    </div>
  );
}
