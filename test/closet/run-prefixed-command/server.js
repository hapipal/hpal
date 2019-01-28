'use strict';

const Hapi = require('hapi');

exports.deployment = async () => {

    const server = Hapi.server();

    const register = (srv, options) => {

        srv.expose('commands', {
            someCommand: (cmdSrv, args, root, ctx) => {

                ctx.options.cmd = 'ran';
            }
        });
    };

    const plugin = {
        name: 'hpal-x',
        register
    };

    await server.register(plugin);

    return server;
};
