"use client"
import React, { useMemo } from "react";
import { SvdData } from "@/lib/utils";
import { MatrixGridDisplay } from "./matrix-grid-display";
import { multiplyMatrices, multiplyMatrixByDiagonal } from "@/lib/svd"; // Ensure this path is correct
import { ScrollArea, ScrollBar } // Import Shadcn ScrollArea components
    from "@/components/ui/scroll-area";

interface SvdMatrixVisualizerProps {
    svdData: SvdData | null;
    usedValues: number; // k
    originalRows: number; // M_orig
    originalCols: number; // N_orig
    maxCellDisplay?: number;
    matrixCellSize?: number;
}

function sliceMatrix(matrix: number[][], numRows: number, numCols: number): number[][] {
    if (!matrix || matrix.length === 0) return []; // Handle empty matrix or row
    return matrix.slice(0, numRows).map(row => {
        if (!row) return []; // Handle case where a row might be undefined/null unexpectedly
        return row.slice(0, numCols);
    });
}

function createSMatrixDynamic(sValues: number[], k: number): number[][] {
    const S_matrix: number[][] = Array(k).fill(null).map(() => Array(k).fill(0));
    for (let i = 0; i < Math.min(sValues.length, k); i++) {
        S_matrix[i][i] = sValues[i];
    }
    return S_matrix;
}

export function SvdMatrixVisualizer({
    svdData,
    usedValues, // k
    originalRows, // M_orig
    originalCols, // N_orig
    maxCellDisplay = 10,
    matrixCellSize = 14, // Slightly adjusted for potentially tighter fit
}: SvdMatrixVisualizerProps) {

    if (!svdData || !svdData.s || !svdData.u || !svdData.v || svdData.u.length === 0 || svdData.v.length === 0) {
        return <p className="text-muted-foreground text-sm p-4 text-center">SVD matrix data incomplete or invalid.</p>;
    }

    const { u: full_u, s: full_s, v: full_vt } = svdData;

    const k = Math.max(1, Math.min(usedValues, full_s.length));
    const K_full_rank_potential = full_s.length;

    // If originalRows/Cols not passed, try to infer from full_u and full_vt,
    // but it's better if parent provides them for accuracy of A's dimensions.
    const M_actual = originalRows > 0 ? originalRows : full_u.length;
    const N_actual = originalCols > 0 ? originalCols : (full_vt[0]?.length || 0);

    const U_k = useMemo(() => sliceMatrix(full_u, M_actual, k), [full_u, M_actual, k]);
    const S_k_array = useMemo(() => full_s.slice(0, k), [full_s, k]);
    const S_k_matrix = useMemo(() => createSMatrixDynamic(S_k_array, k), [S_k_array, k]);
    const VT_k = useMemo(() => sliceMatrix(full_vt, k, N_actual), [full_vt, k, N_actual]);

    const Ak_reconstructed = useMemo(() => {
        if (U_k.length === 0 || U_k[0]?.length === 0 || S_k_array.length === 0 || VT_k.length === 0 || VT_k[0]?.length === 0) {
            return [];
        }
        const USk = multiplyMatrixByDiagonal(U_k, S_k_array);
        try {
            return multiplyMatrices(USk, VT_k);
        } catch (e) {
            console.error("Error reconstructing Ak:", e); return [];
        }
    }, [U_k, S_k_array, VT_k]);

    const u_k_dims_title = `(${U_k.length}×${U_k[0]?.length || 0})`;
    const s_k_dims_title = `(${S_k_matrix.length}×${S_k_matrix[0]?.length || 0})`;
    const vt_k_dims_title = `(${VT_k.length}×${VT_k[0]?.length || 0})`;
    const ak_dims_title = Ak_reconstructed.length > 0 ? `(${Ak_reconstructed.length}×${Ak_reconstructed[0]?.length || 0})` : '(N/A)';

    const MathSymbol = ({ children }: { children: React.ReactNode }) => (
        <div className="text-2xl font-mono text-muted-foreground self-center px-2 flex-shrink-0">
            {children}
        </div>
    );

    return (
        <div className="pt-4 w-full">
            <ScrollArea className="w-full whitespace-nowrap rounded-md">
                <div className="flex justify-center"> {/* This centers the 'flex items-center' div if it's narrower */}
                    <div className="flex items-center gap-x-1 p-2"> {/* Content row */}
                        <MatrixGridDisplay matrix={Ak_reconstructed} title={`Aₖ ${ak_dims_title}`} maxDisplaySize={maxCellDisplay} cellSizePx={matrixCellSize} />
                        <MathSymbol>≈</MathSymbol>
                        <MatrixGridDisplay matrix={U_k} title={`Uₖ ${u_k_dims_title}`} maxDisplaySize={maxCellDisplay} cellSizePx={matrixCellSize} />
                        <MathSymbol>·</MathSymbol>
                        <MatrixGridDisplay matrix={S_k_matrix} title={`Sₖ ${s_k_dims_title} (Diag.)`} maxDisplaySize={maxCellDisplay} cellSizePx={matrixCellSize} highlightActiveFn={(r, c) => r === c} />
                        <MathSymbol>·</MathSymbol>
                        <MatrixGridDisplay matrix={VT_k} title={`Vᵀₖ ${vt_k_dims_title}`} maxDisplaySize={maxCellDisplay} cellSizePx={matrixCellSize} />
                    </div>
                </div>
                <ScrollBar orientation="horizontal" className="h-2.5 [&>div]:h-full" />
            </ScrollArea>

            <p className="text-xs text-muted-foreground text-center mt-3 mb-2 leading-relaxed">
                Approximation: A<sub className="text-[0.6em] align-baseline">{M_actual}×{N_actual}</sub>
                <span className="font-mono text-sm mx-1">≈</span>
                U<sub className="text-[0.6em] align-baseline">{u_k_dims_title.replace(/[()]/g, '')}</sub>
                <span className="font-mono text-sm mx-1">·</span>
                S<sub className="text-[0.6em] align-baseline">{s_k_dims_title.replace(/[()]/g, '')}</sub>
                <span className="font-mono text-sm mx-1">·</span>
                V<sup>T</sup><sub className="text-[0.6em] align-baseline">{vt_k_dims_title.replace(/[()]/g, '')}</sub>
                <br />
                Using k = {k} of {K_full_rank_potential} available singular values.
            </p>
        </div>
    );
}