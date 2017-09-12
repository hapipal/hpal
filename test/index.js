'use strict';

// Load modules

const Lab = require('lab');
const RunUtil = require('./run-util');

// Test shortcuts

const lab = exports.lab = Lab.script();
const before = lab.before;
const describe = lab.describe;
const it = lab.it;
const expect = Lab.expect;

const internals = {};

describe('paldo', () => {

    describe('CLI', () => {

        it('outputs help [-h, --help]', () => {

            return RunUtil.cli(['-h'])
                .then((output) => {

                    expect(output).to.contain('Usage: paldo ???');

                    return RunUtil.cli(['--help']);
                })
                .then((output) => {

                    expect(output).to.contain('Usage: paldo ???');
                });
        });
    });

    describe('bin', () => {

        it('passes through argvs.', () => {

            return RunUtil.bin(['-h']) // "-h" is just an example argv
                .then((result) => {

                    expect(result.code).to.equal(0);
                    expect(result.errorOutput).to.equal('');
                    expect(result.output).to.contain('Usage: paldo ???');
                });
        });
    });
});
