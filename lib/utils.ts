import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type SvdData = {
  u: number[][]
  s: number[]
  v: number[][]
}

export type ColorSvdData = {
  r: SvdData
  g: SvdData
  b: SvdData
}

export type ImageDataState = {
  originalImage: string
  rawImageData: ImageData
  width: number
  height: number
  svdData: ColorSvdData
}
