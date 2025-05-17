"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AppSvdData, ImageDataState, RawPixelData, SvdData } from "@/lib/utils"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import SvdAnalysis from "@/components/svd-analysis"
import ImageSelectionPanel from "@/components/image-selection-panel"
import InterativeImageReconstruction from "@/components/interative-image-reconstruction"


export default function Home() {
    const [imageData, setImageData] = useState<ImageDataState>()
    const [singularValuesUsed, setSingularValuesUsed] = useState<number>(0)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [useColor, setUseColor] = useState<boolean>(true)
    const [initPixelData, setInitPixelData] = useState<RawPixelData | null>(null)
    const [appSvdData, setAppSvdData] = useState<AppSvdData>(null)


    const [graySvd, setGraySvd] = useState<SvdData | null>(null);
    const [reconstructColorPixelData, setReconstructColorPixelData] = useState<RawPixelData | null>(null)
    const [reconstructGrayPixelData, setReconstructGrayPixelData] = useState<RawPixelData | null>(null)

    return (
        <div className="h-screen w-full p-2">
            <ResizablePanelGroup direction="horizontal" className="flex h-full w-full rounded-lg border"
            >
                {/* Left Panel - Controls */}
                <ResizablePanel defaultSize={15} minSize={15} maxSize={20}>
                    <ImageSelectionPanel onImageLoaded={(imageData, rawImageData, width, height, svdData, grayscale, reconstructColorPixelData, reconstructGrayPixelData) => {

                        if (svdData) {
                            setImageData({
                                originalImage: imageData,
                                rawImageData,
                                width,
                                height,
                                svdData,
                            })
                            // setReconstructColorPixelData(reconstructColorPixelData)
                            // setReconstructGrayPixelData(reconstructGrayPixelData)
                            setSingularValuesUsed(svdData.r.s.length)

                            setAppSvdData({
                                rawImageData: rawImageData,
                                color: svdData,
                                grayscale: grayscale,
                            })
                        }
                        imageData && setGraySvd(grayscale)
                    }}
                        isLoading={isProcessing}
                        setIsProcessing={setIsProcessing}
                        useColor={useColor}
                        setInitPixelData={setInitPixelData}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Middle Panel - Original Image */}
                <ResizablePanel defaultSize={15} minSize={25} maxSize={35}>
                    <InterativeImageReconstruction
                        isProcessing={isProcessing}
                        useColor={useColor}
                        setUseColor={setUseColor}
                        singularValuesUsed={singularValuesUsed}
                        setSingularValuesUsed={setSingularValuesUsed}
                        setProcessSvd={setIsProcessing}
                        initPixelData={initPixelData}
                        appSvdData={appSvdData}


                        setGraySvd={setGraySvd}
                        graySvd={graySvd}
                        reconstructColorPixelData={reconstructColorPixelData}
                        reconstructGrayPixelData={reconstructGrayPixelData}
                        imageData={imageData}
                    />

                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel - Data Analysis */}
                <ResizablePanel defaultSize={30} minSize={35}>
                    <SvdAnalysis
                        svdData={appSvdData}
                        usedValues={singularValuesUsed}
                        useColor={useColor}
                    // originalImageWidth={imageData?.width || 0}
                    // originalImageHeight={imageData?.height || 0} 
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}