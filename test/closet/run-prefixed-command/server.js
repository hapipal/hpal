'use strict';

const Hapi = require('hapi');

exports.deployment = () => {

    const server = new Hapi.Server();

    const plugin = (srv, options, next) => {

        srv.expose('commands', {
            someCommand: (cmdSrv, args, root, ctx) => {

                ctx.options.cmd = 'ran';
            }
        });

        return next();
    };

    plugin.attributes = {
        name: 'hpal-x'
    };

    return server.register(plugin).then(() => server);
};
