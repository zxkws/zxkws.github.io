export interface AppHistory {
    push: (path: string) => void;
    replace: (path: string) => void;
  }
  
  const appHistory: AppHistory = {
    push: (path: string) => {
      window.history.pushState({}, '', path);
    },
    replace: (path: string) => {
      window.history.replaceState({}, '', path);
    },
  };
  
  export default appHistory;
  