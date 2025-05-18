// "use client"

// import { useState, useEffect } from "react"
// import { Slider } from "@/components/ui/slider"
// import { Button } from "@/components/ui/button"
// import { Loader2 } from "lucide-react"
// import { SvdData } from "@/lib/utils"

// interface SvdSliderProps {
//     svdData: {
//         r: SvdData
//         g: SvdData
//         b: SvdData
//     }
//     width: number
//     height: number
//     onReconstructed: (imageData: string) => void
//     onValueChange: (value: number) => void
//     maxValue: number
//     initialValue: number
// }

// export default function SvdSlider({
//     svdData,
//     width,
//     height,
//     onReconstructed,
//     onValueChange,
//     maxValue,
//     initialValue,
// }: SvdSliderProps) {
//     const [value, setValue] = useState<number>(initialValue)
//     const [isProcessing, setIsProcessing] = useState<boolean>(false)
//     const [presets, setPresets] = useState<number[]>([])

//     useEffect(() => {
//         // Calculate some preset values based on the max value
//         if (maxValue > 0) {
//             const step = Math.max(1, Math.floor(maxValue / 5))
//             const presetValues = [
//                 1,
//                 Math.floor(maxValue * 0.05),
//                 Math.floor(maxValue * 0.1),
//                 Math.floor(maxValue * 0.25),
//                 Math.floor(maxValue * 0.5),
//                 maxValue,
//             ].filter((v, i, a) => v > 0 && a.indexOf(v) === i)

//             setPresets(presetValues)
//         }
//     }, [maxValue])

//     useEffect(() => {
//         setValue(initialValue)
//     }, [initialValue])

//     useEffect(() => {
//         const updateImage = async () => {
//             setIsProcessing(true)
//             try {
//                 // Use a small timeout to allow the UI to update before heavy computation
//                 // setTimeout(async () => {
//                 try {
//                     const reconstructedImageData = await reconstructColor(svdData, value, width, height)
//                     onReconstructed(reconstructedImageData)
//                     onValueChange(value)
//                 } catch (error) {
//                     console.error("Error in image reconstruction:", error)
//                     // If reconstruction fails, try with a smaller k value
//                     if (value > 1) {
//                         console.log("Trying with a smaller k value:", value - 1)
//                         setValue(value - 1)
//                     }
//                 } finally {
//                     setIsProcessing(false)
//                 }
//                 // }, 50)
//             } catch (error) {
//                 console.error("Error reconstructing image:", error)
//                 setIsProcessing(false)
//             }
//         }

//         updateImage()
//     }, [value, svdData, width, height, onReconstructed, onValueChange])

//     const handleSliderChange = (newValue: number[]) => {
//         setValue(newValue[0])
//     }

//     return (
//         <div className="space-y-6">
//             <div className="flex items-center gap-4">
//                 <div className="w-full">
//                     <Slider
//                         value={[value]}
//                         min={1}
//                         max={maxValue}
//                         step={1}
//                         onValueChange={handleSliderChange}
//                         disabled={isProcessing}
//                     />
//                 </div>
//                 <div className="w-24 flex items-center justify-center">
//                     {isProcessing ? (
//                         <Loader2 className="h-4 w-4 animate-spin" />
//                     ) : (
//                         <div className="text-sm font-medium">
//                             {value} / {maxValue}
//                         </div>
//                     )}
//                 </div>
//             </div>

//             <div className="flex flex-wrap gap-2">
//                 {presets.map((presetValue) => (
//                     <Button
//                         key={presetValue}
//                         variant={value === presetValue ? "default" : "outline"}
//                         size="sm"
//                         onClick={() => setValue(presetValue)}
//                         disabled={isProcessing}
//                     >
//                         {presetValue === 1
//                             ? "1"
//                             : presetValue === maxValue
//                                 ? "All"
//                                 : `${Math.round((presetValue / maxValue) * 100)}%`}
//                     </Button>
//                 ))}
//             </div>
//         </div>
//     )
// }
