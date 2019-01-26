'use strict';

const Wreck = require('wreck');
const PkgDir = require('pkg-dir');
const Pluralize = require('pluralize');
const Semver = require('semver');
const Print = require('../print');
const Helpers = require('../helpers');
const DisplayError = require('../display-error');

const internals = {};

module.exports = async (cwd, pkg, version, query, itemQuery, ctx) => {

    const root = await PkgDir(cwd);

    version = version || (root && internals.getPkgVersion(root, pkg));
    query = query.toLowerCase();

    const ref = Semver.valid(version) ? `v${version}` : (version || 'master');
    const owner = internals.pkgOwners[pkg] || 'hapijs';

    ctx.options.out.write(ctx.colors.grey(`Searching docs from ${owner}/${pkg} @ ${ref}...\n\n`));

    const getAPI = async () => {

        try {
            return await internals.getPkgAPI(owner, pkg, ref);
        }
        catch (err) {
            if (err.isBoom && err.output.statusCode === 404) {
                throw new DisplayError(ctx.colors.red(`Couldn\'t find docs for that version of ${pkg}. Are you sure ${owner}/${pkg} @ ${ref} exists?`));
            }

            if (err.syscall === 'getaddrinfo' && err.code === 'ENOTFOUND') {
                throw new DisplayError(ctx.colors.red(`Could not fetch the ${pkg} docs. It seems you may be offline– ensure you have a connection then try again.`));
            }

            throw new DisplayError(ctx.colors.red(`Could not fetch the ${pkg} docs: ${err.message}`));
        }
    };

    const getManifest = async () => {

        if (!root) {
            return null;
        }

        try {
            return await Helpers.getManifest(root, ctx, true);
        }
        catch (err) {
            // If we can't get the manifest for some reason we're aware of, that's okay
            if (err instanceof DisplayError) {
                return null;
            }

            throw err;
        }
    };

    const [api, manifest] = await Promise.all([getAPI(), getManifest()]);

    const pluralQuery = manifest && Pluralize.plural(query);
    const item = manifest && (manifest.find((m) => m.place === query) || manifest.find((m) => m.place === pluralQuery));
    const methodMatch = query.match(/^([a-z\.]+)/);
    const method = methodMatch && methodMatch[1];
    const headingMatchers = ([
        item && `server.${item.method}(`,
        method && `${method}(`,
        (query.length >= 3) && query
    ])
        .filter((x) => !!x)
        .map((match) => {

            return (section) => {

                if (match[0] === '#') {
                    return internals.anchorize(section)
                        .some((anchor) => ~anchor.indexOf(match));
                }

                return ~section.toLowerCase().indexOf(match);
            };
        });

    if (!itemQuery) {
        return Print.markdownSection(api, headingMatchers);
    }

    const itemQueryEsc = internals.regEscape(itemQuery);
    const itemRegExp = new RegExp(`^\s*\`?${itemQueryEsc}\`? -`, 'i');
    const listItemMatcher = (listItem) => itemRegExp.test(listItem);

    return Print.markdownListItem(api, headingMatchers, listItemMatcher);
};


internals.getPkgVersion = (root, pkg) => {

    try {
        // In node v8.9+ will be able to use require.resolve()'s { paths } option
        return require(`${root}/node_modules/${pkg}/package.json`).version;
    }
    catch (err) {

        if (err.code === 'MODULE_NOT_FOUND') {
            return null;
        }

        throw err;
    }
};

internals.getPkgAPI = async (owner, pkg, ref) => {

    const { payload } = await Wreck.get(`https://raw.githubusercontent.com/${owner}/${pkg}/${ref}/API.md`);

    return payload.toString();
};

internals.pkgOwners = {
    schwifty: 'hapipal',
    schmervice: 'hapipal',
    toys: 'hapipal',
    hodgepodge: 'hapipal',
    'haute-couture': 'hapipal',
    hodgepodge: 'hapipal',
    underdog: 'hapipal',
    hecks: 'hapipal'
};

internals.anchorize = (str) => {

    str = str.toLowerCase();

    const anchors = [];
    const tag = str.match(Print.headingAnchorTagRegex);

    if (tag) {
        str = str.replace(tag[0], '-');
        anchors.push(`#${tag[1]}`);
    }

    anchors.push('#' + str.replace(/[^a-z0-9\s-]/ig, '').trim().replace(/\s/g, '-'));

    return anchors;
};

internals.regEscape = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
