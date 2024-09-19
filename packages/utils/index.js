export const debounce = (fun, delay) => {
    let timer;
    return function (...args) {
        if(timer) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            fun.apply(this, args)
        }, delay)
    }
}

export const throttle = (fun, delay) => {
    let timer;
    return function (...args) {
        if(timer) return;
        timer = setTimeout(() => {
            fun.apply(this, args)
        }, delay)
    }
}

export const cloneDeep = (val, hash = new WeakMap()) => {
    if(!val) return;
    if(typeof val !== 'object') return val;
    if(val instanceof Date) return new Date(val); // 是对象，但不能被for in 遍历，所以会返回空对象
    if(val instanceof RegExp) return new RegExp(val); // 是对象，但不能被for in 遍历，所以会返回空对象

    if(hash.get(val)) return hash.get(val);
    const result = new val.constructor();
    hash.set(val, result);
    // const result = Array.isArray(val) ? [] : {};
    for (const key in val) {
        result[key] = cloneDeep(val[key], hash);
    }
    return result;
}

function partition(arr, ){}

export const quickSort = (arr, start = 0, end = arr?.length) =>{
    if(!arr) return;
    const pivot = arr[Math.floor((end - start)*Math.random() + start)];
    console.log(pivot);
}