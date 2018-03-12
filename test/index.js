'use strict';

// Load modules

const Fs = require('fs');
const Os = require('os');
const ChildProcess = require('child_process');
const Lab = require('lab');
const Pify = require('pify');
const Rimraf = require('rimraf');
const StripAnsi = require('strip-ansi');
const Boom = require('boom');
const Wreck = require('wreck');
const RunUtil = require('./run-util');
const DisplayError = require('../lib/display-error');
const Package = require('../package.json');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Lab.expect;

const internals = {};

describe('hpal', () => {

    describe('CLI', () => {

        const rimraf = (file) => Pify(Rimraf)(`${__dirname}/closet/${file}`, { disableGlob: true });
        const read = (file) => Pify(Fs.readFile)(`${__dirname}/closet/${file}`, 'utf8');

        it('outputs help [-h, --help].', () => {

            return RunUtil.cli(['-h'])
                .then((result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Usage: hpal <command> <options>');
                    expect(result.errorOutput).to.equal('');

                    return RunUtil.cli(['--help']);
                })
                .then((result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Usage: hpal <command> <options>');
                    expect(result.errorOutput).to.equal('');
                });
        });

        it('outputs help (no command).', () => {

            return RunUtil.cli([])
                .then((result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Usage: hpal <command> <options>');
                    expect(result.output).to.not.contain('Unknown option');
                    expect(result.output).to.not.contain('Unknown command');
                    expect(result.errorOutput).to.equal('');
                });
        });

        it('outputs version [-v, --version].', () => {

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

        it('outputs usage on misused flags.', () => {

            return RunUtil.cli(['--notaflag'])
                .then((result) => {

                    expect(result.err).to.be.instanceof(DisplayError);
                    expect(result.output).to.equal('');
                    expect(result.errorOutput).to.contain('Usage: hpal <command> <options>');
                    expect(result.errorOutput).to.contain('Unknown option: notaflag');
                });
        });

        it('outputs usage on non-existent command.', () => {

            return RunUtil.cli(['clank'])
                .then((result) => {

                    expect(result.err).to.be.instanceof(DisplayError);
                    expect(result.output).to.equal('');
                    expect(result.errorOutput).to.contain('Usage: hpal <command> <options>');
                    expect(result.errorOutput).to.contain('Unknown command: clank');
                });
        });

        it('outputs with or without color.', () => {

            return RunUtil.cli(['clank'], null, true)
                .then((result) => {

                    expect(result.err).to.be.instanceof(DisplayError);
                    expect(result.output).to.equal('');
                    expect(result.errorOutput).to.contain('\u001b[31mUnknown command: clank\u001b[0m');

                    return RunUtil.cli(['clank'], null, false);
                })
                .then((result) => {

                    expect(result.err).to.be.instanceof(DisplayError);
                    expect(result.output).to.equal('');
                    expect(result.errorOutput).to.contain('Unknown command: clank');
                    expect(result.errorOutput).to.not.contain('\u001b[31mUnknown command: clank\u001b[0m');
                });
        });

        describe('make command', () => {

            it('errors when there\'s no .hc.js file found.', () => {

                return RunUtil.cli(['make', 'route'], 'no-hc-file')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('There\'s no directory in this project containing a .hc.js file.');
                    });
            });

            it('errors when there\'s no package.json file found.', () => {

                return RunUtil.cli(['make', 'route'], '/')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('No nearby package.json found– you don\'t seem to be in a project.');
                    });
            });

            it('errors when finding a .hc.js file is ambiguous.', () => {

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

            it('errors when haute-couture cannot be found.', () => {

                return RunUtil.cli(['make', 'route'], 'no-haute-couture')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('Couldn\'t find the haute-couture package in this project. It may just need to be installed.');
                    });
            });

            it('errors when file to create already exists.', () => {

                return RunUtil.cli(['make', 'route', 'some-route'], 'file-already-exists')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('The file');
                        expect(result.errorOutput).to.contain('file-already-exists/routes/some-route.js');
                        expect(result.errorOutput).to.contain('already exists.');
                    });
            });

            it('errors when omitting an item to create.', () => {

                return RunUtil.cli(['make'], 'item-omitted')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('Ah, but what to make? You must specify a haute-couture item. Try one of: ');
                        expect(result.errorOutput).to.contain('decorations, ');
                    });
            });

            it('errors when trying to create a non-existent item.', () => {

                return RunUtil.cli(['make', 'nonsense'], 'item-doesnt-exist')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('We don\'t know anything about "nonsense". Try one of: ');
                        expect(result.errorOutput).to.contain('decorations, ');
                    });
            });

            it('errors when trying to create a non-list item with a name.', () => {

                return RunUtil.cli(['make', 'view-manager', 'spunky'], 'cant-have-name')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('view-manager should be declared once and not in a list, so we can\'t use name "spunky".');
                    });
            });

            it('errors when trying to make an item as both a file and a directory.', () => {

                return RunUtil.cli(['make', 'routes', '-f', '-d'], 'file-dir-conflict')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('Options [-d, --asDir] and [-f, --asFile] conflict with each other.');
                    });
            });

            it('errors hard when writing a file fails.', (done, onCleanup) => {

                const writeFile = Fs.writeFile;

                Fs.writeFile = (x, y, z, cb) => cb(new Error('Write badness'));

                onCleanup((next) => {

                    Fs.writeFile = writeFile;
                    next();
                });

                RunUtil.cli(['make', 'routes'], 'write-fails')
                    .then(() => {

                        throw new Error('Shouldn\'t end-up here');
                    })
                    .catch((err) => {

                        expect(err).to.be.instanceof(Error);
                        expect(err).to.not.be.instanceof(DisplayError);
                        expect(err.message).to.equal('Write badness');
                        expect(err.output).to.equal('');
                    })
                    .then(done, done);
            });

            it('errors hard when finding haute-couture fails in an unexpected way.', () => {

                return RunUtil.cli(['make', 'routes'], 'haute-couture-broken')
                    .then(() => {

                        throw new Error('Shouldn\'t end-up here');
                    })
                    .catch((err) => {

                        expect(err).to.be.instanceof(SyntaxError);
                        expect(err).to.not.be.instanceof(DisplayError);
                        expect(err.output).to.equal('');
                    });
            });

            it('creates a list item in a directory (default).', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/routes/index.js');
                    expect(result.errorOutput).to.equal('');

                    return read('list-as-dir/lib/routes/index.js')
                        .then((contents) => {

                            expect(contents).to.startWith('\'use strict\';');

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

            it('creates a list item as a file.', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/routes.js');
                    expect(result.errorOutput).to.equal('');

                    return read('list-as-file/lib/routes.js')
                        .then((contents) => {

                            expect(contents).to.startWith('\'use strict\';');

                            return rimraf('list-as-file/lib/routes.js');
                        });
                };

                return RunUtil.cli(['make', 'routes', '-f'], 'list-as-file')
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'routes', '--asFile'], 'list-as-file'))
                    .then(check);
            });

            it('creates a single item in a directory.', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/bind/index.js');
                    expect(result.errorOutput).to.equal('');

                    return read('single-as-dir/lib/bind/index.js')
                        .then((contents) => {

                            expect(contents).to.startWith('\'use strict\';');

                            return rimraf('single-as-dir/lib/bind');
                        });
                };

                return RunUtil.cli(['make', 'bind', '-d'], 'single-as-dir')
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'bind', '--asDir'], 'single-as-dir'))
                    .then(check);
            });

            it('creates a single item as a file (default).', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/bind.js');
                    expect(result.errorOutput).to.equal('');

                    return read('single-as-file/lib/bind.js')
                        .then((contents) => {

                            expect(contents).to.startWith('\'use strict\';');

                            return rimraf('single-as-file/lib/bind.js');
                        });
                };

                return RunUtil.cli(['make', 'bind'], 'single-as-file')
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'bind', '-f'], 'single-as-file'))
                    .then(check)
                    .then(() => RunUtil.cli(['make', 'bind', '--asFile'], 'single-as-file'))
                    .then(check);
            });

            it('writes file exporting {} when example and signature are absent.', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/x.js');
                    expect(result.errorOutput).to.equal('');

                    return read('no-example-or-signature/lib/x.js')
                        .then((contents) => {

                            expect(contents).to.equal([
                                '\'use strict\';',
                                '',
                                'module.exports = {};',
                                ''
                            ].join(Os.EOL));

                            return rimraf('no-example-or-signature/lib/x.js');
                        });
                };

                return RunUtil.cli(['make', 'x'], 'no-example-or-signature').then(check);
            });

            it('writes file with export built from signature when example is absent.', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/x.js');
                    expect(result.errorOutput).to.equal('');

                    return read('no-example-with-signature/lib/x.js')
                        .then((contents) => {

                            expect(contents).to.equal([
                                '\'use strict\';',
                                '',
                                'module.exports = {',
                                '    a: null,',
                                '    b: null, // Optional',
                                '    c: null',
                                '};',
                                ''
                            ].join(Os.EOL));

                            return rimraf('no-example-with-signature/lib/x.js');
                        });
                };

                return RunUtil.cli(['make', 'x'], 'no-example-with-signature').then(check);
            });

            it('writes file with export built from example when present.', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/x.js');
                    expect(result.errorOutput).to.equal('');

                    return read('with-example-and-signature/lib/x.js')
                        .then((contents) => {

                            expect(contents).to.equal([
                                '\'use strict\';',
                                '',
                                'module.exports = {',
                                '    a: {},',
                                '    b: 0, // Optional, yo!',
                                '    c: []',
                                '};',
                                ''
                            ].join(Os.EOL));

                            return rimraf('with-example-and-signature/lib/x.js');
                        });
                };

                return RunUtil.cli(['make', 'x'], 'with-example-and-signature').then(check);
            });

            it('writes file from example that has some requires.', () => {

                const check = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/x.js');
                    expect(result.errorOutput).to.equal('');

                    return read('with-example-and-requires/lib/x.js')
                        .then((contents) => {

                            expect(contents).to.equal([
                                '\'use strict\';',
                                '',
                                'const FiveSpot = require(\'five-spot\');',
                                'const TenSpot = require(\'ten-spot\');',
                                '',
                                'module.exports = class extends FiveSpot.mixin(TenSpot) {};',
                                ''
                            ].join(Os.EOL));

                            return rimraf('with-example-and-requires/lib/x.js');
                        });
                };

                return RunUtil.cli(['make', 'x'], 'with-example-and-requires').then(check);
            });

            it('wraps listed examples in an array.', () => {

                const checkUnnamed = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/x/index.js');
                    expect(result.errorOutput).to.equal('');

                    return read('listed-example/lib/x/index.js')
                        .then((contents) => {

                            expect(contents).to.equal([
                                '\'use strict\';',
                                '',
                                'module.exports = [',
                                '    {',
                                '        a: 1',
                                '    }',
                                '];',
                                ''
                            ].join(Os.EOL));

                            return rimraf('listed-example/lib/x/index.js');
                        });
                };

                const checkNamed = (result) => {

                    expect(result.err).to.not.exist();
                    expect(result.output).to.contain('Wrote lib/x/y.js');
                    expect(result.errorOutput).to.equal('');

                    return read('listed-example/lib/x/y.js')
                        .then((contents) => {

                            expect(contents).to.equal([
                                '\'use strict\';',
                                '',
                                'module.exports = {',
                                '    a: 1',
                                '};',
                                ''
                            ].join(Os.EOL));

                            return rimraf('listed-example/lib/x/y.js');
                        });
                };

                return RunUtil.cli(['make', 'x'], 'listed-example')
                    .then(checkUnnamed)
                    .then(() => RunUtil.cli(['make', 'x', 'y'], 'listed-example'))
                    .then(checkNamed);
            });
        });

        describe('new command', () => {

            const exists = (file) => Pify(Fs.stat)(`${__dirname}/closet/${file}`);
            const exec = (cmd, cwd) => Pify(ChildProcess.exec, { multiArgs: true })(cmd, { cwd: `${__dirname}/closet/${cwd}` });
            const answerNpmInit = (cli, name, bail) => {

                cli.args.out.on('data', (data) => {

                    data = data.toString();

                    if (~data.indexOf('name: ')) {
                        process.nextTick(() => cli.args.in.write(`${name}\n`));
                    }
                    else if ((/^[\w ]+: /).test(data)) {
                        process.nextTick(() => cli.args.in.write('\n')); // "Return" through the npm prompts
                    }
                    else if (~data.indexOf('Is this ok?')) {
                        process.nextTick(() => cli.args.in.write(bail ? 'no\n' : 'yes\n'));
                    }
                });
            };

            it('creates a new pal project.', { timeout: 5000 }, (done, onCleanup) => {

                onCleanup((next) => rimraf('new/my-project').then(next, next));

                const cli = RunUtil.cli(['new', 'my-project'], 'new');

                answerNpmInit(cli, 'chosen-name');

                cli
                    .then((result) => {

                        expect(result.err).to.not.exist();
                        expect(result.output).to.contain('New pal project created in my-project');
                        expect(result.errorOutput).to.equal('');

                        return Promise.all([
                            read('new/my-project/package.json'),
                            exists('new/my-project/lib/index.js'),
                            exists('new/my-project/test/index.js'),
                            exec('git remote', 'new/my-project'),
                            exec('git tag', 'new/my-project'),
                            exec('git ls-files -m', 'new/my-project'),
                            exec('git log', 'new/my-project').catch((results) => results[2])
                        ]);
                    })
                    .then((results) => {

                        const pkg = JSON.parse(results[0]);
                        const lib = results[1];
                        const test = results[2];
                        const remotes = results[3][0].split('\n');
                        const tags = results[4][0].split('\n');
                        const modifiedFiles = results[5][0].trim();
                        const logError = results[6];

                        expect(pkg.name).to.equal('chosen-name');
                        expect(pkg.version).to.equal('1.0.0');
                        expect(pkg.dependencies).to.exist();
                        expect(pkg.devDependencies).to.exist();
                        expect(lib).to.exist();
                        expect(test).to.exist();
                        expect(remotes).to.contain('pal');
                        expect(tags).to.contain('swagger');
                        expect(tags).to.contain('custom-swagger');
                        expect(tags).to.contain('deployment');
                        expect(tags).to.contain('objection');
                        expect(tags).to.contain('templated-site');
                        expect(tags).to.contain('fancy-templated-site');
                        expect(modifiedFiles).to.equal('');
                        expect(logError).to.contain('your current branch \'master\' does not have any commits');
                    })
                    .then(done, done);
            });

            it('creates a new pal project when bailing on `npm init`.', { timeout: 5000 }, (done, onCleanup) => {

                onCleanup((next) => rimraf('new/bail-on-npm-init').then(next, next));

                const cli = RunUtil.cli(['new', 'bail-on-npm-init'], 'new');

                answerNpmInit(cli, 'chosen-name', true); // Bail

                cli
                    .then((result) => {

                        expect(result.err).to.not.exist();
                        expect(result.output).to.contain('New pal project created in bail-on-npm-init');
                        expect(result.errorOutput).to.contain('Bailed on `npm init`, but continuing to setup your project with an incomplete package.json file.');

                        return Promise.all([
                            read('new/bail-on-npm-init/package.json'),
                            exists('new/bail-on-npm-init/lib/index.js'),
                            exists('new/bail-on-npm-init/test/index.js'),
                            exec('git remote', 'new/bail-on-npm-init'),
                            exec('git tag', 'new/bail-on-npm-init'),
                            exec('git ls-files -m', 'new/bail-on-npm-init'),
                            exec('git log', 'new/bail-on-npm-init').catch((results) => results[2])
                        ]);
                    })
                    .then((results) => {

                        const pkg = JSON.parse(results[0]);
                        const lib = results[1];
                        const test = results[2];
                        const remotes = results[3][0].split('\n');
                        const tags = results[4][0].split('\n');
                        const modifiedFiles = results[5][0].trim();
                        const logError = results[6];

                        expect(pkg.name).to.not.exist();
                        expect(pkg.version).to.not.exist();
                        expect(pkg.dependencies).to.exist();
                        expect(pkg.devDependencies).to.exist();
                        expect(lib).to.exist();
                        expect(test).to.exist();
                        expect(remotes).to.contain('pal');
                        expect(tags).to.contain('swagger');
                        expect(tags).to.contain('custom-swagger');
                        expect(tags).to.contain('deployment');
                        expect(tags).to.contain('objection');
                        expect(tags).to.contain('templated-site');
                        expect(tags).to.contain('fancy-templated-site');
                        expect(modifiedFiles).to.equal('');
                        expect(logError).to.contain('your current branch \'master\' does not have any commits');
                    })
                    .then(done, done);
            });

            it('fails in a friendly way when trying to create a project in a non-empty directory.', (done, onCleanup) => {

                const cli = RunUtil.cli(['new', 'project-already-exists'], 'new');

                cli
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('There\'s already a directory there with some stuff in it– try choosing a new place to create your project.');
                    })
                    .then(done, done);
            });

            it('fails in a friendly way when can\'t git clone due to connection.', (done, onCleanup) => {

                const execOrig = ChildProcess.exec;
                ChildProcess.exec = (cmd, opts, cb) => {

                    if (cmd.indexOf('git clone') === 0) {
                        return process.nextTick(() => cb(new Error('fatal: unable to access \'https://github.com/devinivy/boilerplate-api.git/\': Could not resolve host: github.com')));
                    }

                    return execOrig(cmd, opts, cb);
                };

                onCleanup((next) => {

                    ChildProcess.exec = execOrig;
                    rimraf('new/bad-connection').then(next, next);
                });

                const cli = RunUtil.cli(['new', 'bad-connection'], 'new');

                cli
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('Couldn\'t create a new project. It seems you may be offline– ensure you have a connection then try again.');
                    })
                    .then(done, done);
            });

            it('fails hard when git clone fails for an unknown reason.', { timeout: 5000 }, (done, onCleanup) => {

                const execOrig = ChildProcess.exec;
                ChildProcess.exec = (cmd, opts, cb) => {

                    if (cmd.indexOf('git clone') === 0) {
                        return process.nextTick(() => cb(new Error('Oops!')));
                    }

                    return execOrig(cmd, opts, cb);
                };

                onCleanup((next) => {

                    ChildProcess.exec = execOrig;
                    rimraf('new/unknown-error').then(next, next);
                });

                const cli = RunUtil.cli(['new', 'unknown-error'], 'new');

                cli
                    .then(() => {

                        throw new Error('Shouldn\'t end-up here');
                    })
                    .catch((err) => {

                        expect(err).to.be.instanceof(Error);
                        expect(err).to.not.be.instanceof(DisplayError);
                        expect(err.message).to.contain('Oops!');
                    })
                    .then(done, done);
            });

            it('continues and warns if fetching flavors fails.', { timeout: 5000 }, (done, onCleanup) => {

                const execOrig = ChildProcess.exec;
                ChildProcess.exec = (cmd, opts, cb) => {

                    if (cmd === 'git fetch pal --tags') {
                        return process.nextTick(() => cb(new Error('Oops!')));
                    }

                    return execOrig(cmd, opts, cb);
                };

                onCleanup((next) => {

                    ChildProcess.exec = execOrig;
                    rimraf('new/flavors-fail').then(next, next);
                });

                const cli = RunUtil.cli(['new', 'flavors-fail'], 'new');

                answerNpmInit(cli, 'flavors-fail');

                cli
                    .then((result) => {

                        expect(result.err).to.not.exist();
                        expect(result.output).to.contain('New pal project created in flavors-fail');
                        expect(result.errorOutput).to.contain('Just so you know, we weren\'t able to fetch pal flavors for you. Try running git fetch pal --tags yourself at a later time.');
                    })
                    .then(done, done);
            });

            it('errors if a directory is not specified.', () => {

                return RunUtil.cli(['new'], 'new')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('You must specify a directory in which to start your project.');
                    });
            });

            it('errors when git or npm are missing.', (done, onCleanup) => {

                const execOrig = ChildProcess.exec;
                onCleanup((next) => {

                    ChildProcess.exec = execOrig;
                    next();
                });

                ChildProcess.exec = (cmd, opts, cb) => {

                    if (cmd === 'npm --version') {
                        return execOrig('npm --bad-command', opts, cb);
                    }

                    return execOrig(cmd, opts, cb);
                };

                RunUtil.cli(['new', 'missing-npm'], 'new')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('To use this command you must have git and npm installed and in your PATH');

                        ChildProcess.exec = (cmd, opts, cb) => {

                            if (cmd === 'git --version') {
                                return execOrig('git --bad-command', opts, cb);
                            }

                            return execOrig(cmd, opts, cb);
                        };

                        return RunUtil.cli(['new', 'missing-git'], 'new');
                    })
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('To use this command you must have git and npm installed and in your PATH');
                    })
                    .then(done, done);
            });
        });

        describe('docs command', () => {

            const mockWreckGet = (err) => {

                const get = Wreck.get;
                const calls = [];
                const cleanup = (next) => {

                    Wreck.get = get;
                    next();
                };

                Wreck.get = (url) => {

                    calls.push(url);

                    if (err) {
                        return Promise.reject(err);
                    }

                    if (err === null) {
                        return Promise.resolve({ payload: Buffer.from('') });
                    }

                    return Pify(Fs.readFile)(`${__dirname}/closet/API.md`).then((payload) => ({ payload }));
                };

                return { calls, cleanup };
            };

            const normalizeVersion = (str) => str.replace(/16\.[\d]+\.[\d]+/g, '16.x.x');

            it('errors when fetching docs 404s.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(Boom.notFound());
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx'])
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v16.x.x...');
                        expect(normalizeVersion(result.errorOutput)).to.contain('Couldn\'t find docs for that version of hapi. Are you sure hapijs/hapi @ v16.x.x exists?');
                    })
                    .then(done, done);
            });

            it('errors when fetching docs fails due to being offline.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(Object.assign(new Error(), {
                    syscall: 'getaddrinfo',
                    code: 'ENOTFOUND'
                }));

                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx'])
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v16.x.x...');
                        expect(result.errorOutput).to.contain('Could not fetch the hapi docs. It seems you may be offline– ensure you have a connection then try again.');
                    })
                    .then(done, done);
            });

            it('errors when docs can\'t be fetched (boom error).', (done, onCleanup) => {

                const mockWreck = mockWreckGet(Boom.badImplementation());
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx'])
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v16.x.x...');
                        expect(result.errorOutput).to.contain('Could not fetch the hapi docs: Internal Server Error');
                    })
                    .then(done, done);
            });

            it('errors when docs can\'t be fetched (non-boom error).', (done, onCleanup) => {

                const mockWreck = mockWreckGet(new Error('No way can you get those docs'));
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx'])
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v16.x.x...');
                        expect(result.errorOutput).to.contain('Could not fetch the hapi docs: No way can you get those docs');
                    })
                    .then(done, done);
            });

            it('errors when package is corrupted and version can\'t be determined.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx'], 'corrupted-hapi-version')
                    .then(() => {

                        throw new Error('Shouldn\'t end-up here');
                    })
                    .catch((err) => {

                        expect(err).to.be.instanceof(Error);
                        expect(err).to.not.be.instanceof(DisplayError);
                        expect(err.message).to.contain('Cannot read property \'version\' of null');
                    })
                    .then(done, done);
            });

            it('errors when can\'t find a manifest for an unknown reason.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx'], 'haute-couture-broken')
                    .then(() => {

                        throw new Error('Shouldn\'t end-up here');
                    })
                    .catch((err) => {

                        expect(err).to.be.instanceof(SyntaxError);
                        expect(err).to.not.be.instanceof(DisplayError);
                        expect(err.output).to.equal('Searching docs from hapijs/hapi @ master...');
                    })
                    .then(done, done);
            });

            it('defaults to fetch docs for the version of the package used in the current project.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx'], 'specific-hapi-version')
                    .then((result) => {

                        expect(mockWreck.calls).to.equal([
                            'https://raw.githubusercontent.com/hapijs/hapi/v6.6.6/API.md'
                        ]);

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('Searching docs from hapijs/hapi @ v6.6.6...');
                        expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
                    })
                    .then(done, done);
            });

            it('fetches docs from the packages\'s master branch when not in a project.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx'], '/')
                    .then((result) => {

                        expect(mockWreck.calls).to.equal([
                            'https://raw.githubusercontent.com/hapijs/hapi/master/API.md'
                        ]);

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('Searching docs from hapijs/hapi @ master...');
                        expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
                    })
                    .then(done, done);
            });

            it('fetches docs from the packages\'s master branch when in a project that does not use the package.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx'], 'project-without-hapi')
                    .then((result) => {

                        expect(mockWreck.calls).to.equal([
                            'https://raw.githubusercontent.com/hapijs/hapi/master/API.md'
                        ]);

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('Searching docs from hapijs/hapi @ master...');
                        expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
                    })
                    .then(done, done);
            });

            it('fetches docs for the version specified by [--ver].', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx', '--ver', '4.2.0'], 'specific-hapi-version')
                    .then((result) => {

                        expect(mockWreck.calls).to.equal([
                            'https://raw.githubusercontent.com/hapijs/hapi/v4.2.0/API.md'
                        ]);

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('Searching docs from hapijs/hapi @ v4.2.0...');
                        expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
                    })
                    .then(done, done);
            });

            it('fetches docs for any ref specified by [--ver].', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'xxx', '--ver', 'branch-name'])
                    .then((result) => {

                        expect(mockWreck.calls).to.equal([
                            'https://raw.githubusercontent.com/hapijs/hapi/branch-name/API.md'
                        ]);

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('Searching docs from hapijs/hapi @ branch-name...');
                        expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
                    })
                    .then(done, done);
            });

            it('fetches docs for package specified as docs[:package], defaulting to hapijs repo.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs:joi', 'xxx'], '/')
                    .then((result) => {

                        expect(mockWreck.calls).to.equal([
                            'https://raw.githubusercontent.com/hapijs/joi/master/API.md'
                        ]);

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('Searching docs from hapijs/joi @ master...');
                        expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
                    })
                    .then(done, done);
            });

            it('fetches docs for package specified as docs[:package], with pal repos.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs:schmervice', 'xxx'], '/')
                    .then((result) => {

                        expect(mockWreck.calls).to.equal([
                            'https://raw.githubusercontent.com/devinivy/schmervice/master/API.md'
                        ]);

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('Searching docs from devinivy/schmervice @ master...');
                        expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
                    })
                    .then(done, done);
            });

            it('errors when there is no docs query.', (done, onCleanup) => {

                const mockWreck = mockWreckGet(null);
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs'])
                    .then((result) => {

                        expect(mockWreck.calls).to.equal([]);
                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('You must specify a search query to find a section in the hapi docs.');
                    })
                    .then(done, done);
            });

            it('matches section case-insensitively on haute-couture item, then method, then query.', (done, onCleanup) => {

                const mockWreck = mockWreckGet();
                onCleanup(mockWreck.cleanup);

                let stderr = '';

                Promise.resolve()
                    .then(() => {

                        const cli = RunUtil.cli(['docs', 'plugin'], 'single-as-file');

                        cli.args.err.on('data', (data) => {

                            stderr += data;
                        });

                        return cli;
                    })
                    .then((result) => {

                        expect(stderr).to.equal('');                            // Ensure no missing haoute-couture warning
                        expect(result.err).to.not.exist();
                        expect(StripAnsi(result.output)).to.contain('# server.register('); // Matched using haute-couture manifest
                        expect(result.errorOutput).to.equal('');

                        return RunUtil.cli(['docs', 'ext'], 'single-as-file');
                    })
                    .then((result) => {

                        expect(result.err).to.not.exist();
                        expect(StripAnsi(result.output)).to.contain('# server.ext(');      // Matching server.ext() method before something earlier with a "next" callback
                        expect(result.errorOutput).to.equal('');

                        return RunUtil.cli(['docs', 'lifeCycle'], 'single-as-file');
                    })
                    .then((result) => {

                        expect(result.err).to.not.exist();
                        expect(StripAnsi(result.output)).to.contain('# Request lifecycle'); // Solely based upon the query, no parens
                        expect(result.errorOutput).to.equal('');

                        return RunUtil.cli(['docs', 'eXT'], 'single-as-file');
                    })
                    .then((result) => {

                        expect(result.err).to.not.exist();
                        expect(StripAnsi(result.output)).to.contain('# server.ext(');       // Case
                        expect(result.errorOutput).to.equal('');

                        return RunUtil.cli(['docs', 'plUGins'], 'single-as-file');
                    })
                    .then((result) => {

                        expect(result.err).to.not.exist();
                        expect(StripAnsi(result.output)).to.contain('# server.register('); // Direct (non-plural) haute-couture match
                        expect(result.errorOutput).to.equal('');
                    })
                    .then(done, done);
            });

            it('matches on query only when it has at least three characters.', (done, onCleanup) => {

                const mockWreck = mockWreckGet();
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'rv']) // Would definitely find "server.anything()"
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v16.x.x...');
                        expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "rv".');
                    })
                    .then(done, done);
            });

            it('matches on anchorized query.', (done, onCleanup) => {

                const mockWreck = mockWreckGet();
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', '#serverstatename-options'])
                    .then((result) => {

                        expect(result.err).to.not.exist();
                        expect(StripAnsi(result.output)).to.contain('# server.state(name, [options])');
                        expect(result.errorOutput).to.equal('');
                    })
                    .then(done, done);
            });

            it('matches on pluralized haute-couture item.', (done, onCleanup) => {

                const mockWreck = mockWreckGet();
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', 'cache'], 'single-as-dir')
                    .then((result) => {

                        expect(result.err).to.not.exist();
                        expect(StripAnsi(result.output)).to.contain('# server.cache.provision(options, [callback])');
                        expect(result.errorOutput).to.equal('');
                    })
                    .then(done, done);
            });

            it('matches on a section\'s single configuration item.', (done, onCleanup) => {

                const mockWreck = mockWreckGet();
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', '#route-options', 'json'])
                    .then((result) => {

                        expect(result.err).to.not.exist();

                        const output = StripAnsi(result.output);

                        expect(output).to.contain('# Route options');
                        expect(output).to.contain('    * json -');
                        expect(output).to.contain('        * replacer -');
                        expect(output).to.contain('        * space -');
                        expect(output).to.contain('        * suffix -');
                        expect(output).to.contain('        * escape -');
                        expect(output).to.not.contain('* id -');

                        expect(result.errorOutput).to.equal('');
                    })
                    .then(done, done);
            });

            it('matches against heading anchor tags and does not display anchors in output.', (done, onCleanup) => {

                const mockWreck = mockWreckGet();
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', '#srv.reg'])
                    .then((result) => {

                        expect(result.err).to.not.exist();

                        const output = StripAnsi(result.output);

                        expect(output).to.contain('#### server.registrations');
                        expect(output).to.contain('registrations is an object');
                        expect(output).to.contain('    * version -');
                        expect(output).to.contain('    * name -');
                        expect(output).to.contain('    * options -');
                        expect(output).to.contain('    * attributes -');
                        expect(output).to.contain('array member provides');

                        expect(result.errorOutput).to.equal('');
                    })
                    .then(done, done);
            });

            it('errors when can\'t match single configuration item.', (done, onCleanup) => {

                const mockWreck = mockWreckGet();
                onCleanup(mockWreck.cleanup);

                RunUtil.cli(['docs', '#route-options', 'nope'])
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v16.x.x...');
                        expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "#route-options nope".');
                    })
                    .then(done, done);
            });
        });

        describe.only('run command', () => {

            it('errors when there\'s no package.json file found.', () => {

                return RunUtil.cli(['run', 'x'], '/')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('No nearby package.json found– you don\'t seem to be in a project.');
                    });
            });

            it('errors when command is not specified.', () => {

                return RunUtil.cli(['run'], '/')
                    .then((result) => {

                        expect(result.err).to.be.instanceof(DisplayError);
                        expect(result.output).to.equal('');
                        expect(result.errorOutput).to.contain('You must specify a command to run.');
                    });
            });
        });
    });

    describe('bin', () => {

        it('passes through argvs.', () => {

            return RunUtil.bin(['-h']) // "-h" is just an example argv
                .then((result) => {

                    expect(result.code).to.equal(0);
                    expect(result.output).to.contain('Usage: hpal <command> <options>');
                    expect(result.errorOutput).to.equal('');
                });
        });
    });
});
