/**
 * PrecisionTimer - 高精度同期エンジン
 * 描画の周期をシステム時刻（ミリ秒）と同期させ、
 * ブラウザの負荷による遅延を自動的に補正するロジック
 */

export interface TimingMetrics {
    scheduledTime: number;
    actualTime: number;
    drift: number;
    cumulativeDrift: number;
}

export class PrecisionTimer {
    private audioContext: AudioContext | null = null;
    private driftHistory: number[] = [];
    private cumulativeDrift: number = 0;
    private lastScheduledTime: number = 0;
    private lastActualTime: number = 0;
    private readonly MAX_DRIFT_SAMPLES = 20;
    private readonly DRIFT_CORRECTION_FACTOR = 0.15;

    /**
     * AudioContextを初期化（ユーザーアクション内で呼び出す必要あり）
     */
    async initialize(): Promise<void> {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Suspended状態の場合はresume
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // ウォームアップ: 無音バッファを再生してオーディオパイプラインを準備
            const buffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);
        } catch (e) {
            console.warn('Failed to initialize AudioContext:', e);
        }
    }

    /**
     * 現在の高精度タイムスタンプを取得
     * AudioContextが利用可能な場合はそれを使用（より正確）
     */
    now(): number {
        if (this.audioContext && this.audioContext.state === 'running') {
            return this.audioContext.currentTime * 1000; // 秒→ミリ秒
        }
        return performance.now();
    }

    /**
     * コールバックを指定時間後に実行（自動ドリフト補正付き）
     */
    scheduleCallback(callback: () => void, delayMs: number): number {
        const scheduledTime = this.now() + delayMs;
        const correctedDelay = this.getCorrectedDelay(delayMs);

        const timerId = window.setTimeout(() => {
            const actualTime = this.now();
            this.recordTiming(scheduledTime, actualTime);
            callback();
        }, correctedDelay);

        this.lastScheduledTime = scheduledTime;
        return timerId;
    }

    /**
     * 繰り返しコールバックを実行（高精度ループ）
     */
    scheduleRepeating(
        callback: (metrics: TimingMetrics) => void,
        intervalMs: number
    ): () => void {
        let isRunning = true;
        let nextTime = this.now();

        const tick = () => {
            if (!isRunning) return;

            const actualTime = this.now();
            const drift = actualTime - nextTime;

            this.recordDrift(drift);

            const metrics: TimingMetrics = {
                scheduledTime: nextTime,
                actualTime,
                drift,
                cumulativeDrift: this.cumulativeDrift
            };

            callback(metrics);

            // 次の実行時刻を計算（ドリフトを補正）
            nextTime += intervalMs;
            const correctedDelay = Math.max(0, nextTime - this.now() - this.getAverageDrift() * this.DRIFT_CORRECTION_FACTOR);

            setTimeout(tick, correctedDelay);
        };

        // 最初のティックを開始
        setTimeout(tick, intervalMs);

        // 停止関数を返す
        return () => {
            isRunning = false;
        };
    }

    /**
     * BPMから正確なインターバル（ミリ秒）を計算
     */
    bpmToInterval(bpm: number, subdivision: number = 1): number {
        const secondsPerBeat = 60 / bpm;
        const secondsPerNote = secondsPerBeat / subdivision;
        return secondsPerNote * 1000;
    }

    /**
     * ドリフト補正済みの遅延時間を取得
     */
    private getCorrectedDelay(originalDelay: number): number {
        const avgDrift = this.getAverageDrift();
        const correction = avgDrift * this.DRIFT_CORRECTION_FACTOR;
        return Math.max(0, originalDelay - correction);
    }

    /**
     * タイミングを記録してドリフトを計算
     */
    private recordTiming(scheduled: number, actual: number): void {
        const drift = actual - scheduled;
        this.recordDrift(drift);
        this.lastActualTime = actual;
    }

    /**
     * ドリフト値を履歴に追加
     */
    private recordDrift(drift: number): void {
        this.driftHistory.push(drift);
        this.cumulativeDrift += drift;

        // 古いサンプルを削除
        while (this.driftHistory.length > this.MAX_DRIFT_SAMPLES) {
            const removed = this.driftHistory.shift();
            if (removed !== undefined) {
                this.cumulativeDrift -= removed;
            }
        }
    }

    /**
     * 平均ドリフトを取得
     */
    private getAverageDrift(): number {
        if (this.driftHistory.length === 0) return 0;
        return this.cumulativeDrift / this.driftHistory.length;
    }

    /**
     * 現在のタイミング精度情報を取得
     */
    getTimingStats(): {
        averageDrift: number;
        maxDrift: number;
        minDrift: number;
        sampleCount: number;
    } {
        if (this.driftHistory.length === 0) {
            return { averageDrift: 0, maxDrift: 0, minDrift: 0, sampleCount: 0 };
        }

        return {
            averageDrift: this.getAverageDrift(),
            maxDrift: Math.max(...this.driftHistory),
            minDrift: Math.min(...this.driftHistory),
            sampleCount: this.driftHistory.length
        };
    }

    /**
     * タイミング履歴をリセット
     */
    reset(): void {
        this.driftHistory = [];
        this.cumulativeDrift = 0;
        this.lastScheduledTime = 0;
        this.lastActualTime = 0;
    }

    /**
     * AudioContextを破棄
     */
    destroy(): void {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.reset();
    }
}

// シングルトンインスタンス
let precisionTimerInstance: PrecisionTimer | null = null;

export function getPrecisionTimer(): PrecisionTimer {
    if (!precisionTimerInstance) {
        precisionTimerInstance = new PrecisionTimer();
    }
    return precisionTimerInstance;
}
