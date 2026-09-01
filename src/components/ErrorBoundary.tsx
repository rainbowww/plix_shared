import React from 'react';
import { ShieldAlert, RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react';
import { SnapshotItem } from '../types';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onRestoreSnapshot?: (snapshot: SnapshotItem) => void;
  snapshots?: SnapshotItem[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary caught critical error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleCleanReset = () => {
    try {
      localStorage.removeItem('ai_playlist_creator_state_v3');
      localStorage.removeItem('ai_playlist_creator_state_v2');
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      const snapshots = this.props.snapshots || [];

      return (
        <div className="min-h-screen bg-[#fffbf2] text-[#111111] flex items-center justify-center p-4 font-sans">
          <div className="max-w-2xl w-full bg-white border-3 border-[#111111] rounded-2xl p-6 sm:p-8 shadow-[8px_8px_0_#111111] space-y-6">
            <div className="flex items-center gap-4 border-b-2 border-[#111111] pb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#ff477e] border-2 border-[#111111] shadow-[3px_3px_0_#111111] flex items-center justify-center text-white">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-gaegu font-bold text-[#111111] flex items-center gap-2">
                  <span>시스템 비상 복구 모드 (Safe Recovery Mode)</span>
                  <span className="px-2 py-0.5 rounded bg-[#00ffca] border border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold shadow-[1px_1px_0_#111111]">
                    CRASH PROTECTED
                  </span>
                </h1>
                <p className="text-xs text-[#555555] font-mono-neo font-bold mt-1">
                  앱 실행 중 예기치 않은 오류가 감지되었습니다. 저장된 스냅샷으로 즉시 롤백 복구하거나 안전하게 재시작할 수 있습니다.
                </p>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-[#fffbf2] border-2 border-[#111111] rounded-xl p-3.5 text-xs text-[#ff477e] font-mono-neo font-bold shadow-[2px_2px_0_#111111] overflow-x-auto">
              <p className="font-extrabold flex items-center gap-1.5 text-[#ff477e] uppercase">
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                <span>오류 내용:</span>
              </p>
              <p className="mt-1 text-[#111111] break-all font-mono">{this.state.error?.message || '알 수 없는 렌더링 오류'}</p>
            </div>

            {/* Snapshot Restore Options */}
            <div className="space-y-3">
              <h2 className="text-sm font-mono-neo font-extrabold text-[#111111] uppercase flex items-center justify-between">
                <span>보관된 스냅샷으로 1-클릭 롤백:</span>
                <span className="text-xs text-[#ff477e]">{snapshots.length}개 슬롯 가용</span>
              </h2>

              {snapshots.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {snapshots.map((snap, idx) => (
                    <div
                      key={snap.id}
                      className="bg-[#fffbf2] border-2 border-[#111111] rounded-xl p-3 flex items-center justify-between gap-3 shadow-[3px_3px_0_#111111]"
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-[#ffd166] border border-[#111111] text-[#111111] text-[10px] font-mono-neo font-extrabold">
                            Slot #{idx + 1}
                          </span>
                          <span className="text-xs font-mono-neo font-extrabold text-[#111111] truncate">{snap.tag}</span>
                        </div>
                        <p className="text-[11px] text-[#555555] mt-0.5 truncate font-medium">
                          {snap.timeFormatted} · Step {snap.step} ({snap.state?.concept?.genre || '로파이'})
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (this.props.onRestoreSnapshot) {
                            this.props.onRestoreSnapshot(snap);
                            this.setState({ hasError: false, error: null, errorInfo: null });
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#00ffca] hover:bg-[#00e5b5] border-2 border-[#111111] text-[#111111] text-xs font-mono-neo font-extrabold uppercase flex items-center gap-1 shrink-0 shadow-[2px_2px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>이 시점으로 복원</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#555555] font-mono-neo p-3 bg-[#fffbf2] rounded-xl border-2 border-dashed border-[#111111] text-center">
                  저장된 스냅샷이 없습니다. 아래의 초기화 또는 새로고침을 실행하세요.
                </p>
              )}
            </div>

            {/* Fallback Actions */}
            <div className="flex items-center justify-between pt-2 border-t-2 border-[#111111]">
              <button
                onClick={this.handleCleanReset}
                className="text-xs font-mono-neo font-bold text-[#555555] hover:text-[#ff477e] transition-colors cursor-pointer uppercase"
              >
                데이터 초기화 후 재시작
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-[#ff477e] hover:bg-[#ff2d6c] border-2 border-[#111111] text-white text-xs font-mono-neo font-extrabold uppercase flex items-center gap-1.5 shadow-[3px_3px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>페이지 새로고침</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
