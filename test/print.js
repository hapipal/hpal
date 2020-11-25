'use strict';

/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

// Load modules

const Os = require('os');
const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const Chalk = require('chalk'); // Implicitly from marked-terminal
const StripAnsi = require('strip-ansi');
const Print = require('../lib/print');

// Test shortcuts

const { describe, it, before, after } = exports.lab = Lab.script();
const { expect } = Code;

const internals = {};

describe('Print.example()', () => {

    const p = Print.example;

    it('prints primitives.', () => {

        expect(p(1)).to.equal('1');
        expect(p(2.718)).to.equal('2.718');
        expect(p('')).to.equal(`''`);
        expect(p('a string')).to.equal(`'a string'`);
        expect(p(null)).to.equal('null');
        expect(p(undefined)).to.equal('undefined');
        expect(p(true)).to.equal('true');
        expect(p(false)).to.equal('false');
    });

    it('prints a primitive $value.', () => {

        expect(p({ $value: 1 })).to.equal('1');
        expect(p({ $value: 2.718 })).to.equal('2.718');
        expect(p({ $value: '' })).to.equal(`''`);
        expect(p({ $value: 'a string' })).to.equal(`'a string'`);
        expect(p({ $value: null })).to.equal('null');
        expect(p({ $value: undefined })).to.equal('undefined');
        expect(p({ $value: true })).to.equal('true');
        expect(p({ $value: false })).to.equal('false');
    });

    it('prints a commented primitive $value.', () => {

        expect(p({ $comment: 'x', $value: 1 })).to.equal('1 // x');
        expect(p({ $comment: 'x', $value: 2.718 })).to.equal('2.718 // x');
        expect(p({ $comment: 'x', $value: '' })).to.equal(`'' // x`);
        expect(p({ $comment: 'x', $value: 'a string' })).to.equal(`'a string' // x`);
        expect(p({ $comment: 'x', $value: null })).to.equal('null // x');
        expect(p({ $comment: 'x', $value: undefined })).to.equal('undefined // x');
        expect(p({ $comment: 'x', $value: true })).to.equal('true // x');
        expect(p({ $comment: 'x', $value: false })).to.equal('false // x');
    });

    it('prints an empty object.', () => {

        expect(p({})).to.equal('{}');
    });

    it('prints a commented empty object.', () => {

        expect(p({ $value: {}, $comment: 'Empty' })).to.equal('{} // Empty');
    });

    it('prints an empty array.', () => {

        expect(p([])).to.equal('[]');
    });

    it('prints a commented empty array.', () => {

        expect(p({ $value: [], $comment: 'Empty' })).to.equal('[] // Empty');
    });

    it('prints a $literal.', () => {

        expect(p({ $literal: 'invalid/js' })).to.equal('invalid/js');
    });

    it('prints a stringified $literal.', () => {

        expect(p({ $literal: { toString: () => 'invalid/js' } })).to.equal('invalid/js');
    });

    it('prints a commented $literal.', () => {

        expect(p({ $literal: 'invalid/js', $comment: 'This wont parse' })).to.equal('invalid/js // This wont parse');
    });

    it('prints an object with one key.', () => {

        expect(p({ x: 'y' })).to.equal([
            '{',
            `    x: 'y'`,
            '}'
        ].join(Os.EOL));
    });

    it('prints an object with multiple keys.', () => {

        expect(p({ a: 1, b: 2, c: 3 })).to.equal([
            '{',
            `    a: 1,`,
            `    b: 2,`,
            `    c: 3`,
            '}'
        ].join(Os.EOL));
    });

    it('prints a commented non-empty object.', () => {

        expect(p({ $comment: 'All numeric', $value: { a: 1, b: 2, c: 3 } })).to.equal([
            '{ // All numeric',
            `    a: 1,`,
            `    b: 2,`,
            `    c: 3`,
            '}'
        ].join(Os.EOL));
    });

    it('prints a object-nested, commented empty object.', () => {

        expect(p({ obj: { $comment: 'Nothin to see', $value: {} } })).to.equal([
            '{',
            `    obj: {} // Nothin to see`,
            '}'
        ].join(Os.EOL));

        expect(p({ obj: { $comment: 'Nothin to see', $value: {} }, num: 1 })).to.equal([
            '{',
            `    obj: {}, // Nothin to see`,
            '    num: 1',
            '}'
        ].join(Os.EOL));
    });

    it('prints an array-nested, commented empty object.', () => {

        expect(p([{ $comment: 'Nothin to see', $value: {} }])).to.equal([
            '[',
            `    {} // Nothin to see`,
            ']'
        ].join(Os.EOL));

        expect(p([{ $comment: 'Nothin to see', $value: {} }, 1])).to.equal([
            '[',
            `    {}, // Nothin to see`,
            `    1`,
            ']'
        ].join(Os.EOL));
    });

    it('prints an object-nested non-empty object.', () => {

        expect(p({ obj: { a: 1, b: 2 } })).to.equal([
            '{',
            '    obj: {',
            `        a: 1,`,
            `        b: 2`,
            '    }',
            '}'
        ].join(Os.EOL));
    });

    it('prints an object-nested, commented non-empty object.', () => {

        expect(p({ obj: { $comment: 'Somethin to see', $value: { a: 1, b: 2 } } })).to.equal([
            '{',
            '    obj: { // Somethin to see',
            `        a: 1,`,
            `        b: 2`,
            '    }',
            '}'
        ].join(Os.EOL));
    });

    it('prints an array-nested non-empty object.', () => {

        expect(p([{ a: 1, b: 2 }])).to.equal([
            '[',
            '    {',
            `        a: 1,`,
            `        b: 2`,
            '    }',
            ']'
        ].join(Os.EOL));
    });

    it('prints an array-nested, commented non-empty object.', () => {

        expect(p([{ $comment: 'Somethin to see', $value: { a: 1, b: 2 } }])).to.equal([
            '[',
            '    { // Somethin to see',
            `        a: 1,`,
            `        b: 2`,
            '    }',
            ']'
        ].join(Os.EOL));
    });

    it('prints an array with one value.', () => {

        expect(p(['x'])).to.equal([
            '[',
            `    'x'`,
            ']'
        ].join(Os.EOL));
    });

    it('prints an array with multiple values.', () => {

        expect(p([1, 2, 3])).to.equal([
            '[',
            `    1,`,
            `    2,`,
            `    3`,
            ']'
        ].join(Os.EOL));
    });

    it('prints a commented non-empty array.', () => {

        expect(p({ $comment: 'All numeric', $value: [1, 2, 3] })).to.equal([
            '[ // All numeric',
            `    1,`,
            `    2,`,
            `    3`,
            ']'
        ].join(Os.EOL));
    });

    it('prints a object-nested, commented empty array.', () => {

        expect(p({ arr: { $comment: 'Nothin to see', $value: [] } })).to.equal([
            '{',
            `    arr: [] // Nothin to see`,
            '}'
        ].join(Os.EOL));

        expect(p({ arr: { $comment: 'Nothin to see', $value: [] }, num: 1 })).to.equal([
            '{',
            `    arr: [], // Nothin to see`,
            '    num: 1',
            '}'
        ].join(Os.EOL));
    });

    it('prints an array-nested, commented empty array.', () => {

        expect(p([{ $comment: 'Nothin to see', $value: [] }])).to.equal([
            '[',
            `    [] // Nothin to see`,
            ']'
        ].join(Os.EOL));

        expect(p([{ $comment: 'Nothin to see', $value: [] }, 1])).to.equal([
            '[',
            `    [], // Nothin to see`,
            `    1`,
            ']'
        ].join(Os.EOL));
    });

    it('prints an object-nested non-empty array.', () => {

        expect(p({ arr: ['a', 'b'] })).to.equal([
            '{',
            '    arr: [',
            `        'a',`,
            `        'b'`,
            '    ]',
            '}'
        ].join(Os.EOL));
    });

    it('prints an object-nested, commented non-empty array.', () => {

        expect(p({ arr: { $comment: 'Somethin to see', $value: ['a', 'b'] } })).to.equal([
            '{',
            '    arr: [ // Somethin to see',
            `        'a',`,
            `        'b'`,
            '    ]',
            '}'
        ].join(Os.EOL));
    });

    it('prints an array-nested non-empty array.', () => {

        expect(p([['a', 'b']])).to.equal([
            '[',
            '    [',
            `        'a',`,
            `        'b'`,
            '    ]',
            ']'
        ].join(Os.EOL));
    });

    it('prints an array-nested, commented non-empty array.', () => {

        expect(p([{ $comment: 'Somethin to see', $value: ['a', 'b'] }])).to.equal([
            '[',
            '    [ // Somethin to see',
            `        'a',`,
            `        'b'`,
            '    ]',
            ']'
        ].join(Os.EOL));
    });

    it('prints an object-nested null.', () => {

        expect(p({ x: null })).to.equal([
            '{',
            '    x: null',
            '}'
        ].join(Os.EOL));
    });

    it('prints an array-nested null.', () => {

        expect(p([null])).to.equal([
            '[',
            '    null',
            ']'
        ].join(Os.EOL));
    });

    it('prints quoted keys.', () => {

        expect(p({ 'super-man': 'needs quotes' })).to.equal([
            '{',
            `    'super-man': 'needs quotes'`,
            '}'
        ].join(Os.EOL));
    });

    it('prints with any spacing.', () => {

        expect(p([{ a: [1,2] }], '--')).to.equal([
            '[',
            '--{',
            '----a: [',
            '------1,',
            '------2',
            '----]',
            '--}',
            ']'
        ].join(Os.EOL));
    });

    it('deeply nests.', () => {

        const ex = {
            $comment: 'w',
            $value: [
                { $comment: 'x' , $value: 1 },
                2,
                { $comment: 'y', $literal: '() => null' },
                {
                    three: {
                        $comment: 'z',
                        $value: [
                            undefined,
                            { four: 4 },
                            [],
                            {}
                        ]
                    }
                },
                () => 6
            ]
        };

        expect(p(ex)).to.equal([
            '[ // w',
            '    1, // x',
            '    2,',
            '    () => null, // y',
            '    {',
            '        three: [ // z',
            '            undefined,',
            '            {',
            '                four: 4',
            '            },',
            '            [],',
            '            {}',
            '        ]',
            '    },',
            '    () => 6',
            ']'
        ].join(Os.EOL));
    });
});

