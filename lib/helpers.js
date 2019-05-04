'use strict';

const Fs = require('fs');
const Path = require('path');
const Util = require('util');
const ChildProcess = require('child_process');
const Mkdirp = require('mkdirp');
const Bounce = require('@hapi/bounce');
const Glob = require('glob');
const DisplayError = require('./display-error');

const internals = {};


// Lazy, so can be patched for tests
exports.exec = (cmd, opts) => Util.promisify(ChildProcess.exec)(cmd, opts);

// Lazy, so can be patched for tests
exports.writeFile = (filepath, contents, opts) => Util.promisify(Fs.writeFile)(filepath, contents, opts);

// Lazy, so can be patched for tests
exports.readFile = (filepath) => Util.promisify(Fs.readFile)(filepath);

exports.mkdirp = Util.promisify(Mkdirp);

exports.getManifest = async (root, ctx, amendmentsNotRequired) => {

    // Fail early to avoid getAmendmentFile(), which can be expensive (globbing)
    const hc = internals.getHauteCouture(root, ctx);

    let amendmentFile;

    try {
        amendmentFile = await internals.getAmendmentFile(root, ctx);
    }
    catch (err) {

        Bounce.ignore(err, DisplayError);

        if (!amendmentsNotRequired) {
            throw err;
        }

        amendmentFile = null;
    }

    const amendments = (amendmentFile !== null) ? require(amendmentFile) : [];
    const manifest = hc.manifest.create(amendments, true);
    manifest.file = amendmentFile;

    return manifest;
};

internals.getHauteCouture = (root, { colors }) => {

    try {
        return require(`${root}/node_modules/haute-couture`);
    }
    catch (err) {

        if (err.code === 'MODULE_NOT_FOUND') {
            throw new DisplayError(colors.red('Couldn\'t find the haute-couture package in this project. It may just need to be installed.'));
        }

        throw err;
    }
};

internals.glob = Util.promisify((pattern, opts, cb) => new Glob.Glob(pattern, opts, cb));

internals.getAmendmentFile = async (root, ctx) => {

    const { colors, options: { cwd } } = ctx;

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
            throw new DisplayError(colors.red(`It's ambiguous which directory containing a .hc.js file to use: ${filenames.join(', ')}`));
        }

        return paths[0];
    };

    const amendmentFiles = await internals.glob('**/.hc.js', {
        cwd: root,
        absolute: true,
        ignore: 'node_modules/**'
    });

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

    throw new DisplayError(colors.red('There\'s no directory in this project containing a .hc.js file.'));
};
