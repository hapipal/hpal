# hpal

hapi pal CLI

[![Build Status](https://travis-ci.org/devinivy/hpal.svg?branch=master)](https://travis-ci.org/devinivy/hpal) [![Coverage Status](https://coveralls.io/repos/devinivy/hpal/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/hpal?branch=master)

`hpal` was designed to help you,
  - :sparkles: create new hapi projects from the [pal boilerplate](https://github.com/devinivy/boilerplate-api)
  - :bouquet: generate files for routes, extensions, [models](https://github.com/BigRoomStudios/schwifty), [services](https://github.com/devinivy/schmervice), etc. via [`haute-couture`](https://github.com/devinivy/haute-couture)
  - :books: search the [hapi docs](https://github.com/hapijs/hapi/blob/master/API.md) from the command line


## Installation
```
npm install -g hpal
```

You may also install hpal locally within a project as a dev dependency and/or invoke it using [npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) (which you probably already have installed).

If you want to try the hpal CLI right now, just copy and paste this right into your terminal!
```
npx hpal docs --hapi 17.2.0 h.response
```

## Usage
```
Usage: hpal <command> <options>

Commands:

  hpal new <new-project-directory>
    e.g. hpal new ~/node-projects/new-pal-project

  hpal make [--asDir|--asFile] <haute-couture-item> [<item-name>]
    e.g. hpal make route create-user

  hpal docs [--hapi x.y.z] <docs-section> [<config-item>]
    e.g. hpal docs --hapi 17.2.0 h.continue


Options:

  -h, --help       display usage options
  -v, --version    version information
  -d, --asDir      [make] creates new haute-couture item in a directory index file.
  -f, --asFile     [make] creates new haute-couture item in a file.
  --hapi           [docs] specifies the version of hapi used when searching the API docs.
```

### Commands
#### `hpal new`
> ```
> hpal new <new-project-directory>
>   e.g. hpal new ~/node-projects/new-pal-project
> ```

Clones the [pal boilerplate](https://github.com/devinivy/boilerplate-api), helps you fill-in initial details with [`npm init`](https://docs.npmjs.com/cli/init), pulls down the [pal flavors](https://github.com/devinivy/boilerplate-api#flavors), and leaves you prepared to make the first commit to your new project.

#### `hpal make`
> ```
> hpal make [--asDir|--asFile] <haute-couture-item> [<item-name>]
>   e.g. hpal make route create-user
> ```

Creates a new file for a [`haute-couture` item](https://github.com/devinivy/haute-couture/blob/master/API.md#files-and-directories) with details ready to be filled-in.  This is the best way to add a route, plugin, model, service, etc. to any project that uses haute-couture.

Relies on the presence of a [`.hc.js`](https://github.com/devinivy/haute-couture/blob/master/API.md#specifying-amendments-with-hcjs) file in the project, even if it's empty, in order to determine the base directory of the plugin in which to write the file.  If `.hc.js` contains amendments then those will be respected– in this way you can customize the behavior of `hpal make` per project.  Projects created with [`hpal new`](#hpal-new) are already configured to work with `hpal make`.

The `--asDir` and `--asFile` flags can be used to determine where the file is written.  For a list item like `routes`, specifying `--asFile` (`hpal make route --asFile`) will create `routes.js` rather than `routes/index.js`.  For a single item like `auth/default`, specifying `--asDir` (`hpal make auth/default --asDir`) will create `auth/default/index.js` rather than `auth/default.js`.  When an optional `<item-name>` is specified then that will always place a file in the relevant directory with the name `<item-name>.js`.  For example, `hpal make route create-user` will write the file `routes/create-user.js`.

#### `hpal docs`
> ```
> hpal docs [--hapi x.y.z] <docs-section> [<config-item>]
>   e.g. hpal docs --hapi 17.2.0 h.continue
> ```

Searches the [hapi API reference](https://github.com/hapijs/hapi/blob/master/API.md) for the relevant section or configuration item then prints it formatted to the console.

`<docs-section>` can be,
 - the name of any haute-couture item (e.g. `route`, `plugins`, `auth/default`) when in a haute-couture project
   - e.g. `hpal docs auth/scheme`
 - the name of any server, request, toolkit, etc. method
   - e.g. `hpal docs request.setUrl`
 - a substring of any heading from the docs
   - e.g. `hpal docs router`
 - an anchor seen anywhere in the docs
   - e.g. `hpal docs '#catch-all-route'`

When `<config-item>` is also specified, the first list item within the matched `<docs-section>` that matches text from `<config-item>` will be displayed on its own.  For example, `hpal docs request.setUrl` is a long section of the docs but `hpal docs request.setUrl stripTrailingSlash` contains only information relevant to the `stripTrailingSlash` argument.

All searches are case-insensitive.

When `--hapi` is specified as a valid semver version, that version of the hapi docs will be searched.  Otherwise, when inside a hapi project the docs for the currently installed version of hapi will be searched.  When not in a project and `--hapi` is not specified, the master branch of the docs will be searched.
