"use client"

import { AppSvdData, ColorSvdData, SvdData } from "@/lib/utils";
import { SingularValuesAreaChartGrayscale } from "./singular-values-areachart-grayscale";
import { SingularValuesAreaChartRGB } from "./singular-values-areachart-rgb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"; // shadcn/ui Card
import { SvdMatrixVisualizer } from "./svd-matrix";
import App from "next/app";

interface SvdAnalysisProps {
    svdData: AppSvdData | null; // SVD data for color or grayscale
    usedValues: number;
    useColor: boolean;
    // originalImageWidth: number;
    // originalImageHeight: number;
}

export default function SvdAnalysis({
    svdData,
    usedValues,
    useColor,
    // originalImageWidth,
    // originalImageHeight,
}: SvdAnalysisProps) {
    // The SvdAnalysis component now IS the Card that fills the space.
    // The h-full and flex properties allow it to expand.
    // The CardContent will handle internal scrolling.

    let originalImageWidth = svdData?.rawImageData.width || 0;
    let originalImageHeight = svdData?.rawImageData.height || 0;
    return (
        <Card className="h-full flex flex-col overflow-hidden"> {/* CARD IS NOW THE ROOT, FILLS PARENT */}
            <CardHeader className="flex-shrink-0"> {/* Header doesn't grow/shrink */}
                <CardTitle>SVD Data Analysis</CardTitle>
                <CardDescription>
                    Visualize and explore the singular‐value spectrum, compression ratio, and reconstruction quality.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"> {/* CONTENT IS SCROLLABLE AND EXPANDS */}
                {/* Section 1: Singular Value Area Chart */}
                <div>
                    {(!svdData || (!svdData.color && !svdData.grayscale)) && (
                        <div className="flex items-center justify-center h-60 text-muted-foreground bg-muted/30 rounded-md">
                            Select an image and process SVD to view analysis.
                        </div>
                    )}
                    {svdData && useColor && svdData.color && (
                        <SingularValuesAreaChartRGB
                            svdData={svdData.color}
                            usedValues={usedValues}
                            maxValuesToPlot={100} // Optional: Limit points for performance/clarity
                        />
                    )}
                    {svdData && !useColor && svdData.grayscale && (
                        <SingularValuesAreaChartGrayscale
                            svdData={svdData.grayscale}
                            usedValues={usedValues}
                        />
                    )}
                    {/* {svdData && (
                        (useColor && !svdData.color && <div className="h-60 flex items-center justify-center text-muted-foreground">Color SVD data not available.</div>) ||
                        (!useColor && !svdData.grayscale && <div className="h-60 flex items-center justify-center text-muted-foreground">Grayscale SVD data not available.</div>)
                    )} */}
                </div>

                {/* Section 2: SVD Matrix Visualizer */}
                {/* Show matrices only if the relevant SVD data for the current mode exists */}
                {useColor && svdData?.color?.r && ( // Example for Red channel if in color mode
                    <SvdMatrixVisualizer
                        svdData={svdData.color.r} // Ensure svdData.color.r is of type SvdData {u,s,v}
                        usedValues={usedValues}
                        originalRows={originalImageHeight}
                        originalCols={originalImageWidth}
                    />
                )}
                {!useColor && svdData?.grayscale && (
                    <SvdMatrixVisualizer
                        svdData={svdData.grayscale}
                        usedValues={usedValues}
                        originalRows={originalImageHeight}
                        originalCols={originalImageWidth}
                    />
                )}
            </CardContent>
        </Card>
    );
}