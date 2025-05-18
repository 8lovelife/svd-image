"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ColorSvdData } from "@/lib/utils";
import { SvdMatrixVisualizerRgb } from "./svd-matrix-visualizer-rgb";

interface SvdMatrixRgbVisualizerProps {
    svdData: ColorSvdData | null;
    usedValues: number; // k
    originalRows: number; // M_orig
    originalCols: number; // N_orig
    maxCellDisplay?: number;
    matrixCellSize?: number;
}

export function SvdMatrixRgbVisualizer({
    svdData,
    usedValues, // k
    originalRows, // M_orig
    originalCols, // N_orig
}: SvdMatrixRgbVisualizerProps) {
    const [activeVisualizerChannel, setActiveVisualizerChannel] = useState<'R' | 'G' | 'B'>('R');

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

    return (
        <div>
            <div className="my-4 flex justify-center gap-2">
                {(['R', 'G', 'B'] as const).map(channel => (
                    <Button
                        key={channel}
                        variant={activeVisualizerChannel === channel ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveVisualizerChannel(channel)}
                        disabled={isChannelDataMissing(channel)}
                    >
                        {channel} Channel
                    </Button>
                ))}
            </div>

            <SvdMatrixVisualizerRgb
                svdData={svdData}
                // activeChannel={activeVisualizerChannel}
                usedValues={usedValues}
                originalRows={originalRows}
                originalCols={originalCols}
            />
        </div>
    );
}