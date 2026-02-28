import { Metronome } from '../core/Metronome';

export class MetronomeUI {
    private metronome: Metronome;

    // UI Elements
    private bpmDisplay: HTMLElement | null = null;
    private bpmSlider: HTMLInputElement | null = null;
    private playBtn: HTMLElement | null = null;
    private visualCircle: HTMLElement | null = null;

    constructor() {
        this.metronome = new Metronome();
    }

    public init() {
        this.bpmDisplay = document.getElementById('bpm-display');
        this.bpmSlider = document.getElementById('bpm-slider') as HTMLInputElement;
        const bpmIncrease = document.getElementById('bpm-increase');
        const bpmDecrease = document.getElementById('bpm-decrease');
        this.playBtn = document.getElementById('metronome-play-btn');
        const tapBtn = document.getElementById('tap-tempo-btn');
        const timeSignatureSelect = document.getElementById('time-signature-select') as HTMLSelectElement;
        const subdivisionSelect = document.getElementById('subdivision-select') as HTMLSelectElement;
        const soundSelect = document.getElementById('sound-select') as HTMLSelectElement;
        const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
        const pendulumToggle = document.getElementById('pendulum-toggle') as HTMLInputElement;

        this.visualCircle = document.getElementById('visual-circle');
        const pendulumArm = document.getElementById('pendulum-arm');

        if (!this.bpmDisplay || !this.bpmSlider || !this.playBtn) {
            console.error('Metronome elements not found');
            return;
        }

        // Callbacks for visual feedback
        this.metronome.setVisualCallback((beatNumber, isMainBeat, isAccent) => {
            if (!this.visualCircle) return;
            this.visualCircle.className = 'visual-circle'; // reset
            void this.visualCircle.offsetWidth; // force reflow

            if (isAccent) {
                this.visualCircle.classList.add('accent');
            } else if (isMainBeat) {
                this.visualCircle.classList.add('beat');
            } else {
                this.visualCircle.classList.add('sub-beat');
            }

            setTimeout(() => {
                if (this.visualCircle) {
                    this.visualCircle.classList.remove('beat', 'accent', 'sub-beat');
                }
            }, 100);
        });

        this.metronome.setPendulumCallback((direction) => {
            if (!pendulumArm) return;
            pendulumArm.classList.remove('swinging-left', 'swinging-right');
            void pendulumArm.offsetWidth;

            if (direction === 'right') {
                pendulumArm.classList.add('swinging-right');
            } else {
                pendulumArm.classList.add('swinging-left');
            }
        });

        // Initialize values
        this.updateTempo(120);

        if (timeSignatureSelect) {
            this.metronome.setBeatsPerBar(parseInt(timeSignatureSelect.value, 10));
            timeSignatureSelect.addEventListener('change', (e) => {
                this.metronome.setBeatsPerBar(parseInt((e.target as HTMLSelectElement).value, 10));
            });
        }

        if (subdivisionSelect) {
            this.metronome.setSubdivision(parseInt(subdivisionSelect.value, 10));
            subdivisionSelect.addEventListener('change', (e) => {
                this.metronome.setSubdivision(parseInt((e.target as HTMLSelectElement).value, 10));
            });
        }

        if (soundSelect) {
            this.metronome.setSoundType(soundSelect.value as any);
            soundSelect.addEventListener('change', (e) => {
                this.metronome.setSoundType((e.target as HTMLSelectElement).value as any);
            });
        }

        if (volumeSlider) {
            this.metronome.setVolume(parseFloat(volumeSlider.value));
            volumeSlider.addEventListener('input', (e) => {
                this.metronome.setVolume(parseFloat((e.target as HTMLInputElement).value));
            });
        }

        if (pendulumToggle) {
            this.metronome.setPendulumEnabled(pendulumToggle.checked);
            pendulumToggle.addEventListener('change', (e) => {
                this.metronome.setPendulumEnabled((e.target as HTMLInputElement).checked);
            });
        }

        // Tempo Change Handlers
        this.bpmSlider.addEventListener('input', (e) => {
            this.updateTempo(parseInt((e.target as HTMLInputElement).value, 10));
        });

        if (bpmDecrease) {
            bpmDecrease.addEventListener('click', () => {
                if (this.bpmSlider) {
                    this.updateTempo(parseInt(this.bpmSlider.value, 10) - 1);
                }
            });
        }

        if (bpmIncrease) {
            bpmIncrease.addEventListener('click', () => {
                if (this.bpmSlider) {
                    this.updateTempo(parseInt(this.bpmSlider.value, 10) + 1);
                }
            });
        }

        // Play/Pause
        this.playBtn.addEventListener('click', () => {
            if (this.metronome.isPlaying) {
                this.metronome.stop();
                this.playBtn?.classList.remove('playing');
                if (pendulumArm) {
                    pendulumArm.classList.remove('swinging-left', 'swinging-right');
                }
            } else {
                this.metronome.start();
                this.playBtn?.classList.add('playing');
            }
        });

        // Tap Tempo Logic
        if (tapBtn) {
            this.setupTapTempo(tapBtn);
        }

        // Settings Modal
        this.setupSettingsModal();
    }

