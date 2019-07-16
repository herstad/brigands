export const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);
export const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
