import { useState, useEffect } from 'react';

export function useAccentColor(imageUrl: string | undefined): string | null {
  const [accent, setAccent] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) { setAccent(null); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const SIZE = 64;
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, SIZE, SIZE);

        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        let rSum = 0, gSum = 0, bSum = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          // Only colorful, non-blown-out pixels
          if (max - min > 40 && max > 40 && max < 240) {
            rSum += r; gSum += g; bSum += b; count++;
          }
        }

        if (count > SIZE * SIZE * 0.04) {
          setAccent(
            `rgb(${Math.round(rSum / count)}, ${Math.round(gSum / count)}, ${Math.round(bSum / count)})`
          );
        } else {
          setAccent(null);
        }
      } catch {
        // Canvas tainted (CORS) — degrade gracefully
        setAccent(null);
      }
    };

    img.onerror = () => setAccent(null);
    img.src = imageUrl;
  }, [imageUrl]);

  return accent;
}
