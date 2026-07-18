import { createFetchClient, resolveApiBase, type FetchResponse } from '@zxkws/shared-fetch';

export type Point = { x: number; y: number };
export type BottomSide = 'red' | 'black';
export type SideToMove = 'w' | 'b';

export type RecognitionResult = {
  fen: string;
  confidence: number | null;
  model: string;
  latencyMs: number;
};

export type ChessMove = {
  move: string;
  score?: string;
  rank?: string;
  note?: string;
  winrate?: string;
};

export type AnalysisResult = {
  fen: string;
  bestMove: string;
  moves: ChessMove[];
  source: string;
};

type ImageSource = HTMLVideoElement | HTMLImageElement;

const api = createFetchClient({
  baseURL: resolveApiBase({
    rawBase: import.meta.env.API_BASE_URL,
    dev: import.meta.env.DEV || import.meta.env.MODE === 'development',
  }),
  responseInterceptors: [
    {
      onFulfilled: (response: FetchResponse<unknown>) => {
        const payload = response.data;
        const data =
          payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : payload;
        return { ...response, data };
      },
    },
  ],
});

const sourceSize = (source: ImageSource) => {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  return { width: source.naturalWidth, height: source.naturalHeight };
};

const sourceReady = (source: ImageSource) => {
  const { width, height } = sourceSize(source);
  return width > 0 && height > 0;
};

export class ChessVisionService {
  private cv: any;

  async init() {
    const startedAt = Date.now();
    while (!(window as any).cv?.Mat) {
      if (Date.now() - startedAt > 15_000) {
        throw new Error('OpenCV 加载失败');
      }
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    this.cv = (window as any).cv;
  }

  isReady() {
    return Boolean(this.cv?.Mat);
  }

  findBoardCorners(source: ImageSource): Point[] | null {
    if (!this.cv || !sourceReady(source)) return null;
    const { width, height } = sourceSize(source);
    const scale = Math.min(1, 1100 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);

    const src = this.cv.imread(canvas);
    const gray = new this.cv.Mat();
    const edges = new this.cv.Mat();
    const contours = new this.cv.MatVector();
    const hierarchy = new this.cv.Mat();
    const kernel = this.cv.Mat.ones(3, 3, this.cv.CV_8U);
    let result: Point[] | null = null;

    try {
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);
      this.cv.GaussianBlur(gray, gray, new this.cv.Size(5, 5), 0);
      this.cv.Canny(gray, edges, 45, 140);
      this.cv.dilate(edges, edges, kernel);
      this.cv.findContours(edges, contours, hierarchy, this.cv.RETR_LIST, this.cv.CHAIN_APPROX_SIMPLE);

      const imageArea = canvas.width * canvas.height;
      let maxArea = imageArea * 0.08;
      for (let index = 0; index < contours.size(); index += 1) {
        const contour = contours.get(index);
        const area = this.cv.contourArea(contour);
        if (area <= maxArea) {
          contour.delete();
          continue;
        }
        const perimeter = this.cv.arcLength(contour, true);
        const polygon = new this.cv.Mat();
        this.cv.approxPolyDP(contour, polygon, perimeter * 0.025, true);
        if (polygon.rows === 4 && this.cv.isContourConvex(polygon)) {
          const points: Point[] = [];
          for (let pointIndex = 0; pointIndex < 4; pointIndex += 1) {
            points.push({
              x: polygon.data32S[pointIndex * 2] / scale,
              y: polygon.data32S[pointIndex * 2 + 1] / scale,
            });
          }
          result = this.sortPoints(points);
          maxArea = area;
        }
        polygon.delete();
        contour.delete();
      }
    } finally {
      src.delete();
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
      kernel.delete();
    }
    return result;
  }

