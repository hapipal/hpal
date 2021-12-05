'use strict';

const Path = require('path');
const Mo = require('mo-walk');
const PkgDir = require('pkg-dir');
const Helpers = require('../helpers');
const DisplayError = require('../display-error');

const internals = {};

module.exports = Helpers.withAsyncStorage('run', async (params) => {

    const { cwd, list, command: cmd, args, ctx } = params;

    const root = await PkgDir(cwd);

    if (!root) {
        throw new DisplayError(ctx.colors.red('No nearby package.json found– you don\'t seem to be in a project.'));
    }

    const server = await internals.getServer(root, ctx);

    try {

        if (list && !cmd) {

            ctx.output(''); // Just a newline to make some room

            const commandList = Object.entries(server.plugins).flatMap(([pluginName, plugin]) => {

                return Object.keys(plugin.commands || {}).map((cmdName) => {

                    const command = internals.normalizeCommand(plugin.commands[cmdName]);
                    const description = typeof command.description === 'function' ? command.description(ctx) : command.description;
                    const name = pluginName.replace(/^hpal-/, '') + (
                        (cmdName === 'default') ? '' : internals.kebabize(`:${cmdName}`)
                    );

                    return { name, description };
                });
            });

            if (!commandList.length) {
                ctx.output(ctx.colors.yellow('No commands found on your server.'));
            }
            else {
                ctx.output(ctx.colors.green('Here are some commands found on your server:'));
                ctx.output('');
                ctx.output(commandList.map((command) => ctx.colors.bold(`  hpal run ${command.name}\n`) + (command.description ? `    • ${command.description}\n` : '')).join(''));
            }

            return;
        }

        const [pluginName] = cmd.split(':');
        const rawCommandName = cmd.slice(pluginName.length + 1) || 'default';
        const commandName = internals.camelize(rawCommandName);
        const commandInfo = internals.normalizeCommand(
            internals.getCommand(server, commandName, pluginName) ||
            internals.getCommand(server, commandName, `hpal-${pluginName}`) ||
            internals.getCommand(server, rawCommandName, pluginName) ||
            internals.getCommand(server, rawCommandName, `hpal-${pluginName}`)
        );

        if (!commandInfo || typeof commandInfo.command !== 'function') {
            throw new DisplayError(ctx.colors.red(`Plugin ${pluginName} does not have ` + ((rawCommandName === 'default') ? 'a default command.' : `the command "${rawCommandName}".`)));
        }

        if (!commandInfo.noDefaultOutput) {
            ctx.output(''); // Just a newline to make some room
            ctx.output(ctx.colors.green(`Running ${cmd}...\n`));
        }

        await commandInfo.command(server, args, root, ctx);

        if (!commandInfo.noDefaultOutput) {
            ctx.output(ctx.colors.green('\nComplete!'));
        }

        await server.stop();
    }
    catch (err) {

        if (err instanceof DisplayError) {
            await server.stop();
        }

        throw err;
    }
});

internals.getServer = async (root, ctx) => {

    const path = Path.join(root, 'server');

    const [srv] = await Mo.tryToResolve(path) || [];

    if (!srv || typeof srv.deployment !== 'function') {
        throw new DisplayError(ctx.colors.red(`No server found! To run commands the current project must export { deployment: async () => server } from ${root}/server.`));
    }

    const server = await srv.deployment();

    await server.initialize();

    return server;
};

internals.kebabize = (str) => str.replace(/[A-Z]/g, (m) => (`-${m}`).toLowerCase());
internals.camelize = (str) => str.replace(/[_-]./g, (m) => m[1].toUpperCase());

internals.normalizeCommand = (command) => {

    if (typeof command === 'function') {
        return { command };
    }

    return command;
};

internals.getCommand = (server, commandName, pluginName) => {

    return server.plugins[pluginName] &&
        server.plugins[pluginName].commands &&
        server.plugins[pluginName].commands[commandName];
};
