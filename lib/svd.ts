// svdImageUtils.ts

import { SVD as exactSVD } from 'svd-js';
import { ColorSvdData, SvdData } from './utils';


// -----------------------------------------------------------------------------
// MATRIX UTILITIES
// -----------------------------------------------------------------------------

/**
 * Multiply A(m×p) × B(p×n) ➔ C(m×n)
 */
export function multiplyMatrices(A: number[][], B: number[][]): number[][] {
    const m = A.length;
    const pA = A[0]?.length ?? 0;
    const pB = B.length;
    const n = B[0]?.length ?? 0;

    if (m === 0 || n === 0) {
        if (m === 0) return [];
        if (n === 0) return Array.from({ length: m }, () => []);
    }

    if (pA !== pB) {
        throw new Error(
            `Cannot multiply matrices: Inner dimensions do not match. A_cols (${pA}) !== B_rows (${pB}). A is ${m}x${pA}, B is ${pB}x${n}.`
        );
    }

    if (pA === 0) { // A(m x 0) * B(0 x n) = C(m x n of zeros)
        return Array.from({ length: m }, () => Array(n).fill(0));
    }

    const C: number[][] = Array(m);
    for (let i = 0; i < m; i++) {
        C[i] = Array(n).fill(0);
        for (let k = 0; k < pA; k++) {
            const aik = A[i][k];
            if (aik === 0) continue;
            for (let j = 0; j < n; j++) {
                if (B[k] === undefined || B[k][j] === undefined) {
                    throw new Error(`Matrix B is malformed at B[${k}][${j}] during multiplication.`);
                }
                C[i][j] += aik * B[k][j];
            }
        }
    }
    return C;
}


export function multiplyMatrixByDiagonal(matrix: number[][], diagonal: number[]): number[][] {
    const M = matrix.length;
    if (M === 0) return [];
    const K_matrix_cols = matrix[0]?.length || 0;
    const K_diag_len = diagonal.length;

    // Determine the actual number of columns/diagonal elements to use for multiplication
    const K_eff = Math.min(K_matrix_cols, K_diag_len);

    if (K_matrix_cols !== K_diag_len) {
        console.warn(
            `multiplyMatrixByDiagonal: Matrix columns (${K_matrix_cols}) and diagonal length (${K_diag_len}) mismatch. ` +
            `Multiplication will proceed up to the smaller dimension (${K_eff}).`
        );
    }

    if (K_eff === 0) { // If either matrix has no columns or diagonal is empty
        return matrix.map(() => []); // Return matrix with same number of rows, but 0 columns
    }

    const result: number[][] = Array(M);
    for (let i = 0; i < M; i++) {
        result[i] = Array(K_eff); // Result will have K_eff columns
        for (let j = 0; j < K_eff; j++) {
            const matrixVal = matrix[i]?.[j];
            const diagVal = diagonal[j];
            // Ensure multiplication with numbers, default to 0 if undefined/null
            result[i][j] = (typeof matrixVal === 'number' ? matrixVal : 0) * (typeof diagVal === 'number' ? diagVal : 0);
        }
    }
    return result;
}

/**
 * Transpose an m×n matrix ➔ n×m
 */
function transpose(A: number[][]): number[][] {
    const m = A.length;
    if (m === 0) return [];
    const n = A[0]?.length ?? 0;
    if (n === 0) return Array.from({ length: m }, () => []); // m x 0 matrix transposes to 0 x m

    const B: number[][] = Array(n);
    for (let j = 0; j < n; j++) {
        B[j] = Array(m);
        for (let i = 0; i < m; i++) {
            if (A[i] === undefined || A[i][j] === undefined) {
                throw new Error(`Matrix A is malformed at A[${i}][${j}] during transpose.`);
            }
            B[j][i] = A[i][j];
        }
    }
    return B;
}

// -----------------------------------------------------------------------------
// SVD CORE ALGORITHM (Randomized)
// -----------------------------------------------------------------------------

