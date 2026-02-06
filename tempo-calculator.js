/**
 * Tempo Practice Calculator
 * 練習時間計算エンジン
 * 
 * 数理モデル: 拡張有理S-P公式に基づく高精度計算
 */

(function () {
    'use strict';

    // DOM Elements - will be set in init()
    let form, resultsSection;
    let totalTimeDisplay, totalTimeSecondsDisplay, stepCountDisplay;
    let actualEndTempoDisplay, exactTimeDisplay, approxTimeDisplay;
    let errorRateDisplay, totalBeatsPerStepDisplay;

    /**
     * Web Audio API Metronome Engine
     */
    class Metronome {
        constructor() {
            this.audioContext = null;
            this.isPlaying = false;
            this.currentBeatInBar = 0;
            this.currentSubdivision = 0;
            this.beatsPerBar = 4;
            this.subdivision = 1; // 1=quarter, 2=eighth, 3=triplet, 4=sixteenth
            this.tempo = 120;
            this.lookahead = 25.0; // ms
            this.scheduleAheadTime = 0.1; // seconds
            this.nextNoteTime = 0.0;
            this.timerID = null;
            this.soundType = 'click'; // click, wood, beep
            this.pendulumEnabled = true;
            this.pendulumDirection = 'left';
            this.pendulumArm = null;
        }

        nextNote() {
            // Calculate time based on subdivision
            const baseSecondsPerBeat = 60.0 / this.tempo;
            const secondsPerNote = baseSecondsPerBeat / this.subdivision;
            this.nextNoteTime += secondsPerNote;

            this.currentSubdivision++;
            if (this.currentSubdivision >= this.subdivision) {
                this.currentSubdivision = 0;
                this.currentBeatInBar++;
                if (this.currentBeatInBar >= this.beatsPerBar) {
                    this.currentBeatInBar = 0;
                }
            }
        }

        scheduleNote(beatNumber, subdivisionNumber, time) {
            // Visual feedback
            const isMainBeat = subdivisionNumber === 0;
            const isAccent = beatNumber === 0 && this.beatsPerBar > 0 && isMainBeat;

            requestAnimationFrame(() => {
                const drawTime = (time - this.audioContext.currentTime) * 1000;
                setTimeout(() => {
                    this.triggerVisual(beatNumber, isMainBeat);
                    if (isMainBeat) {
                        this.triggerPendulum();
                    }
                }, Math.max(0, drawTime));
            });

            // Subdivision sounds: main beat is louder, sub-beats are softer
            switch (this.soundType) {
                case 'click':
                    this.playClickSound(time, isAccent, isMainBeat);
                    break;
                case 'wood':
                    this.playWoodSound(time, isAccent, isMainBeat);
                    break;
                case 'beep':
                    this.playBeepSound(time, isAccent, isMainBeat);
                    break;
                default:
                    this.playClickSound(time, isAccent, isMainBeat);
            }
        }

        // クリック音（オリジナル）
        playClickSound(time, isAccent) {
            const osc = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();

            osc.frequency.value = isAccent ? 880.0 : 440.0;

            envelope.gain.value = 1;
            envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
            envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

            osc.connect(envelope);
            envelope.connect(this.audioContext.destination);

            osc.start(time);
            osc.stop(time + 0.03);
        }

        // ウッドブロック風（高周波 + 急速減衰）
        playWoodSound(time, isAccent) {
            // メイン音（三角波で木の響き）
            const osc = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(isAccent ? 1500 : 1200, time);
            osc.frequency.exponentialRampToValueAtTime(isAccent ? 600 : 400, time + 0.015);

            envelope.gain.setValueAtTime(isAccent ? 0.6 : 0.4, time);
            envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

            osc.connect(envelope);
            envelope.connect(this.audioContext.destination);

            osc.start(time);
            osc.stop(time + 0.05);

            // アタック音（短いクリック）
            const click = this.audioContext.createOscillator();
            const clickEnv = this.audioContext.createGain();

            click.type = 'square';
            click.frequency.value = isAccent ? 2000 : 1600;

            clickEnv.gain.setValueAtTime(isAccent ? 0.3 : 0.2, time);
            clickEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.01);

            click.connect(clickEnv);
            clickEnv.connect(this.audioContext.destination);

            click.start(time);
            click.stop(time + 0.02);
        }

        // ビープ音（サイン波）
        playBeepSound(time, isAccent) {
            const osc = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = isAccent ? 1000.0 : 800.0;

            envelope.gain.setValueAtTime(0.5, time);
            envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

            osc.connect(envelope);
            envelope.connect(this.audioContext.destination);

            osc.start(time);
            osc.stop(time + 0.1);
        }

        scheduler() {
            while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
                this.scheduleNote(this.currentBeatInBar, this.currentSubdivision, this.nextNoteTime);
                this.nextNote();
            }
            this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
        }

        start() {
            if (this.isPlaying) return;

            if (this.audioContext == null) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            this.isPlaying = true;
            this.currentBeatInBar = 0;
            this.nextNoteTime = this.audioContext.currentTime + 0.05;
            this.scheduler();
        }

        stop() {
            this.isPlaying = false;
            clearTimeout(this.timerID);
        }

        setTempo(bpm) {
            this.tempo = bpm;
        }

        setBeatsPerBar(beats) {
            this.beatsPerBar = beats;
        }

        setSoundType(type) {
            this.soundType = type;
        }

        setSubdivision(value) {
            this.subdivision = value;
        }

        setPendulumEnabled(enabled) {
            this.pendulumEnabled = enabled;
        }

        setPendulumArm(element) {
            this.pendulumArm = element;
        }

        triggerVisual(beatNumber, isMainBeat) {
            const visualCircle = document.getElementById('visual-circle');
            if (!visualCircle) return;

            const isAccent = beatNumber === 0 && this.beatsPerBar > 0 && isMainBeat;
            visualCircle.className = 'visual-circle'; // reset

            // Force reflow
            void visualCircle.offsetWidth;

            if (isAccent) {
                visualCircle.classList.add('accent');
            } else if (isMainBeat) {
                visualCircle.classList.add('beat');
            } else {
                visualCircle.classList.add('sub-beat');
            }

            setTimeout(() => {
                visualCircle.classList.remove('beat', 'accent', 'sub-beat');
            }, 100);
        }

        triggerPendulum() {
            if (!this.pendulumEnabled || !this.pendulumArm) return;

            // Toggle pendulum direction
            this.pendulumArm.classList.remove('swinging-left', 'swinging-right');

            // Force reflow
            void this.pendulumArm.offsetWidth;

            if (this.pendulumDirection === 'left') {
                this.pendulumArm.classList.add('swinging-right');
                this.pendulumDirection = 'right';
            } else {
                this.pendulumArm.classList.add('swinging-left');
                this.pendulumDirection = 'left';
            }
        }
    }

    const metronome = new Metronome();

    // Tap Tempo Logic
    let tapTimes = [];
    const TAP_TIMEOUT = 2000; // Reset taps after 2 seconds

    /**
     * Navigation Logic
     */
    function setupNavigation() {
        // DOM Elements for Navigation
        const menuBtn = document.getElementById('menu-btn');
        const closeMenuBtn = document.getElementById('close-menu-btn');
        const navMenu = document.getElementById('nav-menu');
        const navOverlay = document.getElementById('nav-overlay');
        const navItems = document.querySelectorAll('.nav-item');
        const viewSections = document.querySelectorAll('.view-section');
        const playBtn = document.getElementById('metronome-play-btn');

        if (!menuBtn || !navMenu || !navOverlay) {
            console.error('Navigation elements not found. Check HTML IDs.');
            return;
        }

        const toggleMenu = () => {
            navMenu.classList.toggle('active');
            navOverlay.classList.toggle('active');
        };

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        if (closeMenuBtn) {
            closeMenuBtn.addEventListener('click', toggleMenu);
        }

        navOverlay.addEventListener('click', toggleMenu);

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.getAttribute('data-target');

                // Switch View
                viewSections.forEach(section => {
                    if (section.id === targetId) {
                        section.classList.remove('hidden');
                        section.classList.add('active');
                    } else {
                        section.classList.add('hidden');
                        section.classList.remove('active');
                    }
                });

                // Update Menu State
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Close Menu
                toggleMenu();

                // Stop metronome if leaving metronome view
                if (targetId !== 'metronome-view' && metronome.isPlaying) {
                    metronome.stop();
                    playBtn.classList.remove('playing');
                }
            });
        });
    }

    /**
     * Metronome Controls Logic
     */
    function setupMetronome() {
        const bpmDisplay = document.getElementById('bpm-display');
        const bpmSlider = document.getElementById('bpm-slider');
        const bpmIncrease = document.getElementById('bpm-increase');
        const bpmDecrease = document.getElementById('bpm-decrease');
        const playBtn = document.getElementById('metronome-play-btn');
        const tapBtn = document.getElementById('tap-tempo-btn');
        const timeSignatureSelect = document.getElementById('time-signature-select');

        if (!bpmDisplay || !bpmSlider || !playBtn) {
            console.error('Metronome elements not found');
            return;
        }

        // Tempo Change (Slider & Buttons)
        const updateTempo = (bpm) => {
            let newBpm = Math.min(Math.max(bpm, 30), 250); // Clamp 30-250
            bpmDisplay.textContent = newBpm;
            bpmSlider.value = newBpm;
            metronome.setTempo(newBpm);

            // Update tempo text (Allegro etc.)
            let text = '';
            if (newBpm < 60) text = 'Largo';
            else if (newBpm < 66) text = 'Larghetto';
            else if (newBpm < 76) text = 'Adagio';
            else if (newBpm < 108) text = 'Andante';
            else if (newBpm < 120) text = 'Moderato';
            else if (newBpm < 168) text = 'Allegro';
            else if (newBpm < 200) text = 'Presto';
            else text = 'Prestissimo';

            document.querySelector('.bpm-text').textContent = text;
        };

        bpmSlider.addEventListener('input', (e) => updateTempo(parseInt(e.target.value)));
        bpmIncrease.addEventListener('click', () => updateTempo(parseInt(bpmSlider.value) + 1));
        bpmDecrease.addEventListener('click', () => updateTempo(parseInt(bpmSlider.value) - 1));

        // Play/Stop
        playBtn.addEventListener('click', () => {
            if (metronome.isPlaying) {
                metronome.stop();
                playBtn.classList.remove('playing');
            } else {
                metronome.start();
                playBtn.classList.add('playing');
            }
        });

        // Time Signature (now with format "beats-noteValue")
        timeSignatureSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === '0') {
                metronome.setBeatsPerBar(0);
            } else {
                const [beats] = value.split('-').map(Number);
                metronome.setBeatsPerBar(beats);
            }
        });

        // Subdivision (note value)
        const subdivisionSelect = document.getElementById('subdivision-select');
        if (subdivisionSelect) {
            subdivisionSelect.addEventListener('change', (e) => {
                metronome.setSubdivision(parseInt(e.target.value));
            });
        }

        // Sound Type
        const soundTypeSelect = document.getElementById('sound-type-select');
        if (soundTypeSelect) {
            soundTypeSelect.addEventListener('change', (e) => {
                metronome.setSoundType(e.target.value);
            });
        }

        // Pendulum toggle
        const pendulumSelect = document.getElementById('pendulum-select');
        const pendulumContainer = document.querySelector('.pendulum-container');
        const pendulumArm = document.getElementById('pendulum-arm');

        if (pendulumArm) {
            metronome.setPendulumArm(pendulumArm);
        }

        if (pendulumSelect && pendulumContainer) {
            pendulumSelect.addEventListener('change', (e) => {
                const enabled = e.target.value === 'on';
                metronome.setPendulumEnabled(enabled);
                pendulumContainer.classList.toggle('hidden', !enabled);
            });
        }

        // Tap Tempo
        tapBtn.addEventListener('click', () => {
            const now = Date.now();
            if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > TAP_TIMEOUT) {
                tapTimes = []; // Reset if too long between taps
            }

            tapTimes.push(now);
            if (tapTimes.length > 4) tapTimes.shift(); // Keep last 4 taps

            if (tapTimes.length >= 2) {
                let intervals = [];
                for (let i = 1; i < tapTimes.length; i++) {
                    intervals.push(tapTimes[i] - tapTimes[i - 1]);
                }
                const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
                const bpm = Math.round(60000 / avgInterval);
                updateTempo(bpm);

                // Visual feedback for tap
                tapBtn.style.transform = 'scale(0.95)';
                setTimeout(() => tapBtn.style.transform = 'scale(1)', 100);
            }
        });
    }

    /**
     * 高精度総和計算（Kahan Summationアルゴリズム）
     */
    function kahanSum(numbers) {
        let sum = 0.0;
        let compensation = 0.0;

        for (let i = 0; i < numbers.length; i++) {
            const y = numbers[i] - compensation;
            const t = sum + y;
            compensation = (t - sum) - y;
            sum = t;
        }

        return sum;
    }

    /**
     * メイン計算関数
     */
    function calculateTempoPracticeTime(params) {
        const { a, b, s, B, R, N } = params;

        if (s <= 0) {
            throw new Error('ステップ幅は正の値である必要があります');
        }
        if (a <= 0 || b <= 0) {
            throw new Error('テンポは正の値である必要があります');
        }
        if (a >= b) {
            throw new Error('目標テンポは開始テンポより大きく設定してください');
        }
        if (B <= 0 || R <= 0 || N <= 0) {
            throw new Error('拍数、反復回数、セット数は正の整数である必要があります');
        }

        const K = B * R;
        const n = Math.floor((b - a) / s);
        const bPrime = a + n * s;
        const C = 60 * K;

        const stepTimes = [];
        for (let k = 0; k <= n; k++) {
            const tempo = a + s * k;
            const stepTime = C / tempo;
            stepTimes.push(stepTime);
        }

        const sumExact = kahanSum(stepTimes);
        const totalExact = sumExact * N;

        const S = a + bPrime;
        const P = a * bPrime;
        const termIntegral = (4 * n * S) / (S * S + 4 * P);
        const termCorrection = S / (2 * P);
        const sumApprox = C * (termIntegral + termCorrection);
        const totalApprox = sumApprox * N;
        const errorRate = ((totalApprox - totalExact) / totalExact) * 100;

        return {
            results: {
                exactSeconds: totalExact,
                approxSeconds: totalApprox,
                errorRate: errorRate
            },
            metadata: {
                nSteps: n,
                actualEndTempo: bPrime,
                totalBeatsPerStep: K,
                timeConstantC: C,
                inputParams: { a, b, s, B, R, N }
            }
        };
    }

    /**
     * 秒数を分:秒形式にフォーマット
     */
    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 結果を画面に表示
     */
    function displayResults(data) {
        const { results, metadata } = data;

        totalTimeDisplay.textContent = formatTime(results.exactSeconds);
        totalTimeSecondsDisplay.textContent = `${results.exactSeconds.toFixed(2)} 秒`;

        stepCountDisplay.textContent = metadata.nSteps;
        actualEndTempoDisplay.textContent = metadata.actualEndTempo;

        exactTimeDisplay.textContent = `${results.exactSeconds.toFixed(4)} 秒`;
        approxTimeDisplay.textContent = `${results.approxSeconds.toFixed(4)} 秒`;
        errorRateDisplay.textContent = `${results.errorRate >= 0 ? '+' : ''}${results.errorRate.toFixed(4)}%`;
        totalBeatsPerStepDisplay.textContent = `${metadata.totalBeatsPerStep} 拍`;

        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * エラーメッセージを表示
     */
    function showError(message) {
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 0.75rem;
            padding: 1rem;
            margin-bottom: 1rem;
            color: #fca5a5;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: fadeIn 0.3s ease;
        `;
        errorDiv.innerHTML = `<span>⚠️</span> ${message}`;

        form.parentNode.insertBefore(errorDiv, form);

        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transform = 'translateY(-10px)';
            errorDiv.style.transition = 'all 0.3s ease';
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
    }

    /**
     * フォーム送信ハンドラ
     */
    function handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(form);
        const params = {
            a: parseFloat(formData.get('startTempo')),
            b: parseFloat(formData.get('endTempo')),
            s: parseFloat(formData.get('stepSize')),
            B: parseInt(formData.get('beatsPerPhrase'), 10),
            R: parseInt(formData.get('repetitions'), 10),
            N: parseInt(formData.get('sets'), 10)
        };

        try {
            const result = calculateTempoPracticeTime(params);
            displayResults(result);
            console.log('計算結果:', result);
        } catch (error) {
            showError(error.message);
            console.error('計算エラー:', error);
        }
    }

    /**
     * 入力値のリアルタイム検証
     */
    function setupValidation() {
        const inputs = form.querySelectorAll('input[type="number"]');

        inputs.forEach(input => {
            input.addEventListener('input', function () {
                const min = parseFloat(this.min);
                const max = parseFloat(this.max);
                let value = parseFloat(this.value);

                if (value < min || value > max) {
                    this.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                } else {
                    this.style.borderColor = '';
                }
            });

            input.addEventListener('focus', function () {
                this.select();
            });
        });
    }

    /**
     * キーボードショートカットの設定
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                form.dispatchEvent(new Event('submit'));
            }
        });
    }

    /**
     * 初期化
     */
    function init() {
        // DOM Elements for Calculator - assign to global variables
        form = document.getElementById('calculator-form');
        resultsSection = document.getElementById('results-section');
        totalTimeDisplay = document.getElementById('totalTime');
        totalTimeSecondsDisplay = document.getElementById('totalTimeSeconds');
        stepCountDisplay = document.getElementById('stepCount');
        actualEndTempoDisplay = document.getElementById('actualEndTempo');
        exactTimeDisplay = document.getElementById('exactTime');
        approxTimeDisplay = document.getElementById('approxTime');
        errorRateDisplay = document.getElementById('errorRate');
        totalBeatsPerStepDisplay = document.getElementById('totalBeatsPerStep');

        if (form) {
            form.addEventListener('submit', handleSubmit);
            setupValidation();
        }

        setupKeyboardShortcuts();

        // Setup new functionalities
        setupNavigation();
        setupMetronome();

        console.log('Tempo Practice Calculator (Simultaneous Metronome Edition) initialized');
    }

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
