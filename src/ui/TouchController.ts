/**
 * TouchController - タッチ操作制御
 * ピンチズーム、バウンス、スワイプの完全禁止
 */

import { logAction, logWarn } from '../core/ActionLogger';

export class TouchController {
    private static instance: TouchController | null = null;
    private initialized = false;
    private touchStartY = 0;

    private constructor() { }

    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(): TouchController {
        if (!TouchController.instance) {
            TouchController.instance = new TouchController();
        }
        return TouchController.instance;
    }

    /**
     * タッチ制御を初期化
     */
    init(): void {
        if (this.initialized) return;

        // ピンチズーム禁止
        this.preventPinchZoom();

        // ジェスチャー禁止（iOS Safari）
        this.preventGestures();

        // オーバースクロール（ラバーバンド）禁止
        this.preventOverscroll();

        // ダブルタップズーム禁止
        this.preventDoubleTapZoom();

        this.initialized = true;
        logAction('touch_controller_initialized');
    }

    /**
     * ピンチズームを禁止
     */
    private preventPinchZoom(): void {
        // touchstart: 複数タッチの検出
        document.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
                logWarn('pinch_attempt_blocked', { touchCount: e.touches.length });
            }
        }, { passive: false });

        // touchmove: 複数タッチ中の移動を禁止
        document.addEventListener('touchmove', (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // wheel: Ctrl+ホイールによるズームも禁止（デスクトップ向け）
        document.addEventListener('wheel', (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                logWarn('ctrl_wheel_zoom_blocked');
            }
        }, { passive: false });
    }

    /**
     * iOS Safariのジェスチャーイベントを禁止
     */
    private preventGestures(): void {
        document.addEventListener('gesturestart', (e: Event) => {
            e.preventDefault();
        });

        document.addEventListener('gesturechange', (e: Event) => {
            e.preventDefault();
        });

        document.addEventListener('gestureend', (e: Event) => {
            e.preventDefault();
        });
    }

    /**
     * オーバースクロール（ラバーバンド）を禁止
     */
    private preventOverscroll(): void {
        // body全体のオーバースクロール禁止
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';

        // メニューのオーバースクロール対策
        const navMenu = document.getElementById('nav-menu');
        const navOverlay = document.getElementById('nav-overlay');

        if (navMenu) {
            navMenu.style.overscrollBehavior = 'contain';

            navMenu.addEventListener('touchstart', (e: TouchEvent) => {
                this.touchStartY = e.touches[0].clientY;
            }, { passive: true });

            navMenu.addEventListener('touchmove', (e: TouchEvent) => {
                const scrollable = navMenu.querySelector('.nav-list') as HTMLElement;

                if (!scrollable) {
                    e.preventDefault();
                    return;
                }

                const currentY = e.touches[0].clientY;
                const deltaY = currentY - this.touchStartY;
                const atTop = scrollable.scrollTop <= 0;
                const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight;

                // 上端で上にスワイプ、または下端で下にスワイプを禁止
                if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
                    e.preventDefault();
                }
            }, { passive: false });
        }

        if (navOverlay) {
            navOverlay.style.overscrollBehavior = 'none';

            // オーバーレイ自体のスクロールを完全禁止
            navOverlay.addEventListener('touchmove', (e: TouchEvent) => {
                e.preventDefault();
            }, { passive: false });
        }
    }

    /**
     * ダブルタップズームを禁止
     */
    private preventDoubleTapZoom(): void {
        let lastTouchEnd = 0;

        document.addEventListener('touchend', (e: TouchEvent) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
                logWarn('double_tap_zoom_blocked');
            }
            lastTouchEnd = now;
        }, { passive: false });
    }

    /**
     * 特定の要素に対してスクロールを許可
     */
    enableScrollingFor(element: HTMLElement): void {
        element.style.touchAction = 'pan-y';
        element.style.overscrollBehavior = 'contain';
    }

    /**
     * 特定の要素に対してすべてのタッチ操作を許可
     */
    enableAllTouchFor(element: HTMLElement): void {
        element.style.touchAction = 'auto';
    }

    /**
     * 現在のビューポート状態をリセット
     * ズームが何らかの理由で行われた場合の復帰用
     */
    resetViewport(): void {
        // Visual Viewport APIを使用（対応ブラウザのみ）
        if (window.visualViewport) {
            const viewport = window.visualViewport;

            if (viewport.scale !== 1) {
                logWarn('viewport_scale_reset', {
                    previousScale: viewport.scale,
                    previousOffsetLeft: viewport.offsetLeft,
                    previousOffsetTop: viewport.offsetTop
                });

                // スケールをリセット（間接的に）
                // 注: 直接的なリセットはセキュリティ上制限されている
                window.scrollTo(0, 0);
            }
        }
    }

    /**
     * ビューポートの変更を監視
     */
    watchViewport(callback: (scale: number) => void): () => void {
        if (!window.visualViewport) {
            return () => { };
        }

        const handler = () => {
            callback(window.visualViewport!.scale);
        };

        window.visualViewport.addEventListener('resize', handler);

        return () => {
            window.visualViewport!.removeEventListener('resize', handler);
        };
    }
}

// 便利なショートカット
export function initTouchController(): void {
    TouchController.getInstance().init();
}
