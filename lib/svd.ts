// svdImageUtils.ts

import { SVD as exactSVD } from 'svd-js';


/** Reconstruct color image from per-channel SVD */
export async function reconstructColor(
    svdData: { r: any; g: any; b: any },
    value: number,
    width: number, height: number
) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(width, height);
    const { r, g, b } = svdData;
    const k = Math.min(value, r.s.length);

    const rec = (sv: { u: number[][]; s: number[]; v: number[][] }) => {
        const uK = sv.u.map(r => r.slice(0, k));
        const sigma = Array.from({ length: k }, (_, i) => { const row = Array(k).fill(0); row[i] = sv.s[i]; return row; });
        const us = multiplyMatrices(uK, sigma);
        return multiplyMatrices(us, sv.v);
    };
    const Rk = rec(r), Gk = rec(g), Bk = rec(b);
    for (let y = 0; y < height; y++)for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        imgData.data[i] = Math.max(0, Math.min(255, Math.round(Rk[y][x] || 0)));
        imgData.data[i + 1] = Math.max(0, Math.min(255, Math.round(Gk[y][x] || 0)));
        imgData.data[i + 2] = Math.max(0, Math.min(255, Math.round(Bk[y][x] || 0)));
        imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
}

/** Reconstruct color image from per-channel SVD */
export async function reconstructColorImage(
    svdData: { r: any; g: any; b: any },
    value: number,
    width: number, height: number
) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(width, height);
    const { r, g, b } = svdData;
    const k = Math.min(value, r.s.length);

    const rec = (sv: { u: number[][]; s: number[]; v: number[][] }) => {
        const uK = sv.u.map(r => r.slice(0, k));
        const sigma = Array.from({ length: k }, (_, i) => { const row = Array(k).fill(0); row[i] = sv.s[i]; return row; });
        const us = multiplyMatrices(uK, sigma);
        return multiplyMatrices(us, sv.v);
    };
    const Rk = rec(r), Gk = rec(g), Bk = rec(b);
    for (let y = 0; y < height; y++)for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        imgData.data[i] = Math.max(0, Math.min(255, Math.round(Rk[y][x] || 0)));
        imgData.data[i + 1] = Math.max(0, Math.min(255, Math.round(Gk[y][x] || 0)));
        imgData.data[i + 2] = Math.max(0, Math.min(255, Math.round(Bk[y][x] || 0)));
        imgData.data[i + 3] = 255;
    }
    return imgData;
}

/** Convert ImageData to 3 channel matrices */
export function imageDataToRGB(imageData: ImageData) {
    const { width, height, data } = imageData;
    const R: number[][] = [], G: number[][] = [], B: number[][] = [];
    for (let y = 0; y < height; y++) {
        const rR: number[] = [], rG: number[] = [], rB: number[] = [];
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            rR.push(data[i]); rG.push(data[i + 1]); rB.push(data[i + 2]);
        }
        R.push(rR); G.push(rG); B.push(rB);
    }
    return { R, G, B };
}

/** Perform SVD per channel */
export async function performColorSVD(imageData: ImageData, k = 50, p = 15) {
    const { R, G, B } = imageDataToRGB(imageData);
    const [rSvd, gSvd, bSvd] = await Promise.all([
        randomizedSVD(R, k, p),
        randomizedSVD(G, k, p),
        randomizedSVD(B, k, p)
    ]);
    return { r: rSvd, g: gSvd, b: bSvd };
}

/**
 * Transpose an m×n matrix ➔ n×m
 */
function transpose(A: number[][]): number[][] {
    const m = A.length;
    const n = A[0]?.length ?? 0;
    const B: number[][] = Array.from({ length: n }, () => Array(m).fill(0));
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            B[j][i] = A[i][j];
        }
    }
    return B;
}

/**
 * Multiply A(m×p) × B(p×n) ➔ C(m×n)
 * Handles empty inputs gracefully.
 */
export function multiplyMatrices(A: number[][], B: number[][]): number[][] {
    if (A.length === 0 || B.length === 0) return [];
    const m = A.length;
    const p = A[0]?.length ?? 0;
    const n = B[0]?.length ?? 0;
    if (p === 0 || n === 0) return Array.from({ length: m }, () => []);

    const C: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
        for (let k = 0; k < p; k++) {
            const aik = A[i][k];
            for (let j = 0; j < n; j++) {
                C[i][j] += aik * B[k][j];
            }
        }
    }
    return C;
}

/**
 * Sample from standard normal distribution via Box–Muller transform
 */
function gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * QR decomposition (Gram–Schmidt) of A(m×l) ➔ { Q(m×l), R(l×l) }
 */
function qrDecomposition(A: number[][]): { Q: number[][]; R: number[][] } {
    const m = A.length;
    const l = A[0]?.length ?? 0;
    const Q: number[][] = Array.from({ length: m }, () => Array(l).fill(0));
    const R: number[][] = Array.from({ length: l }, () => Array(l).fill(0));

    for (let j = 0; j < l; j++) {
        const v = A.map(row => row[j]);
        for (let i = 0; i < j; i++) {
            let dot = 0;
            for (let k = 0; k < m; k++) dot += Q[k][i] * v[k];
            R[i][j] = dot;
            for (let k = 0; k < m; k++) v[k] -= dot * Q[k][i];
        }
        let norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
        R[j][j] = norm;
        if (norm > 0) for (let k = 0; k < m; k++) Q[k][j] = v[k] / norm;
    }
    return { Q, R };
}

