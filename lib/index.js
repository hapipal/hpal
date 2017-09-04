'use strict';

const Bossy = require('bossy');

const internals = {};

exports.start = (options) => {

    const args = Bossy.parse(internals.definition, {
        argv: options.args
    });

    if (args instanceof Error) {
        console.error(internals.usage());
        return process.exit(1);
    }

    if (args.h) {
        console.log(internals.usage());
        return process.exit(1);
    }

    return null;
};

internals.definition = {
    h: {
        type: 'help',
        alias: 'help',
        description: 'Show help'
    }
};

internals.usage = () => Bossy.usage(internals.definition, 'paldo ???');
