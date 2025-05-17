import { performColorSVD, reconstructGrayPixelData, reconstructColorPixelData, performGrayscaleSVD } from "./svd";

self.onmessage = async (event) => {
    const {
        type,
        payload,
        svdChannelData, // This is the SVD data object
        k,              // This is the k-value
        width,          // This is the width
        height,         // This is the height
        useColor        // This is the useColor boolean
    } = event.data;
    if (type === 'RECONSTRUCT_IMAGE') {
        console.log("Worker: Starting RECONSTRUCT_IMAGE with payload:", svdChannelData, " k:", k, "width:", width, "height:", height, "useColor:", useColor);
        if (!svdChannelData) {
            self.postMessage({ type: 'RECONSTRUCT_IMAGE_ERROR', error: 'Invalid svdData received in worker' });
            return;
        }
        try {

            const k_rank_for_randomizedSVD = Math.min(width, height);


            let colorSvdResult = svdChannelData.color;
            if (!svdChannelData.color && useColor) {
                colorSvdResult = await performColorSVD(payload, k_rank_for_randomizedSVD);
            }

            let grayscaleSvdResult = svdChannelData.grayscale;
            if (!svdChannelData.grayscale && !useColor) {
                grayscaleSvdResult = await performGrayscaleSVD(payload, k_rank_for_randomizedSVD);
            }
            console.log("Worker: Starting  RECONSTRUCT_IMAGE for image data:", width, "x", height, "k:",
                k, "useColor:", useColor, "colorSvdResult", colorSvdResult, "grayscaleSvdResult", grayscaleSvdResult);
            let reconstructedPixelData;
            if (useColor && colorSvdResult) {
                console.log("Reconstructing color image with SVD data")
                reconstructedPixelData = await reconstructColorPixelData(colorSvdResult, k, width, height)
            } else if (!useColor && grayscaleSvdResult) {
                console.log("Reconstructing grayscale image with SVD data")
                reconstructedPixelData = await reconstructGrayPixelData(grayscaleSvdResult, k, width, height)
            }

            console.log("Worker Reconstructing - reconstructedPixelData:", reconstructedPixelData); // CRITICAL LOG

            self.postMessage({
                type: 'RECONSTRUCTION_COMPLETE', pixelData: reconstructedPixelData, k, useColor
            });
        } catch (error) {
            console.error("Worker: SVD Calculation Error", error);
            self.postMessage({ type: 'SVD_ERROR', error: error.message || 'Unknown SVD error in worker' });
        }
    }
};