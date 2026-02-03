/**
 * Tempo Practice Calculator
 * 段階的テンポ上昇トレーニング時間計算エンジン
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

    /**
     * 高精度総和計算（Kahan Summationアルゴリズム）
     * 浮動小数点演算の誤差を最小化
     * @param {number[]} numbers - 加算する数値の配列
     * @returns {number} 高精度な総和
     */
    function kahanSum(numbers) {
        let sum = 0.0;
        let compensation = 0.0;  // 補正項

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
     * 拡張数理モデルに基づき練習時間を算出
     * 
     * @param {Object} params - 計算パラメータ
     * @param {number} params.a - 開始テンポ (BPM)
     * @param {number} params.b - 目標テンポ (BPM)
     * @param {number} params.s - ステップ幅 (BPM)
     * @param {number} params.B - フレーズ拍数
     * @param {number} params.R - 反復回数
     * @param {number} params.N - セット数
     * @returns {Object} 計算結果
     */
    function calculateTempoPracticeTime(params) {
        const { a, b, s, B, R, N } = params;

        // 入力値の検証
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

        // 1ステップあたりの総拍数 K = B × R
        const K = B * R;

        // ステップ数 n の算出（切り捨て）
        const n = Math.floor((b - a) / s);

        // 実際の終了テンポ b'
        const bPrime = a + n * s;

        // 時間換算係数 C = 60 × K (秒/拍)
        const C = 60 * K;

        // ===================================================
        // 1. 厳密解法 (Exact Summation using Kahan Algorithm)
        // ===================================================
        // 各ステップの所要時間を計算
        const stepTimes = [];
        for (let k = 0; k <= n; k++) {
            const tempo = a + s * k;
            const stepTime = C / tempo;
            stepTimes.push(stepTime);
        }

        // Kahan加算で高精度な総和を計算
        const sumExact = kahanSum(stepTimes);
        const totalExact = sumExact * N;

        // ===================================================
        // 2. 近似解法 (Rational S-P Formula)
        // 四則演算のみで計算可能な高速モデル
        // ===================================================
        const S = a + bPrime;  // Sum
        const P = a * bPrime;  // Product

        // 積分近似項 (Main Term): 4nS / (S² + 4P)
        // 幾何平均を有理平均(A+H)/2 で近似した結果
        const termIntegral = (4 * n * S) / (S * S + 4 * P);

        // 離散補正項 (Correction Term): S / 2P
        // オイラー・マクローリンの台形補正
        const termCorrection = S / (2 * P);

        // 総和近似
        const sumApprox = C * (termIntegral + termCorrection);
        const totalApprox = sumApprox * N;

        // 誤差率の計算
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
     * @param {number} seconds - 秒数
     * @returns {string} フォーマットされた時間文字列
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
     * @param {Object} data - 計算結果データ
     */
    function displayResults(data) {
        const { results, metadata } = data;

        // メイン結果カード
        totalTimeDisplay.textContent = formatTime(results.exactSeconds);
        totalTimeSecondsDisplay.textContent = `${results.exactSeconds.toFixed(2)} 秒`;

        stepCountDisplay.textContent = metadata.nSteps;
        actualEndTempoDisplay.textContent = metadata.actualEndTempo;

        // 計算詳細
        exactTimeDisplay.textContent = `${results.exactSeconds.toFixed(4)} 秒`;
        approxTimeDisplay.textContent = `${results.approxSeconds.toFixed(4)} 秒`;
        errorRateDisplay.textContent = `${results.errorRate >= 0 ? '+' : ''}${results.errorRate.toFixed(4)}%`;
        totalBeatsPerStepDisplay.textContent = `${metadata.totalBeatsPerStep} 拍`;

        // 結果セクションを表示
        resultsSection.classList.remove('hidden');

        // スムーズスクロール
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * エラーメッセージを表示
     * @param {string} message - エラーメッセージ
     */
    function showError(message) {
        // 既存のエラーメッセージを削除
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // エラーメッセージ要素を作成
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

        // フォームの前に挿入
        form.parentNode.insertBefore(errorDiv, form);

        // 3秒後に自動削除
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transform = 'translateY(-10px)';
            errorDiv.style.transition = 'all 0.3s ease';
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
    }

    /**
     * フォーム送信ハンドラ
     * @param {Event} e - フォーム送信イベント
     */
    function handleSubmit(e) {
        e.preventDefault();

        // フォームから値を取得
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
            // 計算実行
            const result = calculateTempoPracticeTime(params);

            // 結果表示
            displayResults(result);

            // コンソールに詳細ログ（デバッグ用）
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

                // 範囲外の値を補正
                if (value < min) {
                    this.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                } else if (value > max) {
                    this.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                } else {
                    this.style.borderColor = '';
                }
            });

            // フォーカス時にハイライト
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
            // Ctrl/Cmd + Enter で計算実行
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
        // フォーム送信イベント
        form.addEventListener('submit', handleSubmit);

        // 入力検証の設定
        setupValidation();

        // キーボードショートカットの設定
        setupKeyboardShortcuts();

        console.log('Tempo Practice Calculator initialized');
    }

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
