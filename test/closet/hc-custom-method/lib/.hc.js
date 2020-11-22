'use strict';

module.exports = {
    anywhere: {
        method: Object.assign(() => null, {
            toString: () => 'route' // We want to confirm this doesn't match on "server.route(""
        })
    }
};
