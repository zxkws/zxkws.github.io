import { createFetchClient, resolveApiBase, type FetchResponse } from '@zxkws/shared-fetch';

export type Point = { x: number; y: number };
export type BottomSide = 'red' | 'black';
export type SideToMove = 'w' | 'b';

export type RecognitionResult = {
  fen: string;
  confidence: number | null;
  model: string;
  latencyMs: number;
  board?: Array<Array<string | null>>;
};

export type ChessMove = {
  move: string;
  moveText?: string;
  score?: string;
  rank?: string;
  note?: string;
  winrate?: string;
  tags?: string[];
};

export type AnalysisResult = {
  fen: string;
  bestMove: string;
  bestMoveText?: string;
  evaluation?: number | null;
  evaluationText?: string;
  lines?: ChessMove[];
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
  async init() {
    return Promise.resolve();
  }

  isReady() {
    return true;
  }

  findBoardCorners(source: ImageSource): Point[] | null {
    if (!sourceReady(source)) return null;
    const { width, height } = sourceSize(source);
    const padding = 0.08;
    let boardHeight = height * (1 - padding * 2);
    let boardWidth = boardHeight * 0.9;
    if (boardWidth > width * (1 - padding * 2)) {
      boardWidth = width * (1 - padding * 2);
      boardHeight = boardWidth / 0.9;
    }
    const left = (width - boardWidth) / 2;
    const top = (height - boardHeight) / 2;
    return [
      { x: left, y: top },
      { x: left + boardWidth, y: top },
      { x: left + boardWidth, y: top + boardHeight },
      { x: left, y: top + boardHeight },
    ];
  }

  capture(source: ImageSource, corners?: Point[] | null) {
    if (!sourceReady(source)) throw new Error('摄像头画面尚未准备好');
    const { width, height } = sourceSize(source);
    const input = document.createElement('canvas');
    input.width = width;
    input.height = height;
    input.getContext('2d')?.drawImage(source, 0, 0, width, height);

    if (!corners || corners.length !== 4) {
      return this.toLimitedJpeg(input);
    }
    const left = Math.max(0, Math.min(...corners.map((point) => point.x)));
    const top = Math.max(0, Math.min(...corners.map((point) => point.y)));
    const right = Math.min(width, Math.max(...corners.map((point) => point.x)));
    const bottom = Math.min(height, Math.max(...corners.map((point) => point.y)));
    const cropped = document.createElement('canvas');
    cropped.width = 900;
    cropped.height = 1000;
    cropped
      .getContext('2d')
      ?.drawImage(input, left, top, right - left, bottom - top, 0, 0, cropped.width, cropped.height);
    return cropped.toDataURL('image/jpeg', 0.84);
  }

  frameHash(source: ImageSource, corners?: Point[] | null) {
    if (!sourceReady(source)) return Promise.reject(new Error('无法读取画面'));
    const { width, height } = sourceSize(source);
    const points = corners?.length === 4 ? corners : this.findBoardCorners(source);
    const left = points ? Math.max(0, Math.min(...points.map((point) => point.x))) : 0;
    const top = points ? Math.max(0, Math.min(...points.map((point) => point.y))) : 0;
    const right = points ? Math.min(width, Math.max(...points.map((point) => point.x))) : width;
    const bottom = points ? Math.min(height, Math.max(...points.map((point) => point.y))) : height;
    const canvas = document.createElement('canvas');
    canvas.width = 18;
    canvas.height = 20;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return Promise.reject(new Error('无法读取画面'));
    context.drawImage(source, left, top, right - left, bottom - top, 0, 0, 18, 20);
    const pixels = context.getImageData(0, 0, 18, 20).data;
    const values = new Uint8Array(360);
    for (let index = 0; index < values.length; index += 1) {
      const offset = index * 4;
      values[index] = Math.round(pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114);
    }
    return Promise.resolve(values);
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
