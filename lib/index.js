'use strict';

const Path = require('path');
const Fs = require('fs');
const Os = require('os');
const ChildProcess = require('child_process');
const Bossy = require('bossy');
const Semver = require('semver');
const PkgDir = require('pkg-dir');
const Pify = require('pify');
const Deglob = Pify(require('deglob'));
const Mkdirp = Pify(require('mkdirp'));
const Pluralize = require('pluralize');
const Wreck = require('wreck');
const StableStringify = require('json-stable-stringify');
const Print = require('./print');
const DisplayError = require('./display-error');
const Package = require('../package.json');

const internals = {};

const PAL_REPO = 'https://github.com/devinivy/boilerplate-api.git';
const PAL_BRANCH = 'pal';

exports.start = (options) => {

    const args = Bossy.parse(internals.definition, {
        argv: options.argv
    });

    const output = (str) => options.out.write(`${str}\n`);

    if (args instanceof Error) {
        throw new DisplayError(`${internals.usage()}\n${args.message}`);
    }

    if (args.help) {
        return output(internals.usage());
    }

    if (args.version) {
        return output(Package.version);
    }

    const command = args._[2];

    switch (command) {
        case 'make': {

            if (args.asDir && args.asFile) {
                throw new DisplayError('Options [-d, --asDir] and [-f, --asFile] conflict with each other.');
            }

            const cwd = options.cwd;
            const place = args._[3];
            const name = args._[4];
            const asDir = args.asDir ? true : (args.asFile ? false : null);

            return internals.commands.make(cwd, place, name, asDir)
                .then((filepath) => {

                    output(`Wrote ${Path.relative(cwd, filepath)}`);
                });
        }
        case 'docs': {

            const cwd = options.cwd;
            const query = args._[3];
            const itemQuery = args._[4];
            const version = args.hapi;

            if (!query) {
                throw new DisplayError('You must specify a search query to find a section in the hapi docs.');
            }

            if (version && !Semver.valid(version)) {
                throw new DisplayError(`The --hapi option should specify a valid semver version. "${version}" is invalid.`);
            }

            return internals.commands.docs(cwd, version, query, itemQuery, options)
                .then((docs) => {

                    if (docs === null) {
                        throw new DisplayError(`Sorry, couldn't find documentation for "${query}${itemQuery ? ' ' + itemQuery : ''}".`);
                    }

                    output(docs);
                });
        }
        case 'new': {

            if (!args._[3]) {
                throw new DisplayError('You must specify a directory in which to start your project.');
            }

            const cwd = options.cwd;
            const dir = Path.resolve(cwd, args._[3]);

            return internals.commands.new(cwd, dir, options)
                .then(() => {

                    output(`New pal project created in ${Path.relative(cwd, dir)}`);
                });
        }
        default: {
            throw new DisplayError(`${internals.usage()}\nUnknown command: ${command}`);
        }
    }
};

internals.definition = {
    help: {
        type: 'boolean',
        alias: 'h',
        description: 'display usage options',
        default: null
    },
    version: {
        type: 'boolean',
        alias: 'v',
        description: 'version information',
        default: null
    },
    asDir: { // make
        type: 'boolean',
        alias: 'd',
        default: null
    },
    asFile: { // make
        type: 'boolean',
        alias: 'f',
        default: null
    },
    hapi: { // docs
        type: 'string',
        default: null
    }
};

internals.usage = () => Bossy.usage(internals.definition, 'paldo ???');