/** Sample from standard normal distribution */
function gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** QR decomposition (Gram–Schmidt) */
function qrDecomposition(A: number[][]): { Q: number[][]; R: number[][] } {
    const m = A.length;
    if (m === 0) return { Q: [], R: [] };
    const l = A[0]?.length ?? 0;
    if (l === 0) return { Q: Array.from({ length: m }, () => []), R: [] };

    const Q: number[][] = Array.from({ length: m }, () => Array(l).fill(0));
    const R: number[][] = Array.from({ length: l }, () => Array(l).fill(0));

    for (let j = 0; j < l; j++) {
        const v_j = A.map(row => row[j]);
        for (let i = 0; i < j; i++) {
            let dotProduct = 0;
            for (let k = 0; k < m; k++) dotProduct += Q[k][i] * v_j[k];
            R[i][j] = dotProduct;
            for (let k = 0; k < m; k++) v_j[k] -= R[i][j] * Q[k][i];
        }
        let norm_v_j = Math.sqrt(v_j.reduce((sum, val) => sum + val * val, 0));
        R[j][j] = norm_v_j;
        if (norm_v_j > 1e-10) {
            for (let k = 0; k < m; k++) Q[k][j] = v_j[k] / norm_v_j;
        }
    }
    return { Q, R };
}

/**
 * Perform randomized SVD.
 * @returns { u: U_k, s: singular_values_k, v: V_T_k } (SvdData)
 */
export async function randomizedSVD(
    A: number[][],
    k_rank: number,
    p_oversampling = 5
): Promise<SvdData> {
    const m_A = A.length;
    if (m_A === 0) return { u: [], s: [], v: [] };
    const n_A = A[0]?.length ?? 0;
    if (n_A === 0) return { u: A.map(() => []), s: [], v: [] };

    // console.log(`randomizedSVD: Input A is ${m_A}x${n_A}. Requested k_rank=${k_rank}.`);

    const l_intermediate = Math.min(k_rank + p_oversampling, n_A, m_A);
    const final_k = Math.min(k_rank, l_intermediate);

    if (final_k <= 0) {
        const U_empty = A.map(() => []);
        const V_T_empty = Array.from({ length: 0 }, () => Array(n_A).fill(0));
        return { u: U_empty, s: [], v: V_T_empty };
    }
    // console.log(`randomizedSVD: Calculated l_intermediate=${l_intermediate}, final_k=${final_k}.`);

    const Omega = Array.from({ length: n_A }, () => Array.from({ length: l_intermediate }, () => gaussianRandom()));
    const Y = multiplyMatrices(A, Omega);
    const { Q } = qrDecomposition(Y);

    if (Q.length !== m_A || (m_A > 0 && (Q[0]?.length ?? 0) !== l_intermediate)) {
        throw new Error(`randomizedSVD: QR decomposition Q unexpected dimensions. Expected ${m_A}x${l_intermediate}, got ${Q.length}x${Q[0]?.length ?? 0}`);
    }

    const QT = transpose(Q);
    const B = multiplyMatrices(QT, A);
    // console.log(`randomizedSVD: Projected matrix B is ${B.length}x${B[0]?.length || 0}.`);
    if (B.length !== l_intermediate || (l_intermediate > 0 && (B[0]?.length || 0) !== n_A)) {
        throw new Error(`randomizedSVD: Projected matrix B unexpected dimensions. Expected ${l_intermediate}x${n_A}, got ${B.length}x${B[0]?.length || 0}`);
    }

    let U_hat_of_B: number[][], s_all_from_B: number[], V_of_B: number[][];

    if (B.length >= (B[0]?.length ?? 0)) {
        // console.log(`randomizedSVD: B is tall/square (${B.length}x${B[0]?.length || 0}). Calling exactSVD(B).`);
        const { u, q, v } = exactSVD(B); // svd-js: v is V
        U_hat_of_B = u;
        s_all_from_B = q;
        V_of_B = v;
    } else {
        // console.log(`randomizedSVD: B is wide (${B.length}x${B[0]?.length || 0}). Transposing B to Bt.`);
        const Bt = transpose(B);
        // console.log(`randomizedSVD: Bt dimensions: ${Bt.length}x${Bt[0]?.length || 0}. Calling exactSVD(Bt).`);
        if (Bt.length < (Bt[0]?.length ?? 0)) {
            throw new Error("CRITICAL ERROR in randomizedSVD: Transposed matrix Bt is STILL wide.");
        }
        const { u: U_of_Bt, q: s_of_Bt, v: V_of_Bt } = exactSVD(Bt);
        U_hat_of_B = V_of_Bt;
        s_all_from_B = s_of_Bt;
        V_of_B = U_of_Bt;
    }

    const U_A_full_rank = multiplyMatrices(Q, U_hat_of_B);
    const U_final = U_A_full_rank.map(row => row.slice(0, final_k));
    const s_final = s_all_from_B.slice(0, final_k);
    const V_of_B_T = transpose(V_of_B);
    const V_T_A_final = V_of_B_T.slice(0, final_k);

    return { u: U_final, s: s_final, v: V_T_A_final };
}