/**
 * Perform randomized SVD for speed:
 *   A(m×n) ≈ U(m×k) · Σ(k×k) · Vᵀ(k×n)
 * @param A matrix to decompose
 * @param k desired rank
 * @param p oversampling factor (default 5)
 */
export async function randomizedSVD(
    A: number[][],
    k: number,
    p = 5
): Promise<{ u: number[][]; s: number[]; v: number[][] }> {
    if (A.length === 0 || A[0]?.length === 0) {
        throw new Error('Empty matrix: cannot compute SVD');
    }
    const m = A.length;
    const n = A[0].length;
    const l = Math.min(k + p, n);

    // 1. Draw random Gaussian test matrix Ω (n×l)
    const Omega = Array.from({ length: n }, () =>
        Array.from({ length: l }, () => gaussianRandom())
    );

    // 2. Sample matrix Y = A * Ω (m×l)
    const Y = multiplyMatrices(A, Omega);

    // 3. QR factorization: Y = Q·R
    const { Q } = qrDecomposition(Y);

    // 4. Project: B = Qᵀ * A (l×n)
    const QT = transpose(Q);
    const B = multiplyMatrices(QT, A);

    // 5. Exact SVD on small B; handle B wider than tall
    let Uhat: number[][], sAll: number[], Vhat: number[][];
    if (B.length >= B[0].length) {
        ({ u: Uhat, q: sAll, v: Vhat } = exactSVD(B));
    } else {
        // Decompose Bᵀ and swap
        const Bt = transpose(B);
        const { u: u2, q: s2, v: v2 } = exactSVD(Bt);
        Uhat = v2;
        sAll = s2;
        Vhat = u2;
    }

    // 6. Recover U ≈ Q * Uhat (m×l)
    const Ufull = multiplyMatrices(Q, Uhat);

    // 7. Truncate to top-k components
    const U = Ufull.map(row => row.slice(0, k));
    const s = sAll.slice(0, k);
    const VtAll = transpose(Vhat);
    const Vt = VtAll.slice(0, k);

    return { u: U, s, v: Vt };
}

/**
 * Convert RGBA ImageData to a grayscale matrix
 */
export function imageDataToGrayscaleMatrix(imageData: ImageData): number[][] {
    const { width, height, data } = imageData;
    const M: number[][] = [];
    for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            row.push(gray);
        }
        M.push(row);
    }
    return M;
}

/**
 * Perform randomized SVD directly from ImageData
 * @param imageData RGBA image data
 * @param k rank for approximation (default 50)
 * @param p oversampling (default 5)
 */
export async function performSVD(
    imageData: ImageData,
    k = 50,
    p = 15
): Promise<{ u: number[][]; s: number[]; v: number[][] }> {
    const gray = imageDataToGrayscaleMatrix(imageData);
    if (gray.length === 0 || gray[0].length === 0) {
        throw new Error('Empty image data: cannot perform SVD');
    }
    return randomizedSVD(gray, k, p);
}

/**
 * Reconstruct a grayscale image from its SVD components
 * @returns PNG data URL
 */
export async function reconstructImage(
    svdData: { u: number[][]; s: number[]; v: number[][] },
    value: number,
    width: number,
    height: number
): Promise<string> {
    const { u, s, v } = svdData;
    const k = Math.min(value, s.length);

    const uK = u.map(r => r.slice(0, k));
    const sigmaK = Array.from({ length: k }, (_, i) => {
        const row = new Array<number>(k).fill(0);
        row[i] = s[i];
        return row;
    });
    const vKT = v.slice(0, k);
    const US = multiplyMatrices(uK, sigmaK);
    const A_k = multiplyMatrices(US, vKT);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const c = Math.max(0, Math.min(255, Math.round(A_k[y]?.[x] ?? 0)));
            const idx = (y * width + x) * 4;
            img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = c;
            img.data[idx + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
}

export async function reconstructGrayImage(
    svdData: { u: number[][]; s: number[]; v: number[][] },
    value: number,
    width: number,
    height: number
) {
    const { u, s, v } = svdData;
    const k = Math.min(value, s.length);

    const uK = u.map(r => r.slice(0, k));
    const sigmaK = Array.from({ length: k }, (_, i) => {
        const row = new Array<number>(k).fill(0);
        row[i] = s[i];
        return row;
    });
    const vKT = v.slice(0, k);
    const US = multiplyMatrices(uK, sigmaK);
    const A_k = multiplyMatrices(US, vKT);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const c = Math.max(0, Math.min(255, Math.round(A_k[y]?.[x] ?? 0)));
            const idx = (y * width + x) * 4;
            img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = c;
            img.data[idx + 3] = 255;
        }
    }
    return img;
}

export function multiplyMatrixByDiagonal(matrix: number[][], diagonal: number[]): number[][] {
    // Assumes matrix is M x K and diagonal is K
    // Multiplies each column j of matrix by diagonal[j]
    const M = matrix.length;
    const K = matrix[0]?.length || 0;
    if (K !== diagonal.length) {
        // Or K should be Math.min(matrix[0].length, diagonal.length)
        console.warn("Matrix columns and diagonal length mismatch for S multiplication.");
        // Fallback or throw error depending on desired strictness
    }
    const result: number[][] = [];
    for (let i = 0; i < M; i++) {
        result[i] = [];
        for (let j = 0; j < K; j++) {
            result[i][j] = (matrix[i]?.[j] ?? 0) * (diagonal[j] ?? 0);
        }
    }
    return result;
}