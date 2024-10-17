let history = null;
const storage = {
  history: null,
};

function setHistory(customHistory) {
  history = customHistory;
  storage.history = customHistory;
}

function getHistory() {
  return storage.history;
}

export { getHistory, setHistory, history };
