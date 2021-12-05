import * as Hapi from '@hapi/hapi';

export const deployment = async () => {

    const server = Hapi.server();

    const register = (srv) => {

        srv.expose('commands', {
            someCommand: (rootServer, args, root, ctx) => {

                ctx.options.cmd = [rootServer, args, root, ctx];

                const stop = rootServer.stop;
                rootServer.stop = async () => {

                    rootServer.stop = stop;

                    await rootServer.stop();

                    rootServer.stopped = true;
                };
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
