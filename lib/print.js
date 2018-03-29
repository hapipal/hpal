'use strict';

const Os = require('os');
const Marked = require('marked');
const TerminalRenderer = require('marked-terminal');

const internals = {};

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

exports.requires = (example) => {

    const requires = (example && example.$requires) || [];

    return requires
        .map((dep) => `const ${internals.pascalize(dep)} = require('${dep}');`)
        .join(Os.EOL);
};

exports.markdownSection = (content, matchers) => {

    const tokens = Marked.lexer(content);

    for (let i = 0; i < matchers.length; ++i) {

        const matcher = matchers[i];
        const section = internals.getMarkdownSection(tokens, matcher);

        if (section.length) {
            return Marked.parser(section, { renderer: new TerminalRenderer() });
        }
    }

    return null;
};

exports.markdownListItem = (content, headingMatchers, listItemMatcher) => {

    const tokens = Marked.lexer(content);

    for (let i = 0; i < headingMatchers.length; ++i) {

        const headingMatcher = headingMatchers[i];
        const section = internals.getMarkdownSection(tokens, headingMatcher);

        if (section.length) {
            const listItem = internals.getMarkdownListItem(section, listItemMatcher);

            if (listItem.length) {

                const processedListItem = [].concat(
                    section[0],
                    { type: 'list_start' },
                    listItem,
                    { type: 'list_end' }
                );

                processedListItem.links = listItem.links;

                return Marked.parser(processedListItem, { renderer: new TerminalRenderer() });
            }
        }
    }

    return null;
};

exports.colors = (enabled) => {

    const codes = {
        bold: 1,
        red: 31,
        green: 32,
        yellow: 33,
        grey: 92
    };

    const colors = {};

    const names = Object.keys(codes);
    for (let i = 0; i < names.length; ++i) {
        const name = names[i];
        colors[name] = internals.color(name, codes[name], enabled);
    }

    return colors;
};

internals.getMarkdownSection = (tokens, matcher) => {

    const keep = Object.assign([], { links: {} });
    let depth = null;

    for (let i = 0; i < tokens.length; ++i) {

        const token = tokens[i];

        if (depth !== null) {
            if (token.type === 'heading' && token.depth <= depth) {
                break;
            }
            else if (token.type !== 'heading' || token.depth > depth) {
                keep.push(internals.removeHeadingAnchorTags(token));
            }
        }
        else if (token.type === 'heading' && matcher(token.text)) {
            keep.push(internals.removeHeadingAnchorTags(token));
            depth = token.depth;
        }
    }

    return keep;
};

exports.headingAnchorTagRegex = /[\s]*<a name="(.*)" \/>[\s]*/;

internals.removeHeadingAnchorTags = (token) => {

    if (token.type !== 'heading') {
        return token;
    }

    return Object.assign({}, token, {
        text: token.text.replace(exports.headingAnchorTagRegex, '')
    });
};

internals.getMarkdownListItem = (tokens, matcher) => {

    const keep = Object.assign([], { links: {} });
    let depth = null;

    for (let i = 0; i < tokens.length; ++i) {

        const token = tokens[i];
        const nextToken = tokens[i + 1];

        if (depth !== null) {

            keep.push(token);

            if (token.type === 'list_item_start' || token.type === 'loose_item_start') {
                depth++;
            }
            else if (token.type === 'list_item_end') {
                depth--;
            }

            if (depth === 0) {
                break;
            }
        }
        else if ((token.type === 'list_item_start' || token.type === 'loose_item_start') &&
                 (nextToken.type === 'text' && matcher(nextToken.text))) {

            keep.push(token);
            depth = 1;
        }
    }

    return keep;
};

internals.pascalize = (str) => str.replace(/(?:^|-)(\w)/g, (match, char) => char.toUpperCase());

internals.color = function (name, code, enabled) {

    if (!enabled) {
        return (text) => text;
    }

    return (text) => `\u001b[${code}m${text}\u001b[0m`;
};
