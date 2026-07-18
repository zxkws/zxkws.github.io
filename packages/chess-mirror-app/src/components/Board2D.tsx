import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Board2DProps {
  fen: string;
  onFenChange?: (fen: string) => void;
  bestMove?: string | null;
  flipped?: boolean;
  editable?: boolean;
}

const PIECE_MAP: Record<string, string> = {
  r: '车',
  n: '马',
  b: '象',
  a: '士',
  k: '将',
  c: '炮',
  p: '卒',
  R: '车',
  N: '马',
  B: '相',
  A: '仕',
  K: '帅',
  C: '炮',
  P: '兵',
};

const RED_PIECES = ['R', 'N', 'B', 'A', 'K', 'C', 'P'];
const BLACK_PIECES = ['r', 'n', 'b', 'a', 'k', 'c', 'p'];

const parseFen = (fen: string) => {
  const rows = fen.split(' ')[0].split('/');
  const board = rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const value of row) {
      const count = Number(value);
      if (Number.isInteger(count) && count > 0) cells.push(...Array<null>(count).fill(null));
      else cells.push(value);
    }
    return cells;
  });
  return board.length === 10 && board.every((row) => row.length === 9)
    ? board
    : Array.from({ length: 10 }, () => Array<string | null>(9).fill(null));
};

const serializeFen = (board: (string | null)[][], fen: string) => {
  const placement = board
    .map((row) => {
      let result = '';
      let empty = 0;
      row.forEach((piece) => {
        if (!piece) {
          empty += 1;
          return;
        }
        if (empty) result += empty;
        result += piece;
        empty = 0;
      });
      if (empty) result += empty;
      return result;
    })
    .join('/');
  return `${placement} ${fen.split(' ')[1] === 'b' ? 'b' : 'w'} - - 0 1`;
};

const moveCell = (square: string) => ({ row: 9 - Number(square[1]), column: square.charCodeAt(0) - 97 });

export const Board2D: React.FC<Board2DProps> = ({ fen, onFenChange, bestMove, flipped = false, editable = true }) => {
  const [selected, setSelected] = useState<{ row: number; column: number } | null>(null);
  const board = parseFen(fen);
  const displayRows = flipped ? [...board].reverse().map((row) => [...row].reverse()) : board;
  const move =
    bestMove && /^[a-i][0-9][a-i][0-9]$/.test(bestMove)
      ? { from: moveCell(bestMove.slice(0, 2)), to: moveCell(bestMove.slice(2, 4)) }
      : null;

  const displayCell = (cell: { row: number; column: number }) =>
    flipped ? { row: 9 - cell.row, column: 8 - cell.column } : cell;
  const displayMove = move ? { from: displayCell(move.from), to: displayCell(move.to) } : null;

  const selectDisplayCell = (row: number, column: number) => {
    if (!editable) return;
    setSelected(flipped ? { row: 9 - row, column: 8 - column } : { row, column });
  };

  const replaceSelected = (piece: string | null) => {
    if (!selected || !onFenChange) return;
    const next = board.map((row) => [...row]);
    next[selected.row][selected.column] = piece;
    onFenChange(serializeFen(next, fen));
    setSelected(null);
  };

  const selectedDisplay = selected ? displayCell(selected) : null;

  return (
    <div className="board-editor">
      <div className="xiangqi-board">
        <div className="board-grid-lines" />
        <div className="board-river">
          <span>楚河</span>
          <span>汉界</span>
        </div>
        <svg className="board-palaces" viewBox="0 0 800 900" aria-hidden="true">
          <line x1="300" y1="0" x2="500" y2="200" />
          <line x1="500" y1="0" x2="300" y2="200" />
          <line x1="300" y1="700" x2="500" y2="900" />
          <line x1="500" y1="700" x2="300" y2="900" />
        </svg>
        {displayMove && (
          <svg className="board-move-arrow" viewBox="0 0 800 900" aria-hidden="true">
            <defs>
              <marker id="move-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" />
              </marker>
            </defs>
            <line
              x1={displayMove.from.column * 100}
              y1={displayMove.from.row * 100}
              x2={displayMove.to.column * 100}
              y2={displayMove.to.row * 100}
              markerEnd="url(#move-head)"
            />
          </svg>
        )}
        <div className="board-pieces">
          {displayRows.map((row, rowIndex) =>
            row.map((piece, columnIndex) => (
              <button
                type="button"
                key={`${rowIndex}-${columnIndex}`}
                className={cn(
                  'board-cell',
                  selectedDisplay?.row === rowIndex && selectedDisplay.column === columnIndex && 'board-cell-selected',
                  displayMove?.from.row === rowIndex && displayMove.from.column === columnIndex && 'board-cell-from',
                  displayMove?.to.row === rowIndex && displayMove.to.column === columnIndex && 'board-cell-to',
                )}
                onClick={() => selectDisplayCell(rowIndex, columnIndex)}
                aria-label={piece ? PIECE_MAP[piece] : '空位'}
              >
                {piece && (
                  <span className={piece === piece.toUpperCase() ? 'piece piece-red' : 'piece piece-black'}>
                    {PIECE_MAP[piece]}
                  </span>
                )}
              </button>
            )),
          )}
        </div>
      </div>

      {editable && selected && (
        <div className="piece-picker" role="dialog" aria-label="选择棋子">
          <div className="piece-picker-row">
            {RED_PIECES.map((piece) => (
              <button key={piece} onClick={() => replaceSelected(piece)} className="picker-piece piece-red">
                {PIECE_MAP[piece]}
              </button>
            ))}
          </div>
          <div className="piece-picker-row">
            {BLACK_PIECES.map((piece) => (
              <button key={piece} onClick={() => replaceSelected(piece)} className="picker-piece piece-black">
                {PIECE_MAP[piece]}
              </button>
            ))}
          </div>
          <button className="picker-clear" onClick={() => replaceSelected(null)}>
            清空此位
          </button>
        </div>
      )}
    </div>
  );
};
