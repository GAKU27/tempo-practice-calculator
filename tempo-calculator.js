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
            this.gainNode = null; // Master volume
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
            this.volume = 0.8; // 0.0 - 1.0
            this.pendulumEnabled = true;
            this.pendulumDirection = 'left';
            this.pendulumArm = null;

            // 漸進テンポ
            this.progressionEnabled = false;
            this.progressionStep = 5; // BPM per step
            this.progressionBars = 8; // bars before step up
            this.targetTempo = 180;
            this.barCount = 0;
            this.onTempoChange = null; // callback
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

                    // 漸進テンポ: 小節カウント
                    if (this.progressionEnabled) {
                        this.barCount++;
                        if (this.barCount >= this.progressionBars && this.tempo < this.targetTempo) {
                            this.barCount = 0;
                            const newTempo = Math.min(this.tempo + this.progressionStep, this.targetTempo);
                            this.tempo = newTempo;
                            if (this.onTempoChange) {
                                this.onTempoChange(newTempo);
                            }
                        }
                    }
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
        playClickSound(time, isAccent, isMainBeat) {
            const osc = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();

            osc.frequency.value = isAccent ? 880.0 : 440.0;

            // Volume adjustment for sub-beats
            const baseVolume = isMainBeat ? 1.0 : 0.5;
            envelope.gain.setValueAtTime(baseVolume * this.volume, time);
            envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

            osc.connect(envelope);
            envelope.connect(this.audioContext.destination);

            osc.start(time);
            osc.stop(time + 0.03);
        }

        // ウッドブロック風（高周波 + 急速減衰）
        playWoodSound(time, isAccent, isMainBeat) {
            const baseVolume = isMainBeat ? 1.0 : 0.5;

            // メイン音（三角波で木の響き）
            const osc = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(isAccent ? 1500 : 1200, time);
            osc.frequency.exponentialRampToValueAtTime(isAccent ? 600 : 400, time + 0.015);

            envelope.gain.setValueAtTime((isAccent ? 0.6 : 0.4) * baseVolume * this.volume, time);
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

            clickEnv.gain.setValueAtTime((isAccent ? 0.3 : 0.2) * baseVolume * this.volume, time);
            clickEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.01);

            click.connect(clickEnv);
            clickEnv.connect(this.audioContext.destination);

            click.start(time);
            click.stop(time + 0.02);
        }

        // ビープ音（サイン波）
        playBeepSound(time, isAccent, isMainBeat) {
            const osc = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = isAccent ? 1000.0 : 800.0;

            const baseVolume = isMainBeat ? 1.0 : 0.5;
            envelope.gain.setValueAtTime(0.5 * baseVolume * this.volume, time);
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

            // iOS Safari: AudioContextを作成/再開
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // iOS Safari requires unlock via user gesture
            const unlockAudio = () => {
                if (this.audioContext.state === 'suspended') {
                    return this.audioContext.resume();
                }
                return Promise.resolve();
            };

            // iOSでは無音を再生してオーディオをウォームアップ
            const warmupAudio = () => {
                const buffer = this.audioContext.createBuffer(1, 1, 22050);
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(this.audioContext.destination);
                source.start(0);
            };

            unlockAudio()
                .then(() => {
                    warmupAudio();
                    this._startPlayback();
                })
                .catch((err) => {
                    console.log('Audio unlock failed:', err);
                    // 再試行
                    this._startPlayback();
                });
        }

        _startPlayback() {
            if (!this.audioContext) return;
            this.isPlaying = true;
            this.currentBeatInBar = 0;
            this.currentSubdivision = 0;
            this.nextNoteTime = this.audioContext.currentTime + 0.1;
            this.scheduler();
        }

        stop() {
            this.isPlaying = false;
            clearTimeout(this.timerID);
            this.resetPendulum();
        }

        resetPendulum() {
            if (this.pendulumArm) {
                this.pendulumArm.classList.remove('swinging-left', 'swinging-right');
                this.pendulumDirection = 'left';
            }
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

        setVolume(value) {
            this.volume = value;
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
        const pendulumWeight = document.getElementById('pendulum-weight');

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

        // Pendulum color
        const pendulumColorPicker = document.getElementById('pendulum-color');
        const pendulumColorLabel = document.getElementById('pendulum-color-label');

        if (pendulumColorPicker && pendulumWeight) {
            pendulumColorPicker.addEventListener('input', (e) => {
                const color = e.target.value;
                pendulumWeight.style.background = color;
                pendulumWeight.style.boxShadow = `0 0 15px ${color}80, 0 4px 8px rgba(0, 0, 0, 0.3)`;
                if (pendulumColorLabel) {
                    pendulumColorLabel.textContent = color;
                }
            });
        }

        // Settings Panel toggle
        const settingsToggleBtn = document.getElementById('settings-toggle-btn');
        const settingsPanel = document.getElementById('settings-panel');
        const closeSettingsBtn = document.getElementById('close-settings-btn');

        if (settingsToggleBtn && settingsPanel) {
            settingsToggleBtn.addEventListener('click', () => {
                settingsPanel.classList.toggle('hidden');
            });
        }

        if (closeSettingsBtn && settingsPanel) {
            closeSettingsBtn.addEventListener('click', () => {
                settingsPanel.classList.add('hidden');
            });
        }

        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                metronome.setVolume(value / 100);
                if (volumeValue) {
                    volumeValue.textContent = value;
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only handle keyboard shortcuts when not focused on inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (metronome.isPlaying) {
                        metronome.stop();
                        playBtn.classList.remove('playing');
                    } else {
                        metronome.start();
                        playBtn.classList.add('playing');
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    updateTempo(parseInt(bpmSlider.value) + 1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    updateTempo(parseInt(bpmSlider.value) - 1);
                    break;
            }
        });

        // Theme toggle
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                document.documentElement.setAttribute('data-theme', e.target.value);
            });
        }

        // Tempo Progression
        const progressionSelect = document.getElementById('tempo-progression-select');
        const tempoStepSlider = document.getElementById('tempo-step-slider');
        const tempoStepValue = document.getElementById('tempo-step-value');
        const tempoBarSlider = document.getElementById('tempo-bar-slider');
        const tempoBarValue = document.getElementById('tempo-bar-value');
        const targetTempoSlider = document.getElementById('target-tempo-slider');
        const targetTempoValue = document.getElementById('target-tempo-value');

        if (progressionSelect) {
            progressionSelect.addEventListener('change', (e) => {
                metronome.progressionEnabled = e.target.value === 'on';
                metronome.barCount = 0;
            });
        }

        if (tempoStepSlider && tempoStepValue) {
            tempoStepSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                metronome.progressionStep = value;
                tempoStepValue.textContent = value;
            });
        }

        if (tempoBarSlider && tempoBarValue) {
            tempoBarSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                metronome.progressionBars = value;
                tempoBarValue.textContent = value;
            });
        }

        // Target tempo input
        const targetTempoInput = document.getElementById('target-tempo-input');
        if (targetTempoInput) {
            targetTempoInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value) || 180;
                metronome.targetTempo = Math.max(30, Math.min(300, value));
            });
        }

        // Tempo change callback from progression
        metronome.onTempoChange = (newTempo) => {
            updateTempo(newTempo);
        };
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
        setupTimer();

        // Initialize enhanced features
        initDeviceIdentifier();
        initTouchPrevention();
        initThemeManager();
        initDeleteButton();
        initPracticeRecords();

        console.log('Tempo Practice Calculator (Enhanced TypeScript Edition) initialized');
    }

    /**
     * デバイス識別子の初期化
     */
    function initDeviceIdentifier() {
        const STORAGE_KEY = 'tpc_device_id';
        let deviceId = localStorage.getItem(STORAGE_KEY);

        if (!deviceId) {
            // UUID v4形式のIDを生成
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                deviceId = crypto.randomUUID();
            } else {
                deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = (Math.random() * 16) | 0;
                    const v = c === 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                });
            }
            localStorage.setItem(STORAGE_KEY, deviceId);
        }

        // デバイスID表示を更新
        const deviceIdDisplay = document.getElementById('device-id-display');
        if (deviceIdDisplay) {
            deviceIdDisplay.textContent = deviceId;
        }

        console.log('[TPC] Device ID:', deviceId);
    }

    /**
     * タッチ操作の防止を初期化
     */
    function initTouchPrevention() {
        // ピンチズーム禁止
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // ジェスチャー禁止（iOS Safari）
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        document.addEventListener('gestureend', (e) => e.preventDefault());

        // ダブルタップズーム禁止
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });

        // Ctrl+ホイールズーム禁止
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        }, { passive: false });

        // メニューのオーバースクロール対策
        const navMenu = document.getElementById('nav-menu');
        const navOverlay = document.getElementById('nav-overlay');
        let touchStartY = 0;

        if (navMenu) {
            navMenu.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            navMenu.addEventListener('touchmove', (e) => {
                const scrollable = navMenu.querySelector('.nav-list');
                if (!scrollable) {
                    e.preventDefault();
                    return;
                }

                const currentY = e.touches[0].clientY;
                const deltaY = currentY - touchStartY;
                const atTop = scrollable.scrollTop <= 0;
                const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight;

                if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
                    e.preventDefault();
                }
            }, { passive: false });
        }

        if (navOverlay) {
            navOverlay.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        }
    }

    /**
     * テーマ管理の初期化
     */
    function initThemeManager() {
        const themeSelect = document.getElementById('theme-select');

        // 保存されたテーマを読み込み
        const savedTheme = localStorage.getItem('tpc_theme_mode') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        if (themeSelect) {
            themeSelect.value = savedTheme;

            themeSelect.addEventListener('change', (e) => {
                const theme = e.target.value;
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('tpc_theme_mode', theme);
            });
        }
    }

    /**
     * 長押し削除ボタンの初期化
     */
    function initDeleteButton() {
        const deleteBtn = document.getElementById('delete-all-btn');
        const deleteProgress = document.getElementById('delete-progress');

        if (!deleteBtn || !deleteProgress) return;

        const HOLD_DURATION = 3000;
        let holdStartTime = null;
        let progressTimer = null;

        const startHold = () => {
            holdStartTime = Date.now();

            deleteProgress.style.transition = 'none';
            deleteProgress.style.width = '0%';
            void deleteProgress.offsetWidth; // force reflow
            deleteProgress.style.transition = `width ${HOLD_DURATION}ms linear`;
            deleteProgress.style.width = '100%';

            progressTimer = setTimeout(() => {
                executeDelete();
            }, HOLD_DURATION);
        };

        const cancelHold = () => {
            if (progressTimer) {
                clearTimeout(progressTimer);
                progressTimer = null;
            }

            deleteProgress.style.transition = 'width 0.2s ease';
            deleteProgress.style.width = '0%';
            holdStartTime = null;
        };

        const executeDelete = () => {
            // すべてのアプリデータを消去
            const keysToDelete = [
                'tpc_device_id',
                'tpc_action_log',
                'tpc_theme',
                'tpc_theme_mode',
                'tpc_settings',
                'tpc_practice_records'
            ];

            keysToDelete.forEach(key => {
                try { localStorage.removeItem(key); } catch (e) { }
            });

            // リロード
            window.location.reload();
        };

        // タッチイベント
        deleteBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startHold();
        }, { passive: false });

        deleteBtn.addEventListener('touchend', cancelHold);
        deleteBtn.addEventListener('touchcancel', cancelHold);

        // マウスイベント
        deleteBtn.addEventListener('mousedown', startHold);
        deleteBtn.addEventListener('mouseup', cancelHold);
        deleteBtn.addEventListener('mouseleave', cancelHold);
    }

    // ========================================
    // 練習記録システム
    // ========================================
    const PRACTICE_RECORDS_KEY = 'tpc_practice_records';
    const MAX_RECORDS = 50;
    let currentSessionStart = null;
    let currentSessionTempo = null;

    /**
     * 練習記録を初期化
     */
    function initPracticeRecords() {
        renderPracticeRecords();

        // メトロノームの再生・停止をフック
        hookMetronomeEvents();
    }

    /**
     * メトロノームの再生・停止イベントをフック
     */
    function hookMetronomeEvents() {
        const playBtn = document.getElementById('metronome-play-btn');
        if (!playBtn) return;

        // 既存のクリックイベントをラップ
        const originalClick = playBtn.onclick;

        playBtn.addEventListener('click', () => {
            // メトロノームの状態を確認して記録
            setTimeout(() => {
                if (metronome.isPlaying) {
                    // 再生開始
                    startPracticeSession();
                } else {
                    // 停止
                    endPracticeSession();
                }
            }, 50);
        });
    }

    /**
     * 練習セッション開始
     */
    function startPracticeSession() {
        currentSessionStart = Date.now();
        currentSessionTempo = metronome.tempo;
        console.log('[Practice] Session started:', currentSessionTempo, 'BPM');
    }

    /**
     * 練習セッション終了（記録保存）
     */
    function endPracticeSession() {
        if (!currentSessionStart) return;

        const duration = Date.now() - currentSessionStart;
        const minDuration = 5000; // 最低5秒以上で記録

        if (duration >= minDuration) {
            savePracticeRecord({
                startTime: currentSessionStart,
                duration: duration,
                tempo: currentSessionTempo,
                endTempo: metronome.tempo
            });
            console.log('[Practice] Session saved:', formatDuration(duration));
        } else {
            console.log('[Practice] Session too short, not saved');
        }

        currentSessionStart = null;
        currentSessionTempo = null;
    }

    /**
     * 練習記録を保存
     */
    function savePracticeRecord(record) {
        const records = loadPracticeRecords();

        records.unshift({
            id: Date.now(),
            timestamp: record.startTime,
            duration: record.duration,
            tempo: record.tempo,
            endTempo: record.endTempo || record.tempo
        });

        // 最大件数を超えたら古いものを削除
        while (records.length > MAX_RECORDS) {
            records.pop();
        }

        try {
            localStorage.setItem(PRACTICE_RECORDS_KEY, JSON.stringify(records));
            renderPracticeRecords();
        } catch (e) {
            console.warn('Failed to save practice record:', e);
        }
    }

    /**
     * 練習記録を読み込み
     */
    function loadPracticeRecords() {
        try {
            const saved = localStorage.getItem(PRACTICE_RECORDS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load practice records:', e);
        }
        return [];
    }

    /**
     * 練習記録を表示
     */
    function renderPracticeRecords() {
        const listContainer = document.getElementById('records-list');
        const countDisplay = document.getElementById('records-count');

        if (!listContainer) return;

        const records = loadPracticeRecords();

        // 件数表示
        if (countDisplay) {
            countDisplay.textContent = `${records.length}件`;
        }

        if (records.length === 0) {
            listContainer.innerHTML = `
                <div class="records-empty">
                    <div class="records-empty-icon">📝</div>
                    <p>まだ練習記録がありません</p>
                    <p>メトロノームを使用すると記録されます</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = records.map(record => `
            <div class="record-item">
                <div class="record-info">
                    <span class="record-tempo">
                        ♩ ${record.tempo}${record.endTempo && record.endTempo !== record.tempo ? ` → ${record.endTempo}` : ''} BPM
                    </span>
                    <span class="record-date">${formatRecordDate(record.timestamp)}</span>
                </div>
                <div class="record-duration">
                    <span>${formatDuration(record.duration)}</span>
                    <div class="record-duration-label">練習時間</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * 日付をフォーマット
     */
    function formatRecordDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const dayMs = 24 * 60 * 60 * 1000;

        if (diff < dayMs) {
            // 今日
            return `今日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        } else if (diff < 2 * dayMs) {
            // 昨日
            return `昨日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        } else {
            // それ以前
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
    }

    /**
     * 練習時間をフォーマット
     */
    function formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}時間${minutes}分`;
        } else if (minutes > 0) {
            return `${minutes}分${seconds}秒`;
        } else {
            return `${seconds}秒`;
        }
    }

    /**
     * Timer / Stopwatch functionality
     */
    function setupTimer() {
        const timerDisplay = document.getElementById('timer-display');
        const timerMs = document.getElementById('timer-ms');
        const startBtn = document.getElementById('timer-start-btn');
        const stopBtn = document.getElementById('timer-stop-btn');
        const resetBtn = document.getElementById('timer-reset-btn');
        const lapBtn = document.getElementById('lap-btn');
        const lapList = document.getElementById('lap-list');
        const timerTabs = document.querySelectorAll('.timer-tab');
        const countdownSettings = document.getElementById('countdown-settings');
        const countdownMinutes = document.getElementById('countdown-minutes');
        const countdownSeconds = document.getElementById('countdown-seconds');

        if (!timerDisplay || !startBtn) return;

        let timerInterval = null;
        let elapsedTime = 0; // milliseconds
        let isRunning = false;
        let isCountdown = false;
        let countdownTarget = 0;
        let laps = [];
        let lastLapTime = 0;

        function formatTime(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        function formatMs(ms) {
            return `.${String(Math.floor((ms % 1000) / 10)).padStart(2, '0')}`;
        }

        function updateDisplay() {
            const displayTime = isCountdown ? Math.max(0, countdownTarget - elapsedTime) : elapsedTime;
            timerDisplay.textContent = formatTime(displayTime);
            timerMs.textContent = formatMs(displayTime);

            // Countdown finished
            if (isCountdown && displayTime <= 0 && isRunning) {
                stopTimer();
                timerDisplay.style.color = '#ef4444';
                // Play beep sound
                playTimerBeep();
            }
        }

        function playTimerBeep() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

        function startTimer() {
            if (isRunning) return;

            if (isCountdown) {
                const mins = parseInt(countdownMinutes.value) || 0;
                const secs = parseInt(countdownSeconds.value) || 0;
                countdownTarget = (mins * 60 + secs) * 1000;
                if (countdownTarget <= 0) return;
            }

            isRunning = true;
            const startTime = Date.now() - elapsedTime;

            timerInterval = setInterval(() => {
                elapsedTime = Date.now() - startTime;
                updateDisplay();
            }, 10);

            startBtn.disabled = true;
            stopBtn.disabled = false;
            lapBtn.disabled = false;
            timerDisplay.style.color = '';
        }

        function stopTimer() {
            if (!isRunning) return;

            isRunning = false;
            clearInterval(timerInterval);

            startBtn.disabled = false;
            stopBtn.disabled = true;
        }

        function resetTimer() {
            stopTimer();
            elapsedTime = 0;
            laps = [];
            lastLapTime = 0;
            updateDisplay();
            lapList.innerHTML = '';
            lapBtn.disabled = true;
            timerDisplay.style.color = '';
        }

        function recordLap() {
            if (!isRunning) return;

            const lapTime = elapsedTime;
            const lapDiff = lapTime - lastLapTime;
            lastLapTime = lapTime;
            laps.push({ time: lapTime, diff: lapDiff });

            const li = document.createElement('li');
            li.className = 'lap-item';
            li.innerHTML = `
                <span class="lap-number">#${laps.length}</span>
                <span class="lap-time">${formatTime(lapTime)}${formatMs(lapTime)}</span>
                <span class="lap-diff">+${formatTime(lapDiff)}${formatMs(lapDiff)}</span>
            `;
            lapList.insertBefore(li, lapList.firstChild);
        }

        // Event listeners
        startBtn.addEventListener('click', startTimer);
        stopBtn.addEventListener('click', stopTimer);
        resetBtn.addEventListener('click', resetTimer);
        lapBtn.addEventListener('click', recordLap);

        // Tab switching
        timerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                timerTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                isCountdown = tab.dataset.mode === 'countdown';
                countdownSettings.classList.toggle('hidden', !isCountdown);

                resetTimer();
            });
        });

        updateDisplay();
    }

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
