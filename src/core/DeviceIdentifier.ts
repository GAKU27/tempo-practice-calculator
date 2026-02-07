/**
 * DeviceIdentifier - 個体識別管理
 * ブラウザ固有の識別子を生成・保存し、ユーザー選択なしで
 * そのブラウザ専用のデータを自動でロードする仕組み
 */

import { STORAGE_KEYS } from '../types';

export class DeviceIdentifier {
    private static instance: DeviceIdentifier | null = null;
    private deviceId: string;

    private constructor() {
        this.deviceId = this.loadOrCreate();
    }

    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): DeviceIdentifier {
        if (!DeviceIdentifier.instance) {
            DeviceIdentifier.instance = new DeviceIdentifier();
        }
        return DeviceIdentifier.instance;
    }

    /**
     * デバイスIDを取得
     */
    getId(): string {
        return this.deviceId;
    }

    /**
     * デバイスIDを再生成（データ消去時に使用）
     */
    regenerate(): string {
        this.deviceId = this.generateUUID();
        this.save();
        return this.deviceId;
    }

    /**
     * デバイスIDを完全に削除
     */
    clear(): void {
        try {
            localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
        } catch (e) {
            console.warn('Failed to clear device ID:', e);
        }
    }

    /**
     * ローカルストレージから読み込み、なければ新規生成
     */
    private loadOrCreate(): string {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
            if (saved && this.isValidUUID(saved)) {
                return saved;
            }
        } catch (e) {
            console.warn('Failed to load device ID:', e);
        }

        const newId = this.generateUUID();
        this.deviceId = newId;
        this.save();
        return newId;
    }

    /**
     * ローカルストレージに保存
     */
    private save(): void {
        try {
            localStorage.setItem(STORAGE_KEYS.DEVICE_ID, this.deviceId);
        } catch (e) {
            console.warn('Failed to save device ID:', e);
        }
    }

    /**
     * UUID v4形式のIDを生成
     */
    private generateUUID(): string {
        // crypto.randomUUID()が利用可能な場合はそれを使用（より安全）
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        // フォールバック: 手動生成
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /**
     * UUID形式の検証
     */
    private isValidUUID(str: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    /**
     * デバイス情報のサマリーを取得（デバッグ用）
     */
    getDeviceInfo(): Record<string, string> {
        return {
            deviceId: this.deviceId,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            createdAt: new Date().toISOString()
        };
    }
}

// 使いやすさのためのショートカット関数
export function getDeviceId(): string {
    return DeviceIdentifier.getInstance().getId();
}

export function clearDeviceId(): void {
    DeviceIdentifier.getInstance().clear();
}
