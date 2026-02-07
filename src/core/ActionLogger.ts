/**
 * ActionLogger - アクション・エラーログ
 * ユーザー操作履歴と遅延を記録し、診断データを提供
 */

import { ActionLogEntry, STORAGE_KEYS } from '../types';
import { getDeviceId } from './DeviceIdentifier';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface EnhancedLogEntry extends ActionLogEntry {
    level: LogLevel;
    deviceId: string;
    sessionId: string;
}

export class ActionLogger {
    private static instance: ActionLogger | null = null;
    private readonly MAX_ENTRIES = 500;
    private readonly sessionId: string;
    private logs: EnhancedLogEntry[] = [];
    private startTime: number;

    private constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = performance.now();
        this.loadFromStorage();

        // ページ離脱時に自動保存
        window.addEventListener('beforeunload', () => this.saveToStorage());

        // 初期ログ
        this.log('info', 'session_started', {
            userAgent: navigator.userAgent,
            viewport: { width: window.innerWidth, height: window.innerHeight }
        });
    }

    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): ActionLogger {
        if (!ActionLogger.instance) {
            ActionLogger.instance = new ActionLogger();
        }
        return ActionLogger.instance;
    }

    /**
     * ログを記録
     */
    log(level: LogLevel, action: string, details?: Record<string, unknown>): void {
        const entry: EnhancedLogEntry = {
            timestamp: Date.now(),
            action,
            details,
            latency: this.measureLatency(),
            level,
            deviceId: getDeviceId(),
            sessionId: this.sessionId
        };

        this.logs.push(entry);

        // 最大エントリ数を超えたら古いものを削除
        while (this.logs.length > this.MAX_ENTRIES) {
            this.logs.shift();
        }

        // デバッグモードではコンソールにも出力
        if (level === 'error' || level === 'warn') {
            console[level](`[ActionLogger] ${action}`, details);
        }
    }

    /**
     * 情報ログ
     */
    info(action: string, details?: Record<string, unknown>): void {
        this.log('info', action, details);
    }

    /**
     * 警告ログ
     */
    warn(action: string, details?: Record<string, unknown>): void {
        this.log('warn', action, details);
    }

    /**
     * エラーログ
     */
    error(action: string, details?: Record<string, unknown>): void {
        this.log('error', action, details);
    }

    /**
     * デバッグログ
     */
    debug(action: string, details?: Record<string, unknown>): void {
        this.log('debug', action, details);
    }

    /**
     * すべてのログを取得
     */
    getLogs(): EnhancedLogEntry[] {
        return [...this.logs];
    }

    /**
     * 特定のアクションのログをフィルタリング
     */
    getLogsByAction(action: string): EnhancedLogEntry[] {
        return this.logs.filter(log => log.action === action);
    }

    /**
     * 特定のレベルのログをフィルタリング
     */
    getLogsByLevel(level: LogLevel): EnhancedLogEntry[] {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * 現在のセッションのログのみ取得
     */
    getCurrentSessionLogs(): EnhancedLogEntry[] {
        return this.logs.filter(log => log.sessionId === this.sessionId);
    }

    /**
     * ログ統計を取得
     */
    getStats(): {
        totalLogs: number;
        errorCount: number;
        warnCount: number;
        avgLatency: number;
        sessionDuration: number;
    } {
        const now = performance.now();
        const latencies = this.logs
            .filter(log => log.latency !== undefined)
            .map(log => log.latency as number);

        return {
            totalLogs: this.logs.length,
            errorCount: this.logs.filter(log => log.level === 'error').length,
            warnCount: this.logs.filter(log => log.level === 'warn').length,
            avgLatency: latencies.length > 0
                ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                : 0,
            sessionDuration: now - this.startTime
        };
    }

    /**
     * ログをJSON形式でエクスポート
     */
    exportAsJSON(): string {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            deviceId: getDeviceId(),
            sessionId: this.sessionId,
            stats: this.getStats(),
            logs: this.logs
        }, null, 2);
    }

    /**
     * すべてのログをクリア
     */
    clear(): void {
        this.logs = [];
        this.saveToStorage();
        this.log('info', 'logs_cleared');
    }

    /**
     * ローカルストレージに保存
     */
    saveToStorage(): void {
        try {
            // 最新の100件のみ保存（ストレージ節約）
            const logsToSave = this.logs.slice(-100);
            localStorage.setItem(STORAGE_KEYS.ACTION_LOG, JSON.stringify(logsToSave));
        } catch (e) {
            console.warn('Failed to save action logs:', e);
        }
    }

    /**
     * ローカルストレージから読み込み
     */
    private loadFromStorage(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.ACTION_LOG);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    this.logs = parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to load action logs:', e);
            this.logs = [];
        }
    }

    /**
     * セッションIDを生成
     */
    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * 現在のレイテンシを計測
     */
    private measureLatency(): number {
        // performance.nowを使用して高精度な計測
        return performance.now() - this.startTime;
    }
}

// 便利なショートカット関数
export function logAction(action: string, details?: Record<string, unknown>): void {
    ActionLogger.getInstance().info(action, details);
}

export function logError(action: string, details?: Record<string, unknown>): void {
    ActionLogger.getInstance().error(action, details);
}

export function logWarn(action: string, details?: Record<string, unknown>): void {
    ActionLogger.getInstance().warn(action, details);
}
