// Simulation of a Xiangqi Engine (Pikafish/Fairy-Stockfish compatible)
// In production, this would load a .wasm file.

self.onmessage = async (e) => {
  const { type, data } = e.data;

  if (type === 'init') {
    // Artificial initialization delay
    await new Promise(r => setTimeout(resolve, 500));
    self.postMessage({ type: 'ready' });
  }

  if (type === 'search') {
    const fen = data;
    
    // 1. Basic move logic for standard openings (very common)
    // Central Cannon opening
    let bestMove = 'h2e2'; // 炮二平五
    let score = 50;

    // Check if red just moved or black is to move
    const isBlackToMove = fen.includes(' b ');
    
    if (isBlackToMove) {
      bestMove = 'h7e7'; // 炮8平5
    }

    // 2. Realistic Simulation: If the board is already complex, return a "pro" move
    if (fen.split(' ')[0].length > 50) {
      const proMoves = ['c3c4', 'g3g4', 'h2e2', 'b2e2', 'i0h0'];
      bestMove = proMoves[Math.floor(Math.random() * proMoves.length)];
      score = 70 + Math.floor(Math.random() * 20);
    }

    // Simulate thinking time (0.5s to 1.5s for "Master" feel)
    setTimeout(() => {
      self.postMessage({ 
        type: 'bestmove', 
        data: { 
          move: bestMove,
          score: score,
          depth: 24
        } 
      });
    }, 800 + Math.random() * 700);
  }
};

function resolve(v: any) { return v; }
