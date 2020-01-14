'use strict';

const { Hapi } = require('../../run-util');

// Here's the bad require
require('does-not-exist');

exports.deployment = () => Hapi.server();
