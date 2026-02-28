export class TimerUI {
    private timerInterval: number | null = null;
    private elapsedTime: number = 0; // milliseconds
    private isRunning: boolean = false;
    private isCountdown: boolean = false;
    private countdownTarget: number = 0;
    private laps: { time: number, diff: number }[] = [];
    private lastLapTime: number = 0;

    // UI Elements
    private timerDisplay: HTMLElement | null = null;
    private timerMs: HTMLElement | null = null;
    private startBtn: HTMLButtonElement | null = null;
    private stopBtn: HTMLButtonElement | null = null;
    private resetBtn: HTMLElement | null = null;
    private lapBtn: HTMLButtonElement | null = null;
    private lapList: HTMLElement | null = null;
    private countdownSettings: HTMLElement | null = null;
    private countdownMinutes: HTMLInputElement | null = null;
    private countdownSeconds: HTMLInputElement | null = null;

    constructor() { }

    public init() {
        this.timerDisplay = document.getElementById('timer-display');
        this.timerMs = document.getElementById('timer-ms');
        this.startBtn = document.getElementById('timer-start-btn') as HTMLButtonElement;
        this.stopBtn = document.getElementById('timer-stop-btn') as HTMLButtonElement;
        this.resetBtn = document.getElementById('timer-reset-btn');
        this.lapBtn = document.getElementById('lap-btn') as HTMLButtonElement;
        this.lapList = document.getElementById('lap-list');
        const timerTabs = document.querySelectorAll('.timer-tab');
        this.countdownSettings = document.getElementById('countdown-settings');
        this.countdownMinutes = document.getElementById('countdown-minutes') as HTMLInputElement;
        this.countdownSeconds = document.getElementById('countdown-seconds') as HTMLInputElement;

        if (!this.timerDisplay || !this.startBtn) return;

        // Event listeners
        this.startBtn.addEventListener('click', this.startTimer.bind(this));
        if (this.stopBtn) this.stopBtn.addEventListener('click', this.stopTimer.bind(this));
        if (this.resetBtn) this.resetBtn.addEventListener('click', this.resetTimer.bind(this));
        if (this.lapBtn) this.lapBtn.addEventListener('click', this.recordLap.bind(this));

        // Tab switching
        timerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                timerTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                this.isCountdown = (tab as HTMLElement).dataset.mode === 'countdown';
                if (this.countdownSettings) {
                    this.countdownSettings.classList.toggle('hidden', !this.isCountdown);
                }

                this.resetTimer();
            });
        });

        this.updateDisplay();
    }

    private formatTime(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    private formatMs(ms: number): string {
        return `.${String(Math.floor((ms % 1000) / 10)).padStart(2, '0')}`;
    }

    private updateDisplay() {
        const displayTime = this.isCountdown ? Math.max(0, this.countdownTarget - this.elapsedTime) : this.elapsedTime;

        if (this.timerDisplay) this.timerDisplay.textContent = this.formatTime(displayTime);
        if (this.timerMs) this.timerMs.textContent = this.formatMs(displayTime);

        // Countdown finished
        if (this.isCountdown && displayTime <= 0 && this.isRunning) {
            this.stopTimer();
            if (this.timerDisplay) this.timerDisplay.style.color = '#ef4444';
            this.playTimerBeep();
        }
    }

    private playTimerBeep() {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.3;

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.log('Audio not available');
        }
    }

    private startTimer() {
        if (this.isRunning) return;

        if (this.isCountdown) {
            const mins = this.countdownMinutes ? parseInt(this.countdownMinutes.value) || 0 : 0;
            const secs = this.countdownSeconds ? parseInt(this.countdownSeconds.value) || 0 : 0;
            this.countdownTarget = (mins * 60 + secs) * 1000;
            if (this.countdownTarget <= 0) return;
        }

        this.isRunning = true;
        const startTime = Date.now() - this.elapsedTime;

        this.timerInterval = window.setInterval(() => {
            this.elapsedTime = Date.now() - startTime;
            this.updateDisplay();
        }, 10);

        if (this.startBtn) this.startBtn.disabled = true;
        if (this.stopBtn) this.stopBtn.disabled = false;
        if (this.lapBtn) this.lapBtn.disabled = false;
        if (this.timerDisplay) this.timerDisplay.style.color = '';
    }

    private stopTimer() {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (this.startBtn) this.startBtn.disabled = false;
        if (this.stopBtn) this.stopBtn.disabled = true;
    }

    private resetTimer() {
        this.stopTimer();
        this.elapsedTime = 0;
        this.laps = [];
        this.lastLapTime = 0;
        this.updateDisplay();

        if (this.lapList) this.lapList.innerHTML = '';
        if (this.lapBtn) this.lapBtn.disabled = true;
        if (this.timerDisplay) this.timerDisplay.style.color = '';
    }

    private recordLap() {
        if (!this.isRunning) return;

        const lapTime = this.elapsedTime;
        const lapDiff = lapTime - this.lastLapTime;
        this.lastLapTime = lapTime;
        this.laps.push({ time: lapTime, diff: lapDiff });

        if (this.lapList) {
            const li = document.createElement('li');
            li.className = 'lap-item';
            li.innerHTML = `
                <span class="lap-number">#${this.laps.length}</span>
                <span class="lap-time">${this.formatTime(lapTime)}${this.formatMs(lapTime)}</span>
                <span class="lap-diff">+${this.formatTime(lapDiff)}${this.formatMs(lapDiff)}</span>
            `;
            this.lapList.insertBefore(li, this.lapList.firstChild);
        }
    }
}
