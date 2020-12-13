# hpal

hapi pal CLI

[![Build Status](https://travis-ci.com/hapipal/hpal.svg?branch=master)](https://travis-ci.com/hapipal/hpal) [![Coverage Status](https://coveralls.io/repos/hapipal/hpal/badge.svg?branch=master&service=github)](https://coveralls.io/github/hapipal/hpal?branch=master)

Lead Maintainer - [Devin Ivy](https://github.com/devinivy)

`hpal` was designed to help you,
  - :sparkles: create new hapi projects from the [pal boilerplate](https://github.com/hapipal/boilerplate)
  - :bouquet: generate files for routes, extensions, [models](https://github.com/hapipal/schwifty), [services](https://github.com/hapipal/schmervice), etc. via [haute-couture](https://github.com/hapipal/haute-couture)
  - :books: search the [hapi docs](https://hapi.dev/api/) from the command line– plus many others such as [joi](https://joi.dev/api/) and [toys](https://hapipal.com/docs/toys)
  - :honeybee: run custom commands defined by your server's hapi plugins

## Installation

It is recommended to install the hpal CLI as a dev dependency within your project, then invoke it using [npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b).

```
npm install --save-dev @hapipal/hpal
npx hpal --help
```

However, if you want to try the hpal CLI right now, just copy and paste this right into your terminal!
```
npx @hapipal/hpal docs --ver 20.0.0 h.response
```

## Usage
> The hpal CLI is intended for use with hapi v19+ and nodejs v12+ (_see v2 for lower support_).

```
Usage: hpal <command> <options>

Commands:

  hpal new <new-project-directory>
    e.g. hpal new ~/node-projects/new-pal-project

  hpal make [--asDir|--asFile] <haute-couture-item> [<item-name>]
    e.g. hpal make route create-user

  hpal docs[:<package-name>] [--ver x.y.z|ref] <docs-section> [<config-item>]
    e.g. hpal docs --ver 20.0.0 h.continue

  hpal run [--list] <cmd> [<cmd-options>]
    e.g. hpal run plugin-name:command-name


Options:

  -h, --help       show usage options
  -v, --version    show version information
  -d, --asDir      [make] creates new haute-couture item in a directory index file
  -f, --asFile     [make] creates new haute-couture item in a file
  -V, --ver        [docs] specifies the version/ref of the API docs to search for the given package
  -l, --list       [run] lists all available commands on your server
```

### Commands
#### `hpal new`
> ```
> hpal new <new-project-directory>
>   e.g. hpal new ~/node-projects/new-pal-project
> ```

Clones the [pal boilerplate](https://github.com/hapipal/boilerplate), helps you fill-in initial details with [`npm init`](https://docs.npmjs.com/cli/init), pulls down the [pal flavors](https://github.com/hapipal/boilerplate#flavors), and leaves you prepared to make the first commit to your new project.

#### `hpal make`
> ```
> hpal make [--asDir|--asFile] <haute-couture-item> [<item-name>]
>   e.g. hpal make route create-user
> ```

Creates a new file for a [haute-couture item](https://hapipal.com/docs/haute-couture#files-and-directories) with details ready to be filled-in.  This is the best way to add a route, plugin, model, service, etc. to any project that uses haute-couture.

Relies on the presence of a [`.hc.js`](https://hapipal.com/docs/haute-couture#specifying-amendments-with-hcjs) file in the project, even if it's empty, in order to determine the base directory of the plugin in which to write the file.  If `.hc.js` contains amendments then those will be respected– in this way you can customize the behavior of `hpal make` per project.  Projects created with [`hpal new`](#hpal-new) are already configured to work with `hpal make`.

The `--asDir` and `--asFile` flags can be used to determine where the file is written.  For a list item like `routes`, specifying `--asFile` (`hpal make route --asFile`) will create `routes.js` rather than `routes/index.js`.  For a single item like `auth/default`, specifying `--asDir` (`hpal make auth/default --asDir`) will create `auth/default/index.js` rather than `auth/default.js`.  When an optional `<item-name>` is specified then that will always place a file in the relevant directory with the name `<item-name>.js`.  For example, `hpal make route create-user` will write the file `routes/create-user.js`.

In order to omit the statement to enable [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) to the top of the generated files (per the hapi style guide), you may specify `exampleUseStrict` as `false` inside the `meta` property of the relevant haute-couture amendment.

#### `hpal docs`
> ```
> hpal docs[:<package-name>] [--ver x.y.z|ref] <docs-section> [<config-item>]
>   e.g. hpal docs --ver 20.0.0 h.continue
> ```

Searches the [hapi API reference](https://hapi.dev/api/) for the relevant section or configuration item then prints it formatted to the console.

:dizzy: This command can also search the API reference for any package within the pal and hapijs ecosystems by specifying `<package-name>`, e.g. [`hpal docs:toys noop`](https://hapipal.com/docs/toys#toysnoop) or [`hpal docs:joi any.strip`](https://joi.dev/api/#anystrip).

`<docs-section>` can be,
 - the name of any haute-couture item (e.g. `route`, `plugins`, `auth/default`) when in a haute-couture project
   - e.g. [`hpal docs auth/scheme`](https://hapi.dev/api/#server.auth.scheme())
 - the name of any server, request, toolkit, etc. method
   - e.g. [`hpal docs request.setUrl`](https://hapi.dev/api/#request.setUrl())
 - a substring of any heading from the docs
   - e.g. [`hpal docs router`](https://hapi.dev/api/#server.options.router)
 - an anchor seen anywhere in the docs
   - e.g. [`hpal docs '#catch-all-route'`](https://hapi.dev/api/#catch-all-route)

When `<config-item>` is also specified, the first list item within the matched `<docs-section>` that matches text from `<config-item>` will be displayed on its own.  For example, `hpal docs request.setUrl` is a long section of the docs but `hpal docs request.setUrl stripTrailingSlash` contains only information relevant to the `stripTrailingSlash` argument.

All searches are case-insensitive.

When `--ver` is specified as a semver version or a git ref (branch, tag, or commit), then that version of the docs will be searched.  Otherwise, when inside a project the docs for the currently installed version of the given package will be searched.  When not in a project and `--ver` is not specified, the master branch of the package's docs will be searched.

#### `hpal run`
> ```
> hpal run [--list] <cmd> [<cmd-options>]
>   e.g. hpal run plugin-name:command-name
> ```

Runs the command `<cmd>` defined by some plugin on your hapi server.  If the plugin `my-plugin` defines a command `do-the-thing`, then that command can be run with `hpal run my-plugin:do-the-thing`.  If the plugin's name is prefixed with `hpal-`, then `hpal-` may be omitted when running the command.  Plugins may also have a "default" command that can be run as `hpal run my-plugin`.

A list of commands available on the server and their descriptions may be viewed with `hpal run --list`.

Upon running a command hpal will initialize the server if it is not already initialized, then stop the server when the command exits successfully.

##### Requirements

In order to use `hpal run`, hpal must be able to find your hapi server.  It will look in `server.js` and `server/index.js` relative to the root of your project.  That file should export a property `deployment` which contains a function that returns a hapi server, or a promise for a hapi server (for example, an `async` function).

If you're using the [pal boilerplate](https://github.com/hapipal/boilerplate) then you should already be all set!

Here is a very basic example,
```js
// server/index.js
const Hapi = require('hapi');
const AppPlugin = require('../app');

exports.deployment = async ({ start } = {}) => {

    const server = Hapi.server();

    await server.register(AppPlugin);

    if (start) {
        await server.start();
    }

    return server;
};

// Start the server only when this file is
// run directly from the CLI, i.e. "node ./server"

if (!module.parent) {
    exports.deployment({ start: true });
}
```

##### Creating your own commands

Any hapi plugin can create commands that are runnable with `hpal run`!  Commands are exposed to hpal using hapi's [`server.expose()`](https://hapi.dev/api/#server.expose()).  Inside your plugin `my-plugin` simply call `server.expose('commands', commands)`, where `commands` is an object,
 - whose keys are command names.  The name `default` is reserved for the command `hpal run my-plugin`.  Camel-cased command names are converted to kebab-case, so if the key is `someCommand` then it is run using `hpal run my-plugin:some-command`.
 - whose values are either objects `{ command, description }` or functions `command` where,
   - `command` - a function with the signature `async function(server, args, root, ctx)`.
     - `server` - the initialized hapi server.
     - `args` - an array of all the command's CLI arguments.  For example, running `hpal run my-plugin --custom-flag value` will result in `args` being `['--custom-flag', 'value']`.
     - `root` - an absolute path to the project's root directory.
     - `ctx` - a context object containing some hpal internals that may be useful during testing, plus some public helpers.  The following are public:
       - `colors` - an object with functions for basic formatting of CLI output with colors and styles: `colors.green(str)`, `colors.yellow(str)`, `colors.red(str)`, `colors.grey(str)`, and `colors.bold(str)`.  When the CLI does not support color, these functions take no effect.
       - `DisplayError` - a class that can be used to indicate a "safe" failure to hpal.  Throwing a `DisplayError` will output the error's `message` and exit the process with code `1`, but not display a stack trace as would happen with an unexpected error.
   - `description` - a string description of the command displayed by `hpal run --list`.  May alternatively be a function with signature `function (ctx)` that receives `ctx` as described above and returns a string description.

For example, here is a plugin that creates a command to display the server's route table,
```js
// hpal run route-table:show

module.exports = {
    name: 'hpal-route-table', // The hpal- prefix is ignored when running the command
    register(server) {

        server.expose('commands', {
            show(srv) {

                console.log('Route table:');

                srv.table().forEach(({ method, path }) => {

                    console.log(`  ${method} ${path}`);
                });
            }
        });
    }
};
```
