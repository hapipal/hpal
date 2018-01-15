'use strict';

const Wreck = require('wreck');
const PkgDir = require('pkg-dir');
const Pluralize = require('pluralize');
const Print = require('../print');
const Helpers = require('../helpers');
const DisplayError = require('../display-error');

const internals = {};

module.exports = (cwd, version, query, itemQuery, ctx) => {

    query = query.toLowerCase();

    return PkgDir(cwd)
        .then((root) => {

            version = version || (root && internals.getHapiVersion(root));

            ctx.options.out.write(ctx.colors.grey('Searching docs from ' + (version ? `hapi v${version}` : 'hapi\'s master branch') + '...\n\n'));

            return Promise.all([
                internals.getHapiAPI(version).catch((err) => {

                    if (err.isBoom && err.output.statusCode === 404) {
                        throw new DisplayError(ctx.colors.red('Couldn\'t find docs for that version of hapi. Are you sure it\'s a published version?'));
                    }

                    if (err.syscall === 'getaddrinfo' && err.code === 'ENOTFOUND') {
                        throw new DisplayError(ctx.colors.red('Could not fetch the hapi docs. It seems you may be offline– ensure you have a connection then try again.'));
                    }

                    throw new DisplayError(ctx.colors.red(`Could not fetch the hapi docs: ${err.message}`));
                }),
                root && Helpers.getManifest(root, ctx, true).catch((err) => {

                    // If we can't get the manifest for some reason we're aware of, that's okay
                    if (err instanceof DisplayError) {
                        return null;
                    }

                    throw err;
                })
            ]);
        })
        .then((results) => {

            const api = results[0];
            const manifest = results[1];

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
        });
};


internals.getHapiVersion = (root) => {

    try {
        return require(`${root}/node_modules/hapi/package.json`).version;
    }
    catch (err) {

        if (err.code === 'MODULE_NOT_FOUND') {
            return null;
        }

        throw err;
    }
};

internals.getHapiAPI = (version) => {

    const ref = version ? `v${version}` : 'master';

    return Wreck.get(`https://raw.githubusercontent.com/hapijs/hapi/${ref}/API.md`)
        .then((response) => response.payload.toString());
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
