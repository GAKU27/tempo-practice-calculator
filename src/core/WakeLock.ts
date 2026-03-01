export class WakeLock {
    private wakeLock: any = null;
    private static instance: WakeLock;

    private constructor() {
        document.addEventListener('visibilitychange', () => {
            if (this.wakeLock !== null && document.visibilityState === 'visible') {
                this.requestWakeLock();
            }
        });
    }

    public static getInstance(): WakeLock {
        if (!WakeLock.instance) {
            WakeLock.instance = new WakeLock();
        }
        return WakeLock.instance;
    }

    public async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await (navigator as any).wakeLock.request('screen');
                console.log('[TPC] Screen Wake Lock is active');

                this.wakeLock.addEventListener('release', () => {
                    console.log('[TPC] Screen Wake Lock was released');
                });
            } else {
                console.warn('[TPC] Screen Wake Lock API not supported in this browser.');
            }
        } catch (err: any) {
            console.error(`[TPC] Wake Lock error: ${err.name}, ${err.message}`);
        }
    }

    public releaseWakeLock() {
        if (this.wakeLock !== null) {
            this.wakeLock.release()
                .then(() => {
                    this.wakeLock = null;
                });
        }
    }
}
