'use strict';

const Hapi = require('hapi');

exports.deployment = async () => {

    const server = Hapi.server();

    const register = (srv, options) => {

        srv.expose('irrelevant', null);
    };

    const plugin = {
        name: 'y',
        register
    };

    await server.register(plugin);

    return server;
};
