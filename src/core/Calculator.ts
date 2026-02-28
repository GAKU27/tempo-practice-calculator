/**
 * Calculator - 有理S-P公式に基づく高精度テンポ計算エンジン
 */

export interface PracticeParams {
    a: number; // 開始テンポ
    b: number; // 目標テンポ
    s: number; // ステップ幅
    B: number; // 拍子数
    R: number; // 反復回数
    N: number; // 全体のセット数
}

export interface PracticeResults {
    exactSeconds: number;
    approxSeconds: number;
    errorRate: number;
}

export interface PracticeMetadata {
    nSteps: number;
    actualEndTempo: number;
    totalBeatsPerStep: number;
    timeConstantC: number;
    inputParams: PracticeParams;
}

export interface CalculationResult {
    results: PracticeResults;
    metadata: PracticeMetadata;
}

/**
 * 高精度総和計算（Kahan Summationアルゴリズム）
 */
function kahanSum(numbers: number[]): number {
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
 * テンポ練習時間の計算
 * @param params 練習パラメータ
 * @returns 計算結果とメタデータ
 */
export function calculateTempoPracticeTime(params: PracticeParams): CalculationResult {
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

    const stepTimes: number[] = [];
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
export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
