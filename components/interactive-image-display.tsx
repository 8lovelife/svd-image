"use client"

import { useEffect, useRef, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Download, ImageIcon } from "lucide-react"
import { AppSvdData, ColorSvdData, ImageDataState, RawPixelData, SvdData } from "@/lib/utils"
import App from "next/app"

interface InteractiveImageDisplayProps {
    originalImage: string | null
    svdData: {
        grayscale?: SvdData
        color?: ColorSvdData
    } | null
    width: number
    height: number
    isProcessing: boolean
    singularValuesUsed: number
    setSingularValuesUsed: (value: number) => void
    useColor: boolean
    setUseColor: (value: boolean) => void
    imageDataState?: ImageDataState
    setGraySvd: (svdData: SvdData | null) => void
    reconstructColorPixelData: RawPixelData | null
    reconstructGrayPixelData: RawPixelData | null
    initPixelData: RawPixelData | null
    appSvdData?: AppSvdData | null
    setIsProcessing: (isProcessing: boolean) => void

}

export default function InteractiveImageDisplay({
    originalImage,
    svdData,
    width,
    height,
    isProcessing,
    singularValuesUsed,
    setSingularValuesUsed,
    useColor,
    setUseColor,
    imageDataState,
    setGraySvd,
    reconstructColorPixelData,
    reconstructGrayPixelData,
    initPixelData,
    appSvdData,
    setIsProcessing
}: InteractiveImageDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // const [maxSingularValues, setMaxSingularValues] = useState<number>(0)
    // const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const restructorWorkerRef = useRef<Worker | null>(null);
    const [reconstructedPixelData, setReconstructedPixelData] = useState<RawPixelData | null>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize the slider value when SVD data is loaded
    // useEffect(() => {

    let maxSingularValues = 0;
    if (useColor && appSvdData?.color) {
        maxSingularValues = appSvdData.color.r.s.length

    } else if (appSvdData?.grayscale) {
        maxSingularValues = appSvdData.grayscale.s.length
    }


    useEffect(() => {
        console.log("InteractiveDisplay: initPixelData prop changed. Updating reconstructedPixelData.", initPixelData);
        setReconstructedPixelData(initPixelData)
    }, [initPixelData]);


    useEffect(() => {
        // This effect runs only on mount and unmount
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    // Update the canvas when parameters change
    useEffect(() => {
        const updateCanvas = async () => {
            if (!svdData || !canvasRef.current) return
            try {
                setIsProcessing(true)
                const canvas = canvasRef.current
                const ctx = canvas.getContext("2d")
                if (!ctx) return
                if (reconstructedPixelData) {
                    console.log("draw image from reconstructedPixelData")
                    const finalImageData = new ImageData(
                        reconstructedPixelData.data,
                        reconstructedPixelData.width,
                        reconstructedPixelData.height
                    );
                    ctx.clearRect(0, 0, width, height);
                    ctx.putImageData(finalImageData, 0, 0);
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
    }, [reconstructedPixelData])


    // Initialize and terminate the reconstruction worker
    useEffect(() => {
        // Ensure path to worker is correct for your build setup
        restructorWorkerRef.current = new Worker(new URL('../lib/svd.reconstruct.worker.js', import.meta.url), { type: 'module' });

        restructorWorkerRef.current.onmessage = (event: MessageEvent) => {
            const {
                type,
                pixelData, // This is RawPixelData
                error,
                k: workerK,
                useColor: workerUseColor
            } = event.data;

            const updateCanvas = async () => {

                console.log("Reconstruct updateCanvas triggered. workerK:", workerK, "useColor:", workerUseColor,
                    " pixelData:", pixelData, " appSvdData:", appSvdData, "canvasRef:", canvasRef.current);

                if (!canvasRef.current) {
                    console.log("Reconstruct updateCanvas: No appSvdData or canvasRef");
                    setIsProcessing(false)
                    return
                }
                try {
                    // setReconstructedPixelData(pixelData)

                    const canvas = canvasRef.current
                    const ctx = canvas.getContext("2d")
                    if (!ctx) return
                    if (pixelData) {
                        console.log("draw image from reconstructed pixelData")
                        const finalImageData = new ImageData(
                            pixelData.data,
                            pixelData.width,
                            pixelData.height
                        );
                        ctx.clearRect(0, 0, width, height);
                        ctx.putImageData(finalImageData, 0, 0);
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

            if (type === 'RECONSTRUCTION_COMPLETE') {
                console.log("Main thread: Received Reconstruct_RESULT from worker.");
                updateCanvas()
            } else if (type === 'RECONSTRUCT_ERROR') {
                console.error("Main thread: Received Reconstruct_ERROR from worker:", error);
                alert(`An error occurred during RECONSTRUCT processing in worker: ${error}`);
            }

        };

        restructorWorkerRef.current.onerror = (err) => {
            console.error("Reconstruction worker error:", err);
            setIsProcessing(false);
        }

        return () => {
            restructorWorkerRef.current?.terminate();
            restructorWorkerRef.current = null;
        };
    }, []); // Runs once on mount and unmount


    const triggerWorkerReconstructionImperative = (
        // Parameters representing the NEW state that triggered this call
        newKValue: number,
        newIsColorMode: boolean
        // No need to pass other state/props if this function is defined
        // inside InteractiveImageDisplay and can access them directly from scope.
        // However, this makes it harder to memoize with useCallback if needed.
    ) => {
        const effectId = `triggerWorkerImperative-${Date.now()}`;
        console.log(effectId, "Eval. New k:", newKValue, "New colorMode:", newIsColorMode);
        console.log(effectId, "Current props/state: k_prop:", singularValuesUsed, "maxK_state:", maxSingularValues, "initPixelData_prop:", !!initPixelData, "isProcessing_prop:", isProcessing, "svdData_prop:", !!svdData);

        // Use the NEW values for k and color mode for decisions.
        // For other values (svdData, width, height, initPixelData, maxSingularValues),
        // we rely on them being the current values from the component's scope.

        if (isProcessing || !svdData || !restructorWorkerRef.current || width <= 0 || height <= 0) {
            console.log(effectId, "Prerequisites not met.");
            if (isProcessing) setIsProcessing(false);
            return;
        }

        if (newKValue <= 0) {
            console.log(effectId, "k is 0. Setting reconstructedImageData to null.");
            // Check against current state before setting to avoid unnecessary re-render if already null
            if (reconstructedPixelData !== null) setReconstructedPixelData(null);
            if (isProcessing) setIsProcessing(false);
            return;
        }

        console.log(effectId, `Posting RECONSTRUCT_IMAGE to worker. k=${newKValue}, useColor=${useColor}`);
        // setIsProcessing(true);
        restructorWorkerRef.current.postMessage({
            type: 'RECONSTRUCT_IMAGE',
            payload: appSvdData?.rawImageData,
            svdChannelData: svdData,
            k: newKValue,
            width: appSvdData?.rawImageData.width,
            height: appSvdData?.rawImageData.height,
            useColor: newIsColorMode,
        });
    };


    const handleColorModeChange = (isColor: boolean) => {
        setUseColor(isColor)
        setIsProcessing(true)
        triggerWorkerReconstructionImperative(
            singularValuesUsed,
            isColor
        )
    }

    // const handleColorModeChange = (isColor: boolean) => {
    //     setUseColor(isColor)
    //     setIsProcessing(true)
    //     triggerWorkerReconstructionImperative(
    //         singularValuesUsed,
    //         isColor
    //     )
    // }

    // Handle slider change
    const handleSetSingularChange = (presetValue: number) => {
        setSingularValuesUsed(presetValue)
        setIsProcessing(true)
        triggerWorkerReconstructionImperative(
            presetValue,
            useColor
        )
    }


    // Handle slider change
    const handleSliderChange = (newValue: number[]) => {
        const newK = newValue[0];
        setSingularValuesUsed(newK); // Update parent state for immediate UI feedback

        // Clear any existing timeout if user is still sliding
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Set a new timeout. When it fires, it will call triggerWorkerReconstructionImperative.
        // The values of `useColor`, `appSvdData`, `width`, `height`, `initPixelData`, `localMaxSingularValues`
        // used by triggerWorkerReconstructionImperative will be those current at the time the timeout executes.
        debounceTimeoutRef.current = setTimeout(() => {
            console.log("Slider Debounce: Timeout fired. Calling triggerWorkerReconstructionImperative with k=", newK);

            // IMPORTANT: triggerWorkerReconstructionImperative, when called here,
            // will use the 'newK' from this closure (which is correct for k).
            // For 'useColor' and other data (svdData, width, height, initPixelData, maxSingularValues),
            // it will use the values that are current in the InteractiveImageDisplay component's
            // scope *at the moment this timeout callback executes*.
            // This is generally what you want.
            setIsProcessing(true)

            triggerWorkerReconstructionImperative(
                newK,     // The k-value from when the timeout was set (final value after sliding stopped)
                useColor  // The CURRENT useColor prop value when timeout executes
                // Same for other props/state read by triggerWorkerReconstructionImperative
            );
        }, 300); // Adjust debounce delay (e.g., 300ms)
    };

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


    if (isProcessing && !originalImage) {
        return (
            <div className="border rounded-lg p-4 bg-muted/10 h-48 flex flex-col justify-center space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        )
    }
    // If no image is available, show a placeholder

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
                    width={appSvdData?.rawImageData.width || width}
                    height={appSvdData?.rawImageData.height || height}
                    className="w-full h-auto object-contain block"
                    style={{ maxHeight: "40vh" }}
                />

                {/* Loading Overlay (covers canvas) */}
                {isProcessing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm z-10">
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
                                    onClick={() => handleSetSingularChange(presetValue)}
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
                            onClick={() => handleColorModeChange(!useColor)}  // pass a boolean, not a function
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