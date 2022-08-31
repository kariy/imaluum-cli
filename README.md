<!-- TODO -->

# i-Ma'luum CLI

<i>Disclaimer : This tool is not associated with IIUM.</i>

Access i-Ma'luum directly from your command line.

## Installation

### Prerequisites

-   Must have npm installed.

```
$ npm install -g imaluum-cli
```

## Features

-   [x] Exam Result <i>(output as `.png` not supported yet)</i>
-   [x] Class Timetable <i>(output as `.png` not supported yet)</i>
-   [ ] Final Exam Schedule

## Usage

```
$ imaluum --help

Usage: imaluum [options] [command]

A tool to access i-Ma'luum directly from your command line.

Options:

  -V, --version                          Output the version number
  -h, --help                             Display help for command

Commands:

  result [options] <semester> <year>     Get your examination result.
  timetable [options] <semester> <year>  Show class timetable for the given semester.
  login                                  Authenticate by providing your username    and password for i-ma'luum
  help [command]                         Display help for command
```
