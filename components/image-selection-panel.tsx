"use client"

import React, { useState, useEffect, useRef } from "react"; // Added useEffect for default sample selection
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ColorSvdData, RawPixelData, SvdData } from "@/lib/utils"; // Make sure this path is correct
import ImageUpload from "./image-upload";     // Make sure this path is correct
import { performColorSVD } from "@/lib/svd";    // Make sure this path is correct

// Define SampleImage type as used in the component
export interface SampleImage {
    id: string;
    name: string;
    thumbnailUrl: string;
    fullUrl: string; // Needed for handleSampleImageClick
}

// const sampleImages: SampleImage[] = [ // Using 'sampleImages' as defined in your last component snippet
//     { id: 'sample_goose', name: 'Goose', thumbnailUrl: '/images/samples/goose_thumb.jpg', fullUrl: '/images/samples/goose_full.jpg' },
//     { id: 'sample_cat', name: 'Cat', thumbnailUrl: '/images/samples/cat_thumb.jpg', fullUrl: '/images/samples/cat_full.jpg' },
//     { id: 'sample_dog', name: 'Dog', thumbnailUrl: '/images/samples/dog_thumb.jpg', fullUrl: '/images/samples/dog_full.jpg' },
//     { id: 'sample_landscape', name: 'Landscape', thumbnailUrl: '/images/samples/landscape_thumb.jpg', fullUrl: '/images/samples/landscape_full.jpg' },
//     { id: 'sample_abstract', name: 'Abstract', thumbnailUrl: '/images/samples/abstract_thumb.jpg', fullUrl: '/images/samples/abstract_full.jpg' },
//     { id: 'sample_lena2', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
//     { id: 'sample_lena3', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
//     { id: 'sample_lena4', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
//     { id: 'sample_lena5', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
//     { id: 'sample_lena6', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
//     { id: 'sample_lena7', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
//     { id: 'sample_lena8', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
//     { id: 'sample_lena9', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
//     { id: 'sample_lena9', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
//     { id: 'sample_lena9', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
// ];


const staticSamples: SampleImage[] = [
    {
        id: 'sample_cat',
        name: 'Cat',
        thumbnailUrl: '/images/samples/cat_thumb.jpg',
        fullUrl: '/images/samples/cat_full.jpg',
    },
    {
        id: 'sample_goose',
        name: 'Goose',
        thumbnailUrl: '/images/samples/goose_thumb.jpg',
        fullUrl: '/images/samples/goose_full.jpg',
    },
]

const dynamicSamples: SampleImage[] = Array.from({ length: 10 }).map((_, i) => {
    const seed = `sample${i + 1}`
    return {
        id: seed,
        name: `Sample ${i + 1}`,
        thumbnailUrl: `https://picsum.photos/seed/${seed}/120/90`,
        fullUrl: `https://picsum.photos/seed/${seed}/800/600`,
    }
})

const sampleImages: SampleImage[] = [...staticSamples, ...dynamicSamples]

interface ImageSelectionPanelProps {
    onImageLoaded: ( // This callback is called AFTER SVD processing WITHIN this component
        imageDataUrl: string, // Renamed from 'imageData' for clarity
        rawImageData: ImageData,
        width: number,
        height: number,
        svdData: ColorSvdData | null,// Allow null if SVD can fail
        grayscaleSvdData: SvdData | null,
        reconstructColorPixelData: RawPixelData | null,
        reconstructGrayPixelData: RawPixelData | null
    ) => void;
    isLoading: boolean; // This prop will disable interactions
    setIsProcessing: (isProcessing: boolean) => void; // Optional: If you want to set a loading state in the parent
    className?: string; // Optional: Allow passing className to the Card
    useColor: boolean; // Optional: If you want to pass color mode
    setInitPixelData: (pixelData: RawPixelData) => void; // Optional: Setter for initial pixel data
}


