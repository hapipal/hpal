# paldo

hapi pal CLI

[![Build Status](https://travis-ci.org/devinivy/paldo.svg?branch=master)](https://travis-ci.org/devinivy/paldo) [![Coverage Status](https://coveralls.io/repos/devinivy/paldo/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/paldo?branch=master)

```
Usage: paldo <command> <options>

Commands:

  paldo new <new-project-directory>
    e.g. paldo new ~/node-projects/new-pal-project

  paldo make [--asDir|--asFile] <haute-couture-item> [<item-name>]
    e.g. paldo make route create-user

  paldo docs [--hapi x.y.z] <docs-section> [<config-item>]
    e.g. paldo docs --hapi 16.0.0 reply.continue


Options:

  -h, --help       display usage options
  -v, --version    version information
  -d, --asDir      [make] creates new haute-couture item in a directory index file.
  -f, --asFile     [make] creates new haute-couture item in a file.
  --hapi           [docs] specifies the version of hapi used when searching the API docs.
```
