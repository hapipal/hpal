'use strict';

const Fs = require('fs');
const Path = require('path');
const ChildProcess = require('child_process');
const Pify = require('pify');
const Mkdirp = require('mkdirp');
const Glob = require('glob');
const DisplayError = require('./display-error');

const internals = {};


// Lazy, so can be patched for tests
exports.exec = (cmd, opts) => Pify(ChildProcess.exec)(cmd, opts);

// Lazy, so can be patched for tests
exports.writeFile = (filepath, contents, opts) => Pify(Fs.writeFile)(filepath, contents, opts);

// Lazy, so can be patched for tests
exports.readFile = (filepath) => Pify(Fs.readFile)(filepath);

exports.mkdirp = Pify(Mkdirp);

exports.getManifest = (root, ctx, amendmentsNotRequired) => {

    let HauteCouture;

    return Promise.resolve()
        .then(() => {

            // Fail early to avoid getAmendmentFile(), which can be expensive (globbing)
            HauteCouture = internals.getHauteCouture(root, ctx);

            return internals.getAmendmentFile(root, ctx).catch((err) => {

                if (!amendmentsNotRequired || !(err instanceof DisplayError)) {
                    throw err;
                }

                return null;
            });
        })
        .then((amendmentFile) => {

            const amendments = (amendmentFile !== null) ? require(amendmentFile) : [];
            const manifest = HauteCouture.manifest.create(amendments, true);
            manifest.file = amendmentFile;

            return manifest;
        });
};

internals.getHauteCouture = (root, ctx) => {

    try {
        return require(`${root}/node_modules/haute-couture`);
    }
    catch (err) {

        if (err.code === 'MODULE_NOT_FOUND') {
            throw new DisplayError(ctx.colors.red('Couldn\'t find the haute-couture package in this project. It may just need to be installed.'));
        }

        throw err;
    }
};

internals.getAmendmentFile = (root, ctx) => {

    return internals.getProjectFile('.hc.js', ctx.options.cwd, ctx)
        .then((amendmentFile) => {

            if (amendmentFile === null && root !== ctx.options.cwd) {
                return internals.getProjectFile('.hc.js', root, ctx);
            }

            return amendmentFile;
        })
        .then((amendmentFile) => {

            if (amendmentFile === null) {
                throw new DisplayError(ctx.colors.red('There\'s no directory in this project containing a .hc.js file.'));
            }

            return amendmentFile;
        });
};

internals.getProjectFile = (projectFilename, basedir, ctx) => {

    return internals.glob(`**/${projectFilename}`, { cwd: basedir, absolute: true, ignore: 'node_modules/**' })
        .then((amendmentFiles) => {

            if (!amendmentFiles.length) {
                return null;
            }

            const depth = (filename) => filename.split(Path.sep).length;
            const amendmentFileDepths = amendmentFiles.map(depth);
            const amendmentFileMinDepth = [].concat(amendmentFileDepths).sort()[0];
            const minDepthAmendmentFiles = amendmentFiles.filter((filename, i) => {

                return amendmentFileDepths[i] === amendmentFileMinDepth;
            });

            if (minDepthAmendmentFiles.length > 1) {
                const relativize = (dir) => Path.relative(ctx.options.cwd, dir);
                throw new DisplayError(ctx.colors.red(`It's ambiguous which directory containing a .hc.js file to use: ${minDepthAmendmentFiles.map(relativize).join(', ')}`));
            }

            return minDepthAmendmentFiles[0];
        });
};

internals.glob = Pify(Glob);
