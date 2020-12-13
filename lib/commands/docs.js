'use strict';

const Wreck = require('@hapi/wreck');
const Bounce = require('@hapi/bounce');
const Somever = require('@hapi/somever');
const PkgDir = require('pkg-dir');
const Pluralize = require('pluralize');
const Print = require('../print');
const Helpers = require('../helpers');
const DisplayError = require('../display-error');

const internals = {};

module.exports = async ({ cwd, pkg, version, query, itemQuery, ctx }) => {

    const root = await PkgDir(cwd);

    if (!version && root && internals.pkgScope[pkg]) {
        version = internals.getPkgVersion(root, `@${internals.pkgScope[pkg]}/${pkg}`);
    }

    if (!version && root) {
        version = internals.getPkgVersion(root, pkg);
    }

    query = query.toLowerCase();

    let parsedVersion;

    try {
        parsedVersion = version && Somever.version(version);
    }
    catch (err) {
        Bounce.rethrow(err, 'system');
    }

    const ref = parsedVersion ? `v${parsedVersion.version}` : (version || 'master');
    const owner = internals.pkgOwners[pkg] || 'hapijs';

    ctx.options.out.write(ctx.colors.grey(`Searching docs from ${owner}/${pkg} @ ${ref}...\n\n`));

    const getAPI = async () => {

        try {
            return await internals.getPkgAPI(owner, pkg, ref);
        }
        catch (err) {
            Bounce.rethrow(err, 'system');

            if (err.isBoom && err.output.statusCode === 404) {
                throw new DisplayError(ctx.colors.red(`Couldn\'t find docs for that version of ${pkg}. Are you sure ${owner}/${pkg} @ ${ref} exists?`));
            }

            if (err.syscall === 'getaddrinfo' && err.code === 'ENOTFOUND') {
                throw new DisplayError(ctx.colors.red(`Could not fetch the ${pkg} docs. It seems you may be offline– ensure you have a connection then try again.`));
            }

            throw new DisplayError(ctx.colors.red(`Could not fetch the ${pkg} docs: ${err.message}`));
        }
    };

    const getAmendments = async () => {

        if (!root) {
            return null;
        }

        try {
            return await Helpers.getAmendments(root, ctx, { amendmentsRequired: false });
        }
        catch (err) {
            // If we can't get the manifest for some reason we're aware of, that's okay
            Bounce.ignore(err, DisplayError);
            return null;
        }
    };

    const [api, hc] = await Promise.all([getAPI(), getAmendments()]);

    const pluralQuery = hc && Pluralize.plural(query);
    const item = hc && (hc.amendments[query] || hc.amendments[pluralQuery]);
    const methodMatch = query.match(/^([a-z\.]+)/);
    const method = methodMatch && methodMatch[1];
    const headingMatchers = ([
        item && typeof item.method === 'string' && `server.${item.method}(`,
        method && `${method}(`,
        (query.length >= 3) && query
    ])
        .filter(Boolean)
        .map((match) => {

            return (section) => {

                if (match[0] === '#') {
                    return internals.anchorize(section)
                        .some((anchor) => anchor.includes(match));
                }

                return section.toLowerCase().includes(match);
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
        const path = require.resolve(`${pkg}/package.json`, { paths: [root] });
        return require(path).version;
    }
    catch (err) {
        Bounce.ignore(err, { code: 'MODULE_NOT_FOUND' });
        return null;
    }
};

internals.getPkgAPI = async (owner, pkg, ref) => {

    const { payload } = await Wreck.get(`https://raw.githubusercontent.com/${owner}/${pkg}/${ref}/API.md`);

    return payload.toString();
};

internals.pkgScope = {
    // hapipal, should mirror section from pkgOwners
    schwifty: 'hapipal',
    schmervice: 'hapipal',
    toys: 'hapipal',
    'haute-couture': 'hapipal',
    hodgepodge: 'hapipal',
    underdog: 'hapipal',
    hecks: 'hapipal',
    lalalambda: 'hapipal',
    avocat: 'hapipal',
    ahem: 'hapipal',
    // hapi
    accept: 'hapi',
    address: 'hapi',
    ammo: 'hapi',
    b64: 'hapi',
    basic: 'hapi',
    bell: 'hapi',
    boom: 'hapi',
    bossy: 'hapi',
    bounce: 'hapi',
    call: 'hapi',
    catbox: 'hapi',
    'catbox-memecached': 'hapi',
    'catbox-memory': 'hapi',
    'catbox-redis': 'hapi',
    code: 'hapi',
    content: 'hapi',
    cookie: 'hapi',
    crumb: 'hapi',
    cryptiles: 'hapi',
    glue: 'hapi',
    good: 'hapi',
    'good-console': 'hapi',
    'good-squeeze': 'hapi',
    h2o2: 'hapi',
    hapi: 'hapi',
    hawk: 'hapi',
    heavy: 'hapi',
    hoek: 'hapi',
    inert: 'hapi',
    iron: 'hapi',
    joi: 'hapi',
    'joi-date': 'hapi',
    lab: 'hapi',
    mimos: 'hapi',
    nes: 'hapi',
    nigel: 'hapi',
    oppsy: 'hapi',
    pez: 'hapi',
    podium: 'hapi',
    scooter: 'hapi',
    shot: 'hapi',
    sntp: 'hapi',
    somever: 'hapi',
    statehood: 'hapi',
    subtext: 'hapi',
    teamwork: 'hapi',
    topo: 'hapi',
    vise: 'hapi',
    vision: 'hapi',
    wreck: 'hapi',
    yar: 'hapi'
};

internals.pkgOwners = {
    // hapipal, should mirror section from pkgScope
    schwifty: 'hapipal',
    schmervice: 'hapipal',
    toys: 'hapipal',
    'haute-couture': 'hapipal',
    hodgepodge: 'hapipal',
    underdog: 'hapipal',
    hecks: 'hapipal',
    lalalambda: 'hapipal',
    avocat: 'hapipal',
    ahem: 'hapipal',
    // sideway
    joi: 'sideway',
    'joi-date': 'sideway'
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
