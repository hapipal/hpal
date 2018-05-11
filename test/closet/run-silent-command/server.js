'use strict';

const Hapi = require('hapi');

exports.deployment = () => {

    const server = new Hapi.Server();

    const plugin = (srv, options, next) => {

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

        return next();
    };

    plugin.attributes = {
        name: 'x'
    };

    return server.register(plugin).then(() => server);
};
