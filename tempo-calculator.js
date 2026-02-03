/**
 * Tempo Practice Calculator
 * 練習時間計算エンジン
 * 
 * 数理モデル: 拡張有理S-P公式に基づく高精度計算
 */

(function () {
    'use strict';

    // DOM Elements
    const form = document.getElementById('calculator-form');
    const resultsSection = document.getElementById('results-section');

    // Result display elements
    const totalTimeDisplay = document.getElementById('totalTime');
    const totalTimeSecondsDisplay = document.getElementById('totalTimeSeconds');
    const stepCountDisplay = document.getElementById('stepCount');
    const actualEndTempoDisplay = document.getElementById('actualEndTempo');
    const exactTimeDisplay = document.getElementById('exactTime');
    const approxTimeDisplay = document.getElementById('approxTime');
    const errorRateDisplay = document.getElementById('errorRate');
    const totalBeatsPerStepDisplay = document.getElementById('totalBeatsPerStep');

    // Theme toggle element
    const themeToggle = document.getElementById('theme-toggle');

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
            background: var(--color-error-bg);
            border: 1px solid var(--color-error-border);
            border-radius: 0.75rem;
            padding: 1rem;
            margin-bottom: 1rem;
            color: var(--color-error-text);
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
     * 成功トースト表示
     */
    function showToast(message) {
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: var(--color-primary);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            z-index: 1000;
            animation: fadeIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
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
                    this.style.borderColor = 'var(--color-error-border)';
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

    // ========================================
    // URL共有機能
    // ========================================

    /**
     * URLからパラメータを読み込んでフォームに設定
     */
    function loadParamsFromURL() {
        const urlParams = new URLSearchParams(window.location.search);

        const paramMapping = {
            'a': 'startTempo',
            'b': 'endTempo',
            's': 'stepSize',
            'B': 'beatsPerPhrase',
            'R': 'repetitions',
            'N': 'sets'
        };

        let hasParams = false;

        for (const [urlKey, inputName] of Object.entries(paramMapping)) {
            const value = urlParams.get(urlKey);
            if (value !== null) {
                const input = document.querySelector(`[name="${inputName}"]`);
                if (input) {
                    input.value = value;
                    hasParams = true;
                }
            }
        }

        // パラメータがある場合は自動計算
        if (hasParams) {
            setTimeout(() => {
                form.dispatchEvent(new Event('submit'));
            }, 100);
        }
    }

    /**
     * 現在の設定をURL共有用に生成
     */
    function generateShareURL() {
        const formData = new FormData(form);
        const params = new URLSearchParams();

        params.set('a', formData.get('startTempo'));
        params.set('b', formData.get('endTempo'));
        params.set('s', formData.get('stepSize'));
        params.set('B', formData.get('beatsPerPhrase'));
        params.set('R', formData.get('repetitions'));
        params.set('N', formData.get('sets'));

        const baseURL = window.location.origin + window.location.pathname;
        return `${baseURL}?${params.toString()}`;
    }

    /**
     * 共有ボタンのクリックハンドラ
     */
    function handleShare() {
        const shareURL = generateShareURL();

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareURL).then(() => {
                showToast('📋 URLをコピーしました！');
            }).catch(() => {
                prompt('以下のURLをコピーしてください:', shareURL);
            });
        } else {
            prompt('以下のURLをコピーしてください:', shareURL);
        }
    }

    // ========================================
    // ダークモード切り替え機能
    // ========================================

    /**
     * テーマを切り替え
     */
    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        updateThemeIcon(newTheme);
    }

    /**
     * テーマアイコンを更新
     */
    function updateThemeIcon(theme) {
        if (!themeToggle) return;

        const icon = themeToggle.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    }

    /**
     * 保存されたテーマを読み込み
     */
    function loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'dark');

        document.documentElement.setAttribute('data-theme', theme);
        updateThemeIcon(theme);
    }

    /**
     * 初期化
     */
    function init() {
        // フォーム送信イベント
        form.addEventListener('submit', handleSubmit);

        // 入力検証の設定
        setupValidation();

        // キーボードショートカットの設定
        setupKeyboardShortcuts();

        // URLからパラメータを読み込み
        loadParamsFromURL();

        // テーマの初期化
        loadSavedTheme();

        // テーマ切り替えボタン
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        // 共有ボタン
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', handleShare);
        }

        console.log('Tempo Practice Calculator initialized');
    }

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
