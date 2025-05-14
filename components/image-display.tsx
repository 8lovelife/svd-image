"use client"

import { useEffect, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface ImageDisplayProps {
    imageData: string | null
    width: number
    height: number
    label?: string
    isLoading?: boolean
}

export default function ImageDisplay({ imageData, width, height, label, isLoading = false }: ImageDisplayProps) {
    const imgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        if (imgRef.current && imageData) {
            imgRef.current.src = imageData
        }
    }, [imageData])

    if (isLoading) {
        return (
            <div className="relative flex items-center justify-center">
                <Skeleton className="w-full aspect-[4/3]" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-muted-foreground">Processing...</div>
                </div>
            </div>
        )
    }

    if (!imageData) {
        return (
            <div className="flex items-center justify-center border rounded-lg p-4 bg-muted/10 h-48">
                <p className="text-muted-foreground">No image available</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-full overflow-hidden rounded-lg border bg-background">
                <img
                    ref={imgRef}
                    src={imageData || "/placeholder.svg"}
                    alt={label || "Image"}
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: "300px" }}
                />
            </div>
            {label && <div className="mt-2 text-sm text-muted-foreground">{label}</div>}
        </div>
    )
}
