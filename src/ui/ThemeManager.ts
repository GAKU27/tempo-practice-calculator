/**
 * ThemeManager - テーマ・動的配色管理
 * 背景色の明暗を数学的に計算し、枠線・文字色を自動調整
 */

import { ThemeConfig, ThemeMode, STORAGE_KEYS } from '../types';
import { logAction } from '../core/ActionLogger';

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface HSL {
    h: number;
    s: number;
    l: number;
}

export class ThemeManager {
    private static instance: ThemeManager | null = null;
    private currentTheme: ThemeConfig;
    private currentMode: ThemeMode = 'dark';

    private readonly DEFAULT_DARK_THEME: ThemeConfig = {
        backgroundColor: '#0f0f1a',
        borderColor: '#2a2a4a',
        textColor: '#ffffff',
        accentColor: '#8b5cf6'
    };

    private readonly DEFAULT_LIGHT_THEME: ThemeConfig = {
        backgroundColor: '#f5f5f7',
        borderColor: '#d1d1d6',
        textColor: '#1d1d1f',
        accentColor: '#7c3aed'
    };

    private constructor() {
        this.currentTheme = this.DEFAULT_DARK_THEME;
        this.loadFromStorage();
    }

    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    /**
     * 色の相対輝度を計算（WCAG 2.1準拠）
     * 人間の知覚に基づいた重み付け
     */
    getLuminance(hex: string): number {
        const rgb = this.hexToRgb(hex);

        // sRGBリニア化
        const r = this.linearize(rgb.r / 255);
        const g = this.linearize(rgb.g / 255);
        const b = this.linearize(rgb.b / 255);

        // 相対輝度（0-1）
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * 簡易的な明るさ計算（0-255）
     */
    getBrightness(hex: string): number {
        const rgb = this.hexToRgb(hex);
        return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
    }

    /**
     * 2色間のコントラスト比を計算（WCAG 2.1準拠）
     */
    getContrastRatio(color1: string, color2: string): number {
        const l1 = this.getLuminance(color1);
        const l2 = this.getLuminance(color2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * 背景色から適切な枠線色を計算
     */
    calculateBorderColor(bgColor: string): string {
        const brightness = this.getBrightness(bgColor);
        const rgb = this.hexToRgb(bgColor);

        if (brightness > 128) {
            // 明るい背景 → 暗めの枠線
            return this.rgbToHex({
                r: Math.max(0, Math.round(rgb.r * 0.85)),
                g: Math.max(0, Math.round(rgb.g * 0.85)),
                b: Math.max(0, Math.round(rgb.b * 0.85))
            });
        } else {
            // 暗い背景 → 明るめの枠線
            return this.rgbToHex({
                r: Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.15)),
                g: Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.15)),
                b: Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.15))
            });
        }
    }

    /**
     * 背景色に対する最適な文字色を自動選択
     * WCAG 2.1 AAレベル（コントラスト比4.5:1以上）を保証
     */
    calculateTextColor(bgColor: string): string {
        const brightness = this.getBrightness(bgColor);

        // 基本的な白/黒の選択
        const baseColor = brightness > 128 ? '#000000' : '#ffffff';

        // コントラスト比の確認
        const contrastRatio = this.getContrastRatio(bgColor, baseColor);

        if (contrastRatio >= 4.5) {
            return baseColor;
        }

        // コントラストが不十分な場合は調整
        return brightness > 128 ? '#1a1a1a' : '#f0f0f0';
    }

    /**
     * アクセントカラーを背景に合わせて調整
     */
    calculateAccentColor(bgColor: string, baseAccent: string): string {
        const bgBrightness = this.getBrightness(bgColor);
        const accentRgb = this.hexToRgb(baseAccent);
        const accentHsl = this.rgbToHsl(accentRgb);

        if (bgBrightness > 128) {
            // 明るい背景 → アクセントを暗く
            accentHsl.l = Math.max(25, accentHsl.l - 15);
        } else {
            // 暗い背景 → アクセントを明るく
            accentHsl.l = Math.min(75, accentHsl.l + 10);
        }

        return this.hslToHex(accentHsl);
    }

    /**
     * テーマモードを設定
     */
    setMode(mode: ThemeMode): void {
        this.currentMode = mode;
        this.currentTheme = mode === 'dark'
            ? { ...this.DEFAULT_DARK_THEME }
            : { ...this.DEFAULT_LIGHT_THEME };

        this.applyTheme();
        this.saveToStorage();
        logAction('theme_mode_changed', { mode });
    }

    /**
     * UI要素とのバインディングを初期化
     */
    initUI(): void {
        const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
        if (themeSelect) {
            // 初期値をUIに反映
            themeSelect.value = this.currentMode;

            // 変更イベントを監視
            themeSelect.addEventListener('change', (e) => {
                this.setMode((e.target as HTMLSelectElement).value as ThemeMode);
            });
        }
    }

    /**
     * 背景色をカスタム設定し、他の色を自動計算
     */
    setBackgroundColor(bgColor: string): void {
        this.currentTheme = {
            backgroundColor: bgColor,
            borderColor: this.calculateBorderColor(bgColor),
            textColor: this.calculateTextColor(bgColor),
            accentColor: this.calculateAccentColor(bgColor, this.currentTheme.accentColor)
        };

        this.applyTheme();
        this.saveToStorage();
        logAction('background_color_changed', { bgColor, theme: this.currentTheme });
    }

    /**
     * 現在のテーマをDOMに適用
     */
    applyTheme(): void {
        const root = document.documentElement;

        root.style.setProperty('--bg-color', this.currentTheme.backgroundColor);
        root.style.setProperty('--border-color', this.currentTheme.borderColor);
        root.style.setProperty('--text-color', this.currentTheme.textColor);
        root.style.setProperty('--accent-color', this.currentTheme.accentColor);

        // data-theme属性も設定
        root.setAttribute('data-theme', this.currentMode);
    }

    /**
     * 現在のテーマ設定を取得
     */
    getTheme(): ThemeConfig {
        return { ...this.currentTheme };
    }

    /**
     * 現在のモードを取得
     */
    getMode(): ThemeMode {
        return this.currentMode;
    }

    /**
     * ストレージに保存
     */
    private saveToStorage(): void {
        try {
            const data = {
                theme: this.currentTheme,
                mode: this.currentMode
            };
            localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save theme:', e);
        }
    }

    /**
     * ストレージから読み込み
     */
    private loadFromStorage(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.THEME);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.theme) this.currentTheme = data.theme;
                if (data.mode) this.currentMode = data.mode;
                this.applyTheme();
            }
        } catch (e) {
            console.warn('Failed to load theme:', e);
        }
    }

    // ========================================
    // ユーティリティ関数
    // ========================================

    private hexToRgb(hex: string): RGB {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    private rgbToHex(rgb: RGB): string {
        return '#' + [rgb.r, rgb.g, rgb.b]
            .map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0'))
            .join('');
    }

    private rgbToHsl(rgb: RGB): HSL {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    private hslToHex(hsl: HSL): string {
        const h = hsl.h / 360;
        const s = hsl.s / 100;
        const l = hsl.l / 100;

        let r: number, g: number, b: number;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p: number, q: number, t: number): number => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return this.rgbToHex({
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        });
    }

    private linearize(value: number): number {
        return value <= 0.03928
            ? value / 12.92
            : Math.pow((value + 0.055) / 1.055, 2.4);
    }
}

// 便利なショートカット
export function setThemeMode(mode: ThemeMode): void {
    ThemeManager.getInstance().setMode(mode);
}

export function setBackgroundColor(color: string): void {
    ThemeManager.getInstance().setBackgroundColor(color);
}
