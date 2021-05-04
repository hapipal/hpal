'use strict';

// Load modules

const Fs = require('fs');
const Os = require('os');
const Path = require('path');
const Util = require('util');
const AsyncHooks = require('async_hooks');
const ChildProcess = require('child_process');
const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const Rimraf = require('rimraf');
const StripAnsi = require('strip-ansi');
const Boom = require('@hapi/boom');
const Wreck = require('@hapi/wreck');
const Glob = require('glob');
const RunUtil = require('./run-util');
const Helpers = require('../lib/helpers');
const DisplayError = require('../lib/display-error');
const Package = require('../package.json');

// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

const internals = {};

describe('hpal', () => {

    const normalize = (str) => {

        // Naively normalizes string output for OS differences:
        // backslashes to foreslashes (paths) and the OS end-of-line to \n.

        return str && str.replace(/\\/g, '/').replace(RegExp(Os.EOL, 'g'), '\n');
    };

    describe('CLI', () => {

        const rimraf = (file) => Util.promisify(Rimraf)(`${__dirname}/closet/${file}`, { disableGlob: true });
        const read = (file) => Util.promisify(Fs.readFile)(`${__dirname}/closet/${file}`, 'utf8');

        it('outputs help [-h, --help].', async () => {

            const result1 = await RunUtil.cli(['-h']);

            expect(result1.err).to.not.exist();
            expect(result1.output).to.contain('Usage: hpal <command> <options>');
            expect(result1.errorOutput).to.equal('');

            const result2 = await RunUtil.cli(['--help']);

            expect(result2.err).to.not.exist();
            expect(result2.output).to.contain('Usage: hpal <command> <options>');
            expect(result2.errorOutput).to.equal('');
        });

        it('outputs help (no command).', async () => {

            const result = await RunUtil.cli([]);

            expect(result.err).to.not.exist();
            expect(result.output).to.contain('Usage: hpal <command> <options>');
            expect(result.output).to.not.contain('Unknown option');
            expect(result.output).to.not.contain('Unknown command');
            expect(result.errorOutput).to.equal('');
        });

        it('outputs version [-v, --version].', async () => {

            const result1 = await RunUtil.cli(['-v']);

            expect(result1.err).to.not.exist();
            expect(result1.output).to.contain(Package.version);
            expect(result1.errorOutput).to.equal('');

            const result2 = await RunUtil.cli(['--version']);

            expect(result2.err).to.not.exist();
            expect(result2.output).to.contain(Package.version);
            expect(result2.errorOutput).to.equal('');
        });

        it('outputs usage on misused flags.', async () => {

            const result = await RunUtil.cli(['--notaflag']);

            expect(result.err).to.be.instanceof(DisplayError);
            expect(result.output).to.equal('');
            expect(result.errorOutput).to.contain('Usage: hpal <command> <options>');
            expect(result.errorOutput).to.contain('Unknown option: notaflag');
        });

        it('outputs usage on non-existent command.', async () => {

            const result = await RunUtil.cli(['clank']);

            expect(result.err).to.be.instanceof(DisplayError);
            expect(result.output).to.equal('');
            expect(result.errorOutput).to.contain('Usage: hpal <command> <options>');
            expect(result.errorOutput).to.contain('Unknown command: clank');
        });

        it('outputs with or without color.', async () => {

            const result1 = await RunUtil.cli(['clank'], null, true);

            expect(result1.err).to.be.instanceof(DisplayError);
            expect(result1.output).to.equal('');
            expect(result1.errorOutput).to.contain('\u001b[31mUnknown command: clank\u001b[0m');

            const result2 = await RunUtil.cli(['clank'], null, false);

            expect(result2.err).to.be.instanceof(DisplayError);
            expect(result2.output).to.equal('');
            expect(result2.errorOutput).to.contain('Unknown command: clank');
            expect(result2.errorOutput).to.not.contain('\u001b[31mUnknown command: clank\u001b[0m');
        });

        describe('make command', () => {

            const makeFileCleanup = () => ({
                files: [],
                async cleanup() {

                    return await Promise.all(this.files.map(
                        async (file) => await rimraf(file)
                    ));
                }
            });

            it('errors when there\'s no .hc.js file found.', async () => {

                const result = await RunUtil.cli(['make', 'route'], 'no-hc-file');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('There\'s no directory in this project containing a .hc.js file.');
            });

            it('errors when there\'s no package.json file found.', async () => {

                const result = await RunUtil.cli(['make', 'route'], '/');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('No nearby package.json found– you don\'t seem to be in a project.');
            });

            it('errors when finding a .hc.js file is ambiguous.', async () => {

                const result = await RunUtil.cli(['make', 'route'], 'ambiguous-hc-file');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(normalize(result.errorOutput)).to.contain('It\'s ambiguous which directory containing a .hc.js file to use: project-a/.hc.js, project-b/.hc.js');
                expect(result.errorOutput.match(/,/g)).to.have.length(1);
            });

            it('errors when finding a .hc.js file is ambiguous due to (nested) side-paths.', async () => {

                const result1 = await RunUtil.cli(['make', 'route'], 'ambiguous-hc-file-side-paths/project-c');

                expect(result1.err).to.be.instanceof(DisplayError);
                expect(result1.output).to.equal('');
                expect(normalize(result1.errorOutput)).to.contain('It\'s ambiguous which directory containing a .hc.js file to use: ../project-a/.hc.js, ../project-b/.hc.js');
                expect(result1.errorOutput.match(/,/g)).to.have.length(1);

                const OrigGlob = Glob.Glob;

                // Must reverse glob results so that Helpers.getAmendmentFile()
                // can be written in a way that doesn't rely on Glob's undoc'd
                // result order.  Also necessary for code coverage.

                Glob.Glob = class extends OrigGlob {

                    constructor(pattern, opts, cb) {

                        super(pattern, opts, (err, res) => cb(err, res && res.reverse()));

                        Glob.Glob = OrigGlob;
                    }
                };

                Glob.Glob.notOriginal = true;

                const result2 = await RunUtil.cli(['make', 'route'], 'ambiguous-hc-file-side-paths/project-c');

                expect(Glob.Glob.notOriginal).to.not.exist();
                expect(result2.err).to.be.instanceof(DisplayError);
                expect(result2.output).to.equal('');
                expect(normalize(result2.errorOutput)).to.contain('It\'s ambiguous which directory containing a .hc.js file to use: ../project-b/.hc.js, ../project-a/.hc.js');
                expect(result2.errorOutput.match(/,/g)).to.have.length(1);
            });

            it('succeeds when finding a .hc.js file is ambiguous in the project, but not to the cwd (multi-plugin project).', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('ambiguous-hc-file/project-a/routes');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const result = await RunUtil.cli(['make', 'route'], 'ambiguous-hc-file/project-a');

                expect(result.err).to.not.exist();
                expect(normalize(result.output)).to.contain('Wrote routes/index.js');
                expect(result.errorOutput).to.equal('');

                const contents = await read('ambiguous-hc-file/project-a/routes/index.js');

                expect(contents).to.startWith('\'use strict\';');
            });

            it('succeeds when finding a .hc.js file from a cwd deep in the project.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('non-ambiguous-hc-file-cwd/project-b/routes');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const result = await RunUtil.cli(['make', 'route'], 'non-ambiguous-hc-file-cwd/project-a');

                expect(result.err).to.not.exist();
                expect(normalize(result.output)).to.contain('Wrote ../project-b/routes/index.js');
                expect(result.errorOutput).to.equal('');

                const contents = await read('non-ambiguous-hc-file-cwd/project-b/routes/index.js');

                expect(contents).to.startWith('\'use strict\';');
            });

            it('errors when haute-couture cannot be found.', async () => {

                const result = await RunUtil.cli(['make', 'route'], 'no-haute-couture');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('Couldn\'t find the @hapipal/haute-couture package in this project. It may just need to be installed.');
            });

            it('errors when haute-couture cannot be found but a legacy version can be found.', async () => {

                const result = await RunUtil.cli(['make', 'route'], 'legacy-haute-couture');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('This version of hpal is not compatible with old versions of haute-couture. Ensure you have @hapipal/haute-couture v4 or newer installed in your project, or downgrade to hpal v2.');
            });

            it('errors when file to create already exists.', async () => {

                const result = await RunUtil.cli(['make', 'route', 'some-route'], 'file-already-exists');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('The file');
                expect(normalize(result.errorOutput)).to.contain('file-already-exists/routes/some-route.js');
                expect(result.errorOutput).to.contain('already exists.');
            });

            it('errors when omitting an item to create.', async () => {

                const result = await RunUtil.cli(['make'], 'item-omitted');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('Ah, but what to make? You must specify a haute-couture item. Try one of: ');
                expect(result.errorOutput).to.contain('decorations, ');
            });

            it('errors when trying to create a non-existent item.', async () => {

                const result = await RunUtil.cli(['make', 'nonsense'], 'item-doesnt-exist');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('We don\'t know anything about "nonsense". Try one of: ');
                expect(result.errorOutput).to.contain('decorations, ');
            });

            it('errors when trying to create a non-list item with a name.', async () => {

                const result = await RunUtil.cli(['make', 'view-manager', 'spunky'], 'cant-have-name');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('view-manager should be declared once and not in a list, so we can\'t use name "spunky".');
            });

            it('errors when trying to make an item as both a file and a directory.', async () => {

                const result = await RunUtil.cli(['make', 'routes', '-f', '-d'], 'file-dir-conflict');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('Options [-d, --asDir] and [-f, --asFile] conflict with each other.');
            });

            it('errors hard when writing a file fails.', async (flags) => {

                const writeFile = Helpers.writeFile;

                Helpers.writeFile = () => {

                    throw new Error('Write badness');
                };

                flags.onCleanup = () => {

                    Helpers.writeFile = writeFile;
                };

                const err = await expect(RunUtil.cli(['make', 'routes'], 'write-fails')).to.reject();

                expect(err).to.be.instanceof(Error);
                expect(err).to.not.be.instanceof(DisplayError);
                expect(err.message).to.equal('Write badness');
                expect(err.output).to.equal('');
            });

            it('errors hard when finding haute-couture fails in an unexpected way.', async () => {

                const err = await expect(RunUtil.cli(['make', 'routes'], 'haute-couture-broken')).to.reject();

                expect(err).to.be.instanceof(SyntaxError);
                expect(err).to.not.be.instanceof(DisplayError);
                expect(err.output).to.equal('');
            });

            it('creates a list item in a directory (default).', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('list-as-dir/lib/routes');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/routes/index.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('list-as-dir/lib/routes/index.js');
                    expect(contents).to.startWith('\'use strict\';');

                    await rimraf('list-as-dir/lib/routes');
                };

                await check(RunUtil.cli(['make', 'routes'], 'list-as-dir'));
                await check(RunUtil.cli(['make', 'routes', '-d'], 'list-as-dir'));
                await check(RunUtil.cli(['make', 'routes', '--asDir'], 'list-as-dir'));
            });

            it('creates a list item as a file.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('list-as-file/lib/routes.js');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/routes.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('list-as-file/lib/routes.js');
                    expect(contents).to.startWith('\'use strict\';');

                    await rimraf('list-as-file/lib/routes.js');
                };

                await check(RunUtil.cli(['make', 'routes', '-f'], 'list-as-file'));
                await check(RunUtil.cli(['make', 'routes', '--asFile'], 'list-as-file'));
            });

            it('creates a single item in a directory.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('single-as-dir/lib/bind');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/bind/index.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('single-as-dir/lib/bind/index.js');
                    expect(contents).to.startWith('\'use strict\';');

                    await rimraf('single-as-dir/lib/bind');
                };

                await check(RunUtil.cli(['make', 'bind', '-d'], 'single-as-dir'));
                await check(RunUtil.cli(['make', 'bind', '--asDir'], 'single-as-dir'));
            });

            it('creates a single item as a file (default).', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('single-as-file/lib/bind.js');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/bind.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('single-as-file/lib/bind.js');
                    expect(contents).to.startWith('\'use strict\';');

                    await rimraf('single-as-file/lib/bind.js');
                };

                await check(RunUtil.cli(['make', 'bind'], 'single-as-file'));
                await check(RunUtil.cli(['make', 'bind', '-f'], 'single-as-file'));
                await check(RunUtil.cli(['make', 'bind', '--asFile'], 'single-as-file'));
            });

            it('creates an item when haute item `meta` property is absent.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('single-as-file/lib/bind.js');

                const getManifest = Helpers.getManifest;

                flags.onCleanup = async () => {

                    Helpers.getManifest = getManifest;
                    await fileCleanup.cleanup();
                };

                Helpers.getManifest = async (...args) => {

                    const manifest = await getManifest(...args);

                    manifest.forEach((item) => {

                        delete item.meta;
                    });

                    return manifest;
                };

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/bind.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('single-as-file/lib/bind.js');
                    expect(contents).to.startWith('\'use strict\';');
                };

                await check(RunUtil.cli(['make', 'bind'], 'single-as-file'));
            });

            it('writes file exporting {} when example and signature are absent.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('no-example-or-signature/lib/x.js');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/x.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('no-example-or-signature/lib/x.js');
                    expect(contents).to.equal([
                        '\'use strict\';',
                        '',
                        'module.exports = {};',
                        ''
                    ].join(Os.EOL));

                    await rimraf('no-example-or-signature/lib/x.js');
                };

                await check(RunUtil.cli(['make', 'x'], 'no-example-or-signature'));
            });

            it('writes file with export built from signature when example is absent.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('no-example-with-signature/lib/x.js');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/x.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('no-example-with-signature/lib/x.js');
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

                    await rimraf('no-example-with-signature/lib/x.js');
                };

                await check(RunUtil.cli(['make', 'x'], 'no-example-with-signature'));
            });

            it('writes file with export built from example when present.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('with-example-and-signature/lib/x.js');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/x.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('with-example-and-signature/lib/x.js');
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

                    await rimraf('with-example-and-signature/lib/x.js');
                };

                await check(RunUtil.cli(['make', 'x'], 'with-example-and-signature'));
            });

            it('writes file from example that has some requires.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('with-example-and-requires/lib/x.js');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/x.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('with-example-and-requires/lib/x.js');
                    expect(contents).to.equal([
                        '\'use strict\';',
                        '',
                        'const FiveSpot = require(\'five-spot\');',
                        'const TenSpot = require(\'ten-spot\');',
                        '',
                        'module.exports = class extends FiveSpot.mixin(TenSpot) {};',
                        ''
                    ].join(Os.EOL));

                    await rimraf('with-example-and-requires/lib/x.js');
                };

                await check(RunUtil.cli(['make', 'x'], 'with-example-and-requires'));
            });

            it('wraps listed examples in an array.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('listed-example/lib/x/index.js');
                fileCleanup.files.push('listed-example/lib/x/y.js');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const checkUnnamed = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/x/index.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('listed-example/lib/x/index.js');
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
                };

                const checkNamed = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/x/y.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('listed-example/lib/x/y.js');
                    expect(contents).to.equal([
                        '\'use strict\';',
                        '',
                        'module.exports = {',
                        '    a: 1',
                        '};',
                        ''
                    ].join(Os.EOL));
                };

                await checkUnnamed(RunUtil.cli(['make', 'x'], 'listed-example'));
                await checkNamed(RunUtil.cli(['make', 'x', 'y'], 'listed-example'));
            });

            it('skips outputting the use strict header.', async (flags) => {

                const fileCleanup = makeFileCleanup();
                fileCleanup.files.push('skip-use-strict-header/lib/x.js');
                flags.onCleanup = async () => await fileCleanup.cleanup();

                const check = async (promise) => {

                    const result = await promise;
                    expect(result.err).to.not.exist();
                    expect(normalize(result.output)).to.contain('Wrote lib/x.js');
                    expect(result.errorOutput).to.equal('');

                    const contents = await read('skip-use-strict-header/lib/x.js');
                    expect(contents).not.to.startWith('\'use strict\';');
                };

                await check(RunUtil.cli(['make', 'x'], 'skip-use-strict-header'));
            });
        });

        describe('new command', () => {

            const exists = (file) => Util.promisify(Fs.stat)(`${__dirname}/closet/${file}`);

            const exec = (cmd, cwd) => {

                const pexec = Util.promisify((x, y, cb) => ChildProcess.exec(x, y, (err, ...args) => cb(err, !err && args)));

                return pexec(cmd, { cwd: `${__dirname}/closet/${cwd}` });
            };

            const answerNpmInit = (cli, name, bail) => {

                cli.options.out.on('data', (data) => {

                    data = data.toString();

                    if (~data.indexOf('name: ')) {
                        process.nextTick(() => cli.options.in.write(`${name}\n`));
                    }
                    else if ((/^[\w ]+: /).test(data)) {
                        process.nextTick(() => cli.options.in.write('\n')); // "Return" through the npm prompts
                    }
                    else if (~data.toLowerCase().indexOf('is this ok?')) {
                        process.nextTick(() => cli.options.in.write(bail ? 'no\n' : 'yes\n'));
                    }
                });
            };

            const returnError = async (promise) => {

                try {
                    return await promise;
                }
                catch (err) {
                    return err;
                }
            };

            const completePkgKeysOrder = [
                'name',
                'version',
                'description',
                'author',
                'license',
                'main',
                'directories',
                'scripts',
                'dependencies',
                'devDependencies'
            ];

            const bailedPkgKeysOrder = [
                'main',
                'scripts',
                'dependencies',
                'devDependencies'
            ];

            it('creates a new pal project.', { timeout: 5000 }, async (flags) => {

                flags.onCleanup = async () => await rimraf('new/my-project');

                const cli = RunUtil.cli(['new', 'my-project'], 'new');

                answerNpmInit(cli, 'chosen-name');

                const result = await cli;

                expect(result.err).to.not.exist();
                expect(result.output).to.contain('New pal project created in my-project');
                expect(result.errorOutput).to.equal('');

                const results = await Promise.all([
                    read('new/my-project/package.json'),
                    read('new/my-project/README.md'),
                    exists('new/my-project/lib/index.js'),
                    exists('new/my-project/test/index.js'),
                    exec('git remote', 'new/my-project'),
                    exec('git tag', 'new/my-project'),
                    exec('git ls-files -m', 'new/my-project'),
                    returnError(exec('git log', 'new/my-project'))
                ]);

                const pkgAsString = results[0];
                const pkg = JSON.parse(pkgAsString);
                const readme = results[1];
                const readmeH1 = readme.trim().substring(2);
                const lib = results[2];
                const test = results[3];
                const remotes = results[4][0].split('\n');
                const tags = results[5][0].split('\n');
                const modifiedFiles = results[6][0].trim();
                const logError = results[7];

                expect(pkg.name).to.equal('chosen-name');
                expect(pkg.version).to.equal('1.0.0');
                expect(pkg.dependencies).to.exist();
                expect(pkg.devDependencies).to.exist();
                expect(Object.keys(pkg)).to.equal(completePkgKeysOrder);
                expect(Object.keys(pkg.dependencies)).to.equal(Object.keys(pkg.dependencies).sort());
                expect(Object.keys(pkg.devDependencies)).to.equal(Object.keys(pkg.devDependencies).sort());
                expect(pkgAsString.endsWith('\n')).to.equal(true);
                expect(readmeH1).to.equal('chosen-name');
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
                expect(`${logError}`).to.contain('your current branch \'master\' does not have any commits');
            });

            it('creates a new pal project when bailing on `npm init`.', { timeout: 5000 }, async (flags) => {

                flags.onCleanup = async () => await rimraf('new/bail-on-npm-init');

                const cli = RunUtil.cli(['new', 'bail-on-npm-init'], 'new');

                answerNpmInit(cli, 'chosen-name', true); // Bail

                const result = await cli;

                expect(result.err).to.not.exist();
                expect(result.output).to.contain('New pal project created in bail-on-npm-init');
                expect(result.errorOutput).to.contain('Bailed on `npm init`, but continuing to setup your project with an incomplete package.json file.');

                const results = await Promise.all([
                    read('new/bail-on-npm-init/package.json'),
                    read('new/bail-on-npm-init/README.md'),
                    exists('new/bail-on-npm-init/lib/index.js'),
                    exists('new/bail-on-npm-init/test/index.js'),
                    exec('git remote', 'new/bail-on-npm-init'),
                    exec('git tag', 'new/bail-on-npm-init'),
                    exec('git ls-files -m', 'new/bail-on-npm-init'),
                    returnError(exec('git log', 'new/bail-on-npm-init'))
                ]);

                const pkgAsString = results[0];
                const pkg = JSON.parse(pkgAsString);
                const readme = results[1];
                const readmeH1 = readme.trim().substring(2);
                const lib = results[2];
                const test = results[3];
                const remotes = results[4][0].split('\n');
                const tags = results[5][0].split('\n');
                const modifiedFiles = results[6][0].trim();
                const logError = results[7];

                expect(pkg.name).to.not.exist();
                expect(pkg.version).to.not.exist();
                expect(pkg.dependencies).to.exist();
                expect(pkg.devDependencies).to.exist();
                expect(Object.keys(pkg)).to.equal(bailedPkgKeysOrder);
                expect(Object.keys(pkg.dependencies)).to.equal(Object.keys(pkg.dependencies).sort());
                expect(Object.keys(pkg.devDependencies)).to.equal(Object.keys(pkg.devDependencies).sort());
                expect(pkgAsString.endsWith('\n')).to.equal(true);
                expect(readmeH1).to.equal('bail-on-npm-init');
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
                expect(`${logError}`).to.contain('your current branch \'master\' does not have any commits');
            });

            it('creates a new pal project when bailing on `npm init` by ^C press (SIGINT).', { timeout: 5000, skip: process.platform === 'win32' }, async (flags) => {

                flags.onCleanup = async () => await rimraf('new/sigint-on-npm-init');

                const result = await RunUtil.bin(['new', 'closet/new/sigint-on-npm-init'], null, true);

                expect(result.output).to.contain('New pal project created in closet/new/sigint-on-npm-init');
                expect(result.errorOutput).to.contain('Bailed on `npm init`, but continuing to setup your project with an incomplete package.json file.');

                const results = await Promise.all([
                    read('new/sigint-on-npm-init/package.json'),
                    read('new/sigint-on-npm-init/README.md'),
                    exists('new/sigint-on-npm-init/lib/index.js'),
                    exists('new/sigint-on-npm-init/test/index.js'),
                    exec('git remote', 'new/sigint-on-npm-init'),
                    exec('git tag', 'new/sigint-on-npm-init'),
                    exec('git ls-files -m', 'new/sigint-on-npm-init'),
                    returnError(exec('git log', 'new/sigint-on-npm-init'))
                ]);

                const pkgAsString = results[0];
                const pkg = JSON.parse(pkgAsString);
                const readme = results[1];
                const readmeH1 = readme.trim().substring(2);
                const lib = results[2];
                const test = results[3];
                const remotes = results[4][0].split('\n');
                const tags = results[5][0].split('\n');
                const modifiedFiles = results[6][0].trim();
                const logError = results[7];

                expect(pkg.name).to.not.exist();
                expect(pkg.version).to.not.exist();
                expect(pkg.dependencies).to.exist();
                expect(pkg.devDependencies).to.exist();
                expect(Object.keys(pkg)).to.equal(bailedPkgKeysOrder);
                expect(Object.keys(pkg.dependencies)).to.equal(Object.keys(pkg.dependencies).sort());
                expect(Object.keys(pkg.devDependencies)).to.equal(Object.keys(pkg.devDependencies).sort());
                expect(pkgAsString.endsWith('\n')).to.equal(true);
                expect(readmeH1).to.equal('sigint-on-npm-init');
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
                expect(`${logError}`).to.contain('your current branch \'master\' does not have any commits');
            });

            it('fails in a friendly way when trying to create a project in a non-empty directory.', async () => {

                const result = await RunUtil.cli(['new', 'project-already-exists'], 'new');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('There\'s already a directory there with some stuff in it– try choosing a new place to create your project.');
            });

            it('fails in a friendly way when can\'t git clone due to connection.', async (flags) => {

                const execOrig = ChildProcess.exec;
                ChildProcess.exec = (cmd, opts, cb) => {

                    if (cmd.indexOf('git clone') === 0) {
                        return process.nextTick(() => cb(new Error('fatal: unable to access \'https://github.com/hapipal/boilerplate.git/\': Could not resolve host: github.com')));
                    }

                    return execOrig(cmd, opts, cb);
                };

                flags.onCleanup = async () => {

                    ChildProcess.exec = execOrig;
                    await rimraf('new/bad-connection');
                };

                const result = await RunUtil.cli(['new', 'bad-connection'], 'new');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('Couldn\'t create a new project. It seems you may be offline– ensure you have a connection then try again.');
            });

            it('fails hard when git clone fails for an unknown reason.', { timeout: 5000 }, async (flags) => {

                const execOrig = ChildProcess.exec;
                ChildProcess.exec = (cmd, opts, cb) => {

                    if (cmd.indexOf('git clone') === 0) {
                        return process.nextTick(() => cb(new Error('Oops!')));
                    }

                    return execOrig(cmd, opts, cb);
                };

                flags.onCleanup = async () => {

                    ChildProcess.exec = execOrig;
                    await rimraf('new/unknown-error');
                };

                const cli = RunUtil.cli(['new', 'unknown-error'], 'new');
                const err = await expect(cli).to.reject();

                expect(err).to.be.instanceof(Error);
                expect(err).to.not.be.instanceof(DisplayError);
                expect(err.message).to.contain('Oops!');
            });

            it('continues and warns if fetching flavors fails.', { timeout: 5000 }, async (flags) => {

                const execOrig = ChildProcess.exec;
                ChildProcess.exec = (cmd, opts, cb) => {

                    if (cmd === 'git fetch pal --tags') {
                        return process.nextTick(() => cb(new Error('Oops!')));
                    }

                    return execOrig(cmd, opts, cb);
                };

                flags.onCleanup = async () => {

                    ChildProcess.exec = execOrig;
                    await rimraf('new/flavors-fail');
                };

                const cli = RunUtil.cli(['new', 'flavors-fail'], 'new');

                answerNpmInit(cli, 'flavors-fail');

                const result = await cli;

                expect(result.err).to.not.exist();
                expect(result.output).to.contain('New pal project created in flavors-fail');
                expect(result.errorOutput).to.contain('Just so you know, we weren\'t able to fetch pal flavors for you. Try running git fetch pal --tags yourself at a later time.');
            });

            it('errors if a directory is not specified.', async () => {

                const result = await RunUtil.cli(['new'], 'new');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('You must specify a directory in which to start your project.');
            });

            it('errors when git or npm are missing.', async (flags) => {

                const execOrig = ChildProcess.exec;
                flags.onCleanup = () => {

                    ChildProcess.exec = execOrig;
                };

                ChildProcess.exec = (cmd, opts, cb) => {

                    if (cmd === 'npm --version') {
                        return execOrig('npm --bad-command', opts, cb);
                    }

                    return execOrig(cmd, opts, cb);
                };

                const result1 = await RunUtil.cli(['new', 'missing-npm'], 'new');

                expect(result1.err).to.be.instanceof(DisplayError);
                expect(result1.output).to.equal('');
                expect(result1.errorOutput).to.contain('To use this command you must have git and npm installed and in your PATH');

                ChildProcess.exec = (cmd, opts, cb) => {

                    if (cmd === 'git --version') {
                        return execOrig('git --bad-command', opts, cb);
                    }

                    return execOrig(cmd, opts, cb);
                };

                const result2 = await RunUtil.cli(['new', 'missing-git'], 'new');

                expect(result2.err).to.be.instanceof(DisplayError);
                expect(result2.output).to.equal('');
                expect(result2.errorOutput).to.contain('To use this command you must have git and npm installed and in your PATH');
            });
        });

        describe('docs command', () => {

            const mockWreckGet = (err) => {

                const get = Wreck.get;
                const calls = [];
                const cleanup = () => {

                    Wreck.get = get;
                };

                Wreck.get = async (url) => {

                    calls.push(url);

                    if (err) {
                        return Promise.reject(err);
                    }

                    if (err === null) {
                        return Promise.resolve({ payload: Buffer.from('') });
                    }

                    const payload = await Util.promisify(Fs.readFile)(`${__dirname}/closet/API.md`);

                    return { payload };
                };

                return { calls, cleanup };
            };

            const normalizeVersion = (str) => str.replace(/(19|20)\.[\d]+\.[\d]+/g, '20.x.x');

            it('errors when fetching docs 404s.', async (flags) => {

                const mockWreck = mockWreckGet(Boom.notFound());
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx']);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(normalizeVersion(result.errorOutput)).to.contain('Couldn\'t find docs for that version of hapi. Are you sure hapijs/hapi @ v20.x.x exists?');
            });

            it('errors when fetching docs fails due to being offline.', async (flags) => {

                const mockWreck = mockWreckGet(Object.assign(new Error(), {
                    syscall: 'getaddrinfo',
                    code: 'ENOTFOUND'
                }));

                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx']);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(result.errorOutput).to.contain('Could not fetch the hapi docs. It seems you may be offline– ensure you have a connection then try again.');
            });

            it('errors when fetching docs fails due to non-offline DNS error.', async (flags) => {

                const mockWreck = mockWreckGet(Object.assign(new Error('Something bad happened during DNS lookup.'), {
                    syscall: 'getaddrinfo',
                    code: 'EAI_AGAIN'
                }));

                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx']);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(result.errorOutput).to.contain('Could not fetch the hapi docs: Something bad happened during DNS lookup.');
            });

            it('errors when docs can\'t be fetched (boom error).', async (flags) => {

                const mockWreck = mockWreckGet(Boom.badImplementation());
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx']);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(result.errorOutput).to.contain('Could not fetch the hapi docs: Internal Server Error');
            });

            it('errors when docs can\'t be fetched (non-boom error).', async (flags) => {

                const mockWreck = mockWreckGet(new Error('No way can you get those docs'));
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx']);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(result.errorOutput).to.contain('Could not fetch the hapi docs: No way can you get those docs');
            });

            it('errors when package is corrupted and version can\'t be determined.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const err = await expect(RunUtil.cli(['docs', 'xxx'], 'corrupted-hapi-version')).to.reject();

                expect(err).to.be.instanceof(Error);
                expect(err).to.not.be.instanceof(DisplayError);
                expect(err.message).to.contain('Cannot read property \'version\' of null');
            });

            it('errors when can\'t find a manifest for an unknown reason.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const err = await expect(RunUtil.cli(['docs', 'xxx'], 'haute-couture-broken')).to.reject();

                expect(err).to.be.instanceof(SyntaxError);
                expect(err).to.not.be.instanceof(DisplayError);
                expect(normalizeVersion(err.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
            });

            it('defaults to fetch docs for the version of the package used in the current project.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx'], 'specific-hapi-version');

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/hapijs/hapi/v6.6.6/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from hapijs/hapi @ v6.6.6...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('ignores error errors when haute-couture cannot be found.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx'], 'no-haute-couture');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('ignores error errors when legacy haute-couture is installed.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx'], 'legacy-haute-couture');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('defaults to fetch docs for the version of the scoped package used in the current project.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx'], 'specific-hapi-scoped-version');

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/hapijs/hapi/v6.6.6/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from hapijs/hapi @ v6.6.6...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('defaults to fetch docs for the version of the specified scoped package used in the current project.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs:joi', 'xxx'], 'specific-joi-scoped-version');

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/sideway/joi/v6.6.6/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from sideway/joi @ v6.6.6...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('defaults to fetch docs for the version of the specified package used in the current project.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs:joi', 'xxx'], 'specific-joi-version');

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/sideway/joi/v6.6.6/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from sideway/joi @ v6.6.6...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('defaults to fetch docs for the version of the specified pal package used in the current project.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs:schmervice', 'xxx'], 'specific-schmervice-version');

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/hapipal/schmervice/v6.6.6/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from hapipal/schmervice @ v6.6.6...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('fetches docs from the packages\'s master branch when not in a project.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx'], '/');

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/hapijs/hapi/master/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from hapijs/hapi @ master...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('fetches docs from the packages\'s master branch when in a project that does not use the package.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx'], 'project-without-hapi');

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/hapijs/hapi/master/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from hapijs/hapi @ master...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('fetches docs for the version specified by [--ver].', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx', '--ver', '4.2.0'], 'specific-hapi-version');

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/hapijs/hapi/v4.2.0/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from hapijs/hapi @ v4.2.0...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('fetches docs for any ref specified by [--ver].', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'xxx', '--ver', 'branch-name']);

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/hapijs/hapi/branch-name/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from hapijs/hapi @ branch-name...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('fetches docs for package specified as docs[:package], defaulting to hapijs repo.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs:unknown', 'xxx']);

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/hapijs/unknown/master/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from hapijs/unknown @ master...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('fetches docs for package specified as docs[:package], with pal repos.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs:schmervice', 'xxx'], '/');

                expect(mockWreck.calls).to.equal([
                    'https://raw.githubusercontent.com/hapipal/schmervice/master/API.md'
                ]);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('Searching docs from hapipal/schmervice @ master...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "xxx".');
            });

            it('errors when there is no docs query.', async (flags) => {

                const mockWreck = mockWreckGet(null);
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs']);

                expect(mockWreck.calls).to.equal([]);
                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('You must specify a search query to find a section in the hapi docs.');
            });

            it('matches section case-insensitively on haute-couture item, then method, then query.', async (flags) => {

                const mockWreck = mockWreckGet();
                flags.onCleanup = mockWreck.cleanup;

                let stderr = '';

                const cli = RunUtil.cli(['docs', 'plugin'], 'single-as-file');

                cli.options.err.on('data', (data) => {

                    stderr += data;
                });

                const result1 = await cli;

                expect(stderr).to.equal('');                            // Ensure no missing haute-couture warning
                expect(result1.err).to.not.exist();
                expect(StripAnsi(result1.output)).to.contain('# server.register('); // Matched using haute-couture manifest
                expect(result1.errorOutput).to.equal('');

                const result2 = await RunUtil.cli(['docs', 'ext'], 'single-as-file');

                expect(result2.err).to.not.exist();
                expect(StripAnsi(result2.output)).to.contain('# server.ext(');      // Matching server.ext() method before something earlier with a "next" callback
                expect(result2.errorOutput).to.equal('');

                const result3 = await RunUtil.cli(['docs', 'lifeCycle'], 'single-as-file');

                expect(result3.err).to.not.exist();
                expect(StripAnsi(result3.output)).to.contain('# Request lifecycle'); // Solely based upon the query, no parens
                expect(result3.errorOutput).to.equal('');

                const result4 = await RunUtil.cli(['docs', 'eXT'], 'single-as-file');

                expect(result4.err).to.not.exist();
                expect(StripAnsi(result4.output)).to.contain('# server.ext(');       // Case
                expect(result4.errorOutput).to.equal('');

                const result5 = await RunUtil.cli(['docs', 'plUGins'], 'single-as-file');

                expect(result5.err).to.not.exist();
                expect(StripAnsi(result5.output)).to.contain('# server.register('); // Direct (non-plural) haute-couture match
                expect(result5.errorOutput).to.equal('');
            });

            it('does not match based on custom method.', async (flags) => {

                const mockWreck = mockWreckGet();
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'anywhere'], 'hc-custom-method');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "anywhere".');
            });

            it('matches on query only when it has at least three characters.', async (flags) => {

                const mockWreck = mockWreckGet();
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'rv']); // Would definitely find "server.anything()"

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "rv".');
            });

            it('matches on anchorized query.', async (flags) => {

                const mockWreck = mockWreckGet();
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', '#serverstatename-options']);

                expect(result.err).to.not.exist();
                expect(StripAnsi(result.output)).to.contain('# server.state(name, [options])');
                expect(result.errorOutput).to.equal('');
            });

            it('matches on pluralized haute-couture item.', async (flags) => {

                const mockWreck = mockWreckGet();
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', 'cache'], 'single-as-dir');

                expect(result.err).to.not.exist();
                expect(StripAnsi(result.output)).to.contain('# server.cache.provision(options, [callback])');
                expect(result.errorOutput).to.equal('');
            });

            it('matches on a section\'s single configuration item.', async (flags) => {

                const mockWreck = mockWreckGet();
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', '#route-options', 'json']);

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
            });

            it('matches against heading anchor tags and does not display anchors in output.', async (flags) => {

                const mockWreck = mockWreckGet();
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', '#srv.reg']);

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
            });

            it('errors when can\'t match single configuration item.', async (flags) => {

                const mockWreck = mockWreckGet();
                flags.onCleanup = mockWreck.cleanup;

                const result = await RunUtil.cli(['docs', '#route-options', 'nope']);

                expect(result.err).to.be.instanceof(DisplayError);
                expect(normalizeVersion(result.output)).to.equal('Searching docs from hapijs/hapi @ v20.x.x...');
                expect(result.errorOutput).to.contain('Sorry, couldn\'t find documentation for "#route-options nope".');
            });
        });

        describe('run command', () => {

            const Server = Hapi.server().constructor;

            it('errors when there\'s no package.json file found.', async () => {

                const result = await RunUtil.cli(['run', 'x'], '/');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('No nearby package.json found– you don\'t seem to be in a project.');
            });

            it('errors when command is not specified.', async () => {

                const result = await RunUtil.cli(['run'], '/');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('You must specify a command to run.');
            });

            it('errors when there is no server to require.', async () => {

                const result = await RunUtil.cli(['run', 'x'], 'run-no-server');

                const root = Path.resolve(__dirname, 'closet/run-no-server');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(normalize(result.errorOutput)).to.contain(`No server found! To run commands the current project must export { deployment: async () => server } from ${normalize(root)}/server.`);
            });

            it('errors hard when a bad require happens in the server.', async () => {

                await expect(RunUtil.cli(['run', 'x'], 'run-bad-require')).to.reject(/Cannot find module 'does-not-exist'/);
            });

            it('errors when server does not export { deployment }.', async () => {

                const result = await RunUtil.cli(['run', 'x'], 'run-bad-server');

                const root = Path.resolve(__dirname, 'closet/run-bad-server');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(normalize(result.errorOutput)).to.contain(`No server found! To run commands the current project must export { deployment: async () => server } from ${normalize(root)}/server.`);
            });

            it('errors when calling a vanilla or default command that does not exist.', async () => {

                const result1 = await RunUtil.cli(['run', 'x'], 'run-no-command');

                expect(result1.err).to.be.instanceof(DisplayError);
                expect(result1.output).to.equal('');
                expect(result1.errorOutput).to.contain('Plugin x does not have a default command.');

                const result2 = await RunUtil.cli(['run', 'y:some-command'], 'run-no-command');

                expect(result2.err).to.be.instanceof(DisplayError);
                expect(result2.output).to.equal('');
                expect(result2.errorOutput).to.contain('Plugin y does not have the command "some-command".');

                const result3 = await RunUtil.cli(['run', 'x:some-command'], 'run-command-no-func');

                expect(result3.err).to.be.instanceof(DisplayError);
                expect(result3.output).to.equal('');
                expect(result3.errorOutput).to.contain('Plugin x does not have the command "some-command".');
            });

            it('errors when calling a command that is not exported properly.', async () => {

                const result = await RunUtil.cli(['run', 'x:bad-command'], 'run-bad-command');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.equal('');
                expect(result.errorOutput).to.contain('Plugin x does not have the command "bad-command".');
            });

            it('lists all commands found on a server: default, hpal-prefixed, and vanilla.', async () => {

                const result = await RunUtil.cli(['run', '--list'], 'run-list-commands');

                expect(result.err).to.not.exist();
                expect(result.errorOutput).to.equal('');

                const output = StripAnsi(result.output).trim();

                expect(output).to.equal([
                    'Here are some commands found on your server:',
                    '',
                    '  hpal run x',
                    '  hpal run x:camel-cased',
                    '  hpal run x:described',
                    '    • This is what I do',
                    '  hpal run x:described-fn',
                    '    • {"ctx":["DisplayError","colors","options","output"]}',
                    '  hpal run y',
                    '  hpal run y:camel-cased',
                    '  hpal run y:described',
                    '    • This is what I do',
                    '  hpal run y:described-fn',
                    '    • {"ctx":["DisplayError","colors","options","output"]}'
                ].join('\n'));
            });

            it('lists no commands found on a server.', async () => {

                const result = await RunUtil.cli(['run', '--list'], 'run-list-no-commands');

                expect(result.err).to.not.exist();
                expect(result.errorOutput).to.equal('');

                const output = StripAnsi(result.output).trim();

                expect(output).to.equal('No commands found on your server.');
            });

            it('runs a command, passing the server, normalized args, the project root, etc, and stopping server.', async () => {

                const result1 = await RunUtil.cli(['run', 'x:some-command', '-a', 'arg1', '--arg2', 'arg3'], 'run-command');

                expect(result1.err).to.not.exist();
                expect(result1.errorOutput).to.equal('');
                expect(result1.options.cmd[0]).to.be.instanceof(Server);
                expect(result1.options.cmd[0].stopped).to.equal(true);
                expect(result1.options.cmd[1]).to.equal(['-a', 'arg1', '--arg2', 'arg3']);
                expect(result1.options.cmd[2]).to.equal(Path.resolve(__dirname, 'closet/run-command'));
                expect(result1.options.cmd[3]).to.exist();
                expect(result1.options.cmd[3].options).to.shallow.equal(result1.options);
                expect(result1.output).to.contain('Running x:some-command...');
                expect(result1.output).to.contain('Complete!');

                // Test args against flag collision
                const result2 = await RunUtil.cli(['run', 'x:some-command', '--list', '--asFile', '-h'], 'run-command');

                expect(result2.err).to.not.exist();
                expect(result2.errorOutput).to.equal('');
                expect(result2.options.cmd[0]).to.be.instanceof(Server);
                expect(result2.options.cmd[0].stopped).to.equal(true);
                expect(result2.options.cmd[1]).to.equal(['--list', '--asFile', '-h']);
                expect(result2.options.cmd[2]).to.equal(Path.resolve(__dirname, 'closet/run-command'));
                expect(result2.options.cmd[3]).to.exist();
                expect(result2.options.cmd[3].options).to.shallow.equal(result2.options);
                expect(result2.output).to.contain('Running x:some-command...');
                expect(result2.output).to.contain('Complete!');
            });

            it('runs a command and prevents default output', async () => {

                const result = await RunUtil.cli(['run', 'x:some-command'], 'run-silent-command');

                expect(result.err).to.not.exist();
                expect(result.errorOutput).to.equal('');
                expect(result.output).to.equal('');
            });

            it('stops server when a DisplayError is thrown.', async () => {

                const result = await RunUtil.cli(['run', 'x:some-command'], 'run-command-display-error');

                expect(result.err).to.be.instanceof(DisplayError);
                expect(result.output).to.contain('Running x:some-command...');
                expect(result.errorOutput).to.contain('Something happened');
                expect(result.options.cmd[0]).to.be.instanceof(Server);
                expect(result.options.cmd[0].stopped).to.equal(true);
            });

            it('fails hard when a non-DisplayError is thrown.', async () => {

                const err = await expect(RunUtil.cli(['run', 'x:some-command'], 'run-command-bad-error')).to.reject();

                expect(err).to.be.instanceof(Error);
                expect(err).to.not.be.instanceof(DisplayError);
                expect(err.message).to.equal('Something happened');
                expect(err.output).to.contain('Running x:some-command...');
                expect(err.options.cmd[0]).to.be.instanceof(Server);
                expect(err.options.cmd[0].stopped).to.not.equal(true);
            });

            it('runs a default command.', async () => {

                const result = await RunUtil.cli(['run', 'x'], 'run-default-command');

                expect(result.err).to.not.exist();
                expect(result.errorOutput).to.equal('');
                expect(result.options.cmd).to.equal('ran');
            });

            it('runs an hpal-prefixed command.', async () => {

                const result = await RunUtil.cli(['run', 'x:some-command'], 'run-prefixed-command');

                expect(result.err).to.not.exist();
                expect(result.errorOutput).to.equal('');
                expect(result.options.cmd).to.equal('ran');
            });

            it('runs a kebab-cased command.', async () => {

                const result = await RunUtil.cli(['run', 'x:kebab-cased-command'], 'run-kebab-cased-command');

                expect(result.err).to.not.exist();
                expect(result.errorOutput).to.equal('');
                expect(result.options.cmd).to.equal('ran');
            });

            it('runs a kebab-cased, hpal-prefixed command.', async () => {

                const result = await RunUtil.cli(['run', 'x:kebab-cased-command'], 'run-kebab-cased-prefixed-command');

                expect(result.err).to.not.exist();
                expect(result.errorOutput).to.equal('');
                expect(result.options.cmd).to.equal('ran');
            });

            it('provides async local storage.', async () => {

                const result = await RunUtil.cli(['run', 'x', '--some-arg'], 'run-async-local-storage');

                expect(result.err).to.not.exist();
                expect(result.errorOutput).to.equal('');
                expect(result.options.cmd.start).to.only.contain(['command', 'params']);
                expect(result.options.cmd.start.command).to.equal('run');
                expect(result.options.cmd.start.params).to.only.contain(['cwd', 'list', 'command', 'args', 'ctx']);
                expect(result.options.cmd.start.params.cwd).to.contain('run-async-local-storage');
                expect(result.options.cmd.start.params.list).to.equal(false);
                expect(result.options.cmd.start.params.command).to.equal('x');
                expect(result.options.cmd.start.params.args).to.equal(['--some-arg']);
                expect(result.options.cmd.start.params.ctx).to.contain(['options', 'colors', 'DisplayError']);
                expect(result.options.cmd.start).to.shallow.equal(result.options.cmd.stop);
            });

            it('does not fail when async local storage is unsupported.', async (flags) => {

                const { AsyncLocalStorage } = AsyncHooks;

                delete AsyncHooks.AsyncLocalStorage;
                flags.onCleanup = () => {

                    AsyncHooks.AsyncLocalStorage = AsyncLocalStorage;
                };

                const result = await RunUtil.cli(['run', 'x', '--some-arg'], 'run-async-local-storage');

                expect(result.err).to.not.exist();
                expect(result.errorOutput).to.equal('');
                expect(result.options.cmd).to.equal({ start: undefined, stop: undefined });
            });
        });
    });

    describe('bin', () => {

        it('passes through argvs.', async () => {

            const result = await RunUtil.bin(['-h']); // "-h" is just an example argv

            expect(result.code).to.equal(0);
            expect(result.output).to.contain('Usage: hpal <command> <options>');
            expect(result.errorOutput).to.equal('');
        });

        it('passes through node flags.', async () => {

            const result = await RunUtil.bin(['run', 'x', '--use_strict'], `${__dirname}/closet/run-echo-exec-argv`);

            expect(result.code).to.equal(0);
            expect(result.output).to.contain('["--experimental-repl-await","--use_strict"]');
            expect(result.errorOutput).to.equal('');
        });
    });
});
