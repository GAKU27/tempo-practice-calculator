import { calculateTempoPracticeTime, formatTime, PracticeParams, CalculationResult } from '../core/Calculator';

export class CalculatorUI {
    private form: HTMLFormElement | null = null;
    private resultsSection: HTMLElement | null = null;

    // Result elements
    private totalTimeDisplay: HTMLElement | null = null;
    private totalTimeSecondsDisplay: HTMLElement | null = null;
    private actualEndTempoDisplay: HTMLElement | null = null;
    private exactTimeDisplay: HTMLElement | null = null;
    private approxTimeDisplay: HTMLElement | null = null;
    private errorRateDisplay: HTMLElement | null = null;
    private totalBeatsPerStepDisplay: HTMLElement | null = null;

    constructor() { }

    public init() {
        this.form = document.getElementById('calculator-form') as HTMLFormElement;
        this.resultsSection = document.getElementById('results-section');

        this.totalTimeDisplay = document.getElementById('totalTime');
        this.totalTimeSecondsDisplay = document.getElementById('totalTimeSeconds');
        this.actualEndTempoDisplay = document.getElementById('actualEndTempo');
        this.exactTimeDisplay = document.getElementById('exactTime');
        this.approxTimeDisplay = document.getElementById('approxTime');
        this.errorRateDisplay = document.getElementById('errorRate');
        this.totalBeatsPerStepDisplay = document.getElementById('totalBeatsPerStep');

        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
            this.setupValidation();
        }

        this.setupKeyboardShortcuts();
    }

    private handleSubmit(e: Event) {
        e.preventDefault();

        if (!this.form) return;

        const formData = new FormData(this.form);
        const params: PracticeParams = {
            a: parseFloat(formData.get('startTempo') as string),
            b: parseFloat(formData.get('endTempo') as string),
            s: 1, // ハードコード: ステップ幅1
            B: parseInt(formData.get('beatsPerPhrase') as string, 10),
            R: parseInt(formData.get('repetitions') as string, 10),
            N: 1 // ハードコード: 1セット
        };

        try {
            const result = calculateTempoPracticeTime(params);
            this.displayResults(result);
            console.log('計算結果:', result);
        } catch (error: any) {
            this.showError(error.message || '計算エラー');
            console.error('計算エラー:', error);
        }
    }

    private setupValidation() {
        if (!this.form) return;
        const inputs = this.form.querySelectorAll('input[type="number"]');

        inputs.forEach(input => {
            input.addEventListener('input', function (this: HTMLInputElement) {
                const min = parseFloat(this.min);
                const max = parseFloat(this.max);
                let value = parseFloat(this.value);

                if (value < min || value > max) {
                    this.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                } else {
                    this.style.borderColor = '';
                }
            });

            input.addEventListener('focus', function (this: HTMLInputElement) {
                this.select();
            });
        });
    }

    private setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (this.form) {
                    this.form.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    private displayResults(result: CalculationResult) {
        if (!this.resultsSection) return;

        const { exactSeconds, approxSeconds, errorRate } = result.results;
        const { actualEndTempo, totalBeatsPerStep } = result.metadata;

        // Animate numbers for polished feel
        this.animateNumber(this.totalTimeDisplay, null, formatTime(exactSeconds));
        this.animateNumber(this.totalTimeSecondsDisplay, exactSeconds, null, ' 秒');

        // Update details
        if (this.actualEndTempoDisplay) this.actualEndTempoDisplay.textContent = `${actualEndTempo} BPM`;
        if (this.exactTimeDisplay) this.exactTimeDisplay.textContent = `${exactSeconds.toFixed(3)} 秒`;
        if (this.approxTimeDisplay) this.approxTimeDisplay.textContent = `${approxSeconds.toFixed(3)} 秒`;

        if (this.errorRateDisplay) {
            const isNegative = errorRate < 0;
            const sign = isNegative ? '' : '+';
            this.errorRateDisplay.textContent = `${sign}${errorRate.toExponential(2)} %`;
            this.errorRateDisplay.style.color = Math.abs(errorRate) < 0.01 ? 'var(--color-tertiary)' : 'var(--color-text-secondary)';
        }

        if (this.totalBeatsPerStepDisplay) this.totalBeatsPerStepDisplay.textContent = `${totalBeatsPerStep} 拍`;

        // Show results section if hidden
        this.resultsSection.classList.remove('hidden');

        // Highlight effect
        const totalTimeCard = document.querySelector('.result-card.primary') as HTMLElement;
        if (totalTimeCard) {
            totalTimeCard.style.transform = 'scale(1.02)';
            totalTimeCard.style.boxShadow = '0 0 30px rgba(99, 102, 241, 0.3)';
            setTimeout(() => {
                totalTimeCard.style.transform = '';
                totalTimeCard.style.boxShadow = '';
            }, 300);
        }
    }

    private showError(message: string) {
        if (!this.resultsSection) return;

        this.resultsSection.classList.remove('hidden');
        this.resultsSection.innerHTML = `
            <div class="error-message" style="
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #fca5a5;
                padding: var(--space-lg);
                border-radius: var(--radius-md);
                text-align: center;
            ">
                <span style="font-size: var(--font-size-xl); display: block; margin-bottom: var(--space-sm);">⚠️</span>
                ${message}
            </div>
        `;

        // Restore original HTML after 3 seconds so they can calculate again
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }

    private animateNumber(element: HTMLElement | null, finalNumber: number | null, textValue: string | null = null, suffix: string = '') {
        if (!element) return;

        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            if (textValue !== null) {
                element.textContent = textValue;
            } else if (finalNumber !== null) {
                // Number increasing animation
                let current = 0;
                const duration = 500;
                const steps = 20;
                const step = finalNumber / steps;
                const stepTime = duration / steps;

                let counter = 0;
                const timer = setInterval(() => {
                    counter++;
                    current += step;

                    if (counter >= steps) {
                        element.textContent = finalNumber.toFixed(1) + suffix;
                        clearInterval(timer);
                    } else {
                        element.textContent = current.toFixed(1) + suffix;
                    }
                }, stepTime);
            }

            element.style.transition = 'all 0.4s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 50);
    }
}