// -----------------------------------------------------------------------------
// IMAGE DATA CONVERSION AND SVD EXECUTION
// -----------------------------------------------------------------------------

export function imageDataToGrayscaleMatrix(imageData: ImageData): number[][] {
    const { width, height, data } = imageData;
    const M: number[][] = Array(height);
    for (let y = 0; y < height; y++) {
        M[y] = Array(width);
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            M[y][x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }
    }
    return M;
}

export function imageDataToRGBMatrices(imageData: ImageData): { R: number[][]; G: number[][]; B: number[][] } {
    const { width, height, data } = imageData;
    const R: number[][] = Array(height);
    const G: number[][] = Array(height);
    const B: number[][] = Array(height);
    for (let y = 0; y < height; y++) {
        R[y] = Array(width); G[y] = Array(width); B[y] = Array(width);
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            R[y][x] = data[i]; G[y][x] = data[i + 1]; B[y][x] = data[i + 2];
        }
    }
    return { R, G, B };
}

export async function performGrayscaleSVD(
    imageData: ImageData,
    k_rank = 50,
    p_oversampling = 15
): Promise<SvdData> {
    const grayMatrix = imageDataToGrayscaleMatrix(imageData);
    if (grayMatrix.length === 0 || (grayMatrix.length > 0 && grayMatrix[0].length === 0)) {
        console.warn('performGrayscaleSVD: Empty matrix from imageData. Returning empty SVD.');
        return { u: [], s: [], v: [] };
    }
    return randomizedSVD(grayMatrix, k_rank, p_oversampling);
}

export async function performColorSVD(
    imageData: ImageData,
    k_rank = 50,
    p_oversampling = 15
): Promise<ColorSvdData> {
    const { R, G, B } = imageDataToRGBMatrices(imageData);
    // Check if any channel matrix is empty
    if (R.length === 0 || G.length === 0 || B.length === 0) {
        console.warn('performColorSVD: One or more empty channel matrices from imageData. Returning empty SVDs for all channels.');
        const emptySvd = { u: [], s: [], v: [] };
        return { r: emptySvd, g: emptySvd, b: emptySvd };
    }
    const [rSvd, gSvd, bSvd] = await Promise.all([
        randomizedSVD(R, k_rank, p_oversampling),
        randomizedSVD(G, k_rank, p_oversampling),
        randomizedSVD(B, k_rank, p_oversampling)
    ]);
    return { r: rSvd, g: gSvd, b: bSvd };
}

// -----------------------------------------------------------------------------
// IMAGE RECONSTRUCTION (TO RAWPIXELDATA - WORKER FRIENDLY)
// -----------------------------------------------------------------------------

