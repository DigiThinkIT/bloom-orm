/**
 * Utility timout function, calls timeoutFn if returned function isn't called without its timeout window.
 * @param {functino} fn 
 * @param {int} timeout 
 * @param {function} timeoutFn 
 */
export function Timeout(fn, timeout, timeoutFn) {
    let timeoutRef = setTimeout(timeoutFn, timeout);

    return function() {
        clearTimeout(timeoutRef);
        fn.call(fn, arguments);
    }
}