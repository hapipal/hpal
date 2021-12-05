import * as Hapi from '@hapi/hapi';

export const deployment = async () => {

    const server = Hapi.server();

    const register = (srv: Hapi.Server) => {

        srv.expose('commands', {
            someCommand: () => {

                console.log('some-command was run!');
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
