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
                    ${isDragging && !disabled ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-muted-foreground/10 hover:border-muted-foreground/20 dark:border-muted-foreground/20 dark:hover:border-muted-foreground/30"}
                    ${disabled ? "cursor-not-allowed bg-muted/10 dark:bg-muted/20" : "cursor-pointer"}
                    transition-colors duration-150 
                    w-full max-w-xs mx-auto rounded-md shadow-sm`}
                onClick={handleTriggerClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role={disabled ? undefined : "button"}
                tabIndex={disabled ? -1 : 0}
            >
                <CardContent className="flex flex-col items-center justify-center text-center p-3 sm:p-4"> {/* Significantly reduced padding */}
                    <div className={`mb-1 rounded-full p-2 ${disabled ? 'bg-muted/30 dark:bg-muted/50' : 'bg-muted/50 dark:bg-muted/70 group-hover:bg-muted/70 dark:group-hover:bg-muted/90'}`}> {/* Reduced margin and padding for icon wrapper */}
                        {isDragging && !disabled ? (
                            <ImageIcon className="h-5 w-5 text-primary" />
                        ) : (
                            <Upload className={`h-5 w-5 ${disabled ? 'text-muted-foreground/30 dark:text-muted-foreground/40' : 'text-muted-foreground/70 dark:text-muted-foreground/60'}`} />
                        )}
                    </div>
                    <div className={`mb-0.5 text-sm font-medium ${disabled ? 'text-muted-foreground/50 dark:text-muted-foreground/60' : 'text-foreground'}`}> {/* Smaller font, tiny margin */}
                        {isDragging && !disabled ? "Drop here" : "Upload File"} {/* Shorter text */}
                    </div>
                    <p className={`text-xs text-muted-foreground/80 dark:text-muted-foreground/70 max-w-[90%] mb-1.5 ${disabled ? 'opacity-50' : ''}`}>
                        Drag & drop or click
                    </p>
                </CardContent>
            </Card>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/gif, image/webp"
                className="hidden"
                disabled={disabled}
            />
        </>
    );
}