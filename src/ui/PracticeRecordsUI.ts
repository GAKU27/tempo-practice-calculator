export interface PracticeRecord {
    timestamp: number;
    startTempo: string;
    endTempo: string;
    beatsPerPhrase: string;
    repetitions: string;
    formattedTime: string;
}

export class PracticeRecordsUI {
    private readonly STORAGE_KEY = 'tpc_practice_records';
    private records: PracticeRecord[] = [];

    // UI Elements
    private saveBtn: HTMLElement | null = null;
    private clearBtn: HTMLElement | null = null;
    private recordsList: HTMLElement | null = null;

    constructor() { }

    public init() {
        this.saveBtn = document.getElementById('save-record-btn');
        this.clearBtn = document.getElementById('clear-records-btn');
        this.recordsList = document.getElementById('records-list');

        this.loadRecords();
        this.renderRecords();

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', this.handleSave.bind(this));
        }

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', this.handleClear.bind(this));
        }
    }

    private loadRecords() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.records = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load practice records', e);
        }
    }

    private saveAndRender() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.records));
            this.renderRecords();
        } catch (e) {
            console.error('Failed to save practice records', e);
        }
    }

    private renderRecords() {
        if (!this.recordsList) return;

        if (this.records.length === 0) {
            this.recordsList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: var(--space-xl); color: var(--color-text-muted);">
                    <div style="font-size: 3rem; margin-bottom: var(--space-sm); opacity: 0.5;">📝</div>
                    <p>記録がありません</p>
                    <p style="font-size: var(--font-size-xs);">計算結果画面から「練習記録に保存」をクリックすると表示されます</p>
                </div>`;
            return;
        }

        this.recordsList.innerHTML = this.records.map((record, index) => {
            const date = new Date(record.timestamp);
            const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            return `
                <div class="record-item" style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-md); margin-bottom: var(--space-md); display: flex; justify-content: space-between; align-items: center;">
                    <div class="record-info">
                        <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-xs);">${dateStr}</div>
                        <div style="font-size: var(--font-size-base); font-weight: 500; color: var(--color-text-primary);">
                            🎵 ${record.startTempo} BPM → 🎯 ${record.endTempo} BPM
                        </div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-xs);">
                            ⏱️ 時間: ${record.formattedTime} | 🎼 ${record.beatsPerPhrase}拍 × ${record.repetitions}回
                        </div>
                    </div>
                    <button type="button" class="control-btn small delete-record-btn" data-index="${index}" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                        🗑️
                    </button>
                </div>
            `;
        }).join('');

        // Add delete listeners
        this.recordsList.querySelectorAll('.delete-record-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const idx = parseInt(target.getAttribute('data-index') || '0', 10);
                this.records.splice(idx, 1);
                this.saveAndRender();
            });
        });
    }

    private handleSave() {
        const totalTimeElem = document.getElementById('totalTime');
        if (!totalTimeElem || totalTimeElem.textContent === '--:--') {
            this.showFeedbackError('計算結果がありません');
            return;
        }

        const form = document.getElementById('calculator-form') as HTMLFormElement;
        const formData = new FormData(form);

        const record: PracticeRecord = {
            timestamp: Date.now(),
            startTempo: formData.get('startTempo') as string,
            endTempo: formData.get('endTempo') as string,
            beatsPerPhrase: formData.get('beatsPerPhrase') as string,
            repetitions: formData.get('repetitions') as string,
            formattedTime: totalTimeElem.textContent || ''
        };

        this.records.unshift(record);
        this.saveAndRender();

        if (this.saveBtn) {
            const originalText = this.saveBtn.innerHTML;
            this.saveBtn.innerHTML = '<span class="btn-icon">✅</span> 保存しました';
            this.saveBtn.style.background = 'var(--color-tertiary)';

            setTimeout(() => {
                if (this.saveBtn) {
                    this.saveBtn.innerHTML = originalText;
                    this.saveBtn.style.background = 'var(--gradient-primary)';
                }
            }, 2000);
        }
    }

    private handleClear() {
        if (this.records.length === 0) return;
        if (confirm('すべての練習記録を消去しますか？')) {
            this.records = [];
            this.saveAndRender();
        }
    }

    private showFeedbackError(message: string) {
        // Simple alert for now, could be integrated with CalculatorUI's showError
        alert(message);
    }
}
