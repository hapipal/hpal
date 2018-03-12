'use strict';

const PkgDir = require('pkg-dir');
const DisplayError = require('../display-error');

const internals = {};

module.exports = (cwd, list, cmd, args, ctx) => {

    return PkgDir(cwd)
        .then((root) => {

            if (!root) {
                throw new DisplayError(ctx.colors.red('No nearby package.json found– you don\'t seem to be in a project.'));
            }

            return internals.getServer(root, ctx);
        })
        .then((server) => {

            if (list) {

                const pluginNames = Object.keys(server.plugins);
                const commands = pluginNames.reduce((collect, pluginName) => {

                    const { commands: cmds } = server.plugins[pluginName];

                    const fullCmds = Object.keys(cmds || {}).map((cmd) => ({
                        name: (cmd === 'default') ? pluginName : internals.kebabize(`${pluginName}:${cmd}`),
                        description: internals.normalizeCommand(cmds[cmd]).description
                    }));

                    return collect.concat(fullCmds);
                }, []);

                if (!commands.length) {
                    ctx.output(ctx.colors.yellow('No commands found on your server.'));
                }
                else {
                    ctx.output(ctx.colors.green(`Here are some commands we found on your server:`));
                    ctx.output('');
                    ctx.output(commands.map(({ name, description }) => `  hpal run ${name}\n` + (description ? `    - ${description}\n` : '')));
                }

                return server;
            }

            const pluginName = cmd.split(':')[0];
            const rawCommandName = cmd.slice(pluginName.length + 1) || 'default';
            const commandName = rawCommandName.split(':').map(internals.camelize).join(':');
            const commandInfo = internals.normalizeCommand(
                server.plugins[pluginName] &&
                server.plugins[pluginName].commands &&
                server.plugins[pluginName].commands[commandName]
            );

            if (!commandInfo || typeof commandInfo.command !== 'function') {
                throw new DisplayError(ctx.colors.red(`Plugin ${pluginName} does not have ` + (rawCommandName === 'default') ? 'a default command.' : `the command "${rawCommandName}".`));
            }

            ctx.output(ctx.colors.green(`Running ${cmd}...\n`));

            return Promise.resolve()
                .then(() => commandInfo.command(server, args, root, ctx))
                .then(() => ctx.output(ctx.colors.green('\nComplete!')))
                .then(() => server);
        })
        .then((server) => server.stop());
};

internals.getServer = (root, ctx) => {

    try {
        const srv = require(`${root}/server`);

        if (typeof srv.deployment !== 'function') {
            throw new DisplayError(ctx.colors.red(`No server found! To run commands the current project must export { deployment: async () => server } from ${root}/server[.js].`));
        }

        return Promise.resolve()
            .then(() => srv.deployment())
            .then((server) => server.initialize().then(() => server));
    }
    catch (err) {

        if (err.code === 'MODULE_NOT_FOUND') {
            throw new DisplayError(ctx.colors.red(`No server found! To run commands the current project must export { deployment: async () => server } from ${root}/server[.js].`));
        }

        throw err;
    }
};

internals.kebabize = (str) => str.replace(/[A-Z]/g, (m) => (`-${m}`).toLowerCase());
internals.camelize = (str) => str.replace(/[_-]./g, (m) => m[1].toUpperCase());
internals.normalizeCommand = (command) => {

    if (typeof command === 'function') {
        return { command };
    }

    return command;
};
