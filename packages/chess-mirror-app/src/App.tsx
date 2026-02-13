import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, Settings, History, Info, Monitor, Grid2X2, Lock, Unlock, Loader2, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEngine } from './hooks/useEngine';
import { visionService, Point } from './services/vision.service';
import { Board2D } from './components/Board2D';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const [mode, setMode] = useState<'ar' | '2d'>('ar');
  const [isStealth, setIsStealth] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [currentFen, setCurrentFen] = useState('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1');
  const [corners, setCorners] = useState<Point[] | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { bestMove, search, isReady: isEngineReady } = useEngine();

  // Initialize Vision Service
  useEffect(() => {
    visionService.init();
  }, []);

  // AR Overlay Drawing Loop
  useEffect(() => {
    if (mode !== 'ar' || isLocked) return;

    const interval = setInterval(() => {
      if (webcamRef.current && canvasRef.current) {
        const video = webcamRef.current.video;
        if (video && video.readyState === 4) {
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const foundCorners = visionService.findBoardCorners(canvas);
          setCorners(foundCorners);

          const ctx = canvas.getContext('2d');
          if (ctx && foundCorners) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw detected board boundary
            ctx.strokeStyle = '#0ea5e9';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(foundCorners[0].x, foundCorners[0].y);
            ctx.lineTo(foundCorners[1].x, foundCorners[1].y);
            ctx.lineTo(foundCorners[2].x, foundCorners[2].y);
            ctx.lineTo(foundCorners[3].x, foundCorners[3].y);
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
            ctx.fill();

            // Draw grid points
            ctx.fillStyle = '#fff';
            foundCorners.forEach(p => {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [mode, isLocked]);

  // Persistent Draw loop for Move Arrow (even when locked)
  useEffect(() => {
    if (!isLocked || !bestMove || !corners || mode !== 'ar') return;
    
    const interval = setInterval(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        visionService.drawARArrow(ctx, corners, bestMove);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isLocked, bestMove, corners, mode]);

  const handleRecognize = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setIsRecognizing(true);
    setIsLocked(true);
    
    const screenshot = webcamRef.current.getScreenshot();
    if (screenshot) {
      try {
        const result = await visionService.recognizeCloud(screenshot);
        setCurrentFen(result.fen);
        search(result.fen);
      } catch (err) {
        console.error('Cloud recognition failed', err);
        setIsLocked(false);
      }
    }
    setIsRecognizing(false);
  }, [search]);

  const toggleStealth = useCallback(() => {
    setIsStealth((prev) => !prev);
  }, []);

  if (isStealth) {
    return (
      <div 
        className="fixed inset-0 bg-white text-black p-10 font-serif select-none flex flex-col"
        onDoubleClick={toggleStealth}
      >
        <div className="flex-1 max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold border-b pb-2 text-slate-800">Advanced Positional Studies</h1>
          <p className="text-gray-700 leading-relaxed text-lg">
            In analyzing the structural dynamics of the mid-game phase, we often encounter 
            pivotal nodes where traditional paradigms shift. For instance, consider the 
            influence of <span className="font-bold bg-yellow-100 px-1 rounded">{bestMove || 'P2-5'}</span> in restricting 
            vertical mobility while establishing a central anchor point...
          </p>
          <p className="text-gray-600 italic">
            "The art of silence is often louder than the clash of steel." 
            - Chapter IV, The Quiet Scholar
          </p>
        </div>
        <div className="text-right text-xs text-gray-300 mt-auto">
          Last sync: {new Date().toLocaleTimeString()}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#020617] overflow-hidden flex flex-col font-sans text-slate-100 selection:bg-sky-500/30">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,#0c4a6e_0%,transparent_50%),radial-gradient(circle_at_100%_100%,#1e1b4b_0%,transparent_50%)] opacity-40 pointer-events-none" />
      
      {/* Header */}
      <header className="z-10 h-16 flex items-center justify-between px-6 bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Monitor size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">Chess Mirror</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
            isEngineReady ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full bg-current", isEngineReady && "animate-pulse")} />
            {isEngineReady ? "Engine Active" : "Loading AI"}
          </div>
          <button className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90 border border-transparent hover:border-white/10">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col">
        {mode === 'ar' ? (
          <div className="flex-1 relative bg-black overflow-hidden">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'environment' }}
              className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] contrast-[1.1]"
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />
            
            {/* Viewfinder Frame (Only when scanning) */}
            {!isLocked && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-72 h-80 border-2 border-white/20 rounded-[2.5rem] flex flex-col items-center justify-between p-8 backdrop-blur-[1px]">
                  <div className="flex w-full justify-between">
                    <div className="w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-xl" />
                    <div className="w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-xl" />
                  </div>
                  <div className={cn("text-[10px] font-bold uppercase tracking-[0.2em] text-white/40", corners && "text-sky-400")}>
                    {corners ? "Board Locked" : "Scanning Surface"}
                  </div>
                  <div className="flex w-full justify-between">
                    <div className="w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-xl" />
                    <div className="w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br-xl" />
                  </div>
                </div>
              </div>
            )}

            {/* Float Controls */}
            <div className="absolute top-6 right-6 flex flex-col gap-4 z-30">
              <button 
                onClick={isLocked ? () => { setIsLocked(false); setCorners(null); } : handleRecognize}
                disabled={!corners && !isLocked}
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-2xl backdrop-blur-2xl border",
                  isLocked 
                    ? "bg-sky-500 text-white border-sky-400 shadow-sky-500/40" 
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20 disabled:opacity-20 disabled:scale-95"
                )}
              >
                {isRecognizing ? <Loader2 className="animate-spin" /> : (isLocked ? <Lock size={28} /> : <Unlock size={28} />)}
              </button>
            </div>

            {/* Recommendation Bottom Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-30">
              <div 
                className={cn(
                  "group bg-[#0f172a]/80 backdrop-blur-3xl border rounded-[2rem] p-5 shadow-2xl transition-all duration-500 overflow-hidden",
                  isLocked ? "border-sky-500/50 ring-1 ring-sky-500/20" : "border-white/10 hover:border-white/20"
                )}
                onDoubleClick={toggleStealth}
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                    bestMove ? "bg-sky-500 text-white" : "bg-white/5 text-white/30"
                  )}>
                    {isRecognizing ? <Loader2 className="animate-spin" size={32} /> : (bestMove ? <ArrowRight size={32} /> : <Info size={32} />)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-sky-400 uppercase font-black tracking-[0.15em] mb-1">
                      {isRecognizing ? 'Processing Engine' : (bestMove ? 'Best move found' : 'Live Assistant')}
                    </div>
                    <div className="text-xl font-semibold text-white/90">
                      {bestMove ? bestMove : (isRecognizing ? 'Analyzing Patterns...' : 'Target Chessboard')}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
                   <div className="text-[10px] font-bold flex items-center gap-2 italic">
                     <History size={12} /> Double-tap to hide (Stealth)
                   </div>
                   <div className="text-[10px] font-bold">PRO V1.0</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#020617] gap-8">
             <Board2D fen={currentFen} onFenChange={setCurrentFen} />
             
             <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-white/40">Board Sync Status</span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold border border-sky-500/30">LATEST FEN</span>
                </div>
                <code className="text-[10px] bg-black/40 p-3 rounded-xl border border-white/5 text-sky-200/70 break-all leading-relaxed font-mono">
                  {currentFen}
                </code>
                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => setCurrentFen('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1')}
                    className="flex-1 py-4 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 rounded-2xl border border-white/10 transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => { search(currentFen); setMode('ar'); setIsLocked(true); }}
                    className="flex-1 py-4 bg-sky-500 hover:bg-sky-400 active:scale-95 text-white rounded-2xl shadow-xl shadow-sky-500/20 transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    Push to AR
                  </button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Tab Bar */}
      <nav className="h-24 bg-white/5 backdrop-blur-3xl border-t border-white/10 flex items-center justify-around px-8 pb-4">
        <button 
          onClick={() => setMode('ar')}
          className={cn(
            "group relative flex flex-col items-center gap-2 transition-all duration-300",
            mode === 'ar' ? "text-sky-400" : "text-white/30 hover:text-white/60"
          )}
        >
          {mode === 'ar' && <div className="absolute -top-4 w-12 h-1 bg-sky-400 rounded-full blur-[2px]" />}
          <div className={cn("p-2 rounded-2xl transition-all", mode === 'ar' && "bg-sky-400/10")}>
            <Camera size={28} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Augmented Reality</span>
        </button>
        <button 
          onClick={() => setMode('2d')}
          className={cn(
            "group relative flex flex-col items-center gap-2 transition-all duration-300",
            mode === '2d' ? "text-sky-400" : "text-white/30 hover:text-white/60"
          )}
        >
          {mode === '2d' && <div className="absolute -top-4 w-12 h-1 bg-sky-400 rounded-full blur-[2px]" />}
          <div className={cn("p-2 rounded-2xl transition-all", mode === '2d' && "bg-sky-400/10")}>
            <Grid2X2 size={28} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Manual Override</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
