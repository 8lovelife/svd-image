"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ImageUpload from "@/components/image-upload"
import ImageDisplay from "@/components/image-display"
import SvdSlider from "@/components/svd-slider"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColorSvdData, SvdData } from "@/lib/utils"
import InteractiveImageDisplay from "@/components/interactive-image-display"
import { performSVD } from "@/lib/svd"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import SvdAnalysis from "@/components/svd-analysis"

export default function Home() {
    const [imageData, setImageData] = useState<{
        originalImage: string | null
        rawImageData: ImageData | null
        width: number
        height: number
        svdData: {
            r: SvdData
            g: SvdData
            b: SvdData
        } | null
    }>({
        originalImage: null,
        rawImageData: null,
        width: 0,
        height: 0,
        svdData: null,
    })

    const [reconstructedImage, setReconstructedImage] = useState<string | null>(null)
    const [singularValuesUsed, setSingularValuesUsed] = useState<number>(0)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [activeTab, setActiveTab] = useState<string>("visualization")
    const [graySvd, setGraySvd] = useState<SvdData | null>(null);
    const [useColor, setUseColor] = useState<boolean>(true)

    // when user toggles off color, compute grayscale once
    useEffect(() => {
        if (!useColor && graySvd === null && imageData.rawImageData) {
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
                <ResizablePanel defaultSize={15} minSize={20}>
                    {/* <div className="h-full overflow-auto"> */}
                    <Card className="h-full flex flex-col overflow-hidden"> {/* CARD IS NOW THE ROOT, FILLS PARENT */}
                        <CardHeader className="flex-shrink-0"> {/* Header doesn't grow/shrink */}
                            <CardTitle>SVD Image Dimension Reduction</CardTitle>
                            <CardDescription>
                                Upload an image to analyze with Singular Value Decomposition (SVD) and adjust dimensions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"> {/* CONTENT IS SCROLLABLE AND EXPANDS */}
                            <ImageUpload
                                onImageUploaded={(imageData, rawImageData, width, height, svdData) => {
                                    setImageData({
                                        originalImage: imageData,
                                        rawImageData,
                                        width,
                                        height,
                                        svdData,
                                    })
                                    setSingularValuesUsed(svdData ? svdData.r.s.length : 0)
                                    imageData && setGraySvd(null)
                                }}
                            />
                        </CardContent>

                        {/* // TODO list some photos */}
                    </Card>
                    {/* </div> */}
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Middle Panel - Original Image */}
                <ResizablePanel defaultSize={25} minSize={30}>
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
                                    originalImage={imageData.originalImage}
                                    svdData={
                                        imageData.svdData
                                            ? (
                                                useColor
                                                    ? { color: imageData.svdData }
                                                    : { grayscale: graySvd }
                                            )
                                            : null
                                    }
                                    width={imageData.width}
                                    height={imageData.height}
                                    isLoading={isProcessing}
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
                                ? { color: imageData.svdData }
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

function SingularValueChart({ values, usedValues }: { values: number[]; usedValues: number }) {
    // Simple bar chart visualization of singular values
    const maxValue = Math.max(...values)

    return (
        <div className="flex items-end h-full gap-1">
            {values.map((value, index) => (
                <div key={index} className="relative flex-1" style={{ height: "100%" }}>
                    <div
                        className={`absolute bottom-0 w-full ${index < usedValues ? "bg-primary" : "bg-muted"}`}
                        style={{
                            height: `${(value / maxValue) * 100}%`,
                            minHeight: "1px",
                        }}
                    />
                </div>
            ))}
        </div>
    )
}

function SingularValueRGBChart({ values, usedValues }: { values: ColorSvdData; usedValues: number }) {
    // Simple bar chart visualization of singular values
    const valuesR = values.r.s;
    const maxValue = Math.max(...valuesR)

    return (
        <div className="flex items-end h-full gap-1">
            {valuesR.map((value, index) => (
                <div
                    key={index}
                    className={`p-1 border rounded ${index < usedValues ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}
                >
                    <div className="font-medium">S{index + 1}</div>
                    <div className="flex flex-col">
                        <div className="text-red-600">R: {value.toFixed(1)}</div>
                        <div className="text-green-600">G: {values.g.s[index].toFixed(1)}</div>
                        <div className="text-blue-600">B: {values.b.s[index].toFixed(1)}</div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function SingularValueTable({ values, usedValues }: { values: number[], usedValues: number }) {
    return (
        <div className="max-h-64 overflow-y-auto">
            {/* <div className="grid grid-cols-4 gap-2 text-sm"> */}
            {values.map((value, index) => (
                <div
                    key={index}
                    className={`p-2 border rounded ${index < usedValues ? "bg-primary/10 border-primary/20" : "bg-muted/30"}`}
                >
                    <div className="font-medium">S{index + 1}</div>
                    <div>{value.toFixed(2)}</div>
                </div>
            ))}
            {/* </div> */}
        </div>
    )
}

function SingularValueRGBTable({ values, usedValues }: { values: ColorSvdData, usedValues: number }) {
    const valuesR = values.r.s;
    return (
        <div className="max-h-64 overflow-y-auto">
            {/* <div className="grid grid-cols-4 gap-2 text-sm"> */}
            {valuesR.map((value, index) => (
                <div
                    key={index}
                    className={`p-2 border rounded ${index < usedValues ? "bg-primary/10 border-primary/20" : "bg-muted/30"}`}
                >
                    <div className="font-medium">S{index + 1}</div>
                    <div className="flex flex-col">
                        <div className="text-red-600">R: {value.toFixed(1)}</div>
                        <div className="text-green-600">G: {values.g.s[index].toFixed(1)}</div>
                        <div className="text-blue-600">B: {values.b.s[index].toFixed(1)}</div>
                    </div>
                </div>
            ))}
            {/* </div> */}
        </div>
    )
}