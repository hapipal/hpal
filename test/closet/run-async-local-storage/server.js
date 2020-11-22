'use strict';

const Hapi = require('@hapi/hapi');
const Toys = require('@hapipal/toys');

exports.deployment = async () => {

    const server = Hapi.server();

    const storage = {};

    server.ext({
        type: 'onPreStart',
        method: () => {

            storage.start = Toys.asyncStorage('@hapipal/hpal');
        }
    });

    server.ext({
        type: 'onPostStop',
        method: () => {

            storage.stop = Toys.asyncStorage('@hapipal/hpal');
        }
    });

    const register = (srv) => {

        srv.expose('commands', {
            default: {
                command: (rootServer, args, root, ctx) => {

                    ctx.options.cmd = storage;
                }
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