export async function reconstructGrayPixelData(
    svdData: SvdData,
    k_value: number,
    width: number,
    height: number
): Promise<RawPixelData> {
    if (!svdData || !svdData.u || !svdData.s || !svdData.v) {
        throw new Error("reconstructGrayPixelData: Invalid svdData or missing u, s, or v components.");
    }
    const { u, s, v: v_T } = svdData; // svdData.v is V_T

    const rankP = s.length;
    // Basic validation based on what we expect U and V_T to be relative to image dimensions and rank
    if (u.length !== height || (rankP > 0 && u[0]?.length !== rankP)) {
        throw new Error(`Dimension mismatch for U in reconstructGrayPixelData: expected U to be ${height}x${rankP}, got ${u.length}x${u[0]?.length}. Ensure SVD components match image dimensions.`);
    }
    if ((rankP > 0 && v_T.length !== rankP) || (v_T.length > 0 && v_T[0]?.length !== width)) {
        throw new Error(`Dimension mismatch for V_T (from svdData.v) in reconstructGrayPixelData: expected V_T to be ${rankP}x${width}, got ${v_T.length}x${v_T[0]?.length}.`);
    }

    const k_eff = Math.min(k_value, rankP);

    if (k_eff <= 0) {
        const zeroPixelArray = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < zeroPixelArray.length; i += 4) { zeroPixelArray[i + 3] = 255; }
        return { data: zeroPixelArray, width, height };
    }

    const U_k = u.map(r => r.slice(0, k_eff));
    const S_k_diag_values = s.slice(0, k_eff);
    const V_T_k = v_T.slice(0, k_eff);

    const U_k_S_k = U_k.map(row =>
        row.map((val_in_u_col, colIndex) => val_in_u_col * S_k_diag_values[colIndex])
    );

    const A_k_matrix = multiplyMatrices(U_k_S_k, V_T_k);

    if (A_k_matrix.length !== height || (A_k_matrix.length > 0 && A_k_matrix[0]?.length !== width)) {
        throw new Error(`Reconstructed matrix A_k_matrix has incorrect dimensions. Expected ${height}x${width}, got ${A_k_matrix.length}x${A_k_matrix[0]?.length}.`);
    }

    const pixelArray = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const intensity = A_k_matrix[y]?.[x] ?? 0;
            const clampedIntensity = Math.max(0, Math.min(255, Math.round(intensity)));
            const idx = (y * width + x) * 4;
            pixelArray[idx] = clampedIntensity;
            pixelArray[idx + 1] = clampedIntensity;
            pixelArray[idx + 2] = clampedIntensity;
            pixelArray[idx + 3] = 255;
        }
    }
    return { data: pixelArray, width, height };
}

