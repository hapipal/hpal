'use strict';

const Os = require('os');

exports.example = (example, indent) => {

    const NEWLINE = Os.EOL;
    const INDENT = typeof indent === 'undefined' ? '    ' : indent;

    const reduce = (obj, depth) => {

        return Object.keys(obj).reduce((out, key) => {

            const value = obj[key];

            if (typeof value === 'object' && value !== null) {
                return reduce(value, depth + 1);
            }

            return out +
                NEWLINE + INDENT.repeat(depth) +
                key + ':' + value + (isLast ? '' : ',') + (comment ? ` ${comment}` : '')
        }, '{') + '}';
    };

    return reduce(example, 1);
};
