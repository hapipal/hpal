'use strict';

const { Hapi } = require('../../run-util');

exports.deployment = async () => {

    const server = Hapi.server();

    const register = (srv, options) => {

        srv.expose('commands', {
            someCommand: (rootServer, args, root, ctx) => {

                ctx.options.cmd = [rootServer, args, root, ctx];

                const stop = rootServer.stop;
                rootServer.stop = async () => {

                    rootServer.stop = stop;

                    await rootServer.stop();

                    rootServer.stopped = true;
                };

                throw new Error('Something happened');
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
