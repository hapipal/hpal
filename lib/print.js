'use strict';

const Os = require('os');
const Marked = require('marked');
const TerminalRenderer = require('marked-terminal');

exports.example = (example, space) => {

    const EOL = Os.EOL;
    const INDENT = (typeof space === 'undefined') ? '    ' : space;
    const IDENTIFIER_EXP = /^[a-z_$][a-z\d_$]*$/i;
    const makeComment = (c) => {

        return (c ? ` // ${c}` : '');
    };

    const stringify = (obj, isLiteral, outerComment, depth) => {

        if (typeof obj !== 'object' || obj === null || isLiteral) {
            return ((typeof obj === 'string' && !isLiteral) ? `'${obj}'` : `${obj}`) + makeComment((depth === 0) && outerComment);
        }
        else if (Array.isArray(obj)) {

            if (obj.length === 0) {
                return '[]' + makeComment((depth === 0) && outerComment);
            }

            const beginArray = '[' + makeComment(outerComment);
            const endArray = EOL + INDENT.repeat(depth) + ']';

            return obj.reduce((out, value, i) => {

                const isLast = obj.length === (i + 1);
                const displayValue = stringify(value, false, null, depth + 1);
                const isMultiLine = (displayValue.indexOf(EOL) !== -1);
                const innerComment = (typeof value === 'object' && value !== null && !isMultiLine) ? value.$comment : null;

                return out + EOL +
                    INDENT.repeat(depth + 1) +
                    displayValue + (isLast ? '' : ',') +
                    makeComment(innerComment);
            }, beginArray) + endArray;
        }
        else if (Object.keys(obj).length === 0) {
            return '{}' + makeComment((depth === 0) && outerComment);
        }
        else if (obj.hasOwnProperty('$literal')) {
            return stringify(obj.$literal, true, obj.$comment, depth);
        }
        else if (obj.hasOwnProperty('$value')) {
            return stringify(obj.$value, false, obj.$comment, depth);
        }

        const beginObject = '{' + makeComment(outerComment);
        const endObject = EOL + INDENT.repeat(depth) + '}';

        return Object.keys(obj).reduce((out, key, i, keys) => {

            const value = obj[key];
            const isLast = keys.length === (i + 1);
            const displayKey = key.match(IDENTIFIER_EXP) ? key : `'${key}'`;
            const displayValue = stringify(value, false, null, depth + 1);
            const isMultiLine = (displayValue.indexOf(EOL) !== -1);
            const innerComment = (typeof value === 'object' && value !== null && !isMultiLine) ? value.$comment : null;

            return out + EOL + INDENT.repeat(depth + 1) +
                `${displayKey}: ${displayValue}` + (isLast ? '' : ',') +
                makeComment(innerComment);
        }, beginObject) + endObject;
    };

    return stringify(example, false, null, 0);
};

exports.markdownSection = (content, matcher) => {

    const tokens = Marked.lexer(content);
    const keep = Object.assign([], { links: {} });
    let depth = null;

    for (let i = 0; i < tokens.length; ++i) {

        const token = tokens[i];

        if (depth !== null) {
            if (token.type === 'heading' && token.depth <= depth) {
                break;
            }
            else if (token.type !== 'heading' || token.depth > depth) {
                keep.push(token);
            }
        }
        else if (token.type === 'heading' && matcher(token.text)) {
            keep.push(token);
            depth = token.depth;
        }
    }

    return Marked.parser(keep, { renderer: new TerminalRenderer() });
};