export async function reconstructColorPixelData(
    svdDataContainer: ColorSvdData,
    k_value: number,
    width: number,
    height: number
): Promise<RawPixelData> {
    if (!svdDataContainer || !svdDataContainer.r || !svdDataContainer.g || !svdDataContainer.b) {
        throw new Error("reconstructColorPixelData: Invalid input, missing r, g, or b SVD components.");
    }
    const pixelArray = new Uint8ClampedArray(width * height * 4);
    const { r: r_svd, g: g_svd, b: b_svd } = svdDataContainer;
    const k_target = k_value;

    if (k_target <= 0) {
        for (let i = 0; i < pixelArray.length; i += 4) { pixelArray[i + 3] = 255; }
        return { data: pixelArray, width, height };
    }

    const reconstructSingleChannelMatrix = (
        channelName: string,
        channelSvdData: SvdData
    ): number[][] => {
        if (!channelSvdData || !channelSvdData.u || !channelSvdData.s || !channelSvdData.v) {
            throw new Error(`SVD data for channel '${channelName}' is invalid or missing u,s,v.`);
        }
        const { u, s, v: v_T } = channelSvdData;
        const rankP = s.length;

        if (u.length !== height || (rankP > 0 && u[0]?.length !== rankP)) {
            throw new Error(`Dim mismatch U for '${channelName}': expected ${height}x${rankP}, got ${u.length}x${u[0]?.length}.`);
        }
        if ((rankP > 0 && v_T.length !== rankP) || (v_T.length > 0 && v_T[0]?.length !== width)) {
            throw new Error(`Dim mismatch V_T for '${channelName}': expected ${rankP}x${width}, got ${v_T.length}x${v_T[0]?.length}.`);
        }

        const k_for_this_channel = Math.min(k_target, rankP);
        if (k_for_this_channel <= 0) {
            return Array.from({ length: height }, () => Array(width).fill(0));
        }

        const U_k = u.map(row => row.slice(0, k_for_this_channel));
        const S_k_diag_values = s.slice(0, k_for_this_channel);
        const V_T_k = v_T.slice(0, k_for_this_channel);
        const U_k_S_k = U_k.map(u_row => u_row.map((u_val, col_idx) => u_val * S_k_diag_values[col_idx]));
        const channelMatrix = multiplyMatrices(U_k_S_k, V_T_k);

        if (channelMatrix.length !== height || (channelMatrix.length > 0 && channelMatrix[0]?.length !== width)) {
            throw new Error(`Reconstructed matrix for channel ${channelName} has incorrect dimensions.`);
        }
        return channelMatrix;
    };

    let Rk_matrix: number[][], Gk_matrix: number[][], Bk_matrix: number[][];
    try {
        Rk_matrix = reconstructSingleChannelMatrix("R", r_svd);
        Gk_matrix = reconstructSingleChannelMatrix("G", g_svd);
        Bk_matrix = reconstructSingleChannelMatrix("B", b_svd);
    } catch (e: any) { console.error("Fatal error during SVD channel matrix reconstruction:", e.message); throw e; }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            pixelArray[i] = Math.max(0, Math.min(255, Math.round(Rk_matrix[y]?.[x] ?? 0)));
            pixelArray[i + 1] = Math.max(0, Math.min(255, Math.round(Gk_matrix[y]?.[x] ?? 0)));
            pixelArray[i + 2] = Math.max(0, Math.min(255, Math.round(Bk_matrix[y]?.[x] ?? 0)));
            pixelArray[i + 3] = 255;
        }
    }
    return { data: pixelArray, width, height };
}


// Optional: multiplyMatrixByDiagonal - not used by above reconstruction, but can be kept if used elsewhere
/*
export function multiplyMatrixByDiagonal(matrix: number[][], diagonal: number[]): number[][] {
    const M = matrix.length;
    if (M === 0) return [];
    const K_matrix_cols = matrix[0]?.length || 0;
    const K_diag_len = diagonal.length;
    const K_eff = Math.min(K_matrix_cols, K_diag_len);

    if (K_matrix_cols !== K_diag_len) {
        console.warn(`multiplyMatrixByDiagonal: Mismatch. Matrix_cols=${K_matrix_cols}, Diag_len=${K_diag_len}. Using K_eff=${K_eff}.`);
    }
    if (K_eff === 0) return matrix.map(row => []);

    const result: number[][] = Array(M);
    for (let i = 0; i < M; i++) {
        result[i] = Array(K_eff);
        for (let j = 0; j < K_eff; j++) {
            const matrixVal = matrix[i]?.[j];
            const diagVal = diagonal[j];
            result[i][j] = (typeof matrixVal === 'number' ? matrixVal : 0) * (typeof diagVal === 'number' ? diagVal : 0);
        }
    }
    return result;
}
*/

// --- Older Canvas-based functions ---
// These are different from the PixelData functions. Keep if explicitly needed.
/*
export async function reconstructColorImage_returnsImageData(
    svdData: ColorSvdData, k_value: number, width: number, height: number
): Promise<ImageData> { ... as previously refined ... }

export async function reconstructImage_returnsDataURL( // Renamed for clarity
    svdData: SvdData, k_value: number, width: number, height: number
): Promise<string> { ... logic from your reconstructImage, ensure svdData.v is V_T ... }

export async function reconstructColor_returnsDataURL( // Renamed for clarity
    svdData: ColorSvdData, k_value: number, width: number, height: number
): Promise<string> { ... logic from your reconstructColor, ensure svdData.r.v etc. are V_T ... }
*/