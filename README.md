# hpal

hapi pal CLI

[![Build Status](https://travis-ci.org/devinivy/hpal.svg?branch=master)](https://travis-ci.org/devinivy/hpal) [![Coverage Status](https://coveralls.io/repos/devinivy/hpal/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/hpal?branch=master)

```
Usage: hpal <command> <options>

Commands:

  hpal new <new-project-directory>
    e.g. hpal new ~/node-projects/new-pal-project

  hpal make [--asDir|--asFile] <haute-couture-item> [<item-name>]
    e.g. hpal make route create-user

  hpal docs [--hapi x.y.z] <docs-section> [<config-item>]
    e.g. hpal docs --hapi 17.2.0 reply.continue


Options:

  -h, --help       display usage options
  -v, --version    version information
  -d, --asDir      [make] creates new haute-couture item in a directory index file.
  -f, --asFile     [make] creates new haute-couture item in a file.
  --hapi           [docs] specifies the version of hapi used when searching the API docs.
```