internals.commands = {
    make(cwd, place, name, asDir) {

        return PkgDir(cwd)
            .then((root) => internals.getManifest(root))
            .then((manifest) => {

                const pluralPlace = Pluralize.plural(place);
                const item = manifest.find((m) => m.place === place) || manifest.find((m) => m.place === pluralPlace);

                if (!item) {
                    throw new DisplayError(`We don't know anything about "${place}".  Try one of: ${manifest.map((m) => m.place).join(', ')}.`);
                }

                if (!item.list && name) {
                    throw new DisplayError(`${item.place} should be declared once and not in a list, so we can't use name "${name}".`);
                }

                const filepath = (() => {

                    const dir = Path.dirname(manifest.file);

                    if (name) {
                        return Path.join(dir, item.place, `${name}.js`);
                    }

                    if ((item.list && asDir === false) || (!item.list && (asDir === false || asDir === null))) {
                        return Path.join(dir, `${item.place}.js`);
                    }

                    return Path.join(dir, item.place, 'index.js');
                })();

                const contents = (() => {

                    const ex = item.hasOwnProperty('example') ? item.example :
                        (item.signature ? internals.sigToExample(item.signature) : {});

                    const shouldBeListed = item.list && !name;

                    return ([
                        '\'use strict\';',
                        '',
                        `module.exports = ${Print.example(shouldBeListed ? [ex] : ex)};`,
                        ''
                    ]).join(Os.EOL);
                })();

                return internals.write(filepath, contents).then(() => filepath);
            });
    },
    docs(cwd, version, query, itemQuery, options) {

        return PkgDir(cwd)
            .then((root) => {

                version = version || internals.getHapiVersion(root);

                return Promise.all([
                    internals.getHapiAPI(version).catch((err) => {

                        if (err.statusCode === 404) {
                            throw new DisplayError('Couldn\'t find docs for that version of hapi. Are you sure it\'s a published version?');
                        }

                        throw new DisplayError(`Could not fetch the hapi docs: ${err.message}`);
                    }),
                    internals.getManifest(root).catch((ignoreErr) => {

                        options.err.write('(Just so you know, we couldn\'t load a haute-couture manifest, so we can\'t search the hapi docs quite as intelligently as usual.)\n\n');
                    })
                ]);
            })
            .then((results) => {

                const api = results[0];
                const manifest = results[1];

                const pluralQuery = manifest && Pluralize.plural(query);
                const item = manifest && (manifest.find((m) => m.place === query) || manifest.find((m) => m.place === pluralQuery));
                const methodMatch = query.match(/^([a-z\.]+)/i);
                const method = methodMatch && methodMatch[1];
                const headingMatchers = ([
                    item && `server.${item.method}(`,
                    method && `${method}(`,
                    (query.length >= 3) && query
                ])
                    .filter((x) => !!x)
                    .map((match) => {

                        return (section) => {

                            const against = (match[0] === '#') ? internals.anchorize(section) : section.toLowerCase();

                            return ~against.indexOf(match.toLowerCase());
                        };
                    });

                if (!itemQuery) {
                    return Print.markdownSection(api, headingMatchers);
                }

                const itemQueryEsc = internals.regEscape(itemQuery);
                const itemRegExp = new RegExp(`^\s*\`?${itemQueryEsc}\`? -`, 'i');
                const listItemMatcher = (listItem) => itemRegExp.test(listItem);

                return Print.markdownListItem(api, headingMatchers, listItemMatcher);
            });
    },
    new(cwd, dir, options) {

        return internals.ensureGitAndNpm()
            .then(() => {

                return internals.exec(`git clone --depth=1 --origin=pal --branch=${PAL_BRANCH} ${PAL_REPO} ${dir}`, { cwd });
            })
            .then(() => {

                return Promise.all([
                    internals.exec('git checkout --orphan master', { cwd: dir }),
                    internals.exec('git fetch pal --tags', { cwd: dir })
                ]);
            })
            .then(() => Pify(Fs.readFile)(Path.join(dir, 'package.json')))
            .then((pkg) => {

                pkg = JSON.parse(pkg);

                delete pkg.name;
                delete pkg.version;

                return Promise.all([
                    Pify(Fs.writeFile)(Path.join(dir, 'package.json'), JSON.stringify(pkg)),
                    Pify(Fs.writeFile)(Path.join(dir, 'README.md'), '')
                ]);
            })
            .then(() => {

                return internals.spawn('npm', ['init'], dir, options);
            })
            .then(() => {

                return Pify(Fs.readFile)(Path.join(dir, 'package.json'));
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
                    Pify(Fs.writeFile)(Path.join(dir, 'package.json'), StableStringify(pkg, { cmp, space: 2 })),
                    Pify(Fs.writeFile)(Path.join(dir, 'README.md'), `# ${pkg.name}${Os.EOL}`)
                ]);
            })
            .then(() => {

                return internals.exec('git add package.json README.md', { cwd: dir });
            });
    }
};

