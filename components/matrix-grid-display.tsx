// components/matrix-grid-display.tsx (mostly the same, just ensuring props are clear)
"use client"
import React from "react";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
// Assuming MatrixCell is defined and imported if you use it, or render simply.
// For this example, let's simplify rendering directly in MatrixGridDisplay to reduce dependencies.

interface MatrixGridDisplayProps {
    matrix: number[][];
    title: string;
    fullRows: number; // Actual full rows of the matrix
    fullCols: number; // Actual full columns of the matrix
    maxDisplaySize?: number; // Max rows/cols to visually render in the grid
    cellSizePx?: number;     // Size of each cell in pixels
    minCellValue?: number;   // Min value for color scaling (optional, calculated if not provided)
    maxCellValue?: number;   // Max value for color scaling (optional, calculated if not provided)
    highlightActiveFn?: (rowIndex: number, colIndex: number) => boolean; // Function to determine if cell should be highlighted
}

function mapValueToGrayscaleIntensity(value: number, min: number, max: number): number {
    if (max === min) return 128;
    const normalized = (value - min) / (max - min);
    return Math.max(0, Math.min(255, Math.floor(normalized * 255)));
}

export const MatrixGridDisplay: React.FC<MatrixGridDisplayProps> = ({
    matrix,
    title,
    fullRows,
    fullCols,
    maxDisplaySize = 10, // Max cells to show in each dimension
    cellSizePx = 20,      // Default cell size (padding included in this logic now)
    minCellValue,
    maxCellValue,
    highlightActiveFn,
}) => {
    if (!matrix || matrix.length === 0 || matrix[0]?.length === 0) {
        return <div className="text-muted-foreground p-2 text-xs">{title}: No data</div>;
    }

    const displayRows = Math.min(fullRows, matrix.length, maxDisplaySize);
    const displayCols = Math.min(fullCols, matrix[0]?.length, maxDisplaySize);

    let FminVal = minCellValue;
    let FmaxVal = maxCellValue;

    if (FminVal === undefined || FmaxVal === undefined) {
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < displayRows; i++) {
            for (let j = 0; j < displayCols; j++) {
                const val = matrix[i]?.[j] ?? 0;
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }
        FminVal = min === Infinity ? 0 : min;
        FmaxVal = max === -Infinity ? 1 : max;
    }


    return (
        <div className="flex flex-col items-center">
            <p className="text-xs font-medium mb-1 text-center">
                {title} ({fullRows}×{fullCols})<br />
                {(displayRows < fullRows || displayCols < fullCols) && `(showing ${displayRows}×${displayCols})`}
            </p>
            <ScrollArea className="border rounded-md w-auto max-w-full"> {/* Ensures scrollbars appear if content overflows */}
                <div
                    className="grid bg-background" // Added bg-background for better border visibility
                    style={{
                        gridTemplateColumns: `repeat(${displayCols}, ${cellSizePx}px)`,
                        gridTemplateRows: `repeat(${displayRows}, ${cellSizePx}px)`,
                        // gap: '1px', // If you want explicit gaps, cell size needs to be adjusted
                    }}
                >
                    {Array.from({ length: displayRows }).map((_, rowIndex) =>
                        Array.from({ length: displayCols }).map((_, colIndex) => {
                            const value = matrix[rowIndex]?.[colIndex] ?? 0; // Default to 0 if out of bounds
                            const intensity = mapValueToGrayscaleIntensity(value, FminVal!, FmaxVal!);
                            const bgColor = `rgb(${intensity}, ${intensity}, ${intensity})`;
                            const isHighlighted = highlightActiveFn ? highlightActiveFn(rowIndex, colIndex) : false;
                            const intensityNormalized = (FmaxVal! - FminVal!) === 0 ? 0.5 : (value - FminVal!) / (FmaxVal! - FminVal!);
                            const textColor = intensityNormalized > 0.6 ? 'text-black' : 'text-white';

                            return (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={`flex items-center justify-center border border-border/20 overflow-hidden ${isHighlighted ? "ring-1 ring-primary ring-inset" : ""}`}
                                    style={{
                                        backgroundColor: bgColor,
                                        width: `${cellSizePx}px`,
                                        height: `${cellSizePx}px`,
                                    }}
                                    title={`(${rowIndex},${colIndex}): ${value.toPrecision(3)}`}
                                >
                                    {/* Optionally show value if needed, but usually too small */}
                                    {/* <span className={`text-[8px] ${textColor}`}>{value.toFixed(1)}</span> */}
                                </div>
                            );
                        })
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
                {displayRows > 5 && <ScrollBar orientation="vertical" />}
            </ScrollArea>
        </div>
    );
};