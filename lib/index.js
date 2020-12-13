'use strict';

const Path = require('path');
const Bossy = require('@hapi/bossy');
const Commands = require('./commands');
const Print = require('./print');
const DisplayError = require('./display-error');
const Package = require('../package.json');

const internals = {};

exports.start = async (options) => {

    const args = Bossy.parse(internals.definition, {
        argv: options.argv
    });

    const output = (str) => options.out.write(`${str}\n`);
    const colors = Print.colors(options.colors);
    const ctx = { options, colors, output, DisplayError };

    const commandAndPart = (args instanceof Error) ? options.argv[2] : args._[2];
    const extraArgs = (commandAndPart === 'run') ? options.argv : args._;

    if (commandAndPart !== 'run') {
        if (args instanceof Error) {
            throw new DisplayError(`${internals.usage(ctx)}\n\n` + colors.red(args.message));
        }

        if (args.version) {
            return output(Package.version);
        }

        if (args.help || !commandAndPart) {
            return output(`${internals.usage(ctx)}\n`);
        }
    }

    const [command, cmdPart] = commandAndPart.split(':');

    if (command !== 'run') {
        output(''); // Just a newline to make some room
    }

    // Handle each command with return or throw

    if (command === 'make') {

        if (args.asDir && args.asFile) {
            throw new DisplayError(colors.red('Options [-d, --asDir] and [-f, --asFile] conflict with each other.'));
        }

        const cwd = options.cwd;
        const place = extraArgs[3];
        const name = extraArgs[4];
        const asDir = args.asDir ? true : (args.asFile ? false : null);

        const filepath = await Commands.make({ cwd, place, name, asDir, ctx });

        return output(colors.green(`Wrote ${Path.relative(cwd, filepath)}`));
    }

    if (command === 'docs') {

        const cwd = options.cwd;
        const pkg = cmdPart || 'hapi';
        const version = args.ver;
        const query = extraArgs[3];
        const itemQuery = extraArgs[4];

        if (!query) {
            throw new DisplayError(colors.red(`You must specify a search query to find a section in the ${pkg} docs.`));
        }

        const docs = await Commands.docs({ cwd, pkg, version, query, itemQuery, ctx });

        if (docs === null) {
            throw new DisplayError(colors.red(`Sorry, couldn't find documentation for "${query}${itemQuery ? ' ' + itemQuery : ''}".`));
        }

        return output(docs);
    }

    if (command === 'new') {

        if (!extraArgs[3]) {
            throw new DisplayError(colors.red('You must specify a directory in which to start your project.'));
        }

        const cwd = options.cwd;
        const dir = Path.resolve(cwd, extraArgs[3]);

        await Commands.new({ cwd, dir, ctx });

        return output(colors.green(`New pal project created in ${Path.relative(cwd, dir)}`));
    }

    if (command === 'run') {

        const cwd = options.cwd;
        const list = !!args.list;
        const cmd = extraArgs[3] && !extraArgs[3].startsWith('-') ? extraArgs[3] : null;
        const normalizedArgs = extraArgs.slice(4);

        if (!cmd && !list) {
            throw new DisplayError(colors.red('You must specify a command to run.'));
        }

        return await Commands.run({ cwd, list, command: cmd, args: normalizedArgs, ctx });
    }

    throw new DisplayError(`${internals.usage(ctx)}\n\n` + colors.red(`Unknown command: ${command}`));
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
        description: '[run] lists all available commands on your server',
        default: null
    }
};

internals.usage = (ctx) => Bossy.usage(internals.definition, internals.usageText(ctx), { colors: ctx.options.colors });

// eslint-disable-next-line @hapi/scope-start
internals.usageText = ({ colors }) => `hpal <command> <options>

Commands:

  ${colors.green('hpal new')} <new-project-directory>
    ${colors.yellow('e.g.')} hpal new ~/node-projects/new-pal-project

  ${colors.green('hpal make')} [--asDir|--asFile] <haute-couture-item> [<item-name>]
    ${colors.yellow('e.g.')} hpal make route create-user

  ${colors.green('hpal docs')}[:<package-name>] [--ver x.y.z|ref] <docs-section> [<config-item>]
    ${colors.yellow('e.g.')} hpal docs --ver 20.0.0 h.continue

  ${colors.green('hpal run')} [--list] <cmd> [<cmd-options>]
    ${colors.yellow('e.g.')} hpal run plugin-name:command-name
`;
