// components/matrix-grid-display.tsx (mostly the same, just ensuring props are clear)
"use client"
import React from "react";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
// Assuming MatrixCell is defined and imported if you use it, or render simply.
// For this example, let's simplify rendering directly in MatrixGridDisplay to reduce dependencies.

function mapValueToGrayscaleIntensity(value: number, min: number, max: number): number {
    if (max === min) return 128; // Mid-gray if all values are the same
    const normalized = (value - min) / (max - min);
    return Math.max(0, Math.min(255, Math.floor(normalized * 255)));
}

interface MatrixGridDisplayProps {
    matrix: number[][]; // The actual data chunk to render
    title: string;      // Will now include the dimensions of the *displayed chunk*
    // fullRows: number; // No longer needed here, context provided by parent
    // fullCols: number; // No longer needed here
    maxDisplaySize?: number; // This prop now controls how much of the *passed matrix* is shown
    cellSizePx?: number;
    minCellValue?: number;
    maxCellValue?: number;
    highlightActiveFn?: (rowIndex: number, colIndex: number) => boolean;
}

export const MatrixGridDisplay: React.FC<MatrixGridDisplayProps> = ({
    matrix,
    title, // Expects title like "U (displayRows x displayCols)"
    maxDisplaySize = 10,
    cellSizePx = 16, // Changed default for a bit more space
    minCellValue,
    maxCellValue,
    highlightActiveFn,
}) => {
    if (!matrix || matrix.length === 0 || matrix[0]?.length === 0) {
        return <div className="text-muted-foreground p-2 text-xs text-center">{title}: No data to display</div>;
    }

    // The passed 'matrix' is already the slice we want to try and display.
    // maxDisplaySize will further cap its visual rendering if matrix is still larger.
    const actualRowsInPassedMatrix = matrix.length;
    const actualColsInPassedMatrix = matrix[0].length;

    const displayRows = Math.min(actualRowsInPassedMatrix, maxDisplaySize);
    const displayCols = Math.min(actualColsInPassedMatrix, maxDisplaySize);

    // Min/max for color scaling only on the visible part of the passed matrix
    let FminVal = minCellValue;
    let FmaxVal = maxCellValue;

    if (FminVal === undefined || FmaxVal === undefined) {
        let min = Infinity;
        let max = -Infinity;
        // Iterate over the potentially visible part for scaling
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


    const valueFormatter = (value: number): string => {
        if (value === 0) return "0"; if (isNaN(value)) return "";
        if (Math.abs(value) >= 1000) return `${(value / 1000).toPrecision(3)}K`;
        const absVal = Math.abs(value);
        if (absVal < 1 && absVal > 0) return value.toPrecision(2);
        if (absVal < 10) return value.toPrecision(3);
        return value.toPrecision(4);
    };


    return (
        <div className="flex flex-col items-center">
            <p className="text-xs font-medium mb-1 text-center whitespace-nowrap">
                {title} {/* Title now directly passed with dimensions */}
                {(displayRows < actualRowsInPassedMatrix || displayCols < actualColsInPassedMatrix) &&
                    <span className="block text-muted-foreground text-[10px]">(showing {displayRows}×{displayCols})</span>
                }
            </p>
            <ScrollArea className="border rounded-md w-auto max-w-full">
                <div
                    className="grid bg-background"
                    style={{
                        gridTemplateColumns: `repeat(${displayCols}, ${cellSizePx}px)`,
                        gridTemplateRows: `repeat(${displayRows}, ${cellSizePx}px)`,
                    }}
                >
                    {Array.from({ length: displayRows }).map((_, rowIndex) =>
                        Array.from({ length: displayCols }).map((_, colIndex) => {
                            const value = matrix[rowIndex]?.[colIndex] ?? 0;
                            const intensity = mapValueToGrayscaleIntensity(value, FminVal!, FmaxVal!);
                            const bgColor = `rgb(${intensity}, ${intensity}, ${intensity})`;
                            const isHighlighted = highlightActiveFn ? highlightActiveFn(rowIndex, colIndex) : false; // Highlight still uses original k
                            return (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={`flex items-center justify-center border border-border/20 overflow-hidden ${isHighlighted ? "ring-1 ring-primary ring-inset" : ""}`}
                                    style={{ backgroundColor: bgColor, width: `${cellSizePx}px`, height: `${cellSizePx}px` }}
                                    title={`(${rowIndex},${colIndex}): ${valueFormatter(value)}`}
                                />
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