describe('Print.requires()', () => {

    it('prints an example\'s requires.', () => {

        const ex = { $requires: ['five-spot', 'ten-spot', './index', '../../two-levels-up', 'with/basename.js'] };

        expect(Print.requires(ex)).to.equal([
            'const FiveSpot = require(\'five-spot\');',
            'const TenSpot = require(\'ten-spot\');',
            'const Index = require(\'./index\');',
            'const TwoLevelsUp = require(\'../../two-levels-up\');',
            'const Basename = require(\'with/basename.js\');'
        ].join(Os.EOL));
    });

    it('prints an example without requires.', () => {

        expect(Print.requires({})).to.equal('');
    });

    it('prints nothing when there is no example.', () => {

        expect(Print.requires(undefined)).to.equal('');
    });
});

describe('Print.markdownSection()', () => {

    // We force colors on these tests since they affect the output
    // and Windows CI has colors disabled implicitly via chalk.
    // In theory it should not affect output since we normalize for
    // ansi colors here, but it does due to limitations of marked-terminal.

    const { enabled: origEnabled, level: origLevel } = Chalk;

    before(() => {

        Chalk.enabled = true;
        Chalk.level = 1;
    });

    after(() => {

        Chalk.enabled = origEnabled;
        Chalk.level = origLevel;
    });

    const p = Print.markdownSection;

    it('prints section in middle of markdown file.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info',
            '## H2-2'
        ].join('\n');

        const matcher = (h) => h === 'H2-1';

        expect(StripAnsi(p(md, [matcher]))).to.equal([
            '## H2-1',
            'Header two info',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info',
            ''
        ].join('\n\n'));
    });

    it('omits html from headers.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info',
            '## <a name="header2-2" /> H2-2 `code`'
        ].join('\n');

        const matcher = (h) => h.includes('H2-2');

        expect(StripAnsi(p(md, [matcher]))).to.equal([
            '## H2-2 code',
            ''
        ].join('\n\n'));
    });

    it('prints section at end of markdown file.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info'
        ].join('\n');

        const matcher = (h) => h === 'H2-1';

        expect(StripAnsi(p(md, [matcher]))).to.equal([
            '## H2-1',
            'Header two info',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info',
            ''
        ].join('\n\n'));
    });

    it('uses matchers in order, one at a time.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info'
        ].join('\n');

        const matcherA = (h) => h === 'H3-2';
        const matcherB = (h) => h.indexOf('H3') === 0;

        expect(StripAnsi(p(md, [matcherA, matcherB]))).to.equal([
            '### H3-2',
            'Header three second info',
            ''
        ].join('\n\n'));
    });

    it('returns null on no match.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info'
        ].join('\n');

        const matcher = (h) => h === 'nope';

        expect(StripAnsi(p(md, [matcher]))).to.equal(null);
    });
});

describe('Print.markdownListItem()', () => {

    // We force colors on these tests since they affect the output
    // and Windows CI has colors disabled implicitly via chalk.
    // In theory it should not affect output since we normalize for
    // ansi colors here, but it does due to limitations of marked-terminal.

    const { enabled: origEnabled, level: origLevel } = Chalk;

    before(() => {

        Chalk.enabled = true;
        Chalk.level = 1;
    });

    after(() => {

        Chalk.enabled = origEnabled;
        Chalk.level = origLevel;
    });

    const p = Print.markdownListItem;

    it('prints list item.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '  - item',
            '',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info',
            '## H2-2'
        ].join('\n');

        const hMatcher = (h) => h === 'H2-1';
        const lMatcher = (l) => l.indexOf('item') === 0;

        expect(StripAnsi(p(md, [hMatcher], lMatcher))).to.equal([
            '## H2-1',
            '',
            '    * item',
            '',
            ''
        ].join('\n'));
    });

    it('prints loose list item.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '  - item',
            '',
            '    but that\'s not all',
            '',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info',
            '## H2-2'
        ].join('\n');

        const hMatcher = (h) => h === 'H2-1';
        const lMatcher = (l) => l.indexOf('item') === 0;

        expect(StripAnsi(p(md, [hMatcher], lMatcher))).to.equal([
            '## H2-1',
            '',
            '    * item',
            '      ',
            '      but that\'s not all',
            '',
            ''
        ].join('\n'));
    });

    it('prints loose, deep list item.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '  - item',
            '    and then some',
            '',
            '    - deep-item',
            '',
            '      but that\'s not all',
            '',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info',
            '## H2-2'
        ].join('\n');

        const hMatcher = (h) => h === 'H2-1';
        const lMatcher = (l) => l.indexOf('item') === 0;

        expect(StripAnsi(p(md, [hMatcher], lMatcher))).to.equal([
            '## H2-1',
            '',
            '    * item',
            '      and then some',
            '      ',
            '      ',
            '        * deep-item',
            '            ',
            '            but that\'s not all',
            '',
            ''
        ].join('\n'));
    });

    it('prints nested list item.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '  - item',
            '',
            '    - sub 1',
            '    - sub 2',
            '',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info',
            '## H2-2'
        ].join('\n');

        const hMatcher = (h) => h === 'H2-1';
        const lMatcher = (l) => l.indexOf('item') === 0;

        expect(StripAnsi(p(md, [hMatcher], lMatcher))).to.equal([
            '## H2-1',
            '',
            '    * item',
            '      ',
            '      ',
            '        * sub 1',
            '      ',
            '        * sub 2',
            '',
            ''
        ].join('\n'));
    });

    it('returns null when section is found but list item isn\'t.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '  - item'
        ].join('\n');

        const hMatcher = (h) => h === 'H2-1';
        const lMatcher = (l) => l.indexOf('xxxx') === 0;

        expect(StripAnsi(p(md, [hMatcher], lMatcher))).to.equal(null);
    });

    it('returns null when section isn\'t found.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '  - item'
        ].join('\n');

        const hMatcher = (h) => h === 'H2-xxx';
        const lMatcher = (l) => l.indexOf('item') === 0;

        expect(StripAnsi(p(md, [hMatcher], lMatcher))).to.equal(null);
    });

    it('returns null when section isn\'t found due to non-text content.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '  - ```',
            'code',
            '```',
            '',
            '### H3-1',
            'Header three first info',
            '### H3-2',
            'Header three second info',
            '## H2-2'
        ].join('\n');

        const hMatcher = (h) => h === 'H2-1';
        const lMatcher = (l) => l.includes('```') || l.includes('code');

        expect(StripAnsi(p(md, [hMatcher], lMatcher))).to.equal(null);
    });

    it('uses header matchers in order, one at a time.', () => {

        const md = [
            '# H1',
            'Header one info',
            '## H2-1',
            'Header two info',
            '### H3-1',
            'Header three first info',
            ' - item',
            '',
            '### H3-2',
            'Header three second info',
            ' - item',
            ''
        ].join('\n');

        const hMatcherA = (h) => h === 'H3-2';
        const hMatcherB = (h) => h.indexOf('H3') === 0;
        const lMatcher = (l) => l.indexOf('item') === 0;

        expect(StripAnsi(p(md, [hMatcherA, hMatcherB], lMatcher))).to.equal([
            '### H3-2',
            '',
            '    * item',
            '',
            ''
        ].join('\n'));
    });
});