export default function ImageSelectionPanel({
    onImageLoaded,
    isLoading, // This is the prop from the parent indicating overall processing
    setIsProcessing,
    className,
    useColor,
    setInitPixelData
}: ImageSelectionPanelProps) {
    // selectedSampleId is internal to this component for visual highlighting
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
    const svdWorkerRef = useRef<Worker | null>(null);


    const urlToFile = async (url: string, filename: string): Promise<File> => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        const blob = await response.blob();
        const type = blob.type || 'image/jpeg';
        return new File([blob], filename, { type });
    };



    useEffect(() => {
        // Initialize the worker
        svdWorkerRef.current = new Worker(new URL('../lib/svd.worker.js', import.meta.url), { type: 'module' });

        // Cleanup worker on component unmount
        return () => {
            if (svdWorkerRef.current) {
                svdWorkerRef.current.terminate();
                svdWorkerRef.current = null;
                console.log("SVD Worker terminated");
            }
        };
    }, []);

    const MAX_SVD_DIMENSION = 512; // Maximum dimension for SVD processing

    const processImageAndCallBack = (file: File | null) => { // Accept File | null

        if (!file) {
            alert("No file provided for processing.");
            return;
        }
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file (e.g., PNG, JPG, GIF).");
            return;
        }
        if (!svdWorkerRef.current) {
            alert("SVD Worker is not initialized. Please try again shortly.");
            console.error("SVD Worker not initialized.");
            return;
        }

        setIsProcessing(true); // Signal parent processing has started

        const worker = svdWorkerRef.current;
        // let localImgSrcDataUrl = ""; // To store for callback if SVD worker fails before sending data back

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            if (loadEvent.target?.result) {
                const imgSrcDataUrl = loadEvent.target.result as string;
                // localImgSrcDataUrl = imgSrcDataUrl; // Store it
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        console.error("Could not get canvas context");
                        alert("Could not get canvas context");
                        // onImageLoaded(imgSrcDataUrl, new ImageData(1, 1), img.width, img.height, null, null, null); // Pass placeholder values
                        setIsProcessing(false);
                        return;
                    }


                    const originalFileWidth = img.width;
                    const originalFileHeight = img.height;

                    let processedWidth = originalFileWidth;
                    let processedHeight = originalFileHeight;

                    // 2. Resize logic for SVD processing
                    if (originalFileWidth > MAX_SVD_DIMENSION || originalFileHeight > MAX_SVD_DIMENSION) {
                        if (originalFileWidth > originalFileHeight) {
                            processedWidth = MAX_SVD_DIMENSION;
                            processedHeight = Math.round((originalFileHeight * MAX_SVD_DIMENSION) / originalFileWidth);
                        } else {
                            processedHeight = MAX_SVD_DIMENSION;
                            processedWidth = Math.round((originalFileWidth * MAX_SVD_DIMENSION) / originalFileHeight);
                        }
                        console.log(`Image resized for SVD: ${originalFileWidth}x${originalFileHeight} -> ${processedWidth}x${processedHeight}`);
                    } else {
                        console.log(`Image not resized for SVD: ${originalFileWidth}x${originalFileHeight}`);
                    }

                    canvas.width = processedWidth;
                    canvas.height = processedHeight;
                    ctx.drawImage(img, 0, 0, processedWidth, processedHeight);
                    const rawImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    console.log("Main thread: Posting ImageData to worker for SVD calculation.");
                    // Send ImageData to worker. ImageData is transferable.
                    worker.postMessage({ type: 'CALCULATE_SVD', payload: rawImgData, useColor: useColor }, [rawImgData.data.buffer]);

                    worker.onmessage = (event) => {
                        const { type, colorSvdResult, grayscaleSvdResult, originalImageData, reconstructedColorPixelData, reconstructedGrayPixelData, error } = event.data;
                        if (type === 'SVD_RESULT') {
                            console.log("Main thread: Received SVD_RESULT from worker.");
                            console.log("Main onImageLoaded - reconstructedColorPxData:", reconstructedColorPixelData); // CRITICAL LOG
                            console.log("Main onImageLoaded - reconstructedGrayPxData:", reconstructedGrayPixelData);   // CRITICAL LOG
                            onImageLoaded(imgSrcDataUrl, originalImageData, originalFileWidth, originalFileHeight, colorSvdResult as ColorSvdData, grayscaleSvdResult as SvdData, reconstructedColorPixelData, reconstructedGrayPixelData); // Assuming reconstructColorImage and reconstructGrayImage are null for now
                            let initPixelData: RawPixelData
                            if (useColor) {
                                initPixelData = reconstructedColorPixelData;
                            } else {
                                initPixelData = reconstructedGrayPixelData;
                            }
                            console.log("Main thread: Setting initial pixel data for reconstruction:", initPixelData);
                            setInitPixelData(initPixelData);
                        } else if (type === 'SVD_ERROR') {
                            console.error("Main thread: Received SVD_ERROR from worker:", error);
                            alert(`An error occurred during SVD processing in worker: ${error}`);
                            // onImageLoaded(imgSrcDataUrl, originalImageData, img.width, img.height, null, null, null); // Use a fresh ImageData or the one from before posting if possible
                        }
                        setIsProcessing(false);
                        // Clean up worker message handler for this specific task to avoid multiple handlers
                        worker.onmessage = null;
                        worker.onerror = null;
                    };

                    worker.onerror = (error) => {
                        console.error("Main thread: Worker error:", error);
                        alert("An unexpected error occurred with the SVD worker.");
                        // onImageLoaded(imgSrcDataUrl, rawImgData, img.width, img.height, null, null, null); // Use a fresh ImageData or the one from before posting if possible
                        setIsProcessing(false);
                        worker.onmessage = null;
                        worker.onerror = null;
                    };
                };

                img.onerror = () => {
                    console.error("Image load error (Image object)");
                    alert("Could not load image data from file.");
                    // onImageLoaded(localImgSrcDataUrl || "error_url", new ImageData(1, 1), 0, 0, null, null, null); // Pass placeholder values
                    setIsProcessing(false);
                };
                img.src = imgSrcDataUrl;

            } else {
                alert("Failed to read file content.");
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
            console.error("File reading error (FileReader)");
            alert("An error occurred while reading the file.");
            setIsProcessing(false);
        };
        reader.readAsDataURL(file);
    };

    // // This is the internal processing logic as per your last full snippet for ImageSelectionPanel
    // const processImageAndCallBack2 = (file: File) => {
    //     // This component itself does not set a global isLoading flag via props,
    //     // it relies on the parent's isLoading prop to disable its UI.
    //     // The onImageLoaded callback signals completion (or failure) to the parent.

    //     if (!file.type.startsWith("image/")) {
    //         alert("Please select an image file (e.g., PNG, JPG, GIF).");
    //         return;
    //     }
    //     const reader = new FileReader();
    //     reader.onload = async (loadEvent) => {
    //         setIsProcessing(true);
    //         if (loadEvent.target?.result) {
    //             const imgSrcDataUrl = loadEvent.target.result as string;
    //             const img = new Image();
    //             img.onload = async () => {
    //                 const canvas = document.createElement("canvas");
    //                 const ctx = canvas.getContext("2d");
    //                 if (!ctx) {
    //                     console.error("Could not get canvas context");
    //                     alert("Could not get canvas context");
    //                     // onImageLoaded(imgSrcDataUrl, new ImageData(1, 1), img.width, img.height, null);
    //                     return;
    //                 }
    //                 canvas.width = img.width;
    //                 canvas.height = img.height;
    //                 ctx.drawImage(img, 0, 0);
    //                 const rawImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    //                 try {
    //                     const colorSvdResult = await performColorSVD(rawImgData);
    //                     onImageLoaded(imgSrcDataUrl, rawImgData, img.width, img.height, colorSvdResult);
    //                 } catch (error) {
    //                     console.error("SVD Processing Error in Panel:", error);
    //                     alert("An error occurred during SVD processing within selection panel.");
    //                     // onImageLoaded(imgSrcDataUrl, rawImgData, img.width, img.height, null);
    //                 }
    //             };
    //             img.onerror = () => {
    //                 console.error("Image load error (Image object)");
    //                 alert("Could not load image data from file.");
    //                 // onImageLoaded(imgSrcDataUrl, new ImageData(1, 1), 0, 0, null);
    //             };
    //             img.src = imgSrcDataUrl;
    //         } else {
    //             alert("Failed to read file content.");
    //         }
    //         setIsProcessing(false);
    //     };
    //     reader.onerror = () => {
    //         console.error("File reading error (FileReader)");
    //         alert("An error occurred while reading the file.");
    //         setIsProcessing(false);
    //     };
    //     reader.readAsDataURL(file);
    // };

    const handleSampleImageClick = async (sample: SampleImage) => {
        if (isLoading || sample.id === selectedSampleId) return; // Prevent action if parent indicates it's busy
        setSelectedSampleId(sample.id);
        try {
            const filename = sample.thumbnailUrl.split("/").pop() || `${sample.id}_sample.jpg`;
            const file = await urlToFile(sample.fullUrl, filename);
            processImageAndCallBack(file); // Use the internal processing
        } catch (err) {
            console.error("Error preparing sample image file:", err);
            alert("Failed to load sample image.");
            // setSelectedSampleId(null); // Optionally reset selection on fetch error
        }
    };

    // This is the callback for the child ImageUpload component
    // It now assumes ImageUpload's prop is `onFileSelected` that just gives the File.
    // If your ImageUpload still has the onImageUploaded with SVD logic, you need to adapt this.
    const handleFileFromUploadComponent = (file: File) => {

        // 1. Create an Object URL for the selected file
        const objectURL = URL.createObjectURL(file);
        console.log("Generated Object URL for original image:", objectURL);

        if (isLoading) return;
        setSelectedSampleId(null); // Clear visual sample selection
        processImageAndCallBack(file);
    };


    return (
        // Add `relative` for the overlay positioning
        <Card className={`h-full flex flex-col overflow-hidden relative ${className}`}>
            <CardHeader className="flex-shrink-0">
                <CardTitle>SVD Image Dimension Reduction</CardTitle>
                <CardDescription>
                    Upload an image or select a sample to analyze.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-y-hidden p-4 md:p-6">
                <div className="flex-shrink-0 mb-4">
                    <ImageUpload
                        processImage={handleFileFromUploadComponent} // Changed prop name
                        disabled={isLoading}
                    />
                </div>

                {sampleImages.length > 0 && <hr className="border-border my-1 flex-shrink-0" />}

                {sampleImages.length > 0 && (
                    // Wrapper for ScrollArea
                    <div className="flex-1 flex flex-col min-h-0 mt-3">
                        {/* ScrollArea should be direct child for flex sizing to work correctly if there are other elements here later */}
                        <div className="p-2 grid grid-cols-2 gap-3 overflow-x-hidden">
                            {sampleImages.map((sample) => (
                                <div
                                    key={sample.id}
                                    className={`
                                            flex flex-col items-center text-center p-2 rounded-lg border-2 
                                            transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                                            ${isLoading ? 'cursor-not-allowed opacity-60 pointer-events-none' : 'cursor-pointer'}
                                            ${selectedSampleId === sample.id
                                            ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 shadow-sm'
                                            : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                        }
                                        `}
                                    onClick={() => !isLoading && handleSampleImageClick(sample)}
                                    role="button"
                                    tabIndex={isLoading ? -1 : 0}
                                    aria-pressed={selectedSampleId === sample.id}
                                    aria-label={`Select sample image: ${sample.name}`}
                                    aria-disabled={isLoading}
                                >
                                    <div className="w-full aspect-square rounded-md overflow-hidden mb-1.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 relative">
                                        <img
                                            src={sample.thumbnailUrl}
                                            alt={sample.name}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-foreground dark:text-neutral-300 truncate w-full px-1">
                                        {sample.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {sampleImages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center min-h-0">
                        <p className="text-xs text-muted-foreground text-center py-4">No sample images configured.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}