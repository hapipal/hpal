'use strict';

const Hapi = require('@hapi/hapi');

exports.deployment = async () => {

    const server = Hapi.server();

    const register = (srv) => {

        srv.expose('commands', {
            'kebab-cased-command': (cmdSrv, args, root, ctx) => {

                ctx.options.cmd = 'ran';
            }
        });
    };

    const plugin = {
        name: 'x',
        register
    };

    await server.register(plugin);

    return server;
};
