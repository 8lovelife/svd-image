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

export type RawPixelData = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}


export type GraySvdData = {
  u: number[][]
  s: number[]
  v: number[][]
}


export type AppSvdData = {
  rawImageData: ImageData; // Raw image data
  grayscale?: GraySvdData | null; // SVD for grayscale, can be null if not computed
  color?: ColorSvdData | null;    // SVD for color, can be null if not computed
} | null; // The entire svdData object can be null