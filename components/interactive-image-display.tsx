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
    imageDataState?: ImageDataState
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
    const imageProcWorkerRef = useRef<Worker | null>(null);


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
                    console.log("Reconstructing color image with SVD data")
                    const reconstructedImageData = await reconstructColorImage(svdData.color, singularValuesUsed, width, height)
                    ctx.clearRect(0, 0, width, height);
                    ctx.putImageData(reconstructedImageData, 0, 0);
                } else if (!useColor && imageDataState?.rawImageData) {
                    console.log("Reconstructing grayscale image with SVD data")
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


    // InteractiveImageDisplay.tsx

    // ... (props: originalImage, svdData, width, height, isLoadingSvd, singularValuesUsed,
    //             setSingularValuesUsed, useColor, setUseColor, imageDataState, setGraySvd)

    // useEffect(() => {
    //     const updateCanvas = async () => {
    //         // Condition 1: No svdData or canvas not ready
    //         if (!canvasRef.current || !width || !height) { // Simplified initial check
    //             // If no canvas, nothing to do. If no dimensions, also problematic.
    //             return;
    //         }

    //         // `svdData` prop comes from parent, might be null initially or after errors.
    //         // `imageDataState` prop also from parent, contains rawImageData.

    //         setIsProcessing(true); // Start processing for canvas update
    //         try {
    //             const canvas = canvasRef.current;
    //             const ctx = canvas.getContext("2d");
    //             if (!ctx) {
    //                 setIsProcessing(false);
    //                 return;
    //             }

    //             ctx.clearRect(0, 0, width, height); // Clear canvas first

    //             if (useColor) {
    //                 if (svdData?.color) { // Color SVD data IS available directly
    //                     console.log("Reconstructing COLOR image from svdData.color");
    //                     const reconstructed = await reconstructColorImage(svdData.color, singularValuesUsed, width, height);
    //                     ctx.putImageData(reconstructed, 0, 0);
    //                 } else if (originalImage) {
    //                     console.log("COLOR mode: svdData.color missing, drawing original image.");
    //                     // Draw original image as fallback for color mode if SVD data not ready
    //                     const img = new Image();
    //                     img.onload = () => ctx.drawImage(img, 0, 0, width, height);
    //                     img.src = originalImage;
    //                 } else {
    //                     console.log("COLOR mode: No SVD data and no original image.");
    //                 }
    //             } else { // Grayscale mode (!useColor)
    //                 // For grayscale, we have a few possibilities for where SVD data comes from:
    //                 // 1. svdData.grayscale (if already calculated and passed down by parent)
    //                 // 2. Calculate SVD now from imageDataState.rawImageData
    //                 // 3. imageDataState.rawImageData isn't even available (should draw original or nothing)

    //                 if (svdData?.grayscale) { // Scenario 1: Grayscale SVD already computed and passed as prop
    //                     console.log("Reconstructing GRAYSCALE image from svdData.grayscale");
    //                     const reconstructed = await reconstructGrayImage(svdData.grayscale, singularValuesUsed, width, height);
    //                     ctx.putImageData(reconstructed, 0, 0);
    //                 } else if (imageDataState?.rawImageData) { // Scenario 2: Raw image data available, need to compute SVD
    //                     console.log("GRAYSCALE mode: Performing SVD from rawImageData and reconstructing...");
    //                     // IMPORTANT: performSVD is now async (or should be if it's heavy)
    //                     // This performSVD here is likely on the main thread.
    //                     // If ImageSelectionPanel moved its SVD to a worker, this component still tries to do it on main thread for grayscale if svdData.grayscale isn't present.
    //                     const grayscaleSvdResult = await performSVD(imageDataState.rawImageData); // THIS IS THE CPU-INTENSIVE PART

    //                     if (grayscaleSvdResult) {
    //                         setGraySvd(grayscaleSvdResult); // Update parent state. This will trigger a re-render.
    //                         // The next run of this useEffect MIGHT pick up svdData.grayscale if parent updates it correctly
    //                         // But this immediate run will use grayscaleSvdResult for reconstruction.
    //                         const reconstructed = await reconstructGrayImage(grayscaleSvdResult, singularValuesUsed, width, height);
    //                         ctx.putImageData(reconstructed, 0, 0);
    //                     } else {
    //                         console.error("Grayscale SVD calculation failed.");
    //                         if (originalImage) { // Fallback if SVD failed
    //                             console.log("GRAYSCALE mode: SVD failed, drawing original image.");
    //                             const img = new Image();
    //                             img.onload = () => ctx.drawImage(img, 0, 0, width, height);
    //                             img.src = originalImage;
    //                         }
    //                     }
    //                 } else if (originalImage) { // Scenario 3: No SVD data path, fallback to original
    //                     console.log("GRAYSCALE mode: No SVD path (no svdData.grayscale, no rawImageData), drawing original image.");
    //                     const img = new Image();
    //                     img.onload = () => ctx.drawImage(img, 0, 0, width, height);
    //                     img.src = originalImage;
    //                 } else {
    //                     console.log("GRAYSCALE mode: No SVD path and no original image.");
    //                 }
    //             }
    //         } catch (error) {
    //             console.error("Error updating canvas in InteractiveImageDisplay:", error);
    //             if (originalImage && canvasRef.current) { // Fallback to original on any error
    //                 const canvas = canvasRef.current;
    //                 const ctx = canvas.getContext("2d");
    //                 if (ctx) {
    //                     const img = new Image();
    //                     img.onload = () => {
    //                         ctx.clearRect(0, 0, width, height); // Clear before drawing error fallback
    //                         ctx.drawImage(img, 0, 0, width, height);
    //                     }
    //                     img.src = originalImage;
    //                 }
    //             }
    //         } finally {
    //             setIsProcessing(false);
    //         }
    //     };

    //     updateCanvas();
    // }, [
    //     svdData, // IMPORTANT: Add svdData here
    //     singularValuesUsed,
    //     useColor,
    //     originalImage,
    //     width, // IMPORTANT
    //     height, // IMPORTANT
    //     imageDataState, // IMPORTANT
    //     setGraySvd // This is a function, if it's stable (e.g., from useState), it's okay. If it changes, it should be here or wrapped in useCallback.
    //     // setIsProcessing // State setter, stable
    // ]);

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

    const showLoadingOverlay = isLoadingSvd || isProcessing;


    if (!originalImage && !isLoadingSvd) {
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
                {(width > 0 && height > 0) ? (
                    <canvas
                        ref={canvasRef}
                        width={width}
                        height={height}
                        className="w-full h-auto object-contain block"
                        style={{ maxHeight: "40vh" }}
                    />
                ) : (
                    // Fallback if width/height are 0 but we expect an image eventually
                    <Skeleton className="w-full aspect-[4/3]" style={{ maxHeight: "40vh" }} />
                )}

                {/* Loading Overlay (covers canvas) */}
                {showLoadingOverlay && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm z-10">
                        {/* <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" /> */}
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
                        // disabled={showLoadingOverlay}
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
                                    disabled={showLoadingOverlay}
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
                            disabled={showLoadingOverlay}
                            className="h-7"
                        >
                            <ImageIcon className="h-4 w-4 mr-1" />
                            {useColor ? "Grayscale" : "Color"}
                        </Button>

                        <Button variant="outline" size="sm" onClick={handleDownload} disabled={showLoadingOverlay} className="h-7">
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