import React, { useState, useCallback, useRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Board2DProps {
  fen: string;
  onFenChange: (fen: string) => void;
}

const PIECE_MAP: Record<string, string> = {
  'r': '车', 'n': '马', 'b': '相', 'a': '仕', 'k': '帅', 'c': '炮', 'p': '兵',
  'R': '俥', 'N': '傌', 'B': '象', 'A': '士', 'K': '将', 'C': '砲', 'P': '卒'
};

const PIECES_CYCLE = ['r', 'n', 'b', 'a', 'k', 'c', 'p', 'R', 'N', 'B', 'A', 'K', 'C', 'P', ' '];

export const Board2D: React.FC<Board2DProps> = ({ fen, onFenChange }) => {
  const [dragging, setDragging] = useState<{ r: number, c: number, piece: string } | null>(null);
  
  const parseFen = (f: string) => {
    const rows = f.split(' ')[0].split('/');
    const board: (string | null)[][] = rows.map(row => {
      const res: (string | null)[] = [];
      for (const char of row) {
        if (isNaN(parseInt(char))) {
          res.push(char);
        } else {
          for (let i = 0; i < parseInt(char); i++) res.push(null);
        }
      }
      return res;
    });
    return board;
  };

  const serializeFen = (board: (string | null)[][]) => {
    let res = board.map(row => {
      let rowStr = '';
      let empty = 0;
      row.forEach(cell => {
        if (cell) {
          if (empty) rowStr += empty;
          rowStr += cell;
          empty = 0;
        } else {
          empty++;
        }
      });
      if (empty) rowStr += empty;
      return rowStr;
    }).join('/');
    return res + ' w - - 0 1';
  };

  const board = parseFen(fen);

  const handleCellClick = (r: number, c: number) => {
    const newBoard = [...board.map(row => [...row])];
    const current = newBoard[r][c] || ' ';
    const nextIdx = (PIECES_CYCLE.indexOf(current) + 1) % PIECES_CYCLE.length;
    const nextPiece = PIECES_CYCLE[nextIdx].trim() || null;
    newBoard[r][c] = nextPiece;
    onFenChange(serializeFen(newBoard));
  };

  const onDragStart = (r: number, c: number, piece: string) => {
    setDragging({ r, c, piece });
  };

  const onDrop = (r: number, c: number) => {
    if (!dragging) return;
    const newBoard = [...board.map(row => [...row])];
    newBoard[dragging.r][dragging.c] = null;
    newBoard[r][c] = dragging.piece;
    onFenChange(serializeFen(newBoard));
    setDragging(null);
  };

  return (
    <div className="w-full max-w-md aspect-[9/10] bg-[#fdf5e6] rounded-xl shadow-2xl p-4 border-8 border-[#5d4037] relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[url('/wood-pattern.png')] opacity-20 pointer-events-none" />
      
      {/* Board Grid */}
      <div className="relative w-full h-full border-2 border-[#5d4037]">
        {/* River */}
        <div className="absolute top-[45%] left-0 w-full h-[10%] border-y-2 border-[#5d4037] flex items-center justify-around text-[#5d4037] font-bold text-2xl tracking-[1em] px-4 opacity-60">
          <span>楚河</span>
          <span>汉界</span>
        </div>

        {/* Vertical/Horizontal Lines */}
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-9">
          {Array.from({ length: 72 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-[#5d4037]/30" />
          ))}
        </div>

        {/* Palace Diagonals */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-[#5d4037]/30" viewBox="0 0 800 900">
          <line x1="300" y1="0" x2="500" y2="200" />
          <line x1="500" y1="0" x2="300" y2="200" />
          <line x1="300" y1="700" x2="500" y2="900" />
          <line x1="500" y1="700" x2="300" y2="900" />
        </svg>

        {/* Pieces Layer */}
        <div className="absolute inset-0 grid grid-cols-9 grid-rows-10">
          {board.map((row, r) => row.map((piece, c) => (
            <div 
              key={`${r}-${c}`} 
              className={cn(
                "flex items-center justify-center relative",
                dragging?.r === r && dragging?.c === c && "opacity-20"
              )}
              onClick={() => handleCellClick(r, c)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(r, c)}
            >
              {piece && (
                <div 
                  draggable
                  onDragStart={() => onDragStart(r, c, piece)}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xl shadow-lg cursor-grab active:cursor-grabbing transform transition-transform hover:scale-110",
                    piece === piece.toUpperCase() 
                      ? "bg-[#fffafa] border-[#b71c1c] text-[#b71c1c]" 
                      : "bg-[#fffafa] border-[#212121] text-[#212121]"
                  )}
                >
                  <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center">
                    {PIECE_MAP[piece] || piece}
                  </div>
                </div>
              )}
            </div>
          )))}
        </div>
      </div>
    </div>
  );
};
