'use strict';

const Path = require('path');
const Fs = require('fs');
const Os = require('os');
const Bossy = require('bossy');
const PkgDir = require('pkg-dir');
const Pify = require('pify');
const Deglob = Pify(require('deglob'));
const Mkdirp = Pify(require('mkdirp'));
const Pluralize = require('pluralize');
const Print = require('./print');
const DisplayError = require('./display-error');
const Package = require('../package.json');

const internals = {};

exports.start = (options) => {

    const args = Bossy.parse(internals.definition, {
        argv: options.argv
    });

    const output = (str) => options.out.write(`${str}\n`);

    if (args instanceof Error) {
        throw new DisplayError(`${internals.usage()}\n${args.message}`)
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
    }
};

internals.usage = () => Bossy.usage(internals.definition, 'paldo ???');

internals.commands = {
    make(cwd, place, name, asDir) {

        return PkgDir(cwd)
            .then((root) => Promise.all([internals.getHauteCouture(root), internals.getAmendmentFile(root)]))
            .then((results) => {

                const HauteCouture = results[0];
                const amendmentFile = results[1];
                const amendments = require(amendmentFile);
                const manifest = HauteCouture.manifest.create(amendments);
                const pluralPlace = Pluralize.plural(place);
                const item = manifest.find((m) => m.place === place) || manifest.find((m) => m.place === pluralPlace);

                if (!item) {
                    throw new DisplayError(`We don't know anything about "${place}".  Try one of: ${manifest.map((m) => m.place).join(', ')}.`);
                }

                if (!item.list && name) {
                    throw new DisplayError(`${item.place} should be declared once and not in a list, so we can't use name "${name}".`);
                }

                const filepath = (() => {

                    const dir = Path.dirname(amendmentFile);

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

                    return ([
                        `'use strict';`,
                        '',
                        `module.exports = ${Print.example(ex)};`
                    ]).join(Os.EOL);
                })();

                return internals.write(filepath, contents).then(() => filepath);
            });
    }
};

internals.getHauteCouture = (root) => {

    try {
        return require(`${root}/node_modules/haute-couture`);
    }
    catch (err) {

        if (err.code === 'MODULE_NOT_FOUND') {
            throw new DisplayError(`Couldn't find the haute-couture package in this project.  It may just need to be installed.`);
        }

        throw err;
    }
};

internals.getAmendmentFile = (root) => {

    return Deglob('**/.hc.js', { cwd: root, ignore: 'node_modules/**' })
        .then((amendmentFiles) => {

            if (!amendmentFiles.length) {
                throw new DisplayError(`There's no directory in this project containing a .hc.js file.`);
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
