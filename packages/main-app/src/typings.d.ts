// declare module '*.module.css' {
//   const classes: { [key: string]: string };
//   export default classes;
// }
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export = classes;
}

declare global {
  interface Window {
    __ICE_PAGE_PROPS__?: Record<string, unknown>;
    __MAIN_APP_MICRO_APPS__?: Array<import('@ice/stark').AppConfig>;
  }
}