    private updateTempo(bpm: number) {
        let newBpm = Math.min(Math.max(bpm, 30), 250); // Clamp 30-250
        if (this.bpmDisplay) this.bpmDisplay.textContent = newBpm.toString();
        if (this.bpmSlider) this.bpmSlider.value = newBpm.toString();
        this.metronome.setTempo(newBpm);

        const tempoText = document.getElementById('tempo-text');
        if (tempoText) {
            tempoText.textContent = this.getTempoText(newBpm);
        }
    }

    private getTempoText(bpm: number): string {
        if (bpm < 40) return 'Grave (非常に遅く)';
        if (bpm < 50) return 'Largo (幅広く、遅く)';
        if (bpm < 60) return 'Lento (遅く)';
        if (bpm < 66) return 'Larghetto (Largoよりやや速く)';
        if (bpm < 76) return 'Adagio (ゆるやかに)';
        if (bpm < 108) return 'Andante (歩くような速さで)';
        if (bpm < 120) return 'Moderato (中くらいの速さで)';
        if (bpm < 156) return 'Allegro (快活に速く)';
        if (bpm < 176) return 'Vivace (生き生きと速く)';
        if (bpm < 200) return 'Presto (急速に)';
        return 'Prestissimo (極めて急速に)';
    }

    private setupTapTempo(tapBtn: HTMLElement) {
        let tapTimes: number[] = [];
        const TAP_TIMEOUT = 2000;

        tapBtn.addEventListener('click', () => {
            const now = Date.now();

            if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > TAP_TIMEOUT) {
                tapTimes = [];
            }

            tapTimes.push(now);

            if (tapTimes.length > 4) {
                tapTimes.shift();
            }

            if (tapTimes.length >= 2) {
                let intervals = [];
                for (let i = 1; i < tapTimes.length; i++) {
                    intervals.push(tapTimes[i] - tapTimes[i - 1]);
                }

                const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
                const calculatedBpm = Math.round(60000 / avgInterval);

                if (calculatedBpm >= 30 && calculatedBpm <= 250) {
                    this.updateTempo(calculatedBpm);
                }
            }

            const originalText = tapBtn.innerHTML;
            tapBtn.innerHTML = '👣 Tapped!';
            tapBtn.style.color = 'var(--color-primary-light)';
            tapBtn.style.borderColor = 'var(--color-primary)';

            setTimeout(() => {
                tapBtn.innerHTML = originalText;
                tapBtn.style.color = '';
                tapBtn.style.borderColor = '';
            }, 300);
        });
    }

    private setupSettingsModal() {
        const settingsToggleBtn = document.getElementById('metronome-settings-toggle');
        const settingsPanel = document.getElementById('metronome-settings-panel');
        const closeSettingsBtn = document.getElementById('close-metronome-settings');
        const pendulumToggle = document.getElementById('pendulum-toggle') as HTMLInputElement;
        const pendulumContainer = document.getElementById('pendulum-container');

        if (settingsToggleBtn && settingsPanel && closeSettingsBtn) {
            const togglePanel = () => {
                settingsPanel.classList.toggle('hidden');
            };

            settingsToggleBtn.addEventListener('click', togglePanel);
            closeSettingsBtn.addEventListener('click', togglePanel);
        }

        if (pendulumToggle && pendulumContainer) {
            pendulumToggle.addEventListener('change', (e) => {
                if ((e.target as HTMLInputElement).checked) {
                    pendulumContainer.classList.remove('hidden');
                } else {
                    pendulumContainer.classList.add('hidden');
                }
            });
        }
    }

    public stop() {
        if (this.metronome.isPlaying) {
            this.metronome.stop();
            this.playBtn?.classList.remove('playing');
        }
    }
}
