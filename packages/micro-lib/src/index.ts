export const appHistory = {
  push(path: string, data?: any, title?: any) {
    window.history.pushState(data, title, path);
  },
  replace(path: string, data?: any, title?: any) {
    window.history.replaceState(data, title, path);
  },
};

export const start = (options: any) => {
  console.log(options);
};

export const registerMicroApps = (apps: any[]) => {
  console.log(apps);
};
