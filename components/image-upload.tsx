"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, ImageIcon } from "lucide-react"
import { performColorSVD, performSVD } from "@/lib/svd"
import { SvdData } from "@/lib/utils"



interface ImageUploadProps {
    onImageUploaded: (
        imageData: string,
        rawImageData: ImageData,
        width: number,
        height: number,
        svdData: { r: SvdData, g: SvdData, b: SvdData } | null,
    ) => void
    // onProcessingStart: () => void
}

export default function ImageUpload({ onImageUploaded }: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processImage(e.dataTransfer.files[0])
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processImage(e.target.files[0])
        }
    }

    const processImage = (file: File) => {
        if (!file.type.match("image.*")) {
            alert("Please select an image file")
            return
        }

        const reader = new FileReader()
        reader.onload = async (e) => {
            if (e.target?.result) {
                const img = new Image()
                img.onload = async () => {
                    // Create a canvas to get image data
                    const canvas = document.createElement("canvas")
                    const ctx = canvas.getContext("2d")

                    if (!ctx) {
                        console.error("Could not get canvas context")
                        return
                    }

                    // Set canvas dimensions to match image
                    canvas.width = img.width
                    canvas.height = img.height

                    // Draw image on canvas
                    ctx.drawImage(img, 0, 0)

                    // Get image data
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

                    // Perform SVD on the image data (3 channels applied conversion happens inside)
                    const svdData = await performColorSVD(imageData)

                    // Pass the original image data, dimensions, and SVD data to the parent component
                    onImageUploaded(e.target?.result as string, imageData, img.width, img.height, svdData)
                }
                img.src = e.target.result as string
            }
        }
        reader.readAsDataURL(file)
    }

    return (
        <>
            {/* <div className="h-full overflow-auto"> */}
            <Card
                className={`border-2 border-dashed ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                    } transition-colors duration-200 cursor-pointer`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-muted p-6">
                        {isDragging ? (
                            <ImageIcon className="h-10 w-10 text-primary" />
                        ) : (
                            <Upload className="h-10 w-10 text-muted-foreground" />
                        )}
                    </div>
                    <div className="mb-2 text-xl font-medium">{isDragging ? "Drop image here" : "Upload an image"}</div>
                    <p className="mb-4 text-sm text-muted-foreground max-w-xs">
                        Drag and drop an image file here, or click to select a file
                    </p>
                    <Button variant="outline" size="sm">
                        Select Image
                    </Button>
                </CardContent>
            </Card>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            {/* </div> */}
        </>
    )
}
