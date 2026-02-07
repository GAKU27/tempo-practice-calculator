/**
 * Tempo Practice Calculator - Type Definitions
 * すべての型定義を集約
 */

// ========================================
// DOM Elements
// ========================================

export interface AppElements {
    form: HTMLFormElement | null;
    resultsSection: HTMLElement | null;
    totalTimeDisplay: HTMLElement | null;
    totalTimeSecondsDisplay: HTMLElement | null;
    stepCountDisplay: HTMLElement | null;
    actualEndTempoDisplay: HTMLElement | null;
    exactTimeDisplay: HTMLElement | null;
    approxTimeDisplay: HTMLElement | null;
    errorRateDisplay: HTMLElement | null;
    totalBeatsPerStepDisplay: HTMLElement | null;
    bpmDisplay: HTMLElement | null;
    bpmSlider: HTMLInputElement | null;
    pendulumArm: HTMLElement | null;
    pendulumWeight: HTMLElement | null;
    visualCircle: HTMLElement | null;
}

// ========================================
// Metronome
// ========================================

export type SoundType = 'click' | 'wood' | 'beep';

export interface MetronomeConfig {
    tempo: number;
    beatsPerBar: number;
    subdivision: number;
    soundType: SoundType;
    volume: number;
    pendulumEnabled: boolean;
    progressionEnabled: boolean;
    progressionStep: number;
    progressionBars: number;
    targetTempo: number;
}

export interface MetronomeState {
    isPlaying: boolean;
    currentBeatInBar: number;
    currentSubdivision: number;
    nextNoteTime: number;
    barCount: number;
    pendulumDirection: 'left' | 'right';
}

// ========================================
// Calculator
// ========================================

export interface CalculatorParams {
    a: number;  // 開始テンポ (BPM)
    b: number;  // 目標テンポ (BPM)
    s: number;  // ステップ幅 (BPM)
    B: number;  // フレーズ拍数
    R: number;  // 反復回数
    N: number;  // セット数
}

export interface CalculatorResults {
    exactSeconds: number;
    approxSeconds: number;
    errorRate: number;
}

export interface CalculatorMetadata {
    nSteps: number;
    actualEndTempo: number;
    totalBeatsPerStep: number;
    timeConstantC: number;
    inputParams: CalculatorParams;
}

export interface CalculatorOutput {
    results: CalculatorResults;
    metadata: CalculatorMetadata;
}

// ========================================
// Timer
// ========================================

export interface TimerState {
    elapsedTime: number;
    isRunning: boolean;
    isCountdown: boolean;
    countdownTarget: number;
    laps: LapEntry[];
    lastLapTime: number;
}

export interface LapEntry {
    time: number;
    diff: number;
}

// ========================================
// Logging
// ========================================

export interface ActionLogEntry {
    timestamp: number;
    action: string;
    details?: Record<string, unknown>;
    latency?: number;
}

// ========================================
// Theme
// ========================================

export interface ThemeConfig {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    accentColor: string;
}

export type ThemeMode = 'dark' | 'light';

// ========================================
// Settings
// ========================================

export interface AppSettings {
    deviceId: string;
    theme: ThemeConfig;
    themeMode: ThemeMode;
    metronome: Partial<MetronomeConfig>;
}

// ========================================
// Storage Keys
// ========================================

export const STORAGE_KEYS = {
    DEVICE_ID: 'tpc_device_id',
    ACTION_LOG: 'tpc_action_log',
    THEME: 'tpc_theme',
    SETTINGS: 'tpc_settings',
    PRACTICE_RECORDS: 'tpc_practice_records'
} as const;