internals.getManifest = (root) => {

    return internals.getAmendmentFile(root)
        .then((amendmentFile) => {

            const HauteCouture = internals.getHauteCouture(root);
            const amendments = require(amendmentFile);
            const manifest = HauteCouture.manifest.create(amendments);
            manifest.file = amendmentFile;

            return manifest;
        });
};

internals.getHauteCouture = (root) => {

    try {
        return require(`${root}/node_modules/haute-couture`);
    }
    catch (err) {

        if (err.code === 'MODULE_NOT_FOUND') {
            throw new DisplayError('Couldn\'t find the haute-couture package in this project.  It may just need to be installed.');
        }

        throw err;
    }
};

internals.getAmendmentFile = (root) => {

    return Deglob('**/.hc.js', { cwd: root, ignore: 'node_modules/**' })
        .then((amendmentFiles) => {

            if (!amendmentFiles.length) {
                throw new DisplayError('There\'s no directory in this project containing a .hc.js file.');
            }

            if (amendmentFiles.length > 1) {
                throw new DisplayError(`It's ambiguous which directory containing a .hc.js file to use: ${amendmentFiles.join(', ')}`);
            }

            return amendmentFiles[0];
        });
};

internals.sigToExample = (signature) => {

    return signature.reduce((example, arg) => {

        const isOptional = (arg[0] === '[' && arg[arg.length - 1] === ']');
        const key = isOptional ? arg.slice(1, -1) : arg;

        return Object.assign({}, example, {
            [key]: {
                $value: null,
                $comment: isOptional && 'Optional'
            }
        });
    }, {});
};

internals.getHapiVersion = (root) => {

    try {
        return require(`${root}/node_modules/hapi/package.json`).version;
    }
    catch (err) {

        if (err.code === 'MODULE_NOT_FOUND') {
            return null;
        }

        throw err;
    }
};

internals.getHapiAPI = (version) => {

    const ref = version ? `v${version}` : 'master';

    return Wreck.get(`https://raw.githubusercontent.com/hapijs/hapi/${ref}/API.md`)
        .then((response) => response.payload.toString());
};

internals.anchorize = (str) => '#' + str.toLowerCase().replace(/[^a-z0-9\s-]/ig, '').trim().replace(/\s/g, '-');

internals.ensureGitAndNpm = () => {

    return Promise.all([internals.exec('git --version'), internals.exec('npm --version')])
        .catch((err) => {

            throw new DisplayError(`To use this command you must have git and npm installed and in your PATH: ${err.message}`);
        });
};

internals.exec = (cmd, opts) => Pify(ChildProcess.exec)(cmd, opts);

internals.spawn = (cmd, args, cwd, options) => {

    return new Promise((resolve, reject) => {

        const subproc = ChildProcess.spawn(cmd, args, { cwd });

        subproc.stdout.pipe(options.out, { end: false });
        options.in.pipe(subproc.stdin);
        subproc.stderr.pipe(options.err, { end: false });

        subproc.once('close', (code) => {

            if (code !== 0) {
                return reject(new Error(`Failed with code: ${code}`));
            }

            return resolve();
        });
    });
};

internals.write = (filepath, contents) => {

    const writeFile = Pify(Fs.writeFile);

    return Mkdirp(Path.dirname(filepath))
        .then(() => writeFile(filepath, contents, { flag: 'wx' }))
        .catch((err) => {

            if (err.code === 'EEXIST') {
                throw new DisplayError(`The file ${filepath} already exists.`);
            }

            throw err;
        });
};

internals.regEscape = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
