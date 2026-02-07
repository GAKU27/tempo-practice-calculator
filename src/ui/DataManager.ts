/**
 * DataManager - データ消去管理
 * 3秒長押しで完全消去、プログレス表示付き
 */

import { STORAGE_KEYS } from '../types';
import { logAction, logWarn } from '../core/ActionLogger';
import { DeviceIdentifier } from '../core/DeviceIdentifier';

export interface DeleteProgress {
    isHolding: boolean;
    progress: number; // 0-100
    startTime: number | null;
}

export class DataManager {
    private static instance: DataManager | null = null;
    private readonly HOLD_DURATION = 3000; // 3秒
    private holdStartTime: number | null = null;
    private progressTimer: number | null = null;
    private animationFrame: number | null = null;
    private onProgressChange: ((progress: number) => void) | null = null;
    private onDeleteComplete: (() => void) | null = null;

    private constructor() { }

    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): DataManager {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager();
        }
        return DataManager.instance;
    }

    /**
     * 長押し削除ボタンを初期化
     */
    initDeleteButton(
        buttonId: string,
        progressId: string,
        options?: {
            onProgress?: (progress: number) => void;
            onComplete?: () => void;
        }
    ): void {
        const button = document.getElementById(buttonId);
        const progress = document.getElementById(progressId);

        if (!button) {
            logWarn('delete_button_not_found', { buttonId });
            return;
        }

        this.onProgressChange = options?.onProgress || null;
        this.onDeleteComplete = options?.onComplete || null;

        // タッチイベント
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startHold(progress);
        }, { passive: false });

        button.addEventListener('touchend', () => this.cancelHold(progress));
        button.addEventListener('touchcancel', () => this.cancelHold(progress));

        // マウスイベント
        button.addEventListener('mousedown', () => this.startHold(progress));
        button.addEventListener('mouseup', () => this.cancelHold(progress));
        button.addEventListener('mouseleave', () => this.cancelHold(progress));

        logAction('delete_button_initialized', { buttonId, progressId });
    }

    /**
     * 長押し開始
     */
    private startHold(progressElement: HTMLElement | null): void {
        this.holdStartTime = Date.now();

        logAction('delete_hold_started');

        // プログレスアニメーション開始
        if (progressElement) {
            progressElement.style.transition = 'none';
            progressElement.style.width = '0%';

            // 強制リフロー
            void progressElement.offsetWidth;

            progressElement.style.transition = `width ${this.HOLD_DURATION}ms linear`;
            progressElement.style.width = '100%';
        }

        // プログレスコールバック用のアニメーションフレーム
        const updateProgress = () => {
            if (this.holdStartTime === null) return;

            const elapsed = Date.now() - this.holdStartTime;
            const progress = Math.min((elapsed / this.HOLD_DURATION) * 100, 100);

            if (this.onProgressChange) {
                this.onProgressChange(progress);
            }

            if (progress < 100) {
                this.animationFrame = requestAnimationFrame(updateProgress);
            }
        };

        this.animationFrame = requestAnimationFrame(updateProgress);

        // タイムアウト設定
        this.progressTimer = window.setTimeout(() => {
            this.executeDelete();
        }, this.HOLD_DURATION);
    }

    /**
     * 長押しキャンセル
     */
    private cancelHold(progressElement: HTMLElement | null): void {
        if (this.holdStartTime === null) return;

        const elapsed = Date.now() - this.holdStartTime;
        logAction('delete_hold_cancelled', { elapsed, percentage: (elapsed / this.HOLD_DURATION) * 100 });

        // タイマーをクリア
        if (this.progressTimer) {
            clearTimeout(this.progressTimer);
            this.progressTimer = null;
        }

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // プログレスをリセット
        if (progressElement) {
            progressElement.style.transition = 'width 0.2s ease';
            progressElement.style.width = '0%';
        }

        if (this.onProgressChange) {
            this.onProgressChange(0);
        }

        this.holdStartTime = null;
    }

    /**
     * 完全消去の実行
     */
    private executeDelete(): void {
        logAction('delete_executed');

        // すべてのアプリデータを消去
        const keysToDelete = Object.values(STORAGE_KEYS);

        keysToDelete.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn(`Failed to remove ${key}:`, e);
            }
        });

        // デバイスIDを再生成（完全な初期化）
        DeviceIdentifier.getInstance().regenerate();

        // 完了コールバック
        if (this.onDeleteComplete) {
            this.onDeleteComplete();
        }

        // アプリをリロードして初期状態に戻す
        window.location.reload();
    }

    /**
     * 特定のデータのみを削除
     */
    deleteSpecific(keys: (keyof typeof STORAGE_KEYS)[]): void {
        keys.forEach(key => {
            const storageKey = STORAGE_KEYS[key];
            try {
                localStorage.removeItem(storageKey);
                logAction('specific_data_deleted', { key: storageKey });
            } catch (e) {
                logWarn('delete_failed', { key: storageKey, error: String(e) });
            }
        });
    }

    /**
     * 現在のストレージ使用量を取得
     */
    getStorageUsage(): {
        used: number;
        available: number;
        items: { key: string; size: number }[];
    } {
        const items: { key: string; size: number }[] = [];
        let totalUsed = 0;

        Object.values(STORAGE_KEYS).forEach(key => {
            try {
                const value = localStorage.getItem(key);
                if (value) {
                    const size = new Blob([value]).size;
                    items.push({ key, size });
                    totalUsed += size;
                }
            } catch (e) {
                // 無視
            }
        });

        return {
            used: totalUsed,
            available: 5 * 1024 * 1024 - totalUsed, // 一般的なlocalStorageの制限は5MB
            items
        };
    }

    /**
     * データのエクスポート
     */
    exportAllData(): string {
        const data: Record<string, unknown> = {};

        Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
            try {
                const value = localStorage.getItem(key);
                if (value) {
                    try {
                        data[name] = JSON.parse(value);
                    } catch {
                        data[name] = value;
                    }
                }
            } catch (e) {
                // 無視
            }
        });

        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            deviceId: DeviceIdentifier.getInstance().getId(),
            data
        }, null, 2);
    }

    /**
     * データのインポート
     */
    importData(jsonString: string): boolean {
        try {
            const imported = JSON.parse(jsonString);

            if (!imported.data) {
                logWarn('import_failed', { reason: 'No data field' });
                return false;
            }

            Object.entries(imported.data).forEach(([name, value]) => {
                const key = STORAGE_KEYS[name as keyof typeof STORAGE_KEYS];
                if (key) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            });

            logAction('data_imported', { itemCount: Object.keys(imported.data).length });
            return true;
        } catch (e) {
            logWarn('import_failed', { error: String(e) });
            return false;
        }
    }
}

// 便利なショートカット
export function initDataManager(buttonId: string, progressId: string): void {
    DataManager.getInstance().initDeleteButton(buttonId, progressId);
}

export function exportAppData(): string {
    return DataManager.getInstance().exportAllData();
}
