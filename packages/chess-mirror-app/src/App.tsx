import React, { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import {
  Camera,
  CameraOff,
  FlipVertical2,
  ImageUp,
  LoaderCircle,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Undo2,
  Video,
} from 'lucide-react';
import { Board2D } from './components/Board2D';
import { type BottomSide, type Point, type SideToMove, visionService } from './services/vision.service';

const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';

type View = 'photo' | 'video' | 'board';
type Phase = 'capture' | 'confirm' | 'result';
type SourceElement = HTMLVideoElement | HTMLImageElement;
type AnalysisMove = {
  move: string;
  moveText?: string;
  score?: string;
  rank?: string;
  note?: string;
  winrate?: string;
  tags?: string[];
};
type AnalysisView = {
  fen: string;
  bestMove: string;
  bestMoveText?: string;
  evaluation?: string | number | null;
  evaluationText?: string;
  assessment?: string;
  lines?: AnalysisMove[];
  moves?: AnalysisMove[];
  source?: string;
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const App: React.FC = () => {
  const [view, setView] = useState<View>('photo');
  const [phase, setPhase] = useState<Phase>('capture');
  const [cvReady, setCvReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [boardFound, setBoardFound] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentFen, setCurrentFen] = useState(START_FEN);
  const [history, setHistory] = useState([START_FEN]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisView | null>(null);
  const [status, setStatus] = useState('请将完整棋盘放入画面');
  const [error, setError] = useState<string | null>(null);
  const [sideToMove, setSideToMove] = useState<SideToMove>('w');
  const [bottomSide, setBottomSide] = useState<BottomSide>('red');
  const [flipped, setFlipped] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
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

  const bestMove = analysis?.bestMove || null;
  const bestMoveLabel = analysis?.bestMoveText || analysis?.bestMove || null;

  useEffect(() => {
    visionService
      .init()
      .then(() => setCvReady(true))
      .catch((reason) => {
        setError(errorMessage(reason));
        setStatus('识别组件加载失败');
      });
  }, []);

  const releaseCamera = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    const video = webcamRef.current?.video;
    if (video) video.srcObject = null;
  }, []);

  const closeCamera = useCallback(() => {
    releaseCamera();
    setCameraEnabled(false);
    setBoardFound(false);
    cornersRef.current = null;
    setStatus('摄像头已关闭');
  }, [releaseCamera]);

  const openCamera = () => {
    setError(null);
    setCameraEnabled(true);
    setStatus('正在打开摄像头');
  };

  useEffect(() => () => releaseCamera(), [releaseCamera]);

  const replaceBoard = useCallback((fen: string) => {
    setCurrentFen(fen);
    setHistory([fen]);
    setHistoryIndex(0);
    setSideToMove(fen.split(' ')[1] === 'b' ? 'b' : 'w');
  }, []);

  const editBoard = (fen: string) => {
    const nextHistory = [...history.slice(0, historyIndex + 1), fen];
    setCurrentFen(fen);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setSideToMove(fen.split(' ')[1] === 'b' ? 'b' : 'w');
    setAnalysis(null);
    setPhase('confirm');
  };

  const moveHistory = (index: number) => {
    const fen = history[index];
    if (!fen) return;
    setHistoryIndex(index);
    setCurrentFen(fen);
    setSideToMove(fen.split(' ')[1] === 'b' ? 'b' : 'w');
    setAnalysis(null);
  };

  const getSource = useCallback((): SourceElement | null => {
    if (preview) return imageRef.current;
    const video = webcamRef.current?.video;
    return video && video.readyState >= 2 ? video : null;
  }, [preview]);

  const analyzeFen = useCallback(async (fen: string) => {
    setStatus('正在分析局面');
    const result = (await visionService.analyze(fen)) as AnalysisView;
    setAnalysis(result);
    setCurrentFen(result.fen);
    setSideToMove(result.fen.split(' ')[1] === 'b' ? 'b' : 'w');
    setPhase('result');
    setStatus(result.bestMoveText || result.bestMove);
    return result;
  }, []);

  const recognizeSource = useCallback(
    async (source: SourceElement, detectedCorners?: Point[] | null, analyzeImmediately = false) => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setAnalysis(null);
      setError(null);
      setStatus('正在识别棋盘');
      try {
        const corners = detectedCorners ?? cornersRef.current;
        const imageUrl = visionService.capture(source, corners);
        const recognition = await visionService.recognize(imageUrl, sideToMove, bottomSide);
        replaceBoard(recognition.fen);
        if (analyzeImmediately) {
          await analyzeFen(recognition.fen);
          navigator.vibrate?.(80);
        } else {
          closeCamera();
          setView('board');
          setPhase('confirm');
          setStatus('请确认识别结果');
        }
        return true;
      } catch (reason) {
        setError(errorMessage(reason));
        setStatus('识别失败，请调整后重试');
        return false;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [analyzeFen, bottomSide, closeCamera, replaceBoard, sideToMove],
  );

  useEffect(() => {
    if (!cvReady || view === 'board' || (!cameraEnabled && !preview)) return;
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
        const displayed = corners ? visionService.mapCornersToCanvas(corners, source, overlay) : null;
        visionService.drawOverlay(overlay, displayed, bestMove, bottomSide);
      } finally {
        detecting = false;
      }
    }, 450);
    return () => window.clearInterval(timer);
  }, [bestMove, bottomSide, cameraEnabled, cvReady, getSource, preview, view]);

  useEffect(() => {
    previousHashRef.current = null;
    analyzedHashRef.current = null;
    stableFramesRef.current = 0;
  }, [bottomSide, sideToMove, view, videoPaused]);

  useEffect(() => {
    if (!cvReady || !cameraEnabled || view !== 'video' || preview || videoPaused) return;
    let checking = false;
    const timer = window.setInterval(async () => {
      if (checking || busyRef.current) return;
      const source = getSource();
      const corners = cornersRef.current;
      if (!source || !corners) {
        setStatus('寻找棋盘');
        return;
      }
      checking = true;
      try {
        const hash = await visionService.frameHash(source, corners);
        const frameDifference = visionService.frameDifference(previousHashRef.current, hash);
        previousHashRef.current = hash;
        stableFramesRef.current = frameDifference <= 3.5 ? stableFramesRef.current + 1 : 0;
        if (stableFramesRef.current < 2) {
          setStatus('请保持稳定');
          return;
        }
        const boardDifference = visionService.frameDifference(analyzedHashRef.current, hash);
        if (analyzedHashRef.current && boardDifference < 4.5) return;
        if (Date.now() - lastVideoRequestRef.current < 3_000) return;
        lastVideoRequestRef.current = Date.now();
        const succeeded = await recognizeSource(source, corners, true);
        analyzedHashRef.current = succeeded ? hash : null;
      } catch (reason) {
        setError(errorMessage(reason));
      } finally {
        checking = false;
      }
    }, 1_200);
    return () => window.clearInterval(timer);
  }, [cameraEnabled, cvReady, getSource, preview, recognizeSource, videoPaused, view]);

  const handlePhoto = async () => {
    const source = getSource();
    if (source) await recognizeSource(source);
    else setError('摄像头画面尚未准备好');
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    closeCamera();
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const image = new Image();
      image.onload = async () => {
        setPreview(dataUrl);
        const corners = cvReady ? visionService.findBoardCorners(image) : null;
        cornersRef.current = corners;
        setBoardFound(Boolean(corners));
        await recognizeSource(image, corners);
      };
      image.onerror = () => setError('图片读取失败');
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const selectSide = (side: SideToMove) => {
    setSideToMove(side);
    editBoard(`${currentFen.split(' ')[0]} ${side} - - 0 1`);
  };

  const confirmBoard = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await analyzeFen(currentFen);
    } catch (reason) {
      setError(errorMessage(reason));
      setStatus('分析失败，请重试');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const switchCapture = (next: 'photo' | 'video') => {
    setView(next);
    setPhase('capture');
    setPreview(null);
    setVideoPaused(false);
    setAnalysis(null);
    setError(null);
    setStatus(cameraEnabled ? (next === 'video' ? '寻找棋盘' : '请将完整棋盘放入画面') : '摄像头未开启');
  };

  const pauseAndCorrect = () => {
    closeCamera();
    setVideoPaused(true);
    setView('board');
    setPhase('confirm');
    setAnalysis(null);
    setStatus('调整后确认局面');
  };

  const adjustBoard = () => {
    closeCamera();
    if (view === 'video') setVideoPaused(true);
    setView('board');
    setPhase('confirm');
    setAnalysis(null);
    setStatus('调整后确认局面');
  };

  const resumeVideo = () => {
    setView('video');
    setPhase('result');
    setPreview(null);
    setVideoPaused(false);
    openCamera();
  };

  return (
    <div className="chess-app">
      <header className="app-header">
        <div>
          <h1>象棋·镜</h1>
          <p>拍一下，看清下一步</p>
        </div>
        <span className={cvReady ? 'ready-dot ready' : 'ready-dot'}>{cvReady ? '已就绪' : '加载中'}</span>
      </header>

      <main className="app-main">
        <section className="workspace">
          {view === 'board' ? (
            <div className="board-workspace">
              <div className="board-step-title">
                <strong>{phase === 'confirm' ? '确认局面' : '分析结果'}</strong>
                <span>{phase === 'confirm' ? '点击错误位置即可修改' : status}</span>
              </div>
              <Board2D
                fen={currentFen}
                onFenChange={editBoard}
                bestMove={bestMove}
                flipped={flipped}
                editable={phase === 'confirm'}
              />
              {phase === 'confirm' && (
                <div className="board-toolbar">
                  <button
                    className="icon-action"
                    disabled={historyIndex === 0}
                    onClick={() => moveHistory(historyIndex - 1)}
                  >
                    <Undo2 size={18} />
                    撤销
                  </button>
                  <button
                    className="icon-action"
                    disabled={historyIndex >= history.length - 1}
                    onClick={() => moveHistory(historyIndex + 1)}
                  >
                    <Redo2 size={18} />
                    恢复
                  </button>
                  <button className="icon-action" onClick={() => setFlipped((value) => !value)}>
                    <FlipVertical2 size={18} />
                    翻转
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div ref={stageRef} className="camera-stage">
              {preview ? (
                <img ref={imageRef} src={preview} alt="待识别棋盘" />
              ) : cameraEnabled ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: { ideal: 'environment' } }}
                  onUserMedia={(stream) => {
                    mediaStreamRef.current = stream;
                    setError(null);
                    setStatus('请将完整棋盘放入画面');
                  }}
                  onUserMediaError={(reason) => {
                    releaseCamera();
                    setCameraEnabled(false);
                    setError(errorMessage(reason));
                    setStatus('无法使用摄像头');
                  }}
                />
              ) : (
                <div className="camera-placeholder">
                  <Camera size={34} />
                  <strong>摄像头未开启</strong>
                  <span>也可以直接选择棋盘图片</span>
                  <button className="primary" onClick={openCamera}>
                    打开摄像头
                  </button>
                </div>
              )}
              <canvas ref={overlayRef} />
              {(cameraEnabled || preview) && (
                <div className={boardFound ? 'camera-state found' : 'camera-state'}>
                  {view === 'video' && bestMoveLabel ? bestMoveLabel : status}
                </div>
              )}
              {cameraEnabled && (
                <button className="camera-close" onClick={closeCamera}>
                  <CameraOff size={16} />
                  关闭摄像头
                </button>
              )}
              {busy && (
                <div className="busy-layer">
                  <LoaderCircle className="animate-spin" size={22} />
                  {status}
                </div>
              )}
            </div>
          )}

          <nav className="mode-switch" aria-label="识别模式">
            <button className={view === 'photo' ? 'tab-active' : 'tab'} onClick={() => switchCapture('photo')}>
              <Camera size={18} />
              拍照
            </button>
            <button
              className={view === 'video' || videoPaused ? 'tab-active' : 'tab'}
              onClick={() => switchCapture('video')}
            >
              <Video size={18} />
              视频
            </button>
          </nav>
        </section>

        <aside className="control-panel">
          {error && <div className="error-box">{error}</div>}

          {view !== 'board' && (
            <>
              <div className="compact-settings">
                <div>
                  <span>轮到</span>
                  <button className={sideToMove === 'w' ? 'choice-active' : 'choice'} onClick={() => selectSide('w')}>
                    红方
                  </button>
                  <button className={sideToMove === 'b' ? 'choice-active' : 'choice'} onClick={() => selectSide('b')}>
                    黑方
                  </button>
                </div>
                <div>
                  <span>靠近镜头</span>
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
              {view === 'photo' ? (
                <div className="capture-actions">
                  <button
                    className="primary"
                    disabled={busy || !cvReady}
                    onClick={cameraEnabled ? handlePhoto : openCamera}
                  >
                    <Camera size={19} />
                    {cameraEnabled ? '拍照识别' : '打开摄像头'}
                  </button>
                  <button className="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
                    <ImageUp size={19} />
                    选择图片
                  </button>
                </div>
              ) : cameraEnabled ? (
                <button className="secondary full-action" disabled={!analysis} onClick={pauseAndCorrect}>
                  <Pause size={18} />
                  暂停并修正
                </button>
              ) : (
                <button className="primary full-action" onClick={openCamera}>
                  <Video size={18} />
                  打开摄像头
                </button>
              )}
            </>
          )}

          {view === 'board' && phase === 'confirm' && (
            <>
              <div className="compact-settings">
                <div>
                  <span>轮到</span>
                  <button className={sideToMove === 'w' ? 'choice-active' : 'choice'} onClick={() => selectSide('w')}>
                    红方
                  </button>
                  <button className={sideToMove === 'b' ? 'choice-active' : 'choice'} onClick={() => selectSide('b')}>
                    黑方
                  </button>
                </div>
              </div>
              <button className="primary full-action" disabled={busy} onClick={confirmBoard}>
                {busy ? <LoaderCircle className="animate-spin" size={18} /> : null}确认并分析
              </button>
              <button className="secondary full-action" onClick={() => switchCapture(videoPaused ? 'video' : 'photo')}>
                <RotateCcw size={18} />
                重新识别
              </button>
            </>
          )}

          {analysis && (
            <div className="analysis-card">
              <span>建议着法</span>
              <strong>{bestMoveLabel}</strong>
              {(analysis.evaluationText !== undefined ||
                analysis.assessment !== undefined ||
                analysis.evaluation !== undefined) && (
                <div className="evaluation">
                  {analysis.evaluationText ?? analysis.assessment ?? analysis.evaluation}
                </div>
              )}
              {(analysis.lines ?? analysis.moves)?.length > 0 && (
                <div className="candidate-list">
                  {(analysis.lines ?? analysis.moves ?? []).map((move, index) => (
                    <div key={`${move.move}-${index}`}>
                      <b>{index + 1}</b>
                      <span className="candidate-move">
                        <span>{move.moveText || move.move}</span>
                        {move.tags?.map((tag) => (
                          <i key={tag}>{tag}</i>
                        ))}
                      </span>
                      {move.score !== undefined && <small>{move.score}</small>}
                    </div>
                  ))}
                </div>
              )}
              <button className="secondary full-action" onClick={adjustBoard}>
                调整局面
              </button>
              {videoPaused && (
                <button className="primary full-action" onClick={resumeVideo}>
                  <Play size={18} />
                  继续看棋
                </button>
              )}
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
        </aside>
      </main>
    </div>
  );
};

export default App;
