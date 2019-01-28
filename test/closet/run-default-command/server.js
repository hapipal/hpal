'use strict';

const Hapi = require('hapi');

exports.deployment = async () => {

    const server = Hapi.server();

    const register = (srv, options) => {

        srv.expose('commands', {
            default: (cmdSrv, args, root, ctx) => {

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
