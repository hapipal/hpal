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

internals.glob = Pify((pattern, opts, cb) => new Glob.Glob(pattern, opts, cb));

internals.getAmendmentFile = (root, ctx) => {

    return internals.glob('**/.hc.js', { cwd: root, absolute: true, ignore: 'node_modules/**' })
        .then((amendmentFiles) => {

            const cwd = ctx.options.cwd;

            const partIsDotDot = (part) => part === '..';

            const isAncestorPath = (pathA, pathB) => { // A ancestor of B

                const relParts = Path.relative(pathA, pathB).split(Path.sep);

                return !relParts.some(partIsDotDot);
            };

            const isChildPath = (pathA, pathB) => { // A child of B

                const relParts = Path.relative(pathA, pathB).split(Path.sep);

                return relParts.every(partIsDotDot);
            };

            const isAncestorPathOrNoRelation = (pathA, pathB) => isAncestorPath(pathA, pathB) || !isChildPath(pathA, pathB);

            const makeFilename = (path) => Path.resolve(path, '.hc.js');

            const cull = (paths, predicate) => {

                let i = 0;

                while (i < paths.length) {
                    const path = paths[i];
                    paths = paths.filter((p) => p === path || predicate(p, path));
                    i = paths.indexOf(path) + 1;
                }

                if (paths.length > 1) {
                    const relativize = (path) => Path.relative(cwd, path);
                    const filenames = paths.map(makeFilename).map(relativize);
                    throw new DisplayError(ctx.colors.red(`It's ambiguous which directory containing a .hc.js file to use: ${filenames.join(', ')}`));
                }

                return paths[0];
            };

            const amendmentPaths = amendmentFiles.map(Path.dirname);

            // Prefer nearest ancestor...

            const ancestorPaths = amendmentPaths.filter((path) => isAncestorPath(path, cwd));

            if (ancestorPaths.length) {
                return makeFilename(cull(ancestorPaths, isChildPath));
            }

            // ... then nearest (unambiguous) child...

            const childPaths = amendmentPaths.filter((path) => isChildPath(path, cwd));

            if (childPaths.length) {
                return makeFilename(cull(childPaths, isAncestorPathOrNoRelation));
            }

            // ... then any (unambiguous) side-paths!

            if (amendmentPaths.length) {
                return makeFilename(cull(amendmentPaths, isAncestorPathOrNoRelation));
            }

            throw new DisplayError(ctx.colors.red('There\'s no directory in this project containing a .hc.js file.'));
        });
};
