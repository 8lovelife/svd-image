"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ImageUpload from "@/components/image-upload"
import ImageDisplay from "@/components/image-display"
import SvdSlider from "@/components/svd-slider"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColorSvdData, ImageDataState, SvdData } from "@/lib/utils"
import InteractiveImageDisplay from "@/components/interactive-image-display"
import { performSVD } from "@/lib/svd"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import SvdAnalysis from "@/components/svd-analysis"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import ImageSelectionPanel from "@/components/image-selection-panel"


export default function Home() {
    const [imageData, setImageData] = useState<ImageDataState>()
    const [reconstructedImage, setReconstructedImage] = useState<string | null>(null)
    const [singularValuesUsed, setSingularValuesUsed] = useState<number>(0)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [activeTab, setActiveTab] = useState<string>("visualization")
    const [graySvd, setGraySvd] = useState<SvdData | null>(null);
    const [useColor, setUseColor] = useState<boolean>(true)


    // when user toggles off color, compute grayscale once
    useEffect(() => {
        if (!useColor && graySvd === null && imageData?.rawImageData) {
            console.log("Computing grayscale SVD " + useColor)
            setIsProcessing(true)
            performSVD(imageData.rawImageData)
                .then(g => setGraySvd(g))
                .finally(() => setIsProcessing(false))
        }
    }, [useColor, graySvd])

    // 1. Calculate totalPixels
    const totalPixels = useMemo(() => {
        if (imageData?.width && imageData?.height) {
            return imageData.width * imageData.height;
        }
        return 0;
    }, [imageData?.width, imageData?.height]);


    // 2. Calculate maxKForCurrentMode (Maximum possible singular values for the current mode)
    const maxKForCurrentMode = useMemo(() => {
        if (useColor && imageData?.svdData?.r?.s) {
            // For color, all channels (r, g, b) should have the same number of singular values
            return imageData.svdData.r.s.length;
        } else if (!useColor && graySvd?.s) {
            return graySvd.s.length;
        }
        return 0;
    }, [useColor, imageData?.svdData, graySvd]);


    // 3. Calculate compressionRatioForCurrentK
    const compressionRatioForCurrentK = useMemo(() => {
        if (!imageData || singularValuesUsed <= 0 || maxKForCurrentMode === 0) {
            return 0; // Or indicate N/A
        }

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

    }, [imageData, singularValuesUsed, useColor, maxKForCurrentMode]);




    return (
        <div className="h-screen w-full p-2">
            <ResizablePanelGroup direction="horizontal" className="flex h-full w-full rounded-lg border"
            >
                {/* Left Panel - Controls */}
                <ResizablePanel defaultSize={15} minSize={15} maxSize={20}>
                    <ImageSelectionPanel onImageLoaded={(imageData, rawImageData, width, height, svdData) => {
                        if (svdData) {
                            setImageData({
                                originalImage: imageData,
                                rawImageData,
                                width,
                                height,
                                svdData,
                            })
                            setSingularValuesUsed(svdData.r.s.length)
                        }
                        imageData && setGraySvd(null)
                    }}
                        isLoading={isProcessing}
                        setIsProcessing={setIsProcessing}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Middle Panel - Original Image */}
                <ResizablePanel defaultSize={15} minSize={25} maxSize={35}>
                    {/* <div className="h-full overflow-auto"> */}
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
                                    isLoadingSvd={isProcessing}
                                    singularValuesUsed={singularValuesUsed}
                                    setSingularValuesUsed={setSingularValuesUsed}
                                    useColor={useColor}
                                    setUseColor={setUseColor}
                                />
                            </div>

                            {imageData && ( // Only show info if there's image data
                                <div className="mt-auto pt-4 border-t border-border flex-shrink-0 text-xs"> {/* mt-auto pushes to bottom if space */}
                                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Image & SVD Details:</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5"> {/* Increased gap-y */}
                                        <div><span className="font-medium">Dimensions:</span></div>
                                        <div>{imageData.width} × {imageData.height} px</div>

                                        <div><span className="font-medium">Total Pixels:</span></div>
                                        <div>{totalPixels.toLocaleString()}</div>

                                        <div><span className="font-medium">Mode:</span></div>
                                        <div>{useColor ? "Color (RGB)" : "Grayscale"}</div>

                                        <div><span className="font-medium">Singular Values (k):</span></div>
                                        <div>
                                            {singularValuesUsed} / {maxKForCurrentMode > 0 ? maxKForCurrentMode : "-"}
                                        </div>

                                        <div><span className="font-medium">Compression Ratio:</span></div>
                                        <div>
                                            {compressionRatioForCurrentK > 0 ? `${compressionRatioForCurrentK.toFixed(1)}x` : (singularValuesUsed > 0 ? "Calculating..." : "N/A")}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    {/* </div> */}
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel - Data Analysis */}
                <ResizablePanel defaultSize={30} minSize={35}>
                    <SvdAnalysis
                        svdData={
                            useColor
                                ? { color: imageData?.svdData }
                                : { grayscale: graySvd }
                        }
                        usedValues={singularValuesUsed}
                        useColor={useColor}
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}