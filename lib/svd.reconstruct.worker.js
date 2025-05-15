// imageProcessing.worker.js
import {
    performColorSVD,
    performSVD as performGrayscaleSVD,
    reconstructColorImage as reconstructColorInWorker, // Rename for clarity
    reconstructGrayImage as reconstructGrayInWorker    // Rename for clarity
} from './svd'; // Adjust path

self.onmessage = async (event) => {
    const { type, operation, payload } = event.data;

    if (type === 'PROCESS_IMAGE_DATA') { // For SVD calculation
        const rawImageData = payload;
        // ... (SVD calculation logic as before, for CALCOLATE_COLOR_SVD or CALCOLATE_GRAYSCALE_SVD)
        // ... Sends 'PROCESSING_RESULT' with svdResult or 'PROCESSING_ERROR'
        // For SVD calculation
        if (!rawImageData || !rawImageData.data || !rawImageData.width || !rawImageData.height || rawImageData.data.byteLength === 0) {
            self.postMessage({ type: 'PROCESSING_ERROR', operation, error: 'Invalid ImageData for SVD in worker' });
            return;
        }
        try {
            let svdResult;
            if (operation === 'CALCULATE_COLOR_SVD') {
                svdResult = await performColorSVD(rawImageData);
            } else if (operation === 'CALCULATE_GRAYSCALE_SVD') {
                svdResult = await performGrayscaleSVD(rawImageData);
            } else {
                throw new Error('Unknown SVD operation');
            }
            self.postMessage({ type: 'PROCESSING_RESULT', operation, result: svdResult });
        } catch (error) {
            self.postMessage({ type: 'PROCESSING_ERROR', operation, error: error.message || 'SVD Error in worker' });
        }

    } else if (type === 'RECONSTRUCT_IMAGE') { // New type for reconstruction
        const { svdDataForRecon, k, width, height, useColorMode } = payload;

        if (!svdDataForRecon || k === undefined || !width || !height) {
            self.postMessage({ type: 'RECONSTRUCTION_ERROR', error: 'Invalid payload for reconstruction' });
            return;
        }

        try {
            let reconstructedImageData;
            console.log(`Worker: Reconstructing ${useColorMode ? 'COLOR' : 'GRAYSCALE'} image. K=${k}, W=${width}, H=${height}`);
            if (useColorMode) {
                if (!svdDataForRecon.color) throw new Error("Color SVD data missing for reconstruction.");
                reconstructedImageData = await reconstructColorInWorker(svdDataForRecon.color, k, width, height);
            } else {
                if (!svdDataForRecon.grayscale) throw new Error("Grayscale SVD data missing for reconstruction.");
                reconstructedImageData = await reconstructGrayInWorker(svdDataForRecon.grayscale, k, width, height);
            }

            if (!reconstructedImageData) {
                throw new Error("Reconstruction function returned null/undefined");
            }

            console.log("Worker: Reconstruction finished. Posting reconstructed ImageData.");
            // Reconstructed ImageData's buffer is transferred back to the main thread
            self.postMessage({
                type: 'RECONSTRUCTION_RESULT',
                imageData: reconstructedImageData,
                // Optionally include params for main thread to verify if it's for the current request
                paramsForVerification: { k_used: k, mode: useColorMode ? 'color' : 'gray' }
            }, [reconstructedImageData.data.buffer]);

        } catch (error) {
            console.error("Worker: Reconstruction Error", error);
            self.postMessage({ type: 'RECONSTRUCTION_ERROR', error: error.message || 'Unknown reconstruction error in worker' });
        }
    }
};