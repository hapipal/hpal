'use strict';

/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

// Load modules

const Os = require('os');
const Lab = require('lab');
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
