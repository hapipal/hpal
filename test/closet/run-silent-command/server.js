'use strict';

const Hapi = require('hapi');

exports.deployment = async () => {

    const server = Hapi.server();

    const register = (srv, options) => {

        srv.expose('commands', {
            someCommand: {

                // Make hpal silent before and after the command is run
                noDefaultOutput: true,

                command: (cmdSrv, args, root, ctx) => {

                    return Promise.resolve().then(() => {

                        ctx.options.cmd = [cmdSrv, args, root, ctx];

                        const stop = cmdSrv.stop;
                        cmdSrv.stop = () => {

                            cmdSrv.stop = stop;

                            return cmdSrv.stop().then(() => {

                                cmdSrv.stopped = true;
                            });
                        };
                    });
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
