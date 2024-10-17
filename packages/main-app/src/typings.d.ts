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
    __ICE_PAGE_PROPS__?: any;
  }
}
