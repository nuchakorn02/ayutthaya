'use client';

import { useState, useRef, useCallback } from 'react';
import type { ImportPreview } from '@/lib/types';
import ImportPreviewTable from '@/components/admin/ImportPreviewTable';

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
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [onedriveUrl, setOnedriveUrl] = useState('');

  const resetPreview = () => {
    setPreview(null);
    setResult(null);
    setError('');
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
      resetPreview();
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      resetPreview();
    }
  };

  const handleUrlChange = (value: string) => {
    setOnedriveUrl(value);
    resetPreview();
  };

  const handlePreview = async () => {
    if (!file && !onedriveUrl.trim()) return;

    setIsPreviewing(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('action', 'preview');
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('url', onedriveUrl.trim());
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'ตรวจสอบไฟล์ไม่สำเร็จ');
      }

      setPreview(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบ');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview?.confirmation_token) return;

    setIsConfirming(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('action', 'confirm');
      formData.append('confirmation_token', preview.confirmation_token);
      formData.append('source_fingerprint', preview.source_fingerprint);
      formData.append('comparison_fingerprint', preview.comparison_fingerprint);
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('url', onedriveUrl.trim());
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'นำเข้าไม่สำเร็จ');
      }

      setResult(json.data);
      setPreview(null);
      setFile(null);
      setOnedriveUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้า');
    } finally {
      setIsConfirming(false);
    }
  };

  const canPreview = (file || onedriveUrl.trim()) && !isPreviewing && !isConfirming;
  const canConfirm = preview && preview.confirmation_token && !isConfirming && !isPreviewing;

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
              onChange={(e) => handleUrlChange(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-bg-secondary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent-cyan focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Preview Button */}
      {canPreview && (
        <button
          onClick={handlePreview}
          disabled={isPreviewing}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple
            px-6 py-3 font-semibold text-bg-primary transition-all duration-300
            hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {isPreviewing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบก่อนนำเข้า'}
        </button>
      )}

      {/* Preview Result */}
      {preview && (
        <div className="mt-4 space-y-4 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-accent-cyan">ผลการตรวจสอบ: {preview.source_name}</p>
            <button
              onClick={resetPreview}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              ยกเลิก
            </button>
          </div>

          <ImportPreviewTable preview={preview} />

          {canConfirm && (
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-crimson
                px-6 py-3 font-semibold text-[#fcf9f2] transition-all duration-300
                hover:shadow-[0_0_30px_rgba(212,175,55,0.25)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isConfirming ? 'กำลังนำเข้า...' : 'ยืนยันนำเข้า'}
            </button>
          )}
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
