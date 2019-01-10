'use strict';

const Os = require('os');
const Path = require('path');
const PkgDir = require('pkg-dir');
const Pluralize = require('pluralize');
const Print = require('../print');
const Helpers = require('../helpers');
const DisplayError = require('../display-error');

const internals = {};

module.exports = (cwd, place, name, asDir, ctx) => {

    return PkgDir(cwd)
        .then((root) => {

            if (!root) {
                throw new DisplayError(ctx.colors.red('No nearby package.json found– you don\'t seem to be in a project.'));
            }

            return Helpers.getManifest(root, ctx);
        })
        .then((manifest) => {

            if (!place) {
                throw new DisplayError(ctx.colors.red(`Ah, but what to make? You must specify a haute-couture item. Try one of: ${manifest.map((m) => m.place).join(', ')}.`));
            }

            const pluralPlace = Pluralize.plural(place);
            const item = manifest.find((m) => m.place === place) || manifest.find((m) => m.place === pluralPlace);

            if (!item) {
                throw new DisplayError(ctx.colors.red(`We don't know anything about "${place}". Try one of: ${manifest.map((m) => m.place).join(', ')}.`));
            }

            if (!item.list && name) {
                throw new DisplayError(ctx.colors.red(`${item.place} should be declared once and not in a list, so we can't use name "${name}".`));
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
                const requires = Print.requires(ex);

                let useStrict = [
                    '\'use strict\';',
                    ''
                ];
                if (item.noUseStrictHeader) {
                    useStrict = [];
                }

                return ([].concat(
                    useStrict,
                    requires ? [requires, ''] : [],
                    `module.exports = ${Print.example(shouldBeListed ? [ex] : ex)};`,
                    ''
                )).join(Os.EOL);
            })();

            return internals.write(filepath, contents, ctx).then(() => filepath);
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

internals.write = (filepath, contents, ctx) => {

    return Helpers.mkdirp(Path.dirname(filepath))
        .then(() => Helpers.writeFile(filepath, contents, { flag: 'wx' }))
        .catch((err) => {

            if (err.code === 'EEXIST') {
                throw new DisplayError(ctx.colors.red(`The file ${filepath} already exists.`));
            }

            throw err;
        });
};
