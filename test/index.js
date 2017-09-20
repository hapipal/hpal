'use strict';

// Load modules

const Fs = require('fs');
const Lab = require('lab');
const Pify = require('pify');
const Rimraf = require('rimraf');
const RunUtil = require('./run-util');
const DisplayError = require('../lib/display-error');
const Package = require('../package.json');

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
                .then((result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Usage: paldo ???');
                    expect(result.errorOutput).to.equal('');

                    return RunUtil.cli(['--help']);
                })
                .then((result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Usage: paldo ???');
                    expect(result.errorOutput).to.equal('');
                });
        });

        it('outputs version [-v, --version]', () => {

            return RunUtil.cli(['-v'])
                .then((result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain(Package.version);
                    expect(result.errorOutput).to.equal('');

                    return RunUtil.cli(['--version']);
                })
                .then((result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain(Package.version);
                    expect(result.errorOutput).to.equal('');
                });
        });

        it('outputs usage on misused flags', () => {

            return RunUtil.cli(['--notaflag'])
                .then((result) => {

                    expect(result.err).to.be.instanceof(DisplayError);
                    expect(result.output).to.equal('');
                    expect(result.errorOutput).to.contain('Usage: paldo ???');
                    expect(result.errorOutput).to.contain('Unknown option: notaflag');
                });
        });

        it('outputs usage on non-existent command', () => {

            return RunUtil.cli(['clank'])
                .then((result) => {

                    expect(result.err).to.be.instanceof(DisplayError);
                    expect(result.output).to.equal('');
                    expect(result.errorOutput).to.contain('Usage: paldo ???');
                    expect(result.errorOutput).to.contain('Unknown command: clank');
                });
        });

        describe('make command', () => {

            const rimraf = (file) => Pify(Rimraf)(`${__dirname}/closet/${file}`, { disableGlob: true });
            const read = (file) => Pify(Fs.readFile)(`${__dirname}/closet/${file}`, 'utf8');

            it('errors when there\'s no .hc.js file found', () => {

                return RunUtil.cli(['make', 'route'], 'no-hc-file')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('There\'s no directory in this project containing a .hc.js file.');
                    });
            });

            it('errors when finding a .hc.js file is ambiguous', () => {

                return RunUtil.cli(['make', 'route'], 'ambiguous-hc-file')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('It\'s ambiguous which directory containing a .hc.js file to use: ');
                        expect(result.errorOutput).to.contain('project-a');
                        expect(result.errorOutput).to.contain('project-b');
                        expect(result.errorOutput.match(/,/g)).to.have.length(1);
                    });
            });

            it('errors when haute-couture cannot be found', () => {

                return RunUtil.cli(['make', 'route'], 'no-haute-couture')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('Couldn\'t find the haute-couture package in this project.  It may just need to be installed.');
                    });
            });

            it('errors when file to create already exists', () => {

                return RunUtil.cli(['make', 'route', 'some-route'], 'file-already-exists')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('The file');
                        expect(result.errorOutput).to.contain('file-already-exists/routes/some-route.js');
                        expect(result.errorOutput).to.contain('already exists.');
                    });
            });

            it('errors when trying to create a non-existent item', () => {

                return RunUtil.cli(['make', 'nonsense'], 'item-doesnt-exist')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('We don\'t know anything about "nonsense".  Try one of: ');
                        expect(result.errorOutput).to.contain('decorations, ');
                    });
            });

            it('errors when trying to create a non-list item with a name', () => {

                return RunUtil.cli(['make', 'view-manager', 'spunky'], 'cant-have-name')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('view-manager should be declared once and not in a list, so we can\'t use name "spunky".');
                    });
            });

            it('errors when trying to make an item as both a file and a directory', () => {

                return RunUtil.cli(['make', 'routes', '-f', '-d'], 'file-dir-conflict')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('Options [-d, --asDir] and [-f, --asFile] conflict with each other.');
                    });
            });

            it('creates a list item in a directory (default)', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/routes/index.js');
                    expect(result.errorOutput).to.equal('');

                    return read('list-as-dir/lib/routes/index.js')
                        .then((contents) => {

                            expect(contents).to.startWith(`'use strict';`);

                            return rimraf('list-as-dir/lib/routes');
                        });
                };

                return RunUtil.cli(['make', 'routes'], 'list-as-dir')
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'routes', '-d'], 'list-as-dir'))
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'routes', '--asDir'], 'list-as-dir'))
                    .then(check);
            });

            it('creates a list item as a file', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/routes.js');
                    expect(result.errorOutput).to.equal('');

                    return read('list-as-file/lib/routes.js')
                        .then((contents) => {

                            expect(contents).to.startWith(`'use strict';`);

                            return rimraf('list-as-file/lib/routes.js');
                        })
                };

                return RunUtil.cli(['make', 'routes', '-f'], 'list-as-file')
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'routes', '--asFile'], 'list-as-file'))
                    .then(check);
            });

            it('creates a single item in a directory', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/bind/index.js');
                    expect(result.errorOutput).to.equal('');

                    return read('single-as-dir/lib/bind/index.js')
                        .then((contents) => {

                            expect(contents).to.startWith(`'use strict';`);

                            return rimraf('single-as-dir/lib/bind');
                        });
                };

                return RunUtil.cli(['make', 'bind', '-d'], 'single-as-dir')
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'bind', '--asDir'], 'single-as-dir'))
                    .then(check);
            });

            it('creates a single item as a file (default)', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/bind.js');
                    expect(result.errorOutput).to.equal('');

                    return read('single-as-file/lib/bind.js')
                        .then((contents) => {

                            expect(contents).to.startWith(`'use strict';`);

                            return rimraf('single-as-file/lib/bind.js');
                        })
                };

                return RunUtil.cli(['make', 'bind'], 'single-as-file')
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'bind', '-f'], 'single-as-file'))
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'bind', '--asFile'], 'single-as-file'))
                    .then(check);
            });
        });
    });

    describe('bin', () => {

        it('passes through argvs.', () => {

            return RunUtil.bin(['-h']) // "-h" is just an example argv
                .then((result) => {

                    expect(result.code).to.equal(0);
                    expect(result.output).to.contain('Usage: paldo ???');
                    expect(result.errorOutput).to.equal('');
                });
        });
    });
});
