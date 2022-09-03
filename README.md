# <img width="30" src="https://imaluum.iium.edu.my/assets/images/imaluum-icon.png"> <b>i-Ma'luum CLI (In progress)</b>

Access i-Ma'luum directly from your command line.

## 🛠 Installation

### Prerequisites

-   Must have [`Node.js` & `npm`](https://nodejs.org/en/download/package-manager/) installed.

To install, just do :

```
$ npm install -g imaluum-cli
```

## ✨ Features

Features are rather limited at the moment as there is only so much that you can do on i-Ma'luum from a command line but features that most people would often use are available right now. (<i>or to be implemented</i>)

-   [x] Exam Result
-   [x] Class Timetable
-   [ ] Final Exam Schedule
-   [ ] Co-Curricular Information

## 🕹 Usage

```
$ imaluum

Usage: imaluum [options] [command]

A tool to access i-Ma'luum directly from your command line.

Options:

  -V, --version                          output the version number
  -h, --help                             display help for command

Commands:

  result [options] <semester> <year>     Get your examination result.
  timetable [options] <semester> <year>  Show class timetable for the given semester.
  authenticate [options]                 Authenticate to i-Ma'luum site.
  help [command]                         display help for command
```

## 📝 Todo

-   [ ] Add support to output as image `.png` for exam result, class, & exam timetable. 📷
-   [ ] Add more colours. 🎨
-   [ ] Add loader. 🔁
-   [ ] Better error handling. 🚫
-   [ ] Make it run faster (idk how). ⚡

## 📣 Disclaimer

<i>This tool is not associated with the official i-Ma'luum of IIUM.</i>
