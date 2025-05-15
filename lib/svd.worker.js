import { performColorSVD } from "./svd";

self.onmessage = async (event) => {
    const { type, payload } = event.data;

    if (type === 'CALCULATE_SVD') {
        const rawImageData = payload; // payload is expected to be ImageData

        if (!rawImageData || !rawImageData.data || !rawImageData.width || !rawImageData.height) {
            self.postMessage({ type: 'SVD_ERROR', error: 'Invalid ImageData received in worker' });
            return;
        }

        try {

            console.log("Worker: Starting SVD calculation for image data:", rawImageData.width, "x", rawImageData.height);
            const colorSvdResult = await performColorSVD(rawImageData);
            self.postMessage({ type: 'SVD_RESULT', result: colorSvdResult, originalImageData: rawImageData });
        } catch (error) {
            console.error("Worker: SVD Calculation Error", error);
            self.postMessage({ type: 'SVD_ERROR', error: error.message || 'Unknown SVD error in worker' });
        }
    }
};