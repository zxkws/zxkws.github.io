import { History, Location } from 'history';
import { AppConfig } from './types';
interface Route {
    path?: string;
    source: string;
    [key: string]: unknown;
}
export type CreateHistory = (options: {
    type?: string;
    basename?: string;
    location?: Location;
    routes?: Route[];
    customHistory?: History;
    initialIndex?: number;
    initialEntries?: string[];
}) => History<unknown>;
type InitialContext = null | {
    location?: Location;
};
type Options = {
    initialContext?: InitialContext;
    staticConfig?: {
        routes: Route[];
        [key: string]: unknown;
    };
};
export type InitHistory = (appConfig: AppConfig, options?: Options) => void;
declare const _default: (createHistory: CreateHistory) => (appConfig: AppConfig, options?: Options) => void;
export default _default;
