import { DependencyList, RefObject } from 'react';
import { PaginationConfig, Filter, Sorter } from './antdTypes';
import { CachedKeyType } from './utils/cache';
export declare type noop = (...args: any[]) => void;
export declare type Service<R, P extends any[]> = (...args: P) => Promise<R>;
export declare type Subscribe<R, P extends any[]> = (data: FetchResult<R, P>) => void;
export declare type Mutate<R> = (x: R | undefined | ((data: R) => R)) => void;
export interface RequestServiceObject extends RequestInit {
    url?: string;
    [key: string]: any;
}
export declare type RequestService = string | RequestServiceObject;
export declare type CombineService<R, P extends any[]> = RequestService | ((...args: P) => RequestService) | Service<R, P>;
export interface Fetches<R, P extends any[]> {
    [key: string]: FetchResult<R, P>;
}
export interface FetchResult<R, P extends any[]> {
    loading: boolean;
    data: R | undefined;
    error: Error | undefined;
    params: P;
    cancel: noop;
    refresh: () => Promise<R>;
    mutate: Mutate<R>;
    run: (...args: P) => Promise<R>;
    unmount: () => void;
}
export interface FetchConfig<R, P extends any[]> {
    formatResult?: (res: any) => R;
    onSuccess?: (data: R, params: P) => void;
    onError?: (e: Error, params: P) => void;
    loadingDelay?: number;
    pollingInterval?: number;
    pollingWhenHidden?: boolean;
    refreshOnWindowFocus?: boolean;
    focusTimespan: number;
    debounceInterval?: number;
    throttleInterval?: number;
    throwOnError?: boolean;
}
export interface BaseResult<R, P extends any[]> extends FetchResult<R, P> {
    reset: () => void;
    fetches: {
        [key in string]: FetchResult<R, P>;
    };
}
export declare type BaseOptions<R, P extends any[]> = {
    refreshDeps?: DependencyList;
    manual?: boolean;
    onSuccess?: (data: R, params: P) => void;
    onError?: (e: Error, params: P) => void;
    defaultLoading?: boolean;
    loadingDelay?: number;
    defaultParams?: P;
    pollingInterval?: number;
    pollingWhenHidden?: boolean;
    fetchKey?: (...args: P) => string;
    paginated?: false;
    loadMore?: false;
    refreshOnWindowFocus?: boolean;
    focusTimespan?: number;
    cacheKey?: CachedKeyType;
    cacheTime?: number;
    staleTime?: number;
    debounceInterval?: number;
    throttleInterval?: number;
    initialData?: R;
    requestMethod?: (service: any) => Promise<any>;
    ready?: boolean;
    throwOnError?: boolean;
};
export declare type OptionsWithFormat<R, P extends any[], U, UU extends U> = {
    formatResult: (res: R) => U;
} & BaseOptions<UU, P>;
export declare type Options<R, P extends any[], U, UU extends U> = BaseOptions<R, P> | OptionsWithFormat<R, P, U, UU>;
export declare type PaginatedParams = [{
    current: number;
    pageSize: number;
    sorter?: Sorter;
    filters?: Filter;
}, ...any[]];
export interface PaginatedFormatReturn<Item> {
    total: number;
    list: Item[];
    [key: string]: any;
}
export interface PaginatedResult<Item> extends BaseResult<PaginatedFormatReturn<Item>, PaginatedParams> {
    pagination: {
        current: number;
        pageSize: number;
        total: number;
        totalPage: number;
        onChange: (current: number, pageSize: number) => void;
        changeCurrent: (current: number) => void;
        changePageSize: (pageSize: number) => void;
        [key: string]: any;
    };
    tableProps: {
        dataSource: Item[];
        loading: boolean;
        onChange: (pagination: PaginationConfig, filters?: Filter, sorter?: Sorter) => void;
        pagination: PaginationConfig;
        [key: string]: any;
    };
    sorter?: Sorter;
    filters?: Filter;
}
export interface BasePaginatedOptions<U> extends Omit<BaseOptions<PaginatedFormatReturn<U>, PaginatedParams>, 'paginated'> {
    paginated: true;
    defaultPageSize?: number;
}
export interface PaginatedOptionsWithFormat<R, Item, U> extends Omit<BaseOptions<PaginatedFormatReturn<U>, PaginatedParams>, 'paginated'> {
    paginated: true;
    defaultPageSize?: number;
    formatResult: (data: R) => PaginatedFormatReturn<Item>;
}
export declare type LoadMoreParams<R> = [R | undefined, ...any[]];
export interface LoadMoreFormatReturn {
    list: any[];
    [key: string]: any;
}
export interface LoadMoreResult<R> extends BaseResult<R, LoadMoreParams<R>> {
    noMore?: boolean;
    loadMore: () => void;
    reload: () => void;
    loadingMore: boolean;
}
export interface LoadMoreOptions<R extends LoadMoreFormatReturn> extends Omit<BaseOptions<R, LoadMoreParams<R>>, 'loadMore'> {
    loadMore: true;
    ref?: RefObject<any>;
    isNoMore?: (r: R | undefined) => boolean;
    threshold?: number;
}
export interface LoadMoreOptionsWithFormat<R extends LoadMoreFormatReturn, RR> extends Omit<BaseOptions<R, LoadMoreParams<R>>, 'loadMore'> {
    loadMore: true;
    formatResult: (data: RR) => R;
    ref?: RefObject<any>;
    isNoMore?: (r: R | undefined) => boolean;
    threshold?: number;
}
