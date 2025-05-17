import { performColorSVD, reconstructGrayPixelData, reconstructColorPixelData, performGrayscaleSVD } from "./svd";

self.onmessage = async (event) => {
    const { type, payload, useColor } = event.data;

    if (type === 'CALCULATE_SVD') {
        const rawImageData = payload; // payload is expected to be ImageData

        if (!rawImageData || !rawImageData.data || !rawImageData.width || !rawImageData.height) {
            self.postMessage({ type: 'SVD_ERROR', error: 'Invalid ImageData received in worker' });
            return;
        }

        try {
            const { width, height } = rawImageData;
            console.log("Worker: Starting SVD calculation for image data:", width, "x", height);

            // Create reconstructed matrices for each channel
            // if (useColor) {
            console.log("Calculate color image SVD data")
            const colorSvdResult = await performColorSVD(rawImageData);
            const colorPixelData = await reconstructColorPixelData(colorSvdResult, colorSvdResult.r.s.length, width, height)
            // } else if (!useColor && rawImageData) {
            console.log("Calculate grayscale image SVD data")
            const grayscaleSvdResult = await performGrayscaleSVD(rawImageData);
            console.log("Grayscale SVD result:", grayscaleSvdResult);
            const grayPixelData = await reconstructGrayPixelData(grayscaleSvdResult, grayscaleSvdResult.s.length, width, height)
            console.log("Grayscale pixel data:", grayPixelData);
            // }


            console.log("Worker onImageLoaded - reconstructedColorPxData:", colorPixelData); // CRITICAL LOG
            console.log("Worker onImageLoaded - reconstructedGrayPxData:", grayPixelData);   // CRITICAL LOG

            self.postMessage({
                type: 'SVD_RESULT', colorSvdResult: colorSvdResult, grayscaleSvdResult: grayscaleSvdResult,
                originalImageData: rawImageData,
                reconstructedColorPixelData: colorPixelData,
                reconstructedGrayPixelData: grayPixelData
            });
        } catch (error) {
            console.error("Worker: SVD Calculation Error", error);
            self.postMessage({ type: 'SVD_ERROR', error: error.message || 'Unknown SVD error in worker' });
        }
    }
};