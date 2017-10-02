'use strict';

const ChildProcess = require('child_process');
const Path = require('path');
const Stream = require('stream');
const Paldo = require('..');
const DisplayError = require('../lib/display-error');

exports.bin = (argv, cwd) => {

    return new Promise((resolve, reject) => {

        const path = Path.join(__dirname, '..', 'bin', 'paldo');
        const cli = ChildProcess.spawn('node', [].concat(path, argv), { cwd: cwd || __dirname });

        let output = '';
        let errorOutput = '';
        let combinedOutput = '';

        cli.stdout.on('data', (data) => {

            output += data;
            combinedOutput += data;
        });

        cli.stderr.on('data', (data) => {

            errorOutput += data;
            combinedOutput += data;
        });

        cli.once('close', (code, signal) => {

            if (signal) {
                return reject(new Error(`Unexpected signal: ${signal}`));
            }

            return resolve({ output, errorOutput, combinedOutput, code, signal });
        });
    });
};

exports.cli = (argv, cwd) => {

    argv = ['x', 'x'].concat(argv); // [node, script, ...args]

    const stdin = new Stream.PassThrough();
    const stdout = new Stream.PassThrough();
    const stderr = new Stream.PassThrough();

    let output = '';

    stdout.on('data', (data) => {

        output += data;
    });

    const args = {
        argv,
        in: stdin,
        out: stdout,
        err: stderr,
        cwd: cwd ? `${__dirname}/closet/${cwd}` : __dirname
    };

    const cli = Promise.resolve()
        .then(() => Paldo.start(args))
        .then(() => ({ err: null, output, errorOutput: '' }))
        .catch((err) => {

            if (!(err instanceof DisplayError)) {
                err.output = output;
                throw err;
            }

            return { err, output, errorOutput: err.message };
        });

    return Object.assign(cli, { args });
};
