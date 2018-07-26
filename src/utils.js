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

/**
 * Takes a string and padds every line
 * @param {string} lines A string containing multiple lines
 * @param {int} padding Amount of left padding
 * @param {int} skip Number of first lines to skip. (default 1)
 */
export function leftPadLines(lines, padding, skip = 0) {
    lines = JSON.stringify(lines, null, 4).trim().split("\n");

    return lines.reduce((c, v, i) => {
        if (i <= skip) {
            return c + v;
        } else {
            return c + "\n" + Array(padding).join(" ") + v;
        }
    }, '')
}

/**
 * Helper function, capitalizes the first letter of every word in string.
 * @param {string} value String to capitalize words.
 * @param {int} skip Number of words to skip from begining.
 * @return {string}
 */
export function capitalize(value, skip) {
    if (value.constructor !== Array) {
        value = [value];
    }

    return value.reduce((c, v, i) => {
        if (i <= skip) {
            c.push(v);
        } else {
            c.push(v.charAt(0).toUpperCase() + v.slice(1));
        }
        return c;
    }, []);
}

/**
 * Capitalizes and removes spaces from string. Usually used on fields
 * @param {string} value string to normalize
 * @return {string}
 */
export function normalizeField(value) {
    return capitalize(value.split(' '), 1).join('');
}
