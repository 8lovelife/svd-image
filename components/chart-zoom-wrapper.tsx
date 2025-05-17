"use client"

import { useState, type ReactNode, useRef, useEffect } from "react"
import { X, Maximize2 } from 'lucide-react'

interface ChartZoomWrapperProps {
    children: ReactNode
    title?: string
}

export function ChartZoomWrapper({ children, title }: ChartZoomWrapperProps) {
    const [isZoomed, setIsZoomed] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [parentCard, setParentCard] = useState<HTMLElement | null>(null)

    // Find the parent Card element when component mounts
    useEffect(() => {
        if (containerRef.current) {
            // Find the closest parent Card element
            let element = containerRef.current.parentElement
            while (element) {
                if (element.classList.contains('h-full') && element.classList.contains('flex') && element.classList.contains('flex-col')) {
                    setParentCard(element)
                    break
                }
                element = element.parentElement
            }
        }
    }, [])

    const handleZoomToggle = () => {
        setIsZoomed(!isZoomed)
    }

    return (
        <>
            {/* Regular chart container with click handler */}
            <div className="relative w-full h-full" ref={containerRef}>
                <div className="absolute top-2 right-2 z-10">
                    <button
                        onClick={handleZoomToggle}
                        className="bg-white/80 hover:bg-white text-gray-700 p-1.5 rounded-md shadow-sm transition-colors border"
                        title="Expand chart"
                    >
                        <Maximize2 size={16} />
                    </button>
                </div>
                <div className="w-full h-full">{children}</div>
            </div>

            {/* Modal overlay for zoomed view - contained within the Card */}
            {isZoomed && (
                <div
                    className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                    }}
                    onClick={handleZoomToggle}
                >
                    <div
                        className="bg-white rounded-lg w-[95%] max-h-[90%] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-medium">{title || "Chart Detail View"}</h3>
                            <button onClick={handleZoomToggle} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 p-6 overflow-auto">{children}</div>
                    </div>
                </div>
            )}
        </>
    )
}
