"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageDataState, SvdData } from "@/lib/utils"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import SvdAnalysis from "@/components/svd-analysis"
import ImageSelectionPanel from "@/components/image-selection-panel"
import InterativeImageReconstruction from "@/components/interative-image-reconstruction"


export default function Home() {
    const [imageData, setImageData] = useState<ImageDataState>()
    const [singularValuesUsed, setSingularValuesUsed] = useState<number>(0)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [graySvd, setGraySvd] = useState<SvdData | null>(null);
    const [useColor, setUseColor] = useState<boolean>(true)

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
                    <InterativeImageReconstruction
                        imageData={imageData}
                        isProcessing={isProcessing}
                        useColor={useColor}
                        setUseColor={setUseColor}
                        setGraySvd={setGraySvd}
                        graySvd={graySvd}
                        singularValuesUsed={singularValuesUsed}
                        setSingularValuesUsed={setSingularValuesUsed}
                        setProcessSvd={setIsProcessing}
                    />

                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel - Data Analysis */}
                <ResizablePanel defaultSize={30} minSize={35}>
                    <SvdAnalysis
                        svdData={useColor
                            ? { color: imageData?.svdData }
                            : { grayscale: graySvd }}
                        usedValues={singularValuesUsed}
                        useColor={useColor}
                        originalImageWidth={imageData?.width || 0}
                        originalImageHeight={imageData?.height || 0} />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}