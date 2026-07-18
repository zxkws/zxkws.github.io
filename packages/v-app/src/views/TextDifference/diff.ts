export type DiffSegmentType = 'equal' | 'added' | 'removed';

export interface DiffSegment {
  type: DiffSegmentType;
  text: string;
}

export type DiffRowType = 'equal' | 'added' | 'removed' | 'changed';

export interface DiffRow {
  type: DiffRowType;
  leftLineNumber: number | null;
  rightLineNumber: number | null;
  leftSegments: DiffSegment[];
  rightSegments: DiffSegment[];
  leftText: string;
  rightText: string;
}

export interface DiffResult {
  rows: DiffRow[];
  stats: {
    added: number;
    deleted: number;
    changed: number;
  };
}

type EditType = 'equal' | 'added' | 'removed';

interface Edit<T> {
  type: EditType;
  value: T;
}

interface MyersLimits {
  maxEditDistance: number;
  maxTraceCells: number;
  maxItems: number;
}

const LINE_LIMITS: MyersLimits = {
  maxEditDistance: 1500,
  maxTraceCells: 2_000_000,
  maxItems: 50_000,
};

const CHARACTER_LIMITS: MyersLimits = {
  maxEditDistance: 600,
  maxTraceCells: 400_000,
  maxItems: 20_000,
};

const valueAt = (values: Map<number, number>, key: number) => values.get(key) ?? Number.NEGATIVE_INFINITY;

const replacementEdits = <T>(original: readonly T[], modified: readonly T[]): Edit<T>[] => [
  ...original.map((value) => ({ type: 'removed' as const, value })),
  ...modified.map((value) => ({ type: 'added' as const, value })),
];

/**
 * Myers' shortest edit script. Trace growth is bounded; inputs outside those
 * bounds deliberately degrade to one replacement block instead of allocating
 * an O(n*m) matrix or an unbounded Myers trace.
 */
const myersDiff = <T>(original: readonly T[], modified: readonly T[], limits: MyersLimits): Edit<T>[] => {
  if (original.length === 0) {
    return modified.map((value) => ({ type: 'added', value }));
  }
  if (modified.length === 0) {
    return original.map((value) => ({ type: 'removed', value }));
  }

  let prefixLength = 0;
  const commonLength = Math.min(original.length, modified.length);
  while (prefixLength < commonLength && original[prefixLength] === modified[prefixLength]) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < commonLength - prefixLength &&
    original[original.length - 1 - suffixLength] === modified[modified.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const prefix = original.slice(0, prefixLength).map((value) => ({ type: 'equal' as const, value }));
  const suffix = original.slice(original.length - suffixLength).map((value) => ({ type: 'equal' as const, value }));
  const left = original.slice(prefixLength, original.length - suffixLength);
  const right = modified.slice(prefixLength, modified.length - suffixLength);

  if (left.length === 0 || right.length === 0) {
    return [...prefix, ...replacementEdits(left, right), ...suffix];
  }
  if (left.length + right.length > limits.maxItems) {
    return [...prefix, ...replacementEdits(left, right), ...suffix];
  }

  const maximumDistance = left.length + right.length;
  const distanceLimit = Math.min(maximumDistance, limits.maxEditDistance);
  const trace: Map<number, number>[] = [];
  let previous = new Map<number, number>([[1, 0]]);
  let traceCells = 0;

  for (let distance = 0; distance <= distanceLimit; distance += 1) {
    traceCells += distance * 2 + 1;
    if (traceCells > limits.maxTraceCells) {
      return [...prefix, ...replacementEdits(left, right), ...suffix];
    }

    const current = new Map<number, number>();
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const moveDown =
        diagonal === -distance ||
        (diagonal !== distance && valueAt(previous, diagonal - 1) < valueAt(previous, diagonal + 1));
      let x = moveDown ? valueAt(previous, diagonal + 1) : valueAt(previous, diagonal - 1) + 1;
      if (!Number.isFinite(x)) {
        x = 0;
      }
      let y = x - diagonal;

      while (x < left.length && y < right.length && left[x] === right[y]) {
        x += 1;
        y += 1;
      }
      current.set(diagonal, x);

      if (x >= left.length && y >= right.length) {
        trace.push(current);
        const edits: Edit<T>[] = [];
        let backtrackX = left.length;
        let backtrackY = right.length;

        for (let step = trace.length - 1; step > 0; step -= 1) {
          const prior = trace[step - 1];
          const currentDiagonal = backtrackX - backtrackY;
          const priorDiagonal =
            currentDiagonal === -step ||
            (currentDiagonal !== step && valueAt(prior, currentDiagonal - 1) < valueAt(prior, currentDiagonal + 1))
              ? currentDiagonal + 1
              : currentDiagonal - 1;
          const priorX = valueAt(prior, priorDiagonal);
          const priorY = priorX - priorDiagonal;

          while (backtrackX > priorX && backtrackY > priorY) {
            edits.push({ type: 'equal', value: left[backtrackX - 1] });
            backtrackX -= 1;
            backtrackY -= 1;
          }

          if (backtrackX === priorX) {
            edits.push({ type: 'added', value: right[backtrackY - 1] });
            backtrackY -= 1;
          } else {
            edits.push({ type: 'removed', value: left[backtrackX - 1] });
            backtrackX -= 1;
          }
        }

        while (backtrackX > 0 && backtrackY > 0) {
          edits.push({ type: 'equal', value: left[backtrackX - 1] });
          backtrackX -= 1;
          backtrackY -= 1;
        }
        while (backtrackX > 0) {
          edits.push({ type: 'removed', value: left[backtrackX - 1] });
          backtrackX -= 1;
        }
        while (backtrackY > 0) {
          edits.push({ type: 'added', value: right[backtrackY - 1] });
          backtrackY -= 1;
        }

        edits.reverse();
        return [...prefix, ...edits, ...suffix];
      }
    }
    trace.push(current);
    previous = current;
  }

  return [...prefix, ...replacementEdits(left, right), ...suffix];
};

const appendSegment = (segments: DiffSegment[], type: DiffSegmentType, text: string) => {
  if (text === '') return;
  const last = segments[segments.length - 1];
  if (last?.type === type) {
    last.text += text;
  } else {
    segments.push({ type, text });
  }
};

const buildCharacterSegments = (leftText: string, rightText: string) => {
  const edits = myersDiff(Array.from(leftText), Array.from(rightText), CHARACTER_LIMITS);
  const leftSegments: DiffSegment[] = [];
  const rightSegments: DiffSegment[] = [];

  for (const edit of edits) {
    if (edit.type === 'equal') {
      appendSegment(leftSegments, 'equal', edit.value);
      appendSegment(rightSegments, 'equal', edit.value);
    } else if (edit.type === 'removed') {
      appendSegment(leftSegments, 'removed', edit.value);
    } else {
      appendSegment(rightSegments, 'added', edit.value);
    }
  }

  return { leftSegments, rightSegments };
};

const splitLines = (text: string): string[] => (text === '' ? [] : text.split('\n'));

export function buildTextDiff(original: string, modified: string): DiffResult {
  const edits = myersDiff(splitLines(original), splitLines(modified), LINE_LIMITS);
  const rows: DiffRow[] = [];
  const stats = { added: 0, deleted: 0, changed: 0 };
  let leftLineNumber = 1;
  let rightLineNumber = 1;
  let index = 0;

  while (index < edits.length) {
    const edit = edits[index];
    if (edit.type === 'equal') {
      rows.push({
        type: 'equal',
        leftLineNumber,
        rightLineNumber,
        leftSegments: edit.value === '' ? [] : [{ type: 'equal', text: edit.value }],
        rightSegments: edit.value === '' ? [] : [{ type: 'equal', text: edit.value }],
        leftText: edit.value,
        rightText: edit.value,
      });
      leftLineNumber += 1;
      rightLineNumber += 1;
      index += 1;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    while (index < edits.length && edits[index].type !== 'equal') {
      const changedEdit = edits[index];
      if (changedEdit.type === 'removed') removed.push(changedEdit.value);
      if (changedEdit.type === 'added') added.push(changedEdit.value);
      index += 1;
    }

    const pairedCount = Math.min(removed.length, added.length);
    for (let pairIndex = 0; pairIndex < pairedCount; pairIndex += 1) {
      const leftText = removed[pairIndex];
      const rightText = added[pairIndex];
      const { leftSegments, rightSegments } = buildCharacterSegments(leftText, rightText);
      rows.push({
        type: 'changed',
        leftLineNumber,
        rightLineNumber,
        leftSegments,
        rightSegments,
        leftText,
        rightText,
      });
      stats.changed += 1;
      leftLineNumber += 1;
      rightLineNumber += 1;
    }

    for (let removedIndex = pairedCount; removedIndex < removed.length; removedIndex += 1) {
      const leftText = removed[removedIndex];
      rows.push({
        type: 'removed',
        leftLineNumber,
        rightLineNumber: null,
        leftSegments: leftText === '' ? [] : [{ type: 'removed', text: leftText }],
        rightSegments: [],
        leftText,
        rightText: '',
      });
      stats.deleted += 1;
      leftLineNumber += 1;
    }

    for (let addedIndex = pairedCount; addedIndex < added.length; addedIndex += 1) {
      const rightText = added[addedIndex];
      rows.push({
        type: 'added',
        leftLineNumber: null,
        rightLineNumber,
        leftSegments: [],
        rightSegments: rightText === '' ? [] : [{ type: 'added', text: rightText }],
        leftText: '',
        rightText,
      });
      stats.added += 1;
      rightLineNumber += 1;
    }
  }

  return { rows, stats };
}
