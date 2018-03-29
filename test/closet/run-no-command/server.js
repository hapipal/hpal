'use strict';

const Hapi = require('hapi');

exports.deployment = () => {

    const server = new Hapi.Server();

    const plugin = (srv, options, next) => {

        srv.expose('irrelevant', null);

        return next();
    };

    plugin.attributes = {
        name: 'y'
    };

    return server.register(plugin).then(() => server);
};
