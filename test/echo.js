'use strict';

const Net = require('net');

exports.stream = () => {

    return new Promise((resolve, reject) => {

        const srv = Net.createServer((sock) => sock.pipe(sock));

        srv.once('error', reject);
        srv.listen(() => {

            const sock = new Net.Socket();

            sock.once('error', reject);
            sock.connect(srv.address().port, () => resolve(sock));
        });
    });
};
