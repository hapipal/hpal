'use strict';

const Hapi = require('hapi');

exports.deployment = () => {

    const server = new Hapi.Server();

    const pluginX = (srv, options, next) => {

        srv.expose('commands', {
            default: () => null,
            camelCased: () => null,
            described: {
                description: 'This is what I do',
                command: () => null
            }
        });

        return next();
    };

    pluginX.attributes = {
        name: 'x'
    };

    // hpal-prefixed plugin name

    const pluginY = (srv, options, next) => {

        srv.expose('commands', {
            default: () => null,
            camelCased: () => null,
            described: {
                description: 'This is what I do',
                command: () => null
            }
        });

        return next();
    };

    pluginY.attributes = {
        name: 'hpal-y'
    };

    // Exposes something but no commands

    const pluginZ = (srv, options, next) => {

        srv.expose('irrelevant', null);

        return next();
    };

    pluginZ.attributes = {
        name: 'z'
    };

    return server.register([pluginX, pluginY, pluginZ]).then(() => server);
};
