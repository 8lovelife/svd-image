// components/svd-matrix-visualizer.tsx
"use client"
import React from "react";
import { SvdData } from "@/lib/utils";
import { MatrixGridDisplay } from "./matrix-grid-display"; // Assuming this is set up
// Removed Card imports from here

interface SvdMatrixVisualizerProps {
    svdData: SvdData | null;
    usedValues: number;
    originalRows: number;
    originalCols: number;
    matrixName?: string; // This will now be more like a sub-heading if used
    // Props to pass down to MatrixGridDisplay, or set defaults here
    maxCellDisplay?: number;
    matrixCellSize?: number;
}

function createSMatrixForDisplay(sValues: number[], kActive: number, displaySize: number): number[][] {
    const S_matrix: number[][] = Array(displaySize).fill(null).map(() => Array(displaySize).fill(0));
    for (let i = 0; i < Math.min(sValues.length, displaySize); i++) {
        S_matrix[i][i] = sValues[i];
    }
    return S_matrix;
}

export function SvdMatrixVisualizer({
    svdData,
    usedValues,
    originalRows,
    originalCols,
    matrixName, // No longer used for CardTitle here
    maxCellDisplay = 10,
    matrixCellSize = 16,
}: SvdMatrixVisualizerProps) {

    if (!svdData || !svdData.s || !svdData.u || !svdData.v) {
        // Render a simple placeholder if used standalone and data is missing
        return <p className="text-muted-foreground text-sm p-4">SVD matrix data incomplete.</p>;
    }

    const { u, s, v } = svdData;

    const kActual = s.length;
    const M = u.length;
    const K_u_cols = u[0]?.length || 0;
    const K_vt_rows = v.length;
    const N_vt_cols = v[0]?.length || 0;

    return (
        <div className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start mt-2">
                <MatrixGridDisplay
                    matrix={u}
                    title={`U (${M}×${K_u_cols})`}
                    fullRows={M}
                    fullCols={K_u_cols}
                    maxDisplaySize={maxCellDisplay}
                    cellSizePx={matrixCellSize}
                    highlightActiveFn={(_, colIndex) => colIndex < usedValues}
                />
                <MatrixGridDisplay
                    matrix={createSMatrixForDisplay(s, kActual, Math.min(kActual, maxCellDisplay))}
                    title={`S (Diagonal ${kActual}×${kActual})`}
                    fullRows={kActual}
                    fullCols={kActual}
                    maxDisplaySize={maxCellDisplay}
                    cellSizePx={matrixCellSize}
                    highlightActiveFn={(rowIndex, colIndex) => rowIndex === colIndex && rowIndex < usedValues}
                />
                <MatrixGridDisplay
                    matrix={v}
                    title={`Vᵀ (${K_vt_rows}×${N_vt_cols})`}
                    fullRows={K_vt_rows}
                    fullCols={N_vt_cols}
                    maxDisplaySize={maxCellDisplay}
                    cellSizePx={matrixCellSize}
                    highlightActiveFn={(rowIndex, _) => rowIndex < usedValues}
                />
            </div>
            <br />
            <p className="text-xs text-muted-foreground text-center mb-4">
                A ({originalRows}×{originalCols}) ≈ U ({M}×{K_u_cols}) · S ({K_u_cols}×{K_vt_rows}) · Vᵀ ({K_vt_rows}×{N_vt_cols})
                <br />
                Using k = {usedValues} of {kActual} singular values.
            </p>
        </div>
    );
}