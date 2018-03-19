'use strict';

const Path = require('path');
const Bossy = require('bossy');
const Commands = require('./commands');
const Print = require('./print');
const DisplayError = require('./display-error');
const Package = require('../package.json');

const internals = {};

exports.start = (options) => {

    const args = Bossy.parse(internals.definition, {
        argv: options.argv
    });

    const output = (str) => options.out.write(`${str}\n`);
    const colors = Print.colors(options.colors);
    const ctx = { options, colors, output, DisplayError };

    output(''); // Just a newline to make some room

    const extraArgs = (args instanceof Error) ? options.argv : args._;
    const commandAndPart = extraArgs[2];

    if (args instanceof Error && commandAndPart !== 'run') {
        throw new DisplayError(`${internals.usage(ctx)}\n\n` + colors.red(args.message));
    }

    if (args.version) {
        return output(Package.version);
    }

    if (args.help || !commandAndPart) {
        return output(`${internals.usage(ctx)}\n`);
    }

    const command = commandAndPart.split(':')[0];
    const cmdPart = commandAndPart.split(':')[1];

    switch (command) {
        case 'make': {

            if (args.asDir && args.asFile) {
                throw new DisplayError(colors.red('Options [-d, --asDir] and [-f, --asFile] conflict with each other.'));
            }

            const cwd = options.cwd;
            const place = extraArgs[3];
            const name = extraArgs[4];
            const asDir = args.asDir ? true : (args.asFile ? false : null);

            return Commands.make(cwd, place, name, asDir, ctx)
                .then((filepath) => {

                    output(colors.green(`Wrote ${Path.relative(cwd, filepath)}`));
                });
        }
        case 'docs': {

            const cwd = options.cwd;
            const pkg = cmdPart || 'hapi';
            const version = args.ver;
            const query = extraArgs[3];
            const itemQuery = extraArgs[4];

            if (!query) {
                throw new DisplayError(colors.red(`You must specify a search query to find a section in the ${pkg} docs.`));
            }

            return Commands.docs(cwd, pkg, version, query, itemQuery, ctx)
                .then((docs) => {

                    if (docs === null) {
                        throw new DisplayError(colors.red(`Sorry, couldn't find documentation for "${query}${itemQuery ? ' ' + itemQuery : ''}".`));
                    }

                    output(docs);
                });
        }
        case 'new': {

            if (!extraArgs[3]) {
                throw new DisplayError(colors.red('You must specify a directory in which to start your project.'));
            }

            const cwd = options.cwd;
            const dir = Path.resolve(cwd, extraArgs[3]);

            return Commands.new(cwd, dir, ctx)
                .then(() => {

                    output(colors.green(`New pal project created in ${Path.relative(cwd, dir)}`));
                });
        }
        case 'run': {

            const cwd = options.cwd;
            const list = args.list;
            const cmd = extraArgs[3];
            const normalizedArgs = extraArgs.slice(4);

            if (!cmd && !list) {
                throw new DisplayError(colors.red('You must specify a command to run.'));
            }

            return Commands.run(cwd, list, cmd, normalizedArgs, ctx);
        }
        default: {
            throw new DisplayError(`${internals.usage(ctx)}\n\n` + colors.red(`Unknown command: ${command}`));
        }
    }
};

internals.definition = {
    help: {
        type: 'boolean',
        alias: 'h',
        description: 'show usage options',
        default: null
    },
    version: {
        type: 'boolean',
        alias: 'v',
        description: 'show version information',
        default: null
    },
    asDir: {
        type: 'boolean',
        alias: 'd',
        description: '[make] creates new haute-couture item in a directory index file',
        default: null
    },
    asFile: {
        type: 'boolean',
        alias: 'f',
        description: '[make] creates new haute-couture item in a file',
        default: null
    },
    ver: {
        type: 'string',
        alias: 'V',
        description: '[docs] specifies the version/ref of the API docs to search for the given package',
        default: null
    },
    list: {
        type: 'boolean',
        alias: 'l',
        description: '[run] lists all available commands',
        default: null
    }
};

internals.usage = (ctx) => Bossy.usage(internals.definition, internals.usageText(ctx), { colors: ctx.options.colors });

// eslint-disable-next-line hapi/hapi-scope-start
internals.usageText = (ctx) => `hpal <command> <options>

Commands:

  ${ctx.colors.green('hpal new')} <new-project-directory>
    ${ctx.colors.yellow('e.g.')} hpal new ~/node-projects/new-pal-project

  ${ctx.colors.green('hpal make')} [--asDir|--asFile] <haute-couture-item> [<item-name>]
    ${ctx.colors.yellow('e.g.')} hpal make route create-user

  ${ctx.colors.green('hpal docs')}[:<package-name>] [--ver x.y.z|ref] <docs-section> [<config-item>]
    ${ctx.colors.yellow('e.g.')} hpal docs --ver 17.2.0 h.continue

  ${ctx.colors.green('hpal run')} [--list] <cmd> [<cmd-options>]
    ${ctx.colors.yellow('e.g.')} hpal run schwifty:migrations
`;
