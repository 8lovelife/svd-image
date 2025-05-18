"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";

import { MatrixGridDisplay } from "./matrix-grid-display";
import { multiplyMatrices, multiplyMatrixByDiagonal } from "@/lib/svd";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ColorSvdData, SvdData } from "@/lib/utils";
import { Button } from "./ui/button";

interface SvdMatrixVisualizerRgbProps {
    svdData: ColorSvdData | null; // Changed prop name for clarity
    usedValues: number; // k
    originalRows: number; // M_orig (of a single channel matrix)
    originalCols: number; // N_orig (of a single channel matrix)
    maxCellDisplay?: number;
    matrixCellSize?: number;
}

// Helper functions (sliceMatrix, createSMatrixDynamic) remain the same
function sliceMatrix(matrix: number[][], numRows: number, numCols: number): number[][] {
    if (!matrix || matrix.length === 0) return [];
    return matrix.slice(0, numRows).map(row => {
        if (!row) return [];
        return row.slice(0, numCols);
    });
}

function createSMatrixDynamic(sValues: number[], k: number): number[][] {
    const S_matrix: number[][] = Array(k).fill(null).map(() => Array(k).fill(0));
    for (let i = 0; i < Math.min(sValues.length, k); i++) {
        if (S_matrix[i]) { // Check if row exists
            S_matrix[i][i] = sValues[i];
        }
    }
    return S_matrix;
}


