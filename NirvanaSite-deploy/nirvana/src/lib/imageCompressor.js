/**
 * Native Browser Image Compressor
 * Converts uploads to highly-compressed WebP format and caps resolutions
 * directly in the user's browser BEFORE sending to Supabase Storage.
 * This completely halts multi-megabyte egress bloat from origin uploads.
 */

export const compressImageToWebp = (file, { maxWidth = 1920, quality = 0.8 } = {}) => {
    return new Promise((resolve, reject) => {
        // Skip non-image files or SVGs (SVG cannot be compressed this way)
        if (!file || !file.type.startsWith('image/') || file.type.includes('svg')) {
            return resolve(file); 
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let targetWidth = img.width;
                let targetHeight = img.height;

                // Downscale resolution if it exceeds limits (e.g. 4K original)
                if (targetWidth > maxWidth) {
                    targetHeight = Math.round((maxWidth / targetWidth) * targetHeight);
                    targetWidth = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');

                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Convert canvas to WebP Blob (Supported in almost all modern browsers)
                canvas.toBlob((blob) => {
                    if (!blob) {
                        return resolve(file); // gracefully fail 
                    }
                    
                    // Rename output file gracefully
                    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                    const compressedFile = new File([blob], newFileName, {
                        type: 'image/webp',
                        lastModified: Date.now()
                    });

                    resolve(compressedFile);
                }, 'image/webp', quality);
            };
            img.onerror = () => resolve(file); 
        };
        reader.onerror = () => resolve(file);
    });
};
