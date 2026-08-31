export const compressImage = (file, maxWidth = 1600, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve(file); // Not an image or no file
      return;
    }
    
    // If it's a small file already (e.g., < 800KB), don't compress
    if (file.size < 800 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        
        // Preserve PNG if original is PNG, otherwise use WebP for better compression
        const mimeType = file.type === "image/png" ? "image/png" : "image/webp";
        
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file); // Fallback to original if compression fails
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + (mimeType === "image/webp" ? ".webp" : ".png"), {
            type: mimeType,
            lastModified: Date.now(),
          });
          
          // If compressed is somehow larger, use original
          if (compressedFile.size > file.size) {
            resolve(file);
          } else {
            resolve(compressedFile);
          }
        }, mimeType, quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};