export function SvdMatrixVisualizerRgb({
    svdData,
    usedValues,
    originalRows,
    originalCols,
    maxCellDisplay = 15,
    matrixCellSize = 14,
}: SvdMatrixVisualizerRgbProps) {

    const [activeChannel, setActiveVisualizerChannel] = useState<'R' | 'G' | 'B'>('R');

    if (!svdData) {
        return (
            <div className="text-center text-muted-foreground p-4">
                Waiting for Color SVD data...
            </div>
        );
    }

    const isChannelDataMissing = (channel: 'R' | 'G' | 'B') => {
        const key = channel.toLowerCase() as 'r' | 'g' | 'b';
        return !svdData[key] ||
            !svdData[key]?.u ||
            !svdData[key]?.s ||
            !svdData[key]?.v;
    };

    if (isChannelDataMissing('R') && isChannelDataMissing('G') && isChannelDataMissing('B')) {
        return (
            <div className="text-center text-muted-foreground p-4">
                Color SVD data is incomplete or unavailable.
            </div>
        );
    }

    const containerRef = useRef<HTMLDivElement>(null);
    // const [width, height] = useMeasure(); // from react-use, applied to containerRef
    // OR a more manual ResizeObserver setup:
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                setContainerWidth(entries[0].contentRect.width);
            }
        });
        observer.observe(element);
        return () => observer.unobserve(element);
    }, []);


    // Dynamically calculate cellSize and maxDisplay based on containerWidth
    const dynamicParams = useMemo(() => {
        if (!containerWidth) return { cellSize: matrixCellSize, maxDisplay: maxCellDisplay }; // Default values

        const numMatricesAndSymbols = 5; // Ak, symbol, U, symbol, S, symbol, VT (approx)
        const availableSpacePerMatrixRoughly = containerWidth / numMatricesAndSymbols;

        let newCellSize = matrixCellSize;
        let newMaxDisplay = maxCellDisplay;

        // Heuristic: Try to fit maxDisplay cells first
        if (availableSpacePerMatrixRoughly < newMaxDisplay * (newCellSize + 2)) { // +2 for padding/border per cell
            // Not enough space for 10 cells at default size, reduce maxDisplay
            newMaxDisplay = Math.max(3, Math.floor(availableSpacePerMatrixRoughly / (newCellSize + 2)));
        }

        // If still not enough, or if we want to make cells smaller for more to fit
        if (availableSpacePerMatrixRoughly < newMaxDisplay * (newCellSize + 2)) {
            newCellSize = Math.max(8, Math.floor(availableSpacePerMatrixRoughly / newMaxDisplay) - 2);
        }
        // Cap cell size
        newCellSize = Math.min(14, newCellSize);


        // console.log("Container Width:", containerWidth, "New Cell Size:", newCellSize, "New Max Display:", newMaxDisplay);
        return { cellSize: newCellSize, maxDisplay: newMaxDisplay };

    }, [containerWidth]);

    // 1. Get SVD data for the currently active channel
    const currentChannelSvdData = useMemo((): SvdData | null => {
        if (!svdData) return null;
        switch (activeChannel) {
            case 'R': return svdData.r;
            case 'G': return svdData.g;
            case 'B': return svdData.b;
            default: return null;
        }
    }, [svdData, activeChannel]);

    if (!currentChannelSvdData || !currentChannelSvdData.s || !currentChannelSvdData.u || !currentChannelSvdData.v ||
        currentChannelSvdData.u.length === 0 || currentChannelSvdData.v.length === 0) {
        return <p className="text-muted-foreground text-sm p-4 text-center">SVD data for {activeChannel} channel incomplete or invalid.</p>;
    }

    // Now use currentChannelSvdData for all calculations
    const { u: full_u, s: full_s, v: full_vt } = currentChannelSvdData;

    const k = Math.max(1, Math.min(usedValues, full_s.length));
    const K_full_rank_potential = full_s.length;

    // M_actual and N_actual are for the single channel matrix
    const M_actual = originalRows > 0 ? originalRows : full_u.length;
    const N_actual = originalCols > 0 ? originalCols : (full_vt[0]?.length || 0);

    // --- Calculations based on currentChannelSvdData and k ---
    const U_k = useMemo(() => sliceMatrix(full_u, M_actual, k), [full_u, M_actual, k]);
    const S_k_array = useMemo(() => full_s.slice(0, k), [full_s, k]);
    const S_k_matrix = useMemo(() => createSMatrixDynamic(S_k_array, k), [S_k_array, k]);
    const VT_k = useMemo(() => sliceMatrix(full_vt, k, N_actual), [full_vt, k, N_actual]);

    const Ak_reconstructed = useMemo(() => {
        if (U_k.length === 0 || U_k[0]?.length === 0 || S_k_array.length === 0 || VT_k.length === 0 || VT_k[0]?.length === 0) {
            return [];
        }
        // Ensure multiplyMatrixByDiagonal can handle potentially empty U_k[0] if M_actual is 0
        const USk = (U_k[0]?.length > 0 && S_k_array.length > 0) ? multiplyMatrixByDiagonal(U_k, S_k_array) : [];
        if (USk.length === 0 || USk[0]?.length === 0 || VT_k[0]?.length === 0) return [];
        try {
            return multiplyMatrices(USk, VT_k);
        } catch (e) {
            console.error(`Error reconstructing Ak for channel ${activeChannel}:`, e); return [];
        }
    }, [U_k, S_k_array, VT_k, activeChannel]);

    // --- Titles including active channel ---
    const channelLabel = activeChannel; // Or use COLORS[activeChannel].label if you have a COLORS map
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
        <div className="pt-4 w-full" ref={containerRef}> {/* Attach ref here or to the inner flex container */}
            <ScrollArea className="w-full whitespace-nowrap rounded-md">
                <div className="flex justify-center">
                    <div className="flex items-center gap-x-1 p-2">
                        <MatrixGridDisplay matrix={Ak_reconstructed} title={`Aₖ ${ak_dims_title}`} maxDisplaySize={dynamicParams.maxDisplay} cellSizePx={dynamicParams.cellSize} />
                        <MathSymbol>≈</MathSymbol>
                        <MatrixGridDisplay matrix={U_k} title={`Uₖ ${u_k_dims_title}`} maxDisplaySize={dynamicParams.maxDisplay} cellSizePx={dynamicParams.cellSize} />
                        <MathSymbol>·</MathSymbol>
                        <MatrixGridDisplay matrix={S_k_matrix} title={`Sₖ ${s_k_dims_title} (Diag.)`} maxDisplaySize={dynamicParams.maxDisplay} cellSizePx={dynamicParams.cellSize} highlightActiveFn={(r, c) => r === c} />
                        <MathSymbol>·</MathSymbol>
                        <MatrixGridDisplay matrix={VT_k} title={`Vᵀₖ ${vt_k_dims_title}`} maxDisplaySize={dynamicParams.maxDisplay} cellSizePx={dynamicParams.cellSize} />
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

            <div className="my-4 flex flex-wrap justify-center gap-4">
                {(['R', 'G', 'B'] as const).map(channel => {
                    return (
                        <div key={channel} className="flex items-center">
                            <Button
                                variant={activeChannel === channel ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActiveVisualizerChannel(channel)}
                                disabled={isChannelDataMissing(channel)}
                                className={`w-5 h-5 p-0 rounded-full ${activeChannel === channel ? 'ring-2 ring-gray-400' : ''}`}
                                style={{ backgroundColor: channel === 'R' ? '#ef4444' : channel === 'G' ? '#22c55e' : '#3b82f6' }}
                            >
                            </Button>
                            <span className="ml-1 text-xs">{channel}</span>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}