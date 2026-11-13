'use client';

import { useState, useEffect } from 'react';

interface DiscordSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DiscordSettingsModal({ isOpen, onClose }: DiscordSettingsModalProps) {
  const [enabled, setEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [maskedUrl, setMaskedUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [hasEnvUrl, setHasEnvUrl] = useState(false);
  const [hasCustomUrl, setHasCustomUrl] = useState(false);
  const [notifyOnImport, setNotifyOnImport] = useState(true);
  const [notifyOnEdit, setNotifyOnEdit] = useState(true);
  const [notifyOnDelete, setNotifyOnDelete] = useState(true);
  const [importTemplate, setImportTemplate] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings/discord');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'ดึงการตั้งค่าไม่สำเร็จ');

        setEnabled(data.enabled ?? true);
        setMaskedUrl(data.masked_url || '');
        setWebhookUrl('');
        setHasEnvUrl(data.has_env_url || false);
        setHasCustomUrl(data.has_custom_url || false);
        setNotifyOnImport(data.notify_on_import ?? true);
        setNotifyOnEdit(data.notify_on_edit ?? true);
        setNotifyOnDelete(data.notify_on_delete ?? true);
        setImportTemplate(data.import_template ?? '');
      } catch (err) {
        console.error('Failed to load discord settings:', err);
        setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'ดึงข้อมูลไม่สำเร็จ' });
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, [isOpen]);

  const handleTest = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const testPayloadUrl = isEditingUrl && webhookUrl.trim() ? webhookUrl.trim() : undefined;
      const res = await fetch('/api/settings/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          webhook_url: testPayloadUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ส่งข้อความทดสอบไม่สำเร็จ');

      setFeedback({ type: 'success', message: data.message || 'ส่งข้อความทดสอบสำเร็จ!' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'ส่งข้อความทดสอบไม่สำเร็จ' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const payload: {
        action: 'save';
        enabled: boolean;
        notify_on_import: boolean;
        notify_on_edit: boolean;
        notify_on_delete: boolean;
        import_template: string;
        webhook_url?: string;
      } = {
        action: 'save',
        enabled,
        notify_on_import: notifyOnImport,
        notify_on_edit: notifyOnEdit,
        notify_on_delete: notifyOnDelete,
        import_template: importTemplate,
      };

      if (isEditingUrl) {
        payload.webhook_url = webhookUrl.trim();
      }

      const res = await fetch('/api/settings/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกการตั้งค่าไม่สำเร็จ');

      setFeedback({ type: 'success', message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-accent-gold/20 bg-[#0c0909] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/30 text-white">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">ตั้งค่า Discord Webhook</h2>
              <p className="text-xs text-text-secondary">แจ้งเตือนคะแนนและประวัติความเคลื่อนไหวไปยังห้องแชท Discord</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary hover:bg-white/5 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-text-secondary gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
              กำลังโหลดการตั้งค่า...
            </div>
          ) : (
            <>
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                    feedback.type === 'success'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  <span>{feedback.type === 'success' ? '✅' : '⚠️'}</span>
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Master Enable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div>
                  <p className="text-sm font-bold text-white">เปิดใช้งานการแจ้งเตือน Discord</p>
                  <p className="text-xs text-text-secondary mt-0.5">เปิดหรือปิดการส่ง Webhook ทั้งหมดในระบบ</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-gold"></div>
                </label>
              </div>

              {/* Webhook URL Configuration */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Discord Webhook URL
                  </label>
                  {!isEditingUrl && (
                    <button
                      type="button"
                      onClick={() => setIsEditingUrl(true)}
                      className="text-xs text-accent-gold hover:underline cursor-pointer"
                    >
                      ✏️ เปลี่ยน URL
                    </button>
                  )}
                </div>

                {!isEditingUrl ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/40 text-xs font-mono">
                    <span className="text-text-secondary truncate">
                      {maskedUrl || '(ยังไม่มีการระบุ Webhook URL)'}
                    </span>
                    <span className="ml-2 shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-text-secondary">
                      {hasCustomUrl ? 'กำหนดเอง' : hasEnvUrl ? 'ค่าจาก .env' : 'ไม่ได้ตั้งค่า'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-accent-gold/40 bg-black/60 text-xs font-mono text-white placeholder-text-secondary/40 focus:outline-none focus:border-accent-gold"
                    />
                    <div className="flex justify-between items-center text-[10px] text-text-secondary">
                      <span>เว้นว่างไว้เพื่อกลับไปใช้ค่าจาก .env หรือยกเลิก</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingUrl(false);
                          setWebhookUrl('');
                        }}
                        className="text-red-400 hover:underline cursor-pointer"
                      >
                        ยกเลิกการแก้ไข
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                <label htmlFor="discord-import-template" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  ข้อความประกอบการแจ้งเตือนนำเข้า
                </label>
                <textarea
                  id="discord-import-template"
                  value={importTemplate}
                  onChange={(event) => setImportTemplate(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="ข้อความที่ส่งก่อนสรุปผลการนำเข้า (เว้นว่างได้)"
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-text-secondary/50 focus:border-accent-gold focus:outline-none"
                />
                <p className="text-[10px] text-text-secondary text-right">{importTemplate.length}/2000</p>
              </div>

              {/* Notification Events Toggles */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  ประเภทเหตุการณ์ที่ต้องการรับการแจ้งเตือน
                </p>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyOnImport}
                    onChange={(e) => setNotifyOnImport(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black/40 text-accent-gold focus:ring-0 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-text-primary">📥 การนำเข้าคะแนนประจำสัปดาห์ (CSV / Excel Import)</span>
                    <p className="text-[10px] text-text-secondary">แจ้งเตือนสรุปยอดผู้เล่นและแต้มรวมที่เพิ่มขึ้น</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyOnEdit}
                    onChange={(e) => setNotifyOnEdit(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black/40 text-accent-gold focus:ring-0 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-text-primary">✏️ การปรับปรุงคะแนนผู้เล่นรายคน (Score Adjustment)</span>
                    <p className="text-[10px] text-text-secondary">แจ้งเตือนเมื่อแอดมินบวก/ลบแต้มพร้อมเหตุผล</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyOnDelete}
                    onChange={(e) => setNotifyOnDelete(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black/40 text-accent-gold focus:ring-0 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-text-primary">🚪 การพ้นสภาพ / ลบผู้เล่น (Discharge / Delete)</span>
                    <p className="text-[10px] text-text-secondary">แจ้งเตือนเมื่อมีผู้เล่นถูกปลดประจำการ</p>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4 bg-white/[0.02]">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || isLoading || !enabled}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/10 text-xs font-bold text-[#5865F2] hover:bg-[#5865F2]/20 hover:border-[#5865F2] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#5865F2] border-t-transparent" />
            ) : (
              <span>🔔</span>
            )}
            ส่งข้อความทดสอบ
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-text-secondary hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl border border-accent-gold bg-accent-gold/20 text-xs font-bold text-accent-gold hover:bg-accent-gold/30 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
              ) : (
                <span>💾</span>
              )}
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
