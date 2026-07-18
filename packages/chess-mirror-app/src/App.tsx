import React, { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera, CircleStop, ImageUp, LoaderCircle, ScanLine, Video } from 'lucide-react';
import { Board2D } from './components/Board2D';
import { type BottomSide, type Point, type SideToMove, visionService } from './services/vision.service';

const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';

type View = 'photo' | 'video' | 'board';
type SourceElement = HTMLVideoElement | HTMLImageElement;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const App: React.FC = () => {
  const [view, setView] = useState<View>('photo');
  const [cvReady, setCvReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [boardFound, setBoardFound] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentFen, setCurrentFen] = useState(START_FEN);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [status, setStatus] = useState('请将完整棋盘放入画面');
  const [error, setError] = useState<string | null>(null);
  const [sideToMove, setSideToMove] = useState<SideToMove>('w');
  const [bottomSide, setBottomSide] = useState<BottomSide>('red');

  const webcamRef = useRef<Webcam>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cornersRef = useRef<Point[] | null>(null);
  const busyRef = useRef(false);
  const previousHashRef = useRef<Uint8Array | null>(null);
  const analyzedHashRef = useRef<Uint8Array | null>(null);
  const stableFramesRef = useRef(0);
  const lastVideoRequestRef = useRef(0);

  useEffect(() => {
    visionService
      .init()
      .then(() => setCvReady(true))
      .catch((reason) => setError(errorMessage(reason)));
  }, []);

  const getSource = useCallback((): SourceElement | null => {
    if (preview) return imageRef.current;
    const video = webcamRef.current?.video;
    return video && video.readyState >= 2 ? video : null;
  }, [preview]);

  const analyzeFen = useCallback(async (fen: string) => {
    setStatus('正在计算最佳着法');
    const analysis = await visionService.analyze(fen);
    setCurrentFen(analysis.fen);
    setBestMove(analysis.bestMove);
    setSourceName(analysis.source);
    setStatus(`推荐着法：${analysis.bestMove}`);
    return analysis;
  }, []);

  const solveSource = useCallback(
    async (source: SourceElement, detectedCorners?: Point[] | null) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setBestMove(null);
      setSourceName(null);
      setError(null);
      setStatus('正在识别棋盘');
      try {
        const corners = detectedCorners ?? cornersRef.current;
        const imageUrl = visionService.capture(source, corners);
        const recognition = await visionService.recognize(imageUrl, sideToMove, bottomSide);
        setCurrentFen(recognition.fen);
        await analyzeFen(recognition.fen);
      } catch (reason) {
        const message = errorMessage(reason);
        setError(message);
        setStatus('识别失败，请调整角度后重试');
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [analyzeFen, bottomSide, sideToMove],
  );

  useEffect(() => {
    if (!cvReady || view === 'board') return;
    let detecting = false;
    const timer = window.setInterval(() => {
      if (detecting) return;
      const source = getSource();
      const stage = stageRef.current;
      const overlay = overlayRef.current;
      if (!source || !stage || !overlay) return;
      detecting = true;
      try {
        overlay.width = Math.max(1, Math.round(stage.clientWidth));
        overlay.height = Math.max(1, Math.round(stage.clientHeight));
        const corners = visionService.findBoardCorners(source);
        cornersRef.current = corners;
        setBoardFound(Boolean(corners));
        const displayCorners = corners ? visionService.mapCornersToCanvas(corners, source, overlay) : null;
        visionService.drawOverlay(overlay, displayCorners, bestMove, bottomSide);
      } finally {
        detecting = false;
      }
    }, 450);
    return () => window.clearInterval(timer);
  }, [bestMove, bottomSide, cvReady, getSource, view]);

  useEffect(() => {
    previousHashRef.current = null;
    analyzedHashRef.current = null;
    stableFramesRef.current = 0;
  }, [bottomSide, sideToMove, view]);

  useEffect(() => {
    if (!cvReady || view !== 'video' || preview) return;
    let checking = false;
    const timer = window.setInterval(async () => {
      if (checking || busyRef.current) return;
      const source = getSource();
      const corners = cornersRef.current;
      if (!source || !corners) {
        setStatus('视频识别中：等待定位完整棋盘');
        return;
      }
      checking = true;
      try {
        const hash = await visionService.frameHash(source, corners);
        const frameDifference = visionService.frameDifference(previousHashRef.current, hash);
        previousHashRef.current = hash;
        stableFramesRef.current = frameDifference <= 3.5 ? stableFramesRef.current + 1 : 0;

        if (stableFramesRef.current < 2) {
          setStatus('视频识别中：等待棋局稳定');
          return;
        }

        const boardDifference = visionService.frameDifference(analyzedHashRef.current, hash);
        const now = Date.now();
        if (analyzedHashRef.current && boardDifference < 4.5) {
          setStatus(bestMove ? `推荐着法：${bestMove}` : '视频识别中');
          return;
        }
        if (now - lastVideoRequestRef.current < 3_000) return;

        lastVideoRequestRef.current = now;
        analyzedHashRef.current = hash;
        await solveSource(source, corners);
      } catch (reason) {
        setError(errorMessage(reason));
      } finally {
        checking = false;
      }
    }, 1_200);
    return () => window.clearInterval(timer);
  }, [bestMove, cvReady, getSource, preview, solveSource, view]);

  const handlePhoto = async () => {
    const source = getSource();
    if (!source) return;
    await solveSource(source);
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const image = new Image();
      image.onload = async () => {
        setPreview(dataUrl);
        setView('photo');
        const corners = cvReady ? visionService.findBoardCorners(image) : null;
        cornersRef.current = corners;
        setBoardFound(Boolean(corners));
        await solveSource(image, corners);
      };
      image.onerror = () => setError('图片读取失败');
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFenChange = (fen: string) => {
    setCurrentFen(fen);
    setSideToMove(fen.split(' ')[1] === 'b' ? 'b' : 'w');
    setBestMove(null);
  };

  const selectSide = (side: SideToMove) => {
    setSideToMove(side);
    setCurrentFen((fen) => `${fen.split(' ')[0]} ${side} - - 0 1`);
    setBestMove(null);
  };

  const analyzeCorrectedBoard = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await analyzeFen(currentFen);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const switchView = (nextView: View) => {
    setView(nextView);
    if (nextView === 'video') {
      setPreview(null);
      setStatus('视频识别中：等待定位完整棋盘');
    }
  };

  return (
    <div className="h-full min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <header className="border-b border-white/10 bg-slate-900 px-4 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
          <div>
            <h1 className="font-semibold">象棋·镜</h1>
            <p className="text-xs text-slate-400">拍照或视频识别棋局并给出下一步</p>
          </div>
          <div className="text-right text-xs">
            <div className={cvReady ? 'text-green-400' : 'text-amber-400'}>
              {cvReady ? '识别组件已就绪' : '正在加载识别组件'}
            </div>
            {sourceName && <div className="text-slate-500">{sourceName}</div>}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 mx-auto w-full max-w-6xl grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-0 flex flex-col bg-black">
          {view === 'board' ? (
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              <Board2D fen={currentFen} onFenChange={handleFenChange} bestMove={bestMove} />
            </div>
          ) : (
            <div ref={stageRef} className="relative flex-1 min-h-[360px] overflow-hidden">
              {preview ? (
                <img
                  ref={imageRef}
                  src={preview}
                  alt="待识别棋盘"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: { ideal: 'environment' } }}
                  className="absolute inset-0 h-full w-full object-contain"
                />
              )}
              <canvas ref={overlayRef} className="absolute inset-0 h-full w-full pointer-events-none" />
              <div className="absolute left-3 top-3 rounded-lg bg-black/70 px-3 py-2 text-xs">
                {boardFound ? '已定位棋盘' : '请对准完整棋盘'}
              </div>
              {busy && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <div className="rounded-xl bg-slate-900 px-5 py-4 flex items-center gap-3">
                    <LoaderCircle className="animate-spin" size={20} />
                    {status}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-white/10 bg-slate-900 p-3 flex items-center justify-center gap-2">
            <button className={view === 'photo' ? 'tab-active' : 'tab'} onClick={() => switchView('photo')}>
              <Camera size={17} />
              拍照
            </button>
            <button className={view === 'video' ? 'tab-active' : 'tab'} onClick={() => switchView('video')}>
              {view === 'video' ? <CircleStop size={17} /> : <Video size={17} />}视频
            </button>
            <button className={view === 'board' ? 'tab-active' : 'tab'} onClick={() => switchView('board')}>
              <ScanLine size={17} />
              校正棋盘
            </button>
          </div>
        </section>

        <aside className="border-l border-white/10 bg-slate-900 p-4 overflow-auto space-y-4">
          <div>
            <div className="setting-title">当前走棋方</div>
            <div className="grid grid-cols-2 gap-2">
              <button className={sideToMove === 'w' ? 'choice-active' : 'choice'} onClick={() => selectSide('w')}>
                红方
              </button>
              <button className={sideToMove === 'b' ? 'choice-active' : 'choice'} onClick={() => selectSide('b')}>
                黑方
              </button>
            </div>
          </div>

          <div>
            <div className="setting-title">靠近镜头的一方</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={bottomSide === 'red' ? 'choice-active' : 'choice'}
                onClick={() => setBottomSide('red')}
              >
                红方
              </button>
              <button
                className={bottomSide === 'black' ? 'choice-active' : 'choice'}
                onClick={() => setBottomSide('black')}
              >
                黑方
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <div className="text-xs text-slate-400 mb-1">下一步</div>
            <div className="text-3xl font-semibold text-green-400 min-h-9">{bestMove || '—'}</div>
            <div className="mt-2 text-xs text-slate-400">{status}</div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
          )}

          {view === 'photo' && (
            <div className="grid grid-cols-2 gap-2">
              <button className="primary" disabled={busy || !cvReady} onClick={handlePhoto}>
                <Camera size={18} />
                拍照识别
              </button>
              <button className="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
                <ImageUp size={18} />
                选择图片
              </button>
            </div>
          )}

          {view === 'video' && (
            <div className="rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300">
              视频模式会在棋盘稳定且局面发生变化后自动识别。
            </div>
          )}

          {view === 'board' && (
            <button className="primary w-full" disabled={busy} onClick={analyzeCorrectedBoard}>
              <ScanLine size={18} />
              按当前棋盘分析
            </button>
          )}

          <div>
            <div className="setting-title">FEN</div>
            <div className="rounded-lg bg-black/40 p-3 font-mono text-xs break-all text-slate-300">{currentFen}</div>
          </div>

          {preview && view === 'photo' && (
            <button className="secondary w-full" onClick={() => setPreview(null)}>
              返回摄像头
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
        </aside>
      </main>
    </div>
  );
};

export default App;
