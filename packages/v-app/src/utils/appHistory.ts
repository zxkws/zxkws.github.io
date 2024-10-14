const appHistory = {
  push: (url: string, state = {}, hashType = false) => {
    window.history.pushState(
      state,
      "",
      hashType && url.indexOf("#") === -1 ? "#" + url : url
    );
  },
  replace: (url: string, state = {}, hashType = false) => {
    window.history.replaceState(
      state,
      "",
      hashType && url.indexOf("#") === -1 ? "#" + url : url
    );
  },
};

export default appHistory;
