export interface Point {
  x: number;
  y: number;
}

export class ChessVisionService {
  private cv: any;

  async init() {
    this.cv = (window as any).cv;
    if (!this.cv || !this.cv.Mat) {
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if ((window as any).cv && (window as any).cv.Mat) {
            clearInterval(check);
            resolve(true);
          }
        }, 100);
      });
      this.cv = (window as any).cv;
    }
    console.log('OpenCV.js Ready');
  }

  findBoardCorners(canvas: HTMLCanvasElement): Point[] | null {
    if (!this.cv) return null;
    let src = this.cv.imread(canvas);
    let gray = new this.cv.Mat();
    this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);
    this.cv.GaussianBlur(gray, gray, new this.cv.Size(5, 5), 0);
    this.cv.threshold(gray, gray, 120, 255, this.cv.THRESH_BINARY);

    let contours = new this.cv.MatVector();
    let hierarchy = new this.cv.Mat();
    this.cv.findContours(gray, contours, hierarchy, this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    let bestPoly = null;

    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i);
      let area = this.cv.contourArea(cnt);
      if (area > 5000) {
        let peri = this.cv.arcLength(cnt, true);
        let approx = new this.cv.Mat();
        this.cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.rows === 4 && area > maxArea) {
          maxArea = area;
          bestPoly = approx;
        } else {
          approx.delete();
        }
      }
    }

    let result = null;
    if (bestPoly) {
      const points = [
        { x: bestPoly.data32S[0], y: bestPoly.data32S[1] },
        { x: bestPoly.data32S[2], y: bestPoly.data32S[3] },
        { x: bestPoly.data32S[4], y: bestPoly.data32S[5] },
        { x: bestPoly.data32S[6], y: bestPoly.data32S[7] },
      ];
      // Sort points: top-left, top-right, bottom-right, bottom-left
      result = this.sortPoints(points);
      bestPoly.delete();
    }

    src.delete(); gray.delete(); contours.delete(); hierarchy.delete();
    return result;
  }

  private sortPoints(pts: Point[]): Point[] {
    const sorted = [...pts].sort((a, b) => a.y - b.y);
    const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = sorted.slice(2, 4).sort((a, b) => b.x - a.x);
    return [top[0], top[1], bottom[0], bottom[1]];
  }

  /**
   * Draws a 3D-looking arrow on the canvas using the perspective of the board.
   */
  drawARArrow(ctx: CanvasRenderingContext2D, corners: Point[], move: string) {
    if (!corners || corners.length !== 4) return;

    // Xiangqi board is 9x10 (8x9 intervals)
    const srcCoords = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
      0, 0, 800, 0, 800, 900, 0, 900
    ]);
    const dstCoords = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
      corners[0].x, corners[0].y,
      corners[1].x, corners[1].y,
      corners[2].x, corners[2].y,
      corners[3].x, corners[3].y
    ]);

    const M = this.cv.getPerspectiveTransform(srcCoords, dstCoords);

    const getPixel = (col: number, row: number) => {
      // row 0-9, col 0-8. Red is bottom. 
      // Mapping move 'h2e2' -> col 7, row 7 to col 4, row 7 (approx)
      const x = col * 100;
      const y = (9 - row) * 100;
      const vec = this.cv.matFromArray(3, 1, this.cv.CV_64FC1, [x, y, 1]);
      const res = this.cv.matFromArray(3, 1, this.cv.CV_64FC1, [0, 0, 0]);
      
      // Manual matrix multiplication because OpenCV.js gemm is overkill here
      const m = M.data64F;
      const rx = m[0]*x + m[1]*y + m[2];
      const ry = m[3]*x + m[4]*y + m[5];
      const rw = m[6]*x + m[7]*y + m[8];
      
      vec.delete(); res.delete();
      return { x: rx / rw, y: ry / rw };
    };

    // Parse UCI move (e.g., h2e2)
    const colMap: any = { a:0, b:1, c:2, d:3, e:4, f:5, g:6, h:7, i:8 };
    const from = getPixel(colMap[move[0]], parseInt(move[1]) - 1);
    const to = getPixel(colMap[move[2]], parseInt(move[3]) - 1);

    // Draw Arrow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0ea5e9';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Arrow Head
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - 20 * Math.cos(angle - Math.PI / 6), to.y - 20 * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - 20 * Math.cos(angle + Math.PI / 6), to.y - 20 * Math.sin(angle + Math.PI / 6));
    ctx.stroke();

    M.delete(); srcCoords.delete(); dstCoords.delete();
  }

  async recognizeCloud(imageUrl: string, provider = 'modelscope') {
    const response = await fetch('/api/chess-vision/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, provider }),
    });
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }
}

export const visionService = new ChessVisionService();
