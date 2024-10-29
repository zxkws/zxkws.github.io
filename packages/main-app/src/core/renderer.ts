declare global {
  interface Window {
    __ICE_APP_DATA__: any;
  }
}
export function reactAppRenderer(options) {
  const context = {};
  if (!window.__ICE_APP_DATA__) {
    console.log(context);
  }
}
