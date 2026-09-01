import React, { useState } from 'react';
import {
  Save,
  RotateCcw,
  Trash2,
  X,
  Clock,
  ShieldCheck,
  Tag,
  AlertCircle,
  FileJson,
  Upload,
  Download,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { SnapshotItem, AppLanguage } from '../types';
import { downloadJsonFile } from '../utils/helpers';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SnapshotItem[];
  onSaveSnapshot: (tag?: string, desc?: string) => Promise<void>;
  onRestoreSnapshot: (snapshot: SnapshotItem) => void;
  onDeleteSnapshot: (id: string) => Promise<void>;
  language: AppLanguage;
  currentStep: number;
}

export function SnapshotModal({
  isOpen,
  onClose,
  snapshots,
  onSaveSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  language,
  currentStep,
}: SnapshotModalProps) {
  const [tagInput, setTagInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isKo = language === 'ko';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const defaultTag = isKo
        ? `Step ${currentStep === 0 ? '장르 선택' : currentStep} 작업 시점`
        : `Step ${currentStep === 0 ? 'Genre' : currentStep} checkpoint`;
      await onSaveSnapshot(tagInput.trim() || defaultTag, descInput.trim() || undefined);
      setTagInput('');
      setDescInput('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJson = (snap: SnapshotItem) => {
    const filename = `playlist_snapshot_${snap.id}_${Date.now()}.json`;
    downloadJsonFile(filename, snap.state);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white border-3 border-[#111111] rounded-2xl w-full max-w-2xl shadow-[8px_8px_0_#111111] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b-3 border-[#111111] flex items-center justify-between bg-[#00ffca]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#111111] shadow-[2px_2px_0_#111111] flex items-center justify-center text-[#111111]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-gaegu font-bold text-[#111111] flex items-center gap-2">
                <span>{isKo ? '스냅샷 및 롤백 복구 시스템' : 'Snapshot & Rollback System'}</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-[#111111] text-xs font-mono-neo font-extrabold border-2 border-[#111111] shadow-[1px_1px_0_#111111]">
                  {snapshots.length} / 20 {isKo ? '슬롯' : 'Slots'}
                </span>
              </h2>
              <p className="text-xs text-[#111111] font-mono-neo font-bold mt-0.5">
                {isKo
                  ? '현재 상태를 안전하게 저장하고, 언제든 이전 작업 시점으로 즉시 롤백 복원합니다.'
                  : 'Safely snapshot your project and instantly rollback anytime to prevent data loss.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white hover:bg-[#ff477e] hover:text-white border-2 border-[#111111] text-[#111111] flex items-center justify-center shadow-[2px_2px_0_#111111] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-[#fffbf2]">
          {/* Quick Save Form */}
          <div className="bg-white border-3 border-[#111111] rounded-xl p-4 shadow-[4px_4px_0_#111111]">
            <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase flex items-center gap-2 mb-3">
              <Save className="w-4 h-4 text-[#ff477e]" />
              <span>{isKo ? '현재 상태 스냅샷 저장 (새 슬롯 생성)' : 'Create New Snapshot'}</span>
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={
                    isKo
                      ? `태그 (예: Step ${currentStep} 완성 직후)`
                      : `Tag (e.g., Step ${currentStep} completed)`
                  }
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="w-full bg-white border-2 border-[#111111] rounded-lg px-3 py-2 text-xs font-mono-neo font-bold text-[#111111] placeholder-zinc-400 focus:outline-none focus:border-[#ff477e] shadow-[2px_2px_0_#111111]"
                />
                <input
                  type="text"
                  placeholder={
                    isKo
                      ? '메모/설명 (선택 사항)'
                      : 'Description/Note (optional)'
                  }
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full bg-white border-2 border-[#111111] rounded-lg px-3 py-2 text-xs font-mono-neo font-bold text-[#111111] placeholder-zinc-400 focus:outline-none focus:border-[#ff477e] shadow-[2px_2px_0_#111111]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#555555] font-mono-neo font-bold">
                  {isKo
                    ? '최대 20개 슬롯 유지 (초과 시 가장 오래된 슬롯 자동 교체)'
                    : 'Max 20 slots (oldest automatically rotated)'}
                </span>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#ff477e] hover:bg-[#ff2d6c] text-white text-xs font-mono-neo font-extrabold uppercase border-2 border-[#111111] flex items-center gap-1.5 transition-all shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSaving ? (isKo ? '저장 중...' : 'Saving...') : isKo ? '💾 지금 스냅샷 저장' : '💾 Save Snapshot'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Snapshot Slots List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#ff477e]" />
                <span>{isKo ? '저장된 스냅샷 목록' : 'Saved Snapshot Slots'}</span>
              </h3>
              {snapshots.length > 0 && (
                <button
                  onClick={() => onDeleteSnapshot('all')}
                  className="text-xs text-[#ff477e] hover:underline font-mono-neo font-bold flex items-center gap-1 cursor-pointer uppercase"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isKo ? '전체 슬롯 비우기' : 'Clear All Slots'}</span>
                </button>
              )}
            </div>

            {snapshots.length === 0 ? (
              <div className="text-center py-8 px-4 border-2 border-dashed border-[#111111] rounded-xl bg-white shadow-[2px_2px_0_#111111]">
                <ShieldCheck className="w-8 h-8 text-[#555555] mx-auto mb-2" />
                <p className="text-xs text-[#111111] font-mono-neo font-bold">
                  {isKo ? '저장된 스냅샷이 없습니다.' : 'No snapshots saved yet.'}
                </p>
                <p className="text-[11px] text-[#555555] font-medium mt-1">
                  {isKo
                    ? '상단의 [💾 스냅샷 저장] 버튼을 눌러 현재 상태를 보관해 두세요.'
                    : 'Click "Save Snapshot" above to create your first recovery checkpoint.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snap, idx) => {
                  const isConfirming = confirmRestoreId === snap.id;
                  const trackCount = snap.state?.tracks?.length || 0;
                  const title = snap.state?.favoriteTitle || snap.state?.titleSeo?.hookTitle || '타이틀 미생성';
                  const genre = snap.state?.concept?.genre || '로파이';

                  return (
                    <div
                      key={snap.id}
                      className="bg-white border-2 border-[#111111] hover:bg-[#fffbf2] rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0_#111111]"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-[#ffd166] text-[#111111] font-mono-neo font-extrabold text-[11px] border border-[#111111]">
                            Slot #{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white text-[#111111] font-mono-neo font-bold text-[11px] border border-[#111111]">
                            Step {snap.step}
                          </span>
                          <span className="text-xs font-mono-neo font-extrabold text-[#111111] truncate max-w-[200px]">
                            {snap.tag}
                          </span>
                          <span className="text-[11px] text-[#555555] font-mono-neo flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#111111]" />
                            {snap.timeFormatted}
                          </span>
                        </div>

                        <div className="text-xs text-[#111111] font-medium truncate">
                          <span className="text-[#555555] font-bold">[{genre}]</span> {title}
                          {trackCount > 0 && <span className="text-[#ff477e] ml-1.5 font-bold">({trackCount}곡)</span>}
                        </div>

                        {snap.description && (
                          <p className="text-[11px] text-[#555555] italic truncate">
                            {snap.description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isConfirming ? (
                          <div className="flex items-center gap-1 bg-[#ffd166] border-2 border-[#111111] p-1 rounded-lg">
                            <button
                              onClick={() => {
                                onRestoreSnapshot(snap);
                                setConfirmRestoreId(null);
                                onClose();
                              }}
                              className="px-2.5 py-1 bg-[#ff477e] hover:bg-[#ff2d6c] text-white text-xs font-mono-neo font-extrabold border border-[#111111] transition-colors cursor-pointer"
                            >
                              {isKo ? '확인 (복원)' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setConfirmRestoreId(null)}
                              className="px-2 py-1 bg-white hover:bg-[#fffbf2] text-[#111111] text-xs font-mono-neo font-bold border border-[#111111] transition-colors cursor-pointer"
                            >
                              {isKo ? '취소' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRestoreId(snap.id)}
                            title={isKo ? '이 스냅샷으로 롤백 복원' : 'Rollback to this snapshot'}
                            className="px-3 py-1.5 bg-[#00ffca] hover:bg-[#00e5b5] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase flex items-center gap-1.5 shadow-[2px_2px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{isKo ? '↩ 즉시 복구' : '↩ Restore'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleExportJson(snap)}
                          title={isKo ? '스냅샷 JSON 파일 다운로드' : 'Download JSON'}
                          className="p-1.5 rounded-lg bg-white hover:bg-[#ffd166] border border-[#111111] text-[#111111] shadow-[1px_1px_0_#111111] transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteSnapshot(snap.id)}
                          title={isKo ? '스냅샷 삭제' : 'Delete slot'}
                          className="p-1.5 rounded-lg bg-white hover:bg-[#ff477e] hover:text-white border border-[#111111] text-[#111111] shadow-[1px_1px_0_#111111] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-3 border-[#111111] bg-white flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[#111111] font-mono-neo font-bold">
            <ShieldCheck className="w-4 h-4 text-[#00ffca]" />
            <span>
              {isKo
                ? '서버와 브라우저 로컬 저장소에 이중 보관되어 새로고침 후에도 유지됩니다.'
                : 'Double-saved to server & localStorage, persisting across refreshes.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#111111] hover:bg-[#333333] text-white text-xs font-mono-neo font-bold uppercase transition-colors cursor-pointer shadow-[2px_2px_0_#ff477e]"
          >
            {isKo ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
