"use client"

import React, { useState, useEffect } from "react"; // Added useEffect for default sample selection
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ColorSvdData } from "@/lib/utils"; // Make sure this path is correct
import ImageUpload from "./image-upload";     // Make sure this path is correct
import { performColorSVD } from "@/lib/svd";    // Make sure this path is correct

// Define SampleImage type as used in the component
export interface SampleImage {
    id: string;
    name: string;
    thumbnailUrl: string;
    fullUrl: string; // Needed for handleSampleImageClick
}

const sampleImages: SampleImage[] = [ // Using 'sampleImages' as defined in your last component snippet
    { id: 'sample_goose', name: 'Goose', thumbnailUrl: '/images/samples/goose_thumb.jpg', fullUrl: '/images/samples/goose_full.jpg' },
    { id: 'sample_cat', name: 'Cat', thumbnailUrl: '/images/samples/cat_thumb.jpg', fullUrl: '/images/samples/cat_full.jpg' },
    { id: 'sample_dog', name: 'Dog', thumbnailUrl: '/images/samples/dog_thumb.jpg', fullUrl: '/images/samples/dog_full.jpg' },
    { id: 'sample_landscape', name: 'Landscape', thumbnailUrl: '/images/samples/landscape_thumb.jpg', fullUrl: '/images/samples/landscape_full.jpg' },
    { id: 'sample_abstract', name: 'Abstract', thumbnailUrl: '/images/samples/abstract_thumb.jpg', fullUrl: '/images/samples/abstract_full.jpg' },
    { id: 'sample_lena', name: 'Lena', thumbnailUrl: '/images/samples/lena_thumb.png', fullUrl: '/images/samples/lena_full.png' },
];

interface ImageSelectionPanelProps {
    onImageLoaded: ( // This callback is called AFTER SVD processing WITHIN this component
        imageDataUrl: string, // Renamed from 'imageData' for clarity
        rawImageData: ImageData,
        width: number,
        height: number,
        svdData: ColorSvdData | null // Allow null if SVD can fail
    ) => void;
    isLoading: boolean; // This prop will disable interactions
    setIsProcessing: (isProcessing: boolean) => void; // Optional: If you want to set a loading state in the parent
    className?: string; // Optional: Allow passing className to the Card
}


export default function ImageSelectionPanel({
    onImageLoaded,
    isLoading, // This is the prop from the parent indicating overall processing
    setIsProcessing,
    className
}: ImageSelectionPanelProps) {
    // selectedSampleId is internal to this component for visual highlighting
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

    // Effect to select the first sample on initial load if no image loaded yet by parent
    useEffect(() => {
        if (!isLoading && sampleImages.length > 0 && !selectedSampleId) {
            // For this example, we assume `onImageLoaded` indicates an image is active in the parent.
            // If parent wants to control initial visual selection, it can pass an `initialSelectedSampleId` prop.
            // For simplicity, let's not auto-load here, just set the first as visually selected if nothing else.
            // If an image gets processed externally, the parent would clear this or this component could take a prop.
            setSelectedSampleId(sampleImages[0].id); // Default visual selection

            // handleSampleImageClick(sampleImages[0]); // Auto-load the first sample
        }
    }, [isLoading]); // Re-evaluate if loading finishes and no sample selected.


    const urlToFile = async (url: string, filename: string): Promise<File> => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        const blob = await response.blob();
        const type = blob.type || 'image/jpeg';
        return new File([blob], filename, { type });
    };

    // This is the internal processing logic as per your last full snippet for ImageSelectionPanel
    const processImageAndCallBack = (file: File) => {
        // This component itself does not set a global isLoading flag via props,
        // it relies on the parent's isLoading prop to disable its UI.
        // The onImageLoaded callback signals completion (or failure) to the parent.

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file (e.g., PNG, JPG, GIF).");
            return;
        }
        const reader = new FileReader();
        reader.onload = async (loadEvent) => {
            setIsProcessing(true);
            if (loadEvent.target?.result) {
                const imgSrcDataUrl = loadEvent.target.result as string;
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        console.error("Could not get canvas context");
                        alert("Could not get canvas context");
                        // onImageLoaded(imgSrcDataUrl, new ImageData(1, 1), img.width, img.height, null);
                        return;
                    }
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const rawImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    try {
                        const colorSvdResult = await performColorSVD(rawImgData);
                        onImageLoaded(imgSrcDataUrl, rawImgData, img.width, img.height, colorSvdResult);
                    } catch (error) {
                        console.error("SVD Processing Error in Panel:", error);
                        alert("An error occurred during SVD processing within selection panel.");
                        // onImageLoaded(imgSrcDataUrl, rawImgData, img.width, img.height, null);
                    }
                };
                img.onerror = () => {
                    console.error("Image load error (Image object)");
                    alert("Could not load image data from file.");
                    // onImageLoaded(imgSrcDataUrl, new ImageData(1, 1), 0, 0, null);
                };
                img.src = imgSrcDataUrl;
            } else {
                alert("Failed to read file content.");
            }
            setIsProcessing(false);
        };
        reader.onerror = () => {
            console.error("File reading error (FileReader)");
            alert("An error occurred while reading the file.");
            setIsProcessing(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSampleImageClick = async (sample: SampleImage) => {
        if (isLoading) return; // Prevent action if parent indicates it's busy
        setSelectedSampleId(sample.id);
        try {
            const filename = sample.thumbnailUrl.split("/").pop() || `${sample.id}_sample.jpg`;
            const file = await urlToFile(sample.thumbnailUrl, filename);
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
        if (isLoading) return;
        setSelectedSampleId(null); // Clear visual sample selection
        processImageAndCallBack(file);
    };


    return (
        <Card className={`h-full flex flex-col overflow-hidden ${className}`}>
            <CardHeader className="flex-shrink-0">
                <CardTitle>SVD Image Dimension Reduction</CardTitle>
                <CardDescription>
                    Upload an image or select a sample to analyze. {/* Simplified */}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-y-hidden p-4 md:p-6">
                <div className="flex-shrink-0 mb-4"> {/* Added mb-4 */}
                    {/* Assuming ImageUpload component now takes an `onFileSelected` prop for the raw File
                        and a `disabled` prop */}
                    <ImageUpload
                        processImage={handleFileFromUploadComponent} // If ImageUpload gives File
                        // If ImageUpload has old prop: onImageUploaded={onImageLoaded}
                        disabled={isLoading} // Pass the isLoading prop to disable ImageUpload
                    />
                </div>

                {sampleImages.length > 0 && <hr className="border-border my-1 flex-shrink-0" />}

                {sampleImages.length > 0 && (
                    <div className="flex-1 flex flex-col min-h-0 mt-3">
                        <ScrollArea className="flex-grow rounded-md border">
                            <div className="p-2 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-2">
                                {sampleImages.map((sample) => (
                                    <div
                                        key={sample.id}
                                        className={`
                                            flex flex-col items-center text-center p-2 rounded-lg border-2 
                                            ${selectedSampleId === sample.id ? 'border-primary bg-primary/10 shadow-md' : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/30'} 
                                            ${isLoading ? 'cursor-not-allowed opacity-60 pointer-events-none' : 'cursor-pointer'} {/* Added pointer-events-none */}
                                            transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                                        `}
                                        onClick={() => !isLoading && handleSampleImageClick(sample)} // Check isLoading
                                        role="button"
                                        tabIndex={isLoading ? -1 : 0} // Make non-tabbable when loading
                                        onKeyDown={(e) => { if (!isLoading && (e.key === "Enter" || e.key === " ")) handleSampleImageClick(sample); }}
                                        aria-pressed={selectedSampleId === sample.id}
                                        aria-label={`Select sample image: ${sample.name}`}
                                        aria-disabled={isLoading} // Set aria-disabled
                                    >
                                        <img
                                            src={sample.thumbnailUrl}
                                            alt={sample.name}
                                            className="h-20 w-20 xs:h-16 xs:w-16 sm:h-20 sm:w-20 rounded-md object-cover mb-1.5 border bg-slate-200"
                                        />
                                        <span className="text-xs font-medium text-foreground truncate w-full px-1">
                                            {sample.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <ScrollBar orientation="vertical" />
                        </ScrollArea>
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