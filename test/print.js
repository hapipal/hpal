'use strict';

/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

// Load modules

const Os = require('os');
const Lab = require('lab');
const StripAnsi = require('strip-ansi');
const Print = require('../lib/print');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Lab.expect;

const internals = {};

describe('Print.example()', () => {

    const p = Print.example;

    it('prints primitives.', (done) => {

        expect(p(1)).to.equal('1');
        expect(p(2.718)).to.equal('2.718');
        expect(p('')).to.equal(`''`);
        expect(p('a string')).to.equal(`'a string'`);
        expect(p(null)).to.equal('null');
        expect(p(undefined)).to.equal('undefined');
        expect(p(true)).to.equal('true');
        expect(p(false)).to.equal('false');

        done();
    });

    it('prints a primitive $value.', (done) => {

        expect(p({ $value: 1 })).to.equal('1');
        expect(p({ $value: 2.718 })).to.equal('2.718');
        expect(p({ $value: '' })).to.equal(`''`);
        expect(p({ $value: 'a string' })).to.equal(`'a string'`);
        expect(p({ $value: null })).to.equal('null');
        expect(p({ $value: undefined })).to.equal('undefined');
        expect(p({ $value: true })).to.equal('true');
        expect(p({ $value: false })).to.equal('false');

        done();
    });

    it('prints a commented primitive $value.', (done) => {

        expect(p({ $comment: 'x', $value: 1 })).to.equal('1 // x');
        expect(p({ $comment: 'x', $value: 2.718 })).to.equal('2.718 // x');
        expect(p({ $comment: 'x', $value: '' })).to.equal(`'' // x`);
        expect(p({ $comment: 'x', $value: 'a string' })).to.equal(`'a string' // x`);
        expect(p({ $comment: 'x', $value: null })).to.equal('null // x');
        expect(p({ $comment: 'x', $value: undefined })).to.equal('undefined // x');
        expect(p({ $comment: 'x', $value: true })).to.equal('true // x');
        expect(p({ $comment: 'x', $value: false })).to.equal('false // x');

        done();
    });

    it('prints an empty object.', (done) => {

        expect(p({})).to.equal('{}');

        done();
    });

    it('prints a commented empty object.', (done) => {

        expect(p({ $value: {}, $comment: 'Empty' })).to.equal('{} // Empty');

        done();
    });

    it('prints an empty array.', (done) => {

        expect(p([])).to.equal('[]');

        done();
    });

    it('prints a commented empty array.', (done) => {

        expect(p({ $value: [], $comment: 'Empty' })).to.equal('[] // Empty');

        done();
    });

    it('prints a $literal.', (done) => {

        expect(p({ $literal: 'invalid/js' })).to.equal('invalid/js');

        done();
    });

    it('prints a commented $literal.', (done) => {

        expect(p({ $literal: 'invalid/js', $comment: 'This wont parse' })).to.equal('invalid/js // This wont parse');

        done();
    });

    it('prints an object with one key.', (done) => {

        expect(p({ x: 'y' })).to.equal([
            '{',
            `    x: 'y'`,
            '}'
        ].join(Os.EOL));

        done();
    });

    it('prints an object with multiple keys.', (done) => {

        expect(p({ a: 1, b: 2, c: 3 })).to.equal([
            '{',
            `    a: 1,`,
            `    b: 2,`,
            `    c: 3`,
            '}'
        ].join(Os.EOL));

        done();
    });

    it('prints a commented non-empty object.', (done) => {

        expect(p({ $comment: 'All numeric', $value: { a: 1, b: 2, c: 3 } })).to.equal([
            '{ // All numeric',
            `    a: 1,`,
            `    b: 2,`,
            `    c: 3`,
            '}'
        ].join(Os.EOL));

        done();
    });

    it('prints a object-nested, commented empty object.', (done) => {

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

        done();
    });

    it('prints an array-nested, commented empty object.', (done) => {

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

        done();
    });

    it('prints an object-nested non-empty object.', (done) => {

        expect(p({ obj: { a: 1, b: 2 } })).to.equal([
            '{',
            '    obj: {',
            `        a: 1,`,
            `        b: 2`,
            '    }',
            '}'
        ].join(Os.EOL));

        done();
    });

    it('prints an object-nested, commented non-empty object.', (done) => {

        expect(p({ obj: { $comment: 'Somethin to see', $value: { a: 1, b: 2 } } })).to.equal([
            '{',
            '    obj: { // Somethin to see',
            `        a: 1,`,
            `        b: 2`,
            '    }',
            '}'
        ].join(Os.EOL));

        done();
    });

    it('prints an array-nested non-empty object.', (done) => {

        expect(p([{ a: 1, b: 2 }])).to.equal([
            '[',
            '    {',
            `        a: 1,`,
            `        b: 2`,
            '    }',
            ']'
        ].join(Os.EOL));

        done();
    });

    it('prints an array-nested, commented non-empty object.', (done) => {

        expect(p([{ $comment: 'Somethin to see', $value: { a: 1, b: 2 } }])).to.equal([
            '[',
            '    { // Somethin to see',
            `        a: 1,`,
            `        b: 2`,
            '    }',
            ']'
        ].join(Os.EOL));

        done();
    });

    it('prints an array with one value.', (done) => {

        expect(p(['x'])).to.equal([
            '[',
            `    'x'`,
            ']'
        ].join(Os.EOL));

        done();
    });

    it('prints an array with multiple values.', (done) => {

        expect(p([1, 2, 3])).to.equal([
            '[',
            `    1,`,
            `    2,`,
            `    3`,
            ']'
        ].join(Os.EOL));

        done();
    });

    it('prints a commented non-empty array.', (done) => {

        expect(p({ $comment: 'All numeric', $value: [1, 2, 3] })).to.equal([
            '[ // All numeric',
            `    1,`,
            `    2,`,
            `    3`,
            ']'
        ].join(Os.EOL));

        done();
    });

    it('prints a object-nested, commented empty array.', (done) => {

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

        done();
    });

    it('prints an array-nested, commented empty array.', (done) => {

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

        done();
    });

    it('prints an object-nested non-empty array.', (done) => {

        expect(p({ arr: ['a', 'b'] })).to.equal([
            '{',
            '    arr: [',
            `        'a',`,
            `        'b'`,
            '    ]',
            '}'
        ].join(Os.EOL));

        done();
    });

    it('prints an object-nested, commented non-empty array.', (done) => {

        expect(p({ arr: { $comment: 'Somethin to see', $value: ['a', 'b'] } })).to.equal([
            '{',
            '    arr: [ // Somethin to see',
            `        'a',`,
            `        'b'`,
            '    ]',
            '}'
        ].join(Os.EOL));

        done();
    });

    it('prints an array-nested non-empty array.', (done) => {

        expect(p([['a', 'b']])).to.equal([
            '[',
            '    [',
            `        'a',`,
            `        'b'`,
            '    ]',
            ']'
        ].join(Os.EOL));

        done();
    });

    it('prints an array-nested, commented non-empty array.', (done) => {

        expect(p([{ $comment: 'Somethin to see', $value: ['a', 'b'] }])).to.equal([
            '[',
            '    [ // Somethin to see',
            `        'a',`,
            `        'b'`,
            '    ]',
            ']'
        ].join(Os.EOL));

        done();
    });

    it('prints an object-nested null.', (done) => {

        expect(p({ x: null })).to.equal([
            '{',
            '    x: null',
            '}'
        ].join(Os.EOL));

        done();
    });

    it('prints an array-nested null.', (done) => {

        expect(p([null])).to.equal([
            '[',
            '    null',
            ']'
        ].join(Os.EOL));

        done();
    });

    it('prints quoted keys.', (done) => {

        expect(p({ 'super-man': 'needs quotes' })).to.equal([
            '{',
            `    'super-man': 'needs quotes'`,
            '}'
        ].join(Os.EOL));

        done();
    });

    it('prints with any spacing.', (done) => {

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

        done();
    });

    it('deeply nests.', (done) => {

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

        done();
    });
});