  capture(source: ImageSource, corners?: Point[] | null) {
    if (!sourceReady(source)) throw new Error('摄像头画面尚未准备好');
    const { width, height } = sourceSize(source);
    const input = document.createElement('canvas');
    input.width = width;
    input.height = height;
    input.getContext('2d')?.drawImage(source, 0, 0, width, height);

    if (!this.cv || !corners || corners.length !== 4) {
      return this.toLimitedJpeg(input);
    }

    const src = this.cv.imread(input);
    const output = new this.cv.Mat();
    const from = this.cv.matFromArray(
      4,
      1,
      this.cv.CV_32FC2,
      corners.flatMap((point) => [point.x, point.y]),
    );
    const to = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [0, 0, 899, 0, 899, 999, 0, 999]);
    const transform = this.cv.getPerspectiveTransform(from, to);
    const warped = document.createElement('canvas');
    warped.width = 900;
    warped.height = 1000;
    try {
      this.cv.warpPerspective(
        src,
        output,
        transform,
        new this.cv.Size(900, 1000),
        this.cv.INTER_LINEAR,
        this.cv.BORDER_REPLICATE,
      );
      this.cv.imshow(warped, output);
      return warped.toDataURL('image/jpeg', 0.84);
    } finally {
      src.delete();
      output.delete();
      from.delete();
      to.delete();
      transform.delete();
    }
  }

  frameHash(source: ImageSource, corners?: Point[] | null) {
    const jpeg = this.capture(source, corners);
    const image = new Image();
    return new Promise<Uint8Array>((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 18;
        canvas.height = 20;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return reject(new Error('无法读取画面'));
        context.drawImage(image, 0, 0, 18, 20);
        const pixels = context.getImageData(0, 0, 18, 20).data;
        const values = new Uint8Array(360);
        for (let index = 0; index < values.length; index += 1) {
          const offset = index * 4;
          values[index] = Math.round(pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114);
        }
        resolve(values);
      };
      image.onerror = () => reject(new Error('无法读取画面'));
      image.src = jpeg;
    });
  }

  frameDifference(first?: Uint8Array | null, second?: Uint8Array | null) {
    if (!first || !second || first.length !== second.length) return Number.POSITIVE_INFINITY;
    let difference = 0;
    for (let index = 0; index < first.length; index += 1) {
      difference += Math.abs(first[index] - second[index]);
    }
    return difference / first.length;
  }

  mapCornersToCanvas(corners: Point[], source: ImageSource, canvas: HTMLCanvasElement) {
    const { width, height } = sourceSize(source);
    const scale = Math.min(canvas.width / width, canvas.height / height);
    const offsetX = (canvas.width - width * scale) / 2;
    const offsetY = (canvas.height - height * scale) / 2;
    return corners.map((point) => ({
      x: point.x * scale + offsetX,
      y: point.y * scale + offsetY,
    }));
  }

  drawOverlay(canvas: HTMLCanvasElement, corners: Point[] | null, move: string | null, bottomSide: BottomSide) {
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!corners) return;

    context.strokeStyle = '#38bdf8';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.closePath();
    context.stroke();

    if (!move || !/^[a-i][0-9][a-i][0-9]$/.test(move)) return;
    const from = this.movePoint(corners, move.slice(0, 2), bottomSide);
    const to = this.movePoint(corners, move.slice(2, 4), bottomSide);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    context.strokeStyle = '#22c55e';
    context.fillStyle = '#22c55e';
    context.lineWidth = 9;
    context.lineCap = 'round';
    context.shadowBlur = 12;
    context.shadowColor = '#22c55e';
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.beginPath();
    context.moveTo(to.x, to.y);
    context.lineTo(to.x - 24 * Math.cos(angle - Math.PI / 6), to.y - 24 * Math.sin(angle - Math.PI / 6));
    context.lineTo(to.x - 24 * Math.cos(angle + Math.PI / 6), to.y - 24 * Math.sin(angle + Math.PI / 6));
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
  }

  recognize(imageUrl: string, sideToMove: SideToMove, bottomSide: BottomSide, provider = 'modelscope') {
    return api<RecognitionResult>(
      '/chess-vision/recognize',
      { imageUrl, sideToMove, bottomSide, provider },
      { method: 'POST' },
    );
  }

  analyze(fen: string) {
    return api<AnalysisResult>('/chess-vision/analyze', { fen }, { method: 'POST' });
  }

  private toLimitedJpeg(source: HTMLCanvasElement) {
    const scale = Math.min(1, 1280 / Math.max(source.width, source.height));
    if (scale === 1) return source.toDataURL('image/jpeg', 0.82);
    const output = document.createElement('canvas');
    output.width = Math.round(source.width * scale);
    output.height = Math.round(source.height * scale);
    output.getContext('2d')?.drawImage(source, 0, 0, output.width, output.height);
    return output.toDataURL('image/jpeg', 0.82);
  }

  private sortPoints(points: Point[]) {
    const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
    const byDifference = [...points].sort((a, b) => a.x - a.y - (b.x - b.y));
    return [bySum[0], byDifference[3], bySum[3], byDifference[0]];
  }

  private movePoint(corners: Point[], square: string, bottomSide: BottomSide) {
    const column = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    const x = bottomSide === 'red' ? column / 8 : (8 - column) / 8;
    const y = bottomSide === 'red' ? (9 - rank) / 9 : rank / 9;
    const top = {
      x: corners[0].x + (corners[1].x - corners[0].x) * x,
      y: corners[0].y + (corners[1].y - corners[0].y) * x,
    };
    const bottom = {
      x: corners[3].x + (corners[2].x - corners[3].x) * x,
      y: corners[3].y + (corners[2].y - corners[3].y) * x,
    };
    return {
      x: top.x + (bottom.x - top.x) * y,
      y: top.y + (bottom.y - top.y) * y,
    };
  }
}

export const visionService = new ChessVisionService();
