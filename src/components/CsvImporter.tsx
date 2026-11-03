'use client';

import { useState, useRef, useCallback } from 'react';

interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
  import_id?: string;
  partial?: boolean;
}

interface CsvImporterProps {
  onImportComplete?: () => void;
}

export default function CsvImporter({ onImportComplete }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePartialResponse = (payload: {
    partial?: boolean;
    error?: string;
    data?: ImportResult;
  }) => {
    if (!payload.partial || !payload.data) return false;

    setResult({ ...payload.data, partial: true });
    setError(payload.error || 'การนำเข้าสำเร็จเพียงบางส่วน กรุณาตรวจสอบข้อผิดพลาดก่อนดำเนินการต่อ');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onImportComplete?.();
    return true;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
      setError('');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError('');
    }
  };

  const handleUpload = () => {
    if (!file) return;

    setIsUploading(true);
    setError('');
    setResult(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    // Track upload progress up to 90%
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        const scaledProgress = Math.min(Math.round(percentComplete * 0.9), 90);
        setUploadProgress(scaledProgress);
      }
    };

    // Keep progress bar moving slowly while server processes
    let processingInterval: NodeJS.Timeout;
    xhr.upload.onload = () => {
      let currentProgress = 90;
      processingInterval = setInterval(() => {
        if (currentProgress < 98) {
          currentProgress += 1;
          setUploadProgress(currentProgress);
        } else {
          clearInterval(processingInterval);
        }
      }, 250);
    };

    xhr.onload = () => {
      if (processingInterval) clearInterval(processingInterval);
      setUploadProgress(100);
      
      // Delay disabling loading slightly so user sees 100% completion
      setTimeout(() => {
        setIsUploading(false);
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            setResult(json.data);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            onImportComplete?.();
          } else if (!handlePartialResponse(json)) {
            setError(json.error || 'Import failed');
          }
        } catch {
          setError('เกิดข้อผิดพลาดในการนำเข้า');
        }
      }, 400);
    };

    xhr.onerror = () => {
      if (processingInterval) clearInterval(processingInterval);
      setIsUploading(false);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    };

    xhr.open('POST', '/api/import');
    xhr.send(formData);
  };

  const [onedriveUrl, setOnedriveUrl] = useState('');
  const [isUrlImporting, setIsUrlImporting] = useState(false);

  const handleUrlImport = async () => {
    if (!onedriveUrl.trim()) return;

    setIsUrlImporting(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: onedriveUrl.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (handlePartialResponse(json)) {
          setOnedriveUrl('');
          return;
        }
        throw new Error(json.error || 'Import failed');
      }

      setResult(json.data);
      setOnedriveUrl('');
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้าผ่านลิงก์');
    } finally {
      setIsUrlImporting(false);
    }
  };


  return (
    <div className="glass-card p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
        <svg className="h-5 w-5 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        นำเข้าข้อมูล Excel / CSV
      </h3>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`drop-zone flex cursor-pointer flex-col items-center justify-center rounded-xl p-8
          transition-all duration-300 ${isDragOver ? 'drag-over' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="h-10 w-10 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium text-accent-cyan">{file.name}</p>
            <p className="text-xs text-text-secondary">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg className="h-12 w-12 text-text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-text-secondary">
              ลากไฟล์มาวางที่นี่ หรือ <span className="text-accent-cyan underline">เลือกไฟล์</span>
            </p>
            <p className="text-xs text-text-secondary/60">
              รองรับ .csv, .xlsx, .xls
            </p>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {file && !isUploading && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-crimson
            px-6 py-3 font-semibold text-[#fcf9f2] transition-all duration-300
            hover:shadow-[0_0_30px_rgba(212,175,55,0.25)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          นำเข้าข้อมูลทหาร
        </button>
      )}

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="mt-4 space-y-2 animate-slide-up">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-secondary font-medium">
              {uploadProgress < 90 ? 'กำลังส่งข้อมูลทหาร...' : uploadProgress < 100 ? 'กำลังประมวลผลเซกเตอร์ฐานข้อมูล...' : 'นำเข้าเสร็จสิ้น!'}
            </span>
            <span className="font-mono font-bold text-accent-gold">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-[#160b0b] border border-accent-gold/15 rounded-full h-3 overflow-hidden p-0.5 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
            <div
              className="bg-gradient-to-r from-accent-gold to-accent-crimson h-full rounded-full transition-all duration-300 relative overflow-hidden"
              style={{ width: `${uploadProgress}%` }}
            >
              {/* Highlight shimmer animation */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" 
                style={{ 
                  backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                  animation: 'shimmer-gold 2s infinite'
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* OneDrive URL Input */}
      {!file && (
        <div className="mt-6 border-t border-white/10 pt-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
            หรือนำเข้าผ่านลิงก์ OneDrive / Excel Online
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="วางลิงก์แชร์ OneDrive ที่นี่..."
              value={onedriveUrl}
              onChange={(e) => setOnedriveUrl(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-bg-secondary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent-cyan focus:outline-none"
            />
            <button
              onClick={handleUrlImport}
              disabled={isUrlImporting || !onedriveUrl.trim()}
              className="rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple px-5 py-2.5 text-sm font-semibold text-bg-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
            >
              {isUrlImporting ? (
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังนำเข้า...
                </span>
              ) : (
                'นำเข้าจากลิงก์'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className={`mt-4 space-y-2 rounded-xl border p-4 ${
          result.partial
            ? 'border-red-500/20 bg-red-500/10'
            : 'border-green-500/20 bg-green-500/10'
        }`}>
          <p className={`font-semibold ${result.partial ? 'text-red-400' : 'text-green-400'}`}>
            {result.partial ? 'นำเข้าได้บางส่วน — กรุณาตรวจสอบก่อนนำเข้าซ้ำ' : 'นำเข้าสำเร็จ!'}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              นำเข้าใหม่: <span className="font-mono text-green-400">{result.imported}</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              อัปเดต: <span className="font-mono text-blue-400">{result.updated}</span>
            </div>
          </div>
          {result.partial && result.import_id && (
            <p className="text-xs text-red-300">
              รหัสเซสชัน: <span className="font-mono">{result.import_id}</span> — ข้อมูลอาจถูกเขียนไปบางส่วน โปรดตรวจสอบรายการนี้ก่อนนำเข้าซ้ำ
            </p>
          )}
          {result.errors.length > 0 && (
            <div className="mt-2 border-t border-white/5 pt-2">
              <p className="text-xs font-medium text-red-400">ข้อผิดพลาด:</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-400/80">• {err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
