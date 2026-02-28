/**
 * Tempo Practice Calculator - Main Entry Point
 * TypeScript版エントリーポイント
 */

// Core modules
export { DeviceIdentifier, getDeviceId, clearDeviceId } from './core/DeviceIdentifier';
export { PrecisionTimer, getPrecisionTimer } from './core/PrecisionTimer';
export { ActionLogger, logAction, logError, logWarn } from './core/ActionLogger';
export { calculateTempoPracticeTime } from './core/Calculator';
export { Metronome } from './core/Metronome';

// UI modules
export { TouchController, initTouchController } from './ui/TouchController';
export { ThemeManager, setThemeMode, setBackgroundColor } from './ui/ThemeManager';
export { DataManager, initDataManager, exportAppData } from './ui/DataManager';

// Types
export * from './types';

// Initialize function
import { DeviceIdentifier } from './core/DeviceIdentifier';
import { ActionLogger } from './core/ActionLogger';
import { TouchController } from './ui/TouchController';
import { ThemeManager } from './ui/ThemeManager';
import { DataManager } from './ui/DataManager';

// New UI Controllers
import { CalculatorUI } from './ui/CalculatorUI';
import { MetronomeUI } from './ui/MetronomeUI';
import { TimerUI } from './ui/TimerUI';
import { PracticeRecordsUI } from './ui/PracticeRecordsUI';
import { NavigationManager } from './ui/NavigationManager';
import { VisualEffects } from './ui/VisualEffects';

/**
 * アプリケーション初期化
 */
export function initializeApp(): void {
    // デバイスIDを初期化（自動生成）
    const deviceId = DeviceIdentifier.getInstance().getId();
    console.log(`[TPC] Device ID: ${deviceId}`);

    // アクションログを初期化
    ActionLogger.getInstance().info('app_initialized', {
        deviceId,
        timestamp: Date.now(),
        url: window.location.href
    });

    // タッチ制御を初期化
    TouchController.getInstance().init();

    // テーマを適用
    const themeManager = ThemeManager.getInstance();
    themeManager.applyTheme();
    themeManager.initUI();

    // 視覚エフェクト（波紋・パララックス）を初期化
    VisualEffects.init();

    // 削除ボタンを初期化（存在する場合）
    const deleteBtn = document.getElementById('delete-all-btn');
    const deleteProgress = document.getElementById('delete-progress');
    if (deleteBtn && deleteProgress) {
        DataManager.getInstance().initDeleteButton('delete-all-btn', 'delete-progress');
    }

    // 各UIの初期化
    const calculatorUI = new CalculatorUI();
    calculatorUI.init();

    const metronomeUI = new MetronomeUI();
    metronomeUI.init();

    const timerUI = new TimerUI();
    timerUI.init();

    const practiceRecordsUI = new PracticeRecordsUI();
    practiceRecordsUI.init();

    const navManager = new NavigationManager();
    navManager.init();
    navManager.setMetronomeUI(metronomeUI);

    console.log('[TPC] Tempo Practice Calculator initialized (TypeScript Edition Phase 6)');
}

// DOMContentLoaded時に自動初期化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
}
