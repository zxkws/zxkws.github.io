import * as React from 'react';
import type { AppConfig, BuildConfig, Context } from './types';
type IPageComponent = boolean | React.ComponentType;
interface IPageItem {
    [key: string]: any;
}
type IPage = IPageItem[];
interface IModifyFn {
    (routes: IPage): IPage;
}
interface IDOMRender {
    ({ App, appMountNode }: {
        App: React.ComponentType;
        appMountNode: HTMLElement;
    }): void;
}
type RegisterRuntimeAPI = (key: string, api: Function) => void;
type SetRuntimeValue = (key: string, value: unknown) => void;
type GetRuntimeValue = <T extends unknown>(key: string) => T;
type ApplyRuntimeAPI = <T extends unknown>(key: string, ...args: any) => T;
type IWrapper<InjectProps> = (<Props>(Component: React.ComponentType<Props & InjectProps>) => React.ComponentType<Props>);
type IRenderApp = (page?: IPage | React.ComponentType, PageComponent?: IPageComponent) => React.ComponentType;
type IWrapperRouterRender = (renderRouter: IRenderApp) => IRenderApp;
type SetRenderApp = (renderApp: IRenderApp) => void;
type AddProvider = (Provider: React.ComponentType) => void;
type AddDOMRender = (domRender: IDOMRender) => void;
type ModifyRoutes = (modifyFn: IModifyFn) => void;
type WrapperPageComponent = (wrapperPage: IWrapper<any>) => void;
type WrapperRouterRender = (wrapper: IWrapperRouterRender) => void;
type ModifyRoutesComponent = (modify: (routesComponent: IPageComponent) => IPageComponent) => void;
type CommonJsRuntime = {
    default: RuntimePlugin;
};
type GetAppComponent = () => React.ComponentType;
type GetWrapperPageRegistration = () => IWrapper<any>[];
interface RuntimeAPI {
    setRenderApp?: SetRenderApp;
    addProvider: AddProvider;
    addDOMRender: AddDOMRender;
    modifyRoutes?: ModifyRoutes;
    wrapperRouterRender?: WrapperRouterRender;
    modifyRoutesComponent?: ModifyRoutesComponent;
    wrapperPageComponent?: WrapperPageComponent;
    applyRuntimeAPI: ApplyRuntimeAPI;
    appConfig: AppConfig;
    buildConfig: BuildConfig;
    context: Context;
    staticConfig: any;
    getRuntimeValue: GetRuntimeValue;
}
export interface RuntimePlugin {
    (apis: RuntimeAPI): void;
}
declare class RuntimeModule {
    private appConfig;
    private buildConfig;
    private context;
    private staticConfig;
    private renderApp;
    private AppProvider;
    private modifyRoutesRegistration;
    private wrapperPageRegistration;
    private routesComponent;
    private apiRegistration;
    private internalValue;
    modifyDOMRender: IDOMRender;
    constructor(appConfig: AppConfig, buildConfig: BuildConfig, context: Context, staticConfig?: any);
    loadModule(module: RuntimePlugin | CommonJsRuntime): void;
    composeAppProvider(): React.ComponentType<{}>;
    registerRuntimeAPI: RegisterRuntimeAPI;
    private applyRuntimeAPI;
    setRuntimeValue: SetRuntimeValue;
    getRuntimeValue: GetRuntimeValue;
    private setRenderApp;
    private wrapperRouterRender;
    private addProvider;
    private addDOMRender;
    private modifyRoutes;
    private modifyRoutesComponent;
    private wrapperPageComponent;
    private wrapperRoutes;
    getWrapperPageRegistration: GetWrapperPageRegistration;
    getAppComponent: GetAppComponent;
}
export default RuntimeModule;
