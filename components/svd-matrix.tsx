// components/svd-matrix-visualizer.tsx
"use client"
import React, { useMemo } from "react";
import { SvdData } from "@/lib/utils";
import { MatrixGridDisplay } from "./matrix-grid-display"; // Assuming this is set up
// Removed Card imports from here

interface SvdMatrixVisualizerProps {
    svdData: SvdData | null;
    usedValues: number; // This is 'k' for truncation
    originalRows: number; // M of original A
    originalCols: number; // N of original A
    // matrixName is removed, as titles are now more dynamic
    maxCellDisplay?: number;
    matrixCellSize?: number;
}

// Helper to slice a 2D matrix
function sliceMatrix(matrix: number[][], numRows: number, numCols: number): number[][] {
    if (!matrix) return [];
    return matrix.slice(0, numRows).map(row => row.slice(0, numCols));
}

// Helper to create the S matrix (diagonal), now k x k
function createSMatrixDynamic(sValues: number[], k: number): number[][] {
    const S_matrix: number[][] = Array(k).fill(null).map(() => Array(k).fill(0));
    for (let i = 0; i < Math.min(sValues.length, k); i++) {
        S_matrix[i][i] = sValues[i];
    }
    return S_matrix;
}

export function SvdMatrixVisualizer({
    svdData,
    usedValues, // This is 'k'
    originalRows, // M_orig
    originalCols, // N_orig
    maxCellDisplay = 10,
    matrixCellSize = 18, // Adjusted cell size
}: SvdMatrixVisualizerProps) {

    if (!svdData || !svdData.s || !svdData.u || !svdData.v) {
        return <p className="text-muted-foreground text-sm p-4 text-center">SVD matrix data incomplete.</p>;
    }

    const { u: full_u, s: full_s, v: full_vt } = svdData; // Assuming v is V^T

    // k is the number of singular values to USE for display
    const k = Math.max(1, Math.min(usedValues, full_s.length)); // Ensure k is valid

    // Full dimensions (potential, before truncation by k)
    const M_full = full_u.length;
    const K_full_rank_potential = full_s.length; // Max possible rank
    const N_full = full_vt[0]?.length || 0; // Columns of V^T = original N


    // --- Prepare matrices based on k (usedValues) ---
    const U_k = useMemo(() => sliceMatrix(full_u, M_full, k), [full_u, M_full, k]);
    const S_k_array = useMemo(() => full_s.slice(0, k), [full_s, k]);
    const S_k_matrix = useMemo(() => createSMatrixDynamic(S_k_array, k), [S_k_array, k]);
    // V^T_k : take first k rows from full V^T
    const VT_k = useMemo(() => sliceMatrix(full_vt, k, N_full), [full_vt, k, N_full]);

    // Dimensions of the k-truncated matrices for display titles
    const u_k_dims = { rows: U_k.length, cols: U_k[0]?.length || 0 };
    const s_k_dims = { rows: S_k_matrix.length, cols: S_k_matrix[0]?.length || 0 };
    const vt_k_dims = { rows: VT_k.length, cols: VT_k[0]?.length || 0 };

    return (
        <div className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start mt-2">
                <MatrixGridDisplay
                    matrix={U_k}
                    title={`U (${u_k_dims.rows}×${u_k_dims.cols})`}
                    maxDisplaySize={maxCellDisplay}
                    cellSizePx={matrixCellSize}
                // Highlight for U is based on columns up to k, but U_k is already k columns.
                // So, all columns are "active" in this context. No special highlight needed here for usedValues effect.
                // If you want to show a fixed number of columns (e.g., K_full_rank_potential) and highlight first k:
                // highlightActiveFn={(_, colIndex) => colIndex < k}
                />
                <MatrixGridDisplay
                    matrix={S_k_matrix}
                    title={`S (${s_k_dims.rows}×${s_k_dims.cols}) Diagonal`}
                    maxDisplaySize={maxCellDisplay}
                    cellSizePx={matrixCellSize}
                    // All displayed diagonal elements are "active" as S_k_matrix is k x k
                    highlightActiveFn={(rowIndex, colIndex) => rowIndex === colIndex} // Highlight all diagonal
                />
                <MatrixGridDisplay
                    matrix={VT_k}
                    title={`Vᵀ (${vt_k_dims.rows}×${vt_k_dims.cols})`}
                    maxDisplaySize={maxCellDisplay}
                    cellSizePx={matrixCellSize}
                // Highlight for V^T is based on rows up to k, but VT_k is already k rows.
                // All rows are "active". No special highlight needed here for usedValues effect.
                // If showing more rows than k and highlighting first k:
                // highlightActiveFn={(rowIndex, _) => rowIndex < k}
                />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4 mb-2 leading-relaxed">
                Approximation: A<sub>{originalRows}×{originalCols}</sub> ≈
                U<sub>{u_k_dims.rows}×{u_k_dims.cols}</sub> ·
                S<sub>{s_k_dims.rows}×{s_k_dims.cols}</sub> ·
                V<sup>T</sup><sub>{vt_k_dims.rows}×{vt_k_dims.cols}</sub>
                <br />
                Using k = {k} of {K_full_rank_potential} available singular values.
            </p>
        </div>
    );
}