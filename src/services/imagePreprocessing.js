export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getCanvas(img) {
  const canvas = document.createElement('canvas');
  canvas.width  = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx };
}

function getData(ctx, w, h) {
  return ctx.getImageData(0, 0, w, h);
}

function putData(ctx, data) {
  ctx.putImageData(data, 0, 0);
}

export function toGrayscale(ctx, w, h) {
  const d = getData(ctx, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    const gray = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
    d.data[i] = d.data[i + 1] = d.data[i + 2] = gray;
  }
  putData(ctx, d);
}

function otsuThresholdValue(d) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.data.length; i += 4) hist[Math.round(d.data[i])]++;
  const total = d.data.length / 4;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, wF = 0;
  let maxVariance = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVariance) { maxVariance = between; threshold = t; }
  }
  return threshold;
}

export function otsuBinarize(ctx, w, h) {
  const d = getData(ctx, w, h);
  toGrayscale(ctx, w, h);
  const gray = getData(ctx, w, h);
  const threshold = otsuThresholdValue(gray);
  for (let i = 0; i < d.data.length; i += 4) {
    const val = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
    const bw = val >= threshold ? 255 : 0;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = bw;
    d.data[i + 3] = 255;
  }
  putData(ctx, d);
}

export function adaptiveThreshold(ctx, w, h, blockSize = 15, c = 10) {
  const gray = getData(ctx, w, h);
  toGrayscale(ctx, w, h);
  const d = getData(ctx, w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      const half = Math.floor(blockSize / 2);
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const px = x + dx, py = y + dy;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            sum += gray.data[(py * w + px) * 4];
            count++;
          }
        }
      }
      const mean = sum / count;
      const idx = (y * w + x) * 4;
      const val = d.data[idx] >= (mean - c) ? 255 : 0;
      d.data[idx] = d.data[idx + 1] = d.data[idx + 2] = val;
      d.data[idx + 3] = 255;
    }
  }
  putData(ctx, d);
}

export function medianFilter(ctx, w, h, size = 3) {
  const src = getData(ctx, w, h);
  const dst = new ImageData(new Uint8ClampedArray(src.data), w, h);
  const half = Math.floor(size / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const neighbors = [];
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const px = x + dx, py = y + dy;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const idx = (py * w + px) * 4;
            neighbors.push(src.data[idx], src.data[idx + 1], src.data[idx + 2]);
          }
        }
      }
      neighbors.sort((a, b) => a - b);
      const median = neighbors[Math.floor(neighbors.length / 2)];
      const idx = (y * w + x) * 4;
      dst.data[idx] = dst.data[idx + 1] = dst.data[idx + 2] = median;
      dst.data[idx + 3] = 255;
    }
  }
  putData(ctx, dst);
}

export function adjustContrast(ctx, w, h, factor = 1.5) {
  const d = getData(ctx, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i]     = Math.max(0, Math.min(255, 128 + (d.data[i] - 128) * factor));
    d.data[i + 1] = Math.max(0, Math.min(255, 128 + (d.data[i + 1] - 128) * factor));
    d.data[i + 2] = Math.max(0, Math.min(255, 128 + (d.data[i + 2] - 128) * factor));
  }
  putData(ctx, d);
}

export function sharpen(ctx, w, h, intensity = 1) {
  const src = getData(ctx, w, h);
  const kernel = [0, -intensity, 0, -intensity, 1 + 4 * intensity, -intensity, 0, -intensity, 0];
  const dst = new ImageData(new Uint8ClampedArray(src.data), w, h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = (ky + 1) * 3 + (kx + 1);
          const pidx = ((y + ky) * w + (x + kx)) * 4;
          const k = kernel[kidx];
          r += src.data[pidx] * k;
          g += src.data[pidx + 1] * k;
          b += src.data[pidx + 2] * k;
        }
      }
      const idx = (y * w + x) * 4;
      dst.data[idx]     = Math.max(0, Math.min(255, r));
      dst.data[idx + 1] = Math.max(0, Math.min(255, g));
      dst.data[idx + 2] = Math.max(0, Math.min(255, b));
      dst.data[idx + 3] = 255;
    }
  }
  putData(ctx, dst);
}

export function invert(ctx, w, h) {
  const d = getData(ctx, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i]     = 255 - d.data[i];
    d.data[i + 1] = 255 - d.data[i + 1];
    d.data[i + 2] = 255 - d.data[i + 2];
  }
  putData(ctx, d);
}

export function upscale(ctx, w, h, factor = 2) {
  const src = getData(ctx, w, h);
  const nw = Math.round(w * factor), nh = Math.round(h * factor);
  const dst = document.createElement('canvas');
  dst.width = nw; dst.height = nh;
  const dCtx = dst.getContext('2d');
  dCtx.imageSmoothingEnabled = false;
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(Math.floor(x / factor), w - 1);
      const sy = Math.min(Math.floor(y / factor), h - 1);
      const sidx = (sy * w + sx) * 4;
      const didx = (y * nw + x) * 4;
      const imgData = dCtx.createImageData(1, 1);
      imgData.data[0] = src.data[sidx];
      imgData.data[1] = src.data[sidx + 1];
      imgData.data[2] = src.data[sidx + 2];
      imgData.data[3] = 255;
      dCtx.putImageData(imgData, x, y);
    }
  }
  return dst;
}

export async function previewPreprocessing(imgSrc, options) {
  const img = await loadImage(imgSrc);
  const { canvas, ctx } = getCanvas(img);
  const w = canvas.width, h = canvas.height;

  if (options.grayscale) toGrayscale(ctx, w, h);
  if (options.binarize === 'otsu') otsuBinarize(ctx, w, h);
  else if (options.binarize === 'adaptive') adaptiveThreshold(ctx, w, h, options.adaptiveBlock || 15, options.adaptiveC || 10);
  if (options.denoise) medianFilter(ctx, w, h, options.denoiseKernel || 3);
  if (options.contrast) adjustContrast(ctx, w, h, options.contrastFactor || 1.5);
  if (options.sharpen) sharpen(ctx, w, h, options.sharpenIntensity || 1);
  if (options.invert) invert(ctx, w, h);

  return { canvas, ctx };
}

export async function applyPreprocessing(imgSrc, options) {
  const { canvas } = await previewPreprocessing(imgSrc, options);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export const DEFAULT_PREPROCESS_OPTIONS = {
  grayscale: false,
  binarize: 'none',
  denoise: false,
  denoiseKernel: 3,
  contrast: false,
  contrastFactor: 1.5,
  sharpen: false,
  sharpenIntensity: 1,
  invert: false,
};