describe('Print.requires()', () => {

    it('prints an example\'s requires.', (done) => {

        const ex = { $requires: ['five-spot', 'ten-spot', './index', '../../two-levels-up', 'with/basename.js'] };

        expect(Print.requires(ex)).to.equal([
            'const FiveSpot = require(\'five-spot\');',
            'const TenSpot = require(\'ten-spot\');',
            'const Index = require(\'./index\');',
            'const TwoLevelsUp = require(\'../../two-levels-up\');',
            'const Basename = require(\'with/basename.js\');'
        ].join(Os.EOL));

        done();
    });

    it('prints an example without requires.', (done) => {

        expect(Print.requires({})).to.equal('');

        done();
    });

    it('prints nothing when there is no example.', (done) => {

        expect(Print.requires(undefined)).to.equal('');

        done();
    });
});

describe('Print.markdownSection()', () => {

    const p = Print.markdownSection;

    it('prints section in middle of markdown file.', (done) => {

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

        done();
    });

    it('prints section at end of markdown file.', (done) => {

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

        done();
    });

    it('uses matchers in order, one at a time.', (done) => {

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

        done();
    });

    it('returns null on no match.', (done) => {

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

        done();
    });
});

describe('Print.markdownListItem()', () => {

    const p = Print.markdownListItem;

    it('prints list item.', (done) => {

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

        done();
    });

    it('prints loose list item.', (done) => {

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
            '    * but that\'s not all',
            '',
            ''
        ].join('\n'));

        done();
    });

    it('prints nested list item.', (done) => {

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
            '        * sub 1',
            '        * sub 2',
            '',
            ''
        ].join('\n'));

        done();
    });

    it('returns null when section is found but list item isn\'t.', (done) => {

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

        done();
    });

    it('returns null when section isn\'t found.', (done) => {

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

        done();
    });

    it('returns null when section isn\'t found due to non-text content.', (done) => {

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
        const lMatcher = (l) => ~l.indexOf('```') || ~l.indexOf('code');

        expect(StripAnsi(p(md, [hMatcher], lMatcher))).to.equal(null);

        done();
    });

    it('uses header matchers in order, one at a time.', (done) => {

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

        done();
    });
});
