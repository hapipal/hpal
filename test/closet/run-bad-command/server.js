'use strict';

const Hapi = require('hapi');

exports.deployment = () => {

    const server = new Hapi.Server();

    const plugin = (srv, options, next) => {

        srv.expose('commands', {
            'bad-command': {}
        });

        return next();
    };

    plugin.attributes = {
        name: 'x'
    };

    return server.register(plugin).then(() => server);
};
