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
import { SingularValuesLineChartGrayscale } from "@/components/singular-values-areachart-grayscale"
import { SingularValuesAreaChartRGB } from "@/components/singular-values-areachart-rgb"
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


    // const svdDataForAnalysisComponent = useMemo(() => {
    //     if (useColor) {
    //         if (imageData?.svdData) {
    //             // Ensure uploadedImageData.svdData is cast to ColorSvdData if necessary
    //             return { color: uploadedImageData.svdData as ColorSvdData };
    //         }
    //         return null; // Or { color: undefined } if the component handles undefined better than null for the whole object
    //     } else { // Grayscale mode
    //         if (graySvd) {
    //             // Ensure graySvd is cast to SvdData if necessary
    //             return { grayscale: graySvd as SvdData };
    //         }
    //         return null; // Or { grayscale: undefined }
    //     }
    // }, [useColor, imageData, graySvd]);

    return (
        <div className="h-screen w-full p-2">
            <ResizablePanelGroup direction="horizontal" className="flex h-full w-full rounded-lg border"
            >
                {/* Left Panel - Controls */}
                <ResizablePanel defaultSize={15} minSize={20}>
                    <div className="h-full overflow-auto">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>SVD Image Dimension Reduction</CardTitle>
                                <CardDescription>
                                    Upload an image to analyze with Singular Value Decomposition (SVD) and adjust dimensions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
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
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Middle Panel - Original Image */}
                <ResizablePanel defaultSize={25} minSize={30}>
                    <div className="h-full overflow-auto">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                                        <Info className="h-4 w-4" />
                                        <span>
                                            {imageData.width} × {imageData.height}
                                        </span>
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
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
                            </CardContent>
                        </Card>
                    </div>
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