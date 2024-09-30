// Value of history will be modified after render Router.
let routerHistory = null;
function setHistory(customHistory) {
    routerHistory = customHistory;
}
export { routerHistory, setHistory, };
