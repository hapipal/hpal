'use strict';

const Os = require('os');

exports.example = (example, space) => {

    const EOL = Os.EOL;
    const INDENT = (typeof space === 'undefined') ? '    ' : space;
    const makeComment = (c, s) => (c ? `${s}// ${c}` : '');

    const reduce = (obj, isLiteral, outerComment, depth) => {

        if (typeof obj !== 'object' || obj === null || isLiteral) {
            return ((typeof obj === 'string' && !isLiteral) ? `'${obj}'` : `${obj}`) + makeComment((depth === 0) && outerComment, ' ');
        }
        else if (Object.keys(obj).length === 0) {
            return '{}' + makeComment(outerComment, ' ');
        }
        else if (obj.hasOwnProperty('$literal')) {
            return reduce(obj.$literal, true, obj.$comment, depth);
        }
        else if (obj.hasOwnProperty('$value')) {
            return reduce(obj.$value, false, obj.$comment, depth);
        }

        const begin = '{' + makeComment(outerComment, ' ');
        const end = EOL + INDENT.repeat(depth) + '}';

        return Object.keys(obj).reduce((out, key, i, keys) => {

            const value = obj[key];
            const isLast = keys.length === (i + 1);
            const isOnly = keys.length === 1;
            const displayKey = key.match(/^[a-z_$][a-z\d_$]*$/i) ? key : `'${key}'`;
            const displayValue = reduce(value, false, null, depth + 1);

            // TODO still printing inner and outer comment on objects
            const innerComment = (typeof value === 'object' && value !== null) ? value.$comment : null;

            return out + EOL +
                INDENT.repeat(depth + 1) +
                `${displayKey}: ${displayValue}` +
                (isLast ? '' : ',') +
                makeComment(innerComment, (isLast && !isOnly) ? '  ' : ' ');
        }, begin) + end;
    };

    return reduce(example, false, null, 0);
};
