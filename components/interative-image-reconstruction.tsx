"use client"

import React, { useState, useEffect, useMemo } from "react"; // Added useEffect for default sample selection
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AppSvdData, ColorSvdData, ImageDataState, RawPixelData, SvdData } from "@/lib/utils"; // Make sure this path is correct
import ImageUpload from "./image-upload";     // Make sure this path is correct
import { performColorSVD } from "@/lib/svd";    // Make sure this path is correct
import InteractiveImageDisplay from "./interactive-image-display";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"


interface ImageReconstructionProps {
    imageData?: ImageDataState
    isProcessing: boolean
    setProcessSvd: (isProcessing: boolean) => void
    useColor: boolean
    setUseColor: (value: boolean) => void
    setGraySvd: (svdData: SvdData | null) => void
    graySvd: SvdData | null
    singularValuesUsed: number
    setSingularValuesUsed: (value: number) => void
    reconstructColorPixelData: RawPixelData | null
    reconstructGrayPixelData: RawPixelData | null
    initPixelData: RawPixelData | null
    appSvdData?: AppSvdData | null
}


export default function InterativeImageReconstruction({
    imageData,
    isProcessing,
    setProcessSvd,
    useColor,
    setUseColor,
    setGraySvd,
    graySvd,
    singularValuesUsed,
    setSingularValuesUsed,
    reconstructColorPixelData,
    reconstructGrayPixelData,
    initPixelData,
    appSvdData,
}: ImageReconstructionProps) {


    // 1. Calculate totalPixels
    const totalPixels = useMemo(() => {
        const imageData = appSvdData?.rawImageData;
        if (imageData?.width && imageData?.height) {
            return imageData.width * imageData.height;
        }
        return 0;
    }, [appSvdData?.rawImageData]);



    const totalProcessedPixels = appSvdData ? appSvdData.rawImageData.width * appSvdData.rawImageData.height : 0;
    const totalOriginalPixels = imageData ? imageData.width * imageData.height : 0;


    // 2. Calculate maxKForCurrentMode (Maximum possible singular values for the current mode)
    const maxKForCurrentMode = useMemo(() => {
        if (useColor && appSvdData?.color?.r?.s) {
            // For color, all channels (r, g, b) should have the same number of singular values
            return appSvdData?.color?.r?.s.length;
        } else if (!useColor && appSvdData?.grayscale?.s) {
            return appSvdData?.grayscale?.s.length;
        }
        return 0;
    }, [useColor, appSvdData]);


    // 3. Calculate compressionRatioForCurrentK
    const compressionRatioForCurrentK = useMemo(() => {
        if (!appSvdData?.rawImageData || singularValuesUsed <= 0 || maxKForCurrentMode === 0) {
            return 0; // Or indicate N/A
        }
        const imageData = appSvdData.rawImageData;
        const M = imageData.height; // Number of rows
        const N = imageData.width;  // Number of columns
        const k = singularValuesUsed;     // Number of singular values used

        if (M === 0 || N === 0 || k === 0) return 0;

        let originalStorageElements: number;
        let compressedStorageElements: number;

        if (useColor) {
            // Original: M rows, N columns, 3 channels
            originalStorageElements = M * N * 3;
            // Compressed: For each channel, U_k (M*k), S_k (k), V_k^T (k*N)
            // S_k is often stored as a vector of k elements.
            // U_k, V_k^T matrices.
            // Total elements = 3 * (M*k + k + N*k) or 3 * k * (M + N + 1) if storing S_k diagonal
            compressedStorageElements = 3 * (k * M + k * N + k); // M*k + N*k + k elements per channel
            // Or a common approximation: 3 * k * (M + N + 1)
        } else { // Grayscale
            originalStorageElements = M * N;
            compressedStorageElements = k * M + k * N + k; // M*k + N*k + k
            // Or common approximation: k * (M + N + 1)
        }

        if (compressedStorageElements === 0) return 0; // Avoid division by zero

        return originalStorageElements / compressedStorageElements;

    }, [appSvdData?.rawImageData, singularValuesUsed, useColor, maxKForCurrentMode]);


    const getEnergyColorClass = (value: number): string => {
        if (value >= 0.95) return "text-green-600"
        if (value >= 0.8) return "text-yellow-500"
        return "text-red-500"
    }

    const doCumulativeEnergy = (s: number[]): number[] => {
        const squared = s.map(x => x * x);
        const total = squared.reduce((sum, val) => sum + val, 0);
        const cumulative: number[] = [];
        let runningSum = 0;
        for (let i = 0; i < squared.length; i++) {
            runningSum += squared[i];
            cumulative.push(runningSum / total);
        }
        return cumulative;
    };

    const energyCurves = useMemo(() => {
        if (!appSvdData) return null;
        if (useColor && appSvdData.color) {
            const rEnergy = doCumulativeEnergy(appSvdData.color.r.s);
            const gEnergy = doCumulativeEnergy(appSvdData.color.g.s);
            const bEnergy = doCumulativeEnergy(appSvdData.color.b.s);
            return { r: rEnergy, g: gEnergy, b: bEnergy }
        }
        if (!useColor && appSvdData.grayscale) {
            const gray = doCumulativeEnergy(appSvdData.grayscale.s);
            return { gray: gray }
        }
        return null;
    }, [appSvdData, useColor]);

    return (
        <Card className="h-full flex flex-col overflow-hidden"> {/* CARD IS NOW THE ROOT, FILLS PARENT */}
            <CardHeader className="flex-shrink-0"> {/* Header doesn't grow/shrink */}
                <CardTitle>Interactive Image Reconstruction</CardTitle>
                <CardDescription>
                    Adjust singular values (k) to observe changes in image quality and compression.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"> {/* CONTENT IS SCROLLABLE AND EXPANDS */}
                <div className="flex-grow">
                    <InteractiveImageDisplay
                        originalImage={imageData?.originalImage || null}
                        svdData={
                            imageData?.svdData
                                ? (
                                    useColor
                                        ? { color: imageData.svdData }
                                        : { grayscale: graySvd }
                                )
                                : null
                        }
                        width={imageData?.width || 0}
                        height={imageData?.height || 0}
                        isProcessing={isProcessing}
                        singularValuesUsed={singularValuesUsed}
                        setSingularValuesUsed={setSingularValuesUsed}
                        useColor={useColor}
                        setUseColor={setUseColor}
                        imageDataState={imageData}
                        setGraySvd={setGraySvd}
                        setIsProcessing={setProcessSvd}
                        reconstructColorPixelData={reconstructColorPixelData}
                        reconstructGrayPixelData={reconstructGrayPixelData}
                        initPixelData={initPixelData}
                        appSvdData={appSvdData}
                    />
                </div>

                <div className="mt-auto pt-4 border-t border-border flex-shrink-0 text-xs">
                    {/* <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Image & SVD Details:</h4> */}

                    <div className="flex mb-3">
                        <div className="w-1/2 pr-3 border-r border-border">
                            <h5 className="font-medium text-center mb-2 text-primary">Original Image</h5>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                <div className="font-medium">Dimensions:</div>
                                <div>{imageData ? `${imageData.width} × ${imageData.height} px` : "-"}</div>
                                <div className="font-medium">Pixels:</div>
                                <div>{totalOriginalPixels > 0 ? totalOriginalPixels.toLocaleString() : "-"}</div>
                            </div>
                        </div>

                        <div className="w-1/2 pl-3">
                            <h5 className="font-medium text-center mb-2 text-primary">SVD Process</h5>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                <div className="font-medium">Dimensions:</div>
                                <div>{appSvdData && appSvdData.rawImageData.width ?
                                    `${appSvdData.rawImageData.width} × ${appSvdData.rawImageData.height} px` : "-"}</div>
                                <div className="font-medium">Pixels:</div>
                                <div>{totalProcessedPixels > 0 ? totalProcessedPixels.toLocaleString() : "-"}</div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-border pt-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            <div className="font-medium">Mode:</div>
                            <div>{appSvdData ? (useColor ? "Color ( RGB )" : "Grayscale") : "-"}</div>
                            <div className="font-medium">Singular Index (k):</div>
                            <div>{appSvdData ? `${singularValuesUsed} / ${maxKForCurrentMode > 0 ? maxKForCurrentMode : "-"}` : "-"}
                            </div>

                            <div className="font-medium">Singular Value:</div>
                            <div>
                                {appSvdData ? (
                                    useColor && appSvdData.color ? (
                                        <>
                                            <span>
                                                R: {appSvdData.color.r.s[singularValuesUsed - 1].toFixed(2)}
                                            </span>
                                            {" | "}
                                            <span>
                                                G: {appSvdData.color.g.s[singularValuesUsed - 1].toFixed(2)}
                                            </span>
                                            {" | "}
                                            <span>
                                                B: {appSvdData.color.b.s[singularValuesUsed - 1].toFixed(2)}
                                            </span>
                                        </>
                                    ) : appSvdData.grayscale ? (
                                        <span >
                                            {appSvdData.grayscale.s[singularValuesUsed - 1].toFixed(2)}
                                        </span>
                                    ) : (
                                        "-"
                                    )
                                ) : (
                                    "-"
                                )}
                            </div>

                            <div className="font-medium">Cumulative Energy:</div>
                            <div>

                                {/* {energyCurves && (() => {
                                    if (useColor) {
                                        const { r, g, b } = energyCurves as { r: number[]; g: number[]; b: number[] }
                                        return (
                                            <>
                                                <span className={getEnergyColorClass(r[singularValuesUsed - 1])}>
                                                    R: {(r[singularValuesUsed - 1] * 100).toFixed(2)}%
                                                </span>{" "}
                                                <span className={getEnergyColorClass(g[singularValuesUsed - 1])}>
                                                    G: {(g[singularValuesUsed - 1] * 100).toFixed(2)}%
                                                </span>{" "}
                                                <span className={getEnergyColorClass(b[singularValuesUsed - 1])}>
                                                    B: {(b[singularValuesUsed - 1] * 100).toFixed(1)}%
                                                </span>
                                            </>
                                        )
                                    } else {
                                        const { gray } = energyCurves as { gray: number[] }
                                        const val = gray[singularValuesUsed - 1] * 100
                                        return (
                                            <span className={getEnergyColorClass(gray[singularValuesUsed - 1])}>
                                                {val.toFixed(2)}%
                                            </span>
                                        )
                                    }
                                })()
                                
                                } */}

                                {energyCurves ? (
                                    useColor ? (
                                        <>
                                            <span >
                                                R: {((energyCurves as { r: number[] }).r[singularValuesUsed - 1] * 100).toFixed(2)}%
                                            </span>
                                            {" | "}
                                            <span >
                                                G: {((energyCurves as { g: number[] }).g[singularValuesUsed - 1] * 100).toFixed(2)}%
                                            </span>
                                            {" | "}
                                            <span >
                                                B: {((energyCurves as { b: number[] }).b[singularValuesUsed - 1] * 100).toFixed(2)}%
                                            </span>
                                        </>
                                    ) : (
                                        <span >
                                            {((energyCurves as { gray: number[] }).gray[singularValuesUsed - 1] * 100).toFixed(2)}%
                                        </span>
                                    )
                                ) : (
                                    "-"
                                )}


                            </div>

                            <div className="font-medium">Compression Ratio:</div>
                            <div>{appSvdData ? (compressionRatioForCurrentK > 0 ?
                                `${compressionRatioForCurrentK.toFixed(1)}x` : (singularValuesUsed > 0 ? "Calculating..." : "N/A")) : "-"}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}