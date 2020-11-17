'use strict';

const Hapi = require('@hapi/hapi');

// Here's the bad require
require('does-not-exist');

exports.deployment = () => Hapi.server();
