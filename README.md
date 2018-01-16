# hpal

hapi pal CLI

[![Build Status](https://travis-ci.org/devinivy/hpal.svg?branch=master)](https://travis-ci.org/devinivy/hpal) [![Coverage Status](https://coveralls.io/repos/devinivy/hpal/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/hpal?branch=master)

## Installation
```
npm install -g hpal
```

You may also install hpal locally within a project as a dev dependency and/or invoke it using [npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) (which you probably already have).

If you want to try the hpal CLI right now, just copy and paste this right into your terminal!
```
npx hpal docs --hapi 17.2.0 h.response
```

## Usage
The hapi pal CLI is designed to help you,
  - :sparkles: create new hapi projects from the [pal boilerplate](https://github.com/devinivy/boilerplate-api)
  - :bouquet: generate files for routes, extensions, [models](https://github.com/BigRoomStudios/schwifty), [services](https://github.com/devinivy/schmervice), etc. via [`haute-couture`](https://github.com/devinivy/haute-couture)
  - :books: search the [hapi docs](https://github.com/hapijs/hapi/blob/master/API.md) from the command line

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

#### `hpal make`
> ```
> hpal make [--asDir|--asFile] <haute-couture-item> [<item-name>]
>   e.g. hpal make route create-user
> ```

#### `hpal docs`
> ```
> hpal docs [--hapi x.y.z] <docs-section> [<config-item>]
>   e.g. hpal docs --hapi 17.2.0 h.continue
> ```
