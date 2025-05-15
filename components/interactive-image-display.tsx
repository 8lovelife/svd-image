"use client"

import { useEffect, useRef, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Download, ImageIcon } from "lucide-react"
import { ColorSvdData, ImageDataState, SvdData } from "@/lib/utils"
import { performSVD, reconstructColor, reconstructColorImage, reconstructGrayImage, reconstructImage } from "@/lib/svd"

interface InteractiveImageDisplayProps {
    originalImage: string | null
    svdData: {
        grayscale?: SvdData
        color?: ColorSvdData
    } | null
    width: number
    height: number
    isLoadingSvd: boolean
    singularValuesUsed: number
    setSingularValuesUsed: (value: number) => void
    useColor: boolean
    setUseColor: (value: boolean) => void
    imageDataState: ImageDataState
    setGraySvd: (svdData: SvdData | null) => void
}

export default function InteractiveImageDisplay({
    originalImage,
    svdData,
    width,
    height,
    isLoadingSvd,
    singularValuesUsed,
    setSingularValuesUsed,
    useColor,
    setUseColor,
    imageDataState,
    setGraySvd
}: InteractiveImageDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // const [singularValuesUsed, setSingularValuesUsed] = useState<number>(0)
    const [maxSingularValues, setMaxSingularValues] = useState<number>(0)
    // const [useColor, setUseColor] = useState<boolean>(true)
    const [compressionRatio, setCompressionRatio] = useState<number>(0)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)

    // Initialize the slider value when SVD data is loaded
    useEffect(() => {
        if (useColor && svdData?.color) {
            const maxValues = svdData.color.r.s.length
            setMaxSingularValues(maxValues)
            // setSingularValuesUsed(maxValues)
        } else if (svdData?.grayscale) {
            const maxValues = svdData.grayscale.s.length
            setMaxSingularValues(maxValues)
            // setSingularValuesUsed(maxValues)
        }
    }, [svdData, useColor])

    // Update the canvas when parameters change
    useEffect(() => {
        const updateCanvas = async () => {

            if (!svdData || !canvasRef.current) return
            try {
                setIsProcessing(true)

                const canvas = canvasRef.current
                const ctx = canvas.getContext("2d")
                if (!ctx) return

                // Create reconstructed matrices for each channel
                if (useColor && svdData.color) {
                    const reconstructedImageData = await reconstructColorImage(svdData.color, singularValuesUsed, width, height)
                    ctx.clearRect(0, 0, width, height);
                    ctx.putImageData(reconstructedImageData, 0, 0);
                } else if (!useColor && imageDataState.rawImageData) {
                    const grayscale = await performSVD(imageDataState.rawImageData);
                    setGraySvd(grayscale)
                    const reconstructedImageData = await reconstructGrayImage(grayscale, singularValuesUsed, width, height)
                    ctx.clearRect(0, 0, width, height);
                    ctx.putImageData(reconstructedImageData, 0, 0);
                }
            } catch (error) {
                console.error("Error updating canvas:", error)
                // If there's an error, try to show the original image
                if (originalImage && canvasRef.current) {
                    const canvas = canvasRef.current
                    const ctx = canvas.getContext("2d")
                    if (ctx) {
                        const img = new Image()
                        img.onload = () => {
                            ctx.drawImage(img, 0, 0, width, height)
                        }
                        img.src = originalImage
                    }
                }
            } finally {
                setIsProcessing(false)
            }
        }

        updateCanvas()
    }, [singularValuesUsed, useColor, originalImage])

    // Handle slider change
    const handleSliderChange = (newValue: number[]) => {
        setSingularValuesUsed(newValue[0])
    }

    // Handle download
    const handleDownload = () => {
        if (canvasRef.current) {
            const link = document.createElement("a")
            link.href = canvasRef.current.toDataURL("image/png")
            link.download = `svd-image-k${singularValuesUsed}${useColor ? "-color" : "-grayscale"}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }

    const shouldShowPreset = (presetValue: number, index: number, screenWidth: number) => {
        if (screenWidth < 640) { // Example: 'sm' breakpoint
            // Only show first, last, and maybe one middle preset on small screens
            return index === 0 || presetValue === maxSingularValues || index === Math.floor(presets.length / 2);
        }
        return true; // Show all on larger screens
    }

    // Calculate preset values for the slider
    const presets = (() => {
        if (maxSingularValues <= 0) return []

        const step = Math.max(1, Math.floor(maxSingularValues / 5))
        return [
            1,
            Math.floor(maxSingularValues * 0.05),
            Math.floor(maxSingularValues * 0.1),
            Math.floor(maxSingularValues * 0.25),
            Math.floor(maxSingularValues * 0.5),
            maxSingularValues,
        ].filter((v, i, a) => v > 0 && a.indexOf(v) === i)
    })()

    if (isLoadingSvd) {
        return (
            <div className="relative flex items-center justify-center">
                <Skeleton className="w-full aspect-[4/3]" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-muted-foreground">Processing...</div>
                </div>
            </div>
        )
    }

    if (!originalImage) {
        return (
            <div className="flex items-center justify-center border rounded-lg p-4 bg-muted/10 h-48">
                <p className="text-muted-foreground">No image available</p>
            </div>
        )
    }

    return (
        <div>
            {/* Image display */}
            <div className="relative w-full overflow-hidden rounded-lg border bg-background">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className="w-full h-auto object-contain block" // CSS for display scaling
                    style={{ maxHeight: "40vh" }} // Responsive max height based on viewport
                />

                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <div className="text-muted-foreground">Processing...</div>
                    </div>
                )}
            </div>

            {/* Controls below image */}
            <div className="mt-4">
                {/* Slider */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-full">
                        <Slider
                            value={[singularValuesUsed]}
                            min={1}
                            max={maxSingularValues}
                            step={1}
                            onValueChange={handleSliderChange}
                            disabled={isProcessing}
                        />
                    </div>
                    <div className="w-24 flex items-center justify-center text-sm font-medium">
                        {singularValuesUsed} / {maxSingularValues}
                    </div>
                </div>

                {/* Presets and controls */}
                <div className="flex flex-col xs:flex-row xs:justify-between items-center gap-y-2 xs:gap-x-3">
                    <div className="flex-1 min-w-0 order-1 xs:order-none"> {/* Presets take available space */}
                        <div className="flex flex-wrap gap-1.5 justify-center xs:justify-start">
                            {presets.filter((val, idx) => shouldShowPreset(val, idx, window.innerWidth)).map((presetValue) => (
                                <Button
                                    key={presetValue}
                                    variant={singularValuesUsed === presetValue ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSingularValuesUsed(presetValue)}
                                    disabled={isProcessing}
                                    className="h-7 px-2 text-xs"
                                >
                                    {presetValue === 1
                                        ? "1"
                                        : presetValue === maxSingularValues
                                            ? "All"
                                            : `${Math.round((presetValue / maxSingularValues) * 100)}%`}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 order-2 xs:order-none">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUseColor(!useColor)}  // pass a boolean, not a function
                            disabled={isProcessing}
                            className="h-7"
                        >
                            <ImageIcon className="h-4 w-4 mr-1" />
                            {useColor ? "Grayscale" : "Color"}
                        </Button>

                        <Button variant="outline" size="sm" onClick={handleDownload} disabled={isProcessing} className="h-7">
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Compression info */}
                {/* {compressionRatio > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                        Compression ratio: {compressionRatio.toFixed(2)}x | Using {singularValuesUsed} of {maxSingularValues}{" "}
                        singular values
                        {useColor ? " (applied to R,G,B channels)" : ""}
                    </div>
                )} */}
            </div>
        </div>
    )
}