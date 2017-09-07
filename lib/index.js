'use strict';

const Path = require('path');
const Os = require('os');
const Bossy = require('bossy');
const PkgDir = require('pkg-dir');
const Pify = require('pify');
const Deglob = Pify(require('deglob'));
const Pluralize = require('pluralize');
const Print = require('./print');

const internals = {};

exports.start = (options) => {

    const args = Bossy.parse(internals.definition, {
        argv: options.args
    });

    if (args instanceof Error) {
        console.error(internals.usage());
        return process.exit(1);
    }

    if (args.help) {
        console.log(internals.usage());
        return process.exit(1);
    }

    const command = args._[2];

    switch (command) {
        case 'make': {

            return PkgDir().then((root) => {

                const place = args._[3];
                const name = args._[4];

                return internals.commands.make(root, place, name);
            });
        }
        default: {
            console.log(internals.usage());
            return process.exit(1);
        }
    }
};

internals.definition = {
    h: {
        type: 'help',
        alias: 'help',
        description: 'Show help'
    }
};

internals.usage = () => Bossy.usage(internals.definition, 'paldo ???');

internals.commands = {
    make(root, place, name) {

        return internals.getAmendmentFile(root)
            .then((amendmentFile) => {

                const amendments = require(amendmentFile);
                const dir = Path.dirname(amendmentFile);

                const HauteCouture = internals.getHauteCouture(root);
                const manifest = HauteCouture.manifest.create(amendments);
                const pluralPlace = Pluralize.plural(place);
                const item = manifest.find((m) => m.place === place || m.place === pluralPlace);

                if (!item) {
                    throw new Error(`We don't know anything about "${place}".  Try one of: ${manifest.map((m) => m.place).join(', ')}.`);
                }

                const ex = item.hasOwnProperty('example') ? item.example :
                                (item.signature ? internals.sigToExample(item.signature) : {});

                const contents = [
                    `'use strict';`,
                    '',
                    `module.exports = ${Print.example(ex)};`
                ].join(Os.EOL);

                console.log(contents);
            });
    }
};

internals.getHauteCouture = (root) => {

    try {
        return require(`${root}/node_modules/haute-couture`);
    }
    catch (err) {

        if (err.code === 'MODULE_NOT_FOUND') {
            throw new Error(`Couldn't find the haute-couture package in this project.  It may just need to be installed.`);
        }

        throw err;
    }
};

internals.getAmendmentFile = (root) => {

    return Deglob('**/.hc.js', { cwd: root })
        .then((amendmentFiles) => {

            if (!amendmentFiles.length) {
                throw new Error(`There's no directory in this project containing a .hc.js file.`);
            }

            if (amendmentFiles.length > 1) {
                throw new Error(`It's ambiguous which directory containing a .hc.js file to use: ${amendmentFiles.join(', ')}`);
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
