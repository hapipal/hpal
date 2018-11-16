'use strict';

const Os = require('os');
const Path = require('path');
const ChildProcess = require('child_process');
const StableStringify = require('json-stable-stringify');
const Helpers = require('../helpers');
const DisplayError = require('../display-error');

const internals = {};

const PAL_REPO = 'https://github.com/hapipal/boilerplate.git';
const PAL_BRANCH = 'pal';

module.exports = (cwd, dir, ctx) => {

    return internals.ensureGitAndNpm(ctx)
        .then(() => {

            return Helpers.exec(`git clone --depth=1 --origin=pal --branch=${PAL_BRANCH} ${PAL_REPO} "${dir}"`, { cwd })
                .catch((err) => {

                    if (~err.message.indexOf('already exists and is not an empty directory')) {
                        throw new DisplayError(ctx.colors.red('There\'s already a directory there with some stuff in it– try choosing a new place to create your project.'));
                    }

                    if (~err.message.indexOf('Could not resolve host')) {
                        throw new DisplayError(ctx.colors.red('Couldn\'t create a new project. It seems you may be offline– ensure you have a connection then try again.'));
                    }

                    throw err;
                });
        })
        .then(() => {

            return Promise.all([
                Helpers.exec('git checkout --orphan master', { cwd: dir }),
                Helpers.exec('git fetch pal --tags', { cwd: dir })
                    .catch((ignoreErr) => {

                        const cmd = ctx.colors.grey('git fetch pal --tags');

                        ctx.options.err.write(
                            ctx.colors.yellow(
                                'Just so you know, we weren\'t able to fetch pal flavors for you. ' +
                                `Try running ${cmd} yourself at a later time.`
                            ) + '\n'
                        );
                    })
            ]);
        })
        .then(() => Helpers.readFile(Path.join(dir, 'package.json')))
        .then((pkg) => {

            pkg = JSON.parse(pkg);

            delete pkg.name;
            delete pkg.version;

            return Promise.all([
                Helpers.writeFile(Path.join(dir, 'package.json'), JSON.stringify(pkg)),
                Helpers.writeFile(Path.join(dir, 'README.md'), '')
            ]);
        })
        .then(() => {

            return internals.npmInit(dir, ctx)
                .catch((ignoreErr) => {

                    ctx.options.err.write(
                        ctx.colors.yellow(
                            'Bailed on `npm init`, but continuing to setup your project with an incomplete package.json file.'
                        ) + '\n'
                    );
                });
        })
        .then(() => {

            return Helpers.readFile(Path.join(dir, 'package.json'));
        })
        .then((pkg) => {

            pkg = JSON.parse(pkg);

            const order = [
                'name',
                'version',
                'description',
                'author',
                'license',
                'main',
                'directories'
            ];

            const cmp = (x, y) => {

                const xScore = order.indexOf(x.key) === -1 ? order.length : order.indexOf(x.key);
                const yScore = order.indexOf(y.key) === -1 ? order.length : order.indexOf(y.key);

                return xScore - yScore;
            };

            return Promise.all([
                Helpers.writeFile(Path.join(dir, 'package.json'), StableStringify(pkg, { cmp, space: 2 })),
                Helpers.writeFile(Path.join(dir, 'README.md'), `# ${pkg.name}${Os.EOL}`)
            ]);
        })
        .then(() => {

            return Helpers.exec('git add package.json README.md', { cwd: dir });
        });
};


internals.ensureGitAndNpm = (ctx) => {

    return Promise.all([Helpers.exec('git --version'), Helpers.exec('npm --version')])
        .catch((err) => {

            throw new DisplayError(ctx.colors.red(`To use this command you must have git and npm installed and in your PATH: ${err.message}`));
        });
};

internals.npmInit = (cwd, ctx) => {

    return new Promise((resolve, reject) => {

        const subproc = ChildProcess.spawn('npm', ['init'], { cwd });

        subproc.stdout.pipe(ctx.options.out, { end: false });
        ctx.options.in.pipe(subproc.stdin);
        subproc.stderr.pipe(ctx.options.err, { end: false });

        subproc.stdout.on('data', (data) => {

            data = data.toString();

            if (~data.toLowerCase().indexOf('is this ok?')) {
                ctx.options.in.once('data', () => subproc.stdin.end());
            }
        });

        subproc.once('close', (code) => {

            if (code !== 0) {
                return reject(new Error(`Failed with code: ${code}`));
            }

            return resolve();
        });
    });
};