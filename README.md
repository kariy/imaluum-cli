<!-- TODO -->

# <img width="30" src="https://imaluum.iium.edu.my/assets/images/imaluum-icon.png"> <b>i-Ma'luum CLI </b>

<i>Disclaimer : This tool is not associated with the official i-Ma'luum of IIUM.</i>

Access i-Ma'luum directly from your command line.

## 🔧 Installation

### Prerequisites

-   Must have [`Node.js` & `npm`](https://nodejs.org/en/download/package-manager/) installed.

```
$ npm install -g imaluum-cli
```

## ✨ Features

-   [x] Exam Result <i>(output as `.png` not supported yet)</i>
-   [x] Class Timetable <i>(output as `.png` not supported yet)</i>
-   [ ] Final Exam Schedule

## ✏️ Usage

```
$ imaluum --help

Usage: imaluum [options] [command]

A tool to access i-Ma'luum directly from your command line.

Options:

  -V, --version                          output the version number
  -h, --help                             display help for command

Commands:

  result [options] <semester> <year>     Get your examination result.
  timetable [options] <semester> <year>  Show class timetable for the given semester.
  authenticate                           Authenticate to i-Ma'luum.
  help [command]                         display help for command
```
