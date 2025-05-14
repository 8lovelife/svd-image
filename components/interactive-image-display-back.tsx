"use client"

import { useEffect, useRef, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Download, ImageIcon } from "lucide-react"
import { ColorSvdData, SvdData } from "@/lib/utils" // Assuming ColorSvdData is {r: SvdData, g: SvdData, b: SvdData}
import { reconstructColorImage, reconstructGrayImage } from "@/lib/svd"

interface InteractiveImageDisplayProps {
    originalImage: string | null
    svdData: {
        grayscale?: SvdData
        color?: ColorSvdData // Make sure ColorSvdData has r, g, b keys with SvdData
    } | null
    width: number
    height: number
    isLoading?: boolean
    singularValuesUsed: number
    setSingularValuesUsed: (value: number) => void
    useColor: boolean
    setUseColor: (value: boolean) => void
}

export default function InteractiveImageDisplay({
    originalImage,
    svdData,
    width,
    height,
    isLoading = false,
    singularValuesUsed,
    setSingularValuesUsed,
    useColor,
    setUseColor,
}: InteractiveImageDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [maxSingularValues, setMaxSingularValues] = useState<number>(0)
    const [compressionRatio, setCompressionRatio] = useState<number>(0)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)

    // Effect to initialize/update maxSingularValues and adjust singularValuesUsed if needed
    useEffect(() => {
        let currentMax = 0
        if (useColor && svdData?.color?.r?.s) { // Check down to 's' array
            currentMax = svdData.color.r.s.length
        } else if (!useColor && svdData?.grayscale?.s) { // Added !useColor and check for 's'
            currentMax = svdData.grayscale.s.length
        }
        setMaxSingularValues(currentMax)

        if (currentMax > 0) {
            // If singularValuesUsed is out of bounds (0, <1, or >currentMax), adjust it.
            if (singularValuesUsed < 1 || singularValuesUsed > currentMax) {
                setSingularValuesUsed(currentMax) // Default to max
            }
        } else {
            // No data or max is 0, so no singular values can be used.
            if (singularValuesUsed !== 0) {
                setSingularValuesUsed(0)
            }
        }
    }, [svdData, useColor, singularValuesUsed, setSingularValuesUsed])

    // Update the canvas when parameters change
    useEffect(() => {
        const updateCanvas = async () => {
            if (!canvasRef.current || width <= 0 || height <= 0) return // Guard against invalid dimensions

            setIsProcessing(true)
            const canvas = canvasRef.current
            const ctx = canvas.getContext("2d")
            if (!ctx) {
                setIsProcessing(false)
                return
            }

            // Ensure canvas intrinsic size is correct
            canvas.width = width
            canvas.height = height

            try {
                if (svdData && singularValuesUsed > 0 && maxSingularValues > 0) {
                    // Calculate compression ratio
                    const M = height // Number of rows
                    const N = width  // Number of columns
                    const k = singularValuesUsed

                    let originalStorageElements
                    let compressedStorageElements

                    if (useColor && svdData.color) {
                        originalStorageElements = M * N * 3 // R, G, B channels
                        compressedStorageElements = 3 * (k * (M + N + 1)) // U_k, S_k, V_k^T for each channel
                    } else if (!useColor && svdData.grayscale) {
                        originalStorageElements = M * N // Grayscale
                        compressedStorageElements = k * (M + N + 1) // U_k, S_k, V_k^T
                    } else {
                        setCompressionRatio(0) // Should not happen if logic is correct
                        throw new Error("SVD data missing for current color mode.")
                    }

                    if (compressedStorageElements > 0 && originalStorageElements > 0) {
                        const ratio = originalStorageElements / compressedStorageElements
                        setCompressionRatio(ratio)
                    } else {
                        setCompressionRatio(0)
                    }

                    // Reconstruct and draw image
                    ctx.clearRect(0, 0, width, height)
                    if (useColor && svdData.color) {
                        const reconstructedImageData = await reconstructColorImage(svdData.color, singularValuesUsed, width, height)
                        ctx.putImageData(reconstructedImageData, 0, 0)
                    } else if (!useColor && svdData.grayscale) {
                        const reconstructedImageData = await reconstructGrayImage(svdData.grayscale, singularValuesUsed, width, height)
                        ctx.putImageData(reconstructedImageData, 0, 0)
                    } else if (originalImage) { // Fallback to original if SVD data isn't quite ready but image exists
                        const img = new Image()
                        img.onload = () => {
                            ctx.clearRect(0, 0, width, height)
                            ctx.drawImage(img, 0, 0, width, height)
                        }
                        img.src = originalImage
                    }
                } else if (originalImage) {
                    // If no SVD processing possible (e.g., singularValuesUsed is 0), show original
                    const img = new Image()
                    img.onload = () => {
                        ctx.clearRect(0, 0, width, height)
                        ctx.drawImage(img, 0, 0, width, height)
                    }
                    img.src = originalImage
                    setCompressionRatio(0) // No compression applied
                } else {
                    // No data, clear canvas
                    ctx.clearRect(0, 0, width, height)
                    setCompressionRatio(0)
                }
            } catch (error) {
                console.error("Error updating canvas:", error)
                setCompressionRatio(0)
                // If there's an error, try to show the original image
                if (originalImage && canvasRef.current) { // canvasRef.current already checked
                    const img = new Image()
                    img.onload = () => {
                        // canvas.width/height should be set
                        ctx.clearRect(0, 0, width, height) // Clear before drawing fallback
                        ctx.drawImage(img, 0, 0, width, height)
                    }
                    img.src = originalImage
                }
            } finally {
                setIsProcessing(false)
            }
        }

        updateCanvas()
    }, [svdData, singularValuesUsed, useColor, originalImage, width, height, maxSingularValues]) // maxSingularValues added as it influences logic

    const handleSliderChange = (newValue: number[]) => {
        setSingularValuesUsed(newValue[0])
    }

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

    const presets = (() => {
        if (maxSingularValues <= 0) return []
        const uniquePresets = new Set<number>()
        uniquePresets.add(1)
        if (maxSingularValues > 1) {
            [0.05, 0.1, 0.25, 0.5].forEach(p => {
                const val = Math.max(1, Math.floor(maxSingularValues * p));
                if (val < maxSingularValues) uniquePresets.add(val);
            });
            uniquePresets.add(maxSingularValues)
        }
        return Array.from(uniquePresets).sort((a, b) => a - b)
    })()

    if (isLoading) {
        return (
            <div className="relative flex w-full items-center justify-center">
                <Skeleton className="w-full aspect-[4/3]" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-muted-foreground">Loading SVD Data...</div>
                </div>
            </div>
        )
    }

    if (!originalImage || width <= 0 || height <= 0) {
        return (
            <div className="flex items-center justify-center border rounded-lg p-4 bg-muted/10 aspect-[4/3] min-h-[12rem] w-full">
                <p className="text-muted-foreground">No image available or invalid dimensions</p>
            </div>
        )
    }

    return (
        <div className="w-full">
            {/* Image display */}
            <div className="relative w-full overflow-hidden rounded-lg border bg-background">
                <canvas
                    ref={canvasRef}
                    width={width} // Intrinsic width for drawing buffer
                    height={height} // Intrinsic height for drawing buffer
                    className="w-full h-auto object-contain block" // CSS for display scaling
                    style={{ maxHeight: "50vh" }} // Responsive max height based on viewport
                />
                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                        <div className="text-muted-foreground">Processing...</div>
                    </div>
                )}
            </div>

            {/* Controls below image */}
            <div className="mt-4 space-y-4">
                {/* Slider Group */}
                <div className="flex flex-col xs:flex-row items-center gap-2">
                    <div className="w-full xs:flex-1">
                        <Slider
                            value={[singularValuesUsed]}
                            min={maxSingularValues > 0 ? 1 : 0}
                            max={maxSingularValues > 0 ? maxSingularValues : 1} // Slider needs max >= min
                            step={1}
                            onValueChange={handleSliderChange}
                            disabled={isProcessing || maxSingularValues === 0}
                        />
                    </div>
                    <div className="w-full xs:w-auto xs:min-w-[6rem] text-center xs:text-right text-sm font-medium whitespace-nowrap px-1">
                        {singularValuesUsed} / {maxSingularValues > 0 ? maxSingularValues : "-"}
                    </div>
                </div>

                {/* Presets and Actions Group */}
                {(maxSingularValues > 0 && presets.length > 0) && (
                    <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
                        {/* Presets on the left (or top on small screens) */}
                        <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                            {presets.map((presetValue) => (
                                <Button
                                    key={presetValue}
                                    variant={singularValuesUsed === presetValue ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSingularValuesUsed(presetValue)}
                                    disabled={isProcessing}
                                    className="h-7 px-2.5 text-xs"
                                >
                                    {presetValue === 1
                                        ? "1"
                                        : presetValue === maxSingularValues
                                            ? "All"
                                            : `${Math.round((presetValue / maxSingularValues) * 100)}%`}
                                </Button>
                            ))}
                        </div>

                        {/* Toggle Color and Download on the right (or bottom on small screens) */}
                        <div className="flex items-center gap-2 justify-center sm:justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setUseColor(!useColor)}
                                disabled={isProcessing || (!svdData?.color && !svdData?.grayscale)} // Disable if no data for either mode
                                className="h-7"
                            >
                                <ImageIcon className="h-4 w-4 mr-1.5" />
                                {useColor ? "Grayscale" : "Color"}
                            </Button>

                            <Button variant="outline" size="sm" onClick={handleDownload} disabled={isProcessing} className="h-7">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Compression info */}
                {compressionRatio > 0 && !isProcessing && (
                    <div className="mt-2 text-xs text-muted-foreground text-center sm:text-left">
                        Approx. Compression: {compressionRatio.toFixed(1)}x (using {singularValuesUsed} value{singularValuesUsed === 1 ? "" : "s"})
                        {useColor ? " per channel" : ""}
                    </div>
                )}
            </div>
        </div>
    )
}