"use client"

import type React from "react" // No need for 'type' if you're not using React.FC etc. and have "jsx": "react-jsx" in tsconfig
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card" // Removed CardHeader, etc. as not used
import { Upload, ImageIcon } from "lucide-react"
import { performColorSVD } from "@/lib/svd" // Assuming performSVD is not directly used here
import { SvdData, ColorSvdData } from "@/lib/utils" // Assuming ColorSvdData is {r:SvdData, g:SvdData, b:SvdData}


interface ImageUploadProps {
    processImage: (file: File) => void
    disabled?: boolean; // Added disabled prop
}

export default function ImageUpload({ processImage, disabled = false }: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleTriggerClick = () => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { // Typed event for Card
        if (disabled) return;
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { // Typed event
        if (disabled) return;
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { // Typed event
        if (disabled) return;
        e.preventDefault()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processImage(e.dataTransfer.files[0])
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        if (e.target.files && e.target.files[0]) {
            processImage(e.target.files[0])
        }
    }

    return (
        <>
            <Card
                className={`
                    border-2 border-dashed 
                    ${isDragging && !disabled ? "border-primary bg-primary/10" : "border-muted-foreground/20 hover:border-muted-foreground/40"}
                    ${disabled ? "cursor-not-allowed bg-muted/20" : "cursor-pointer"}
                    transition-colors duration-200
                    w-full max-w-md mx-auto rounded-lg shadow-sm`} // Constrain width and center
                onClick={handleTriggerClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role={disabled ? undefined : "button"}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTriggerClick(); }}
            >
                <CardContent className="flex flex-col items-center justify-center text-center p-6 sm:p-8"> {/* Reduced padding */}
                    <div className={`mb-3 rounded-full p-4 ${disabled ? 'bg-muted/50' : 'bg-muted group-hover:bg-muted/80'}`}> {/* Reduced icon padding and margin */}
                        {isDragging && !disabled ? (
                            <ImageIcon className="h-8 w-8 text-primary" /> // Smaller icon
                        ) : (
                            <Upload className={`h-8 w-8 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} /> // Smaller icon
                        )}
                    </div>
                    <div className={`mb-1 text-lg font-medium ${disabled ? 'text-muted-foreground/70' : ''}`}> {/* Reduced margin */}
                        {isDragging && !disabled ? "Drop image here" : "Upload an image"}
                    </div>
                    <p className={`mb-3 text-xs sm:text-sm text-muted-foreground max-w-xs ${disabled ? 'text-muted-foreground/70' : ''}`}> {/* Reduced margin & text size */}
                        Drag & drop or click to select a file
                    </p>
                    {!disabled && (
                        <Button variant="outline" size="sm" className="h-8 px-3 text-xs sm:text-sm"> {/* Smaller button */}
                            Select Image
                        </Button>
                    )}
                </CardContent>
            </Card>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*" // Be more specific if needed, e.g., "image/png, image/jpeg"
                className="hidden"
                disabled={disabled}
            />
        </>
    )
}