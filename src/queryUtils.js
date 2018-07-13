/**
 * This is the default implementation of a query ascending behaviour.
 * Usually, custom models may replace this function generate their internal
 * query language.
 * @example
 * // used on a fetch query on some model.
 * model.fetch({ orderby: r => asc(r.id) });
 * @param {string} col The column to order in ascending order
 * @returns {function} A comparison function to use between two objects
 */
export function asc(col) {
    return function (a, b) {
        return a[col] - b[col];
    }
}

/**
 * This is the default implementation of a query descending behaviour.
 * Usually, custom models may replace this function generate their internal
 * query language.
 * @example
 * // used on a fetch query on some model.
 * model.fetch({ orderby: r => desc(r.id) });
 * @param {string} col The column to order in descending order
 * @returns {function} A comparison function to use between two objects
 */
export function desc(col) {
    return function (a, b) {
        return b[col] - a[col];
    }
}

/**
 * Helper function. It accumulates an array of asc or desc calls to implement
 * multi column sorting for local stores. It is usually used internally and should
 * not be used outside of building custom models.
 * @example
 * // multi column sorting
 * [
 *  {a: 1, b:1}, 
 *  {a:1, b: 2}, 
 *  {a: 2, b:1}, 
 *  {a: 2, b: 2}
 * ].sort(multiColSort([asc('a'), desc('b')]))
 * // result:
 * [
 *  {a: 1, b: 2},
 *  {a: 1, b: 1},
 *  {a: 2, b: 2},
 *  {a: 2, b: 1}
 * ]
 * @param {Array} orderby An array or single asc/desc function to accumulate
 * @returns {function} A comparison function which combines the provided array of sort functions.
 */
export function multiColSort(orderby) {
    if (orderby.constructor !== Array) {
        orderby = [orderby];
    }

    let fn = orderby.shift();
    return function (a, b) {
        let result = fn(a, b);
        if (result === 0 && orderby.length > 0) {
            return multiColSort(orderby)(a, b);
        }

        return result;
    }
}

/**
 * 
 * @param {*} fn A value to test if is considered an arrow function.
 * @returns {boolean} true or false
 */
export function isArrowFunction(fn) {
    let fnSrc = fn.toString();
    return (/^\s*(\(\s*\)|\([a-z0-9_=,\s+\{\}\.]+\)|[a-z0-9_\.]+)\s*=>.+/).test(fnSrc);
}