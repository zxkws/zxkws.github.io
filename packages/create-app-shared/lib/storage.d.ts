import type { History } from 'history';
interface Storage {
    history: History | null;
}
declare let history: Storage['history'];
declare function getHistory(): any;
declare function setHistory(customHistory: History): void;
export { getHistory, setHistory, history, };
