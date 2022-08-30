import commander from 'commander'
import puppeteer from 'puppeteer'

import fs from 'node:fs'
import cp from 'child_process'
import readline from 'node:readline'

const DUMP_BASE_PATH = "./tmp"
const CREDENTIALS_FILE_PATH = `${DUMP_BASE_PATH}/credentials.json`

export type Credentials = {
    username: string,
    password: string
}

export enum Commands { Result, Test }

export type CommandArguments<T extends Commands> = T extends Commands.Result
    ? { semester: string, year: string } : {};

export class Runner {

    program: commander.Command

    private credentials: Credentials | null
    private browser: puppeteer.Browser | null
    private page: puppeteer.Page | null

    constructor(command: commander.Command) {
        this.program = command
        this.browser = null
        this.page = null
        this.credentials = null
    }

    async execute<T extends Commands>(command: T, args: CommandArguments<T>) {
        await this._setup()

        switch (command) {
            case Commands.Result: {
                await this._result(args as CommandArguments<Commands.Result>)
                break;
            }
            case Commands.Test: {
                // await this._test()
                break
            }
            default:
                throw this.program.error("Unknown command")
        }

        await this._finish()
    }

    private async _result({ semester, year }: CommandArguments<Commands.Result>) {
        if (!this.page) throw new Error("Puppeteer page not running")

        if (!semester.match(/[123]/)) {
            throw this.program.error('Invalid <semester>. <semester> must be in the range of 1 >= semester <= 3.')
        }

        if (!year.match(/^([\d]*)\/([\d]*)*$/)) {
            throw this.program.error('Invalid <year>. Hint: Make sure it is in the format XXXX/XXXX. (e.g. 2021/2022)')
        }

        await this.page.$eval('a[href="https://imaluum.iium.edu.my/MyAcademic/result"]', (elem) => {
            // @ts-ignore
            elem.click();
        });

        await this.page.waitForNavigation();

        const yearElems = await this.page.$$('section.content ul.dropdown-menu a')
        const yearString = await this.page.$$eval('section.content ul.dropdown-menu a', (elems) => elems.map(elem => elem.textContent))

        const selected = {
            fullStr: `Sem ${semester}, ${year}`,
            idx: -1
        }

        yearString.find((elem, idx) => elem === selected.fullStr ? selected.idx = idx : null)

        if (selected.idx === -1) {
            throw this.program.error(`[ERROR] Result of ${selected.fullStr} does not exist!`)
        }

        yearElems[selected.idx].evaluate(elem =>
            // @ts-ignore
            elem.click()
        )

        await this.page.waitForNavigation()

        const RESULT_TABLE_PATH = `${DUMP_BASE_PATH}/result_table.html`

        const tableHTML = await this.page.$eval('section.content table', (elem) => elem.outerHTML);
        fs.writeFileSync(RESULT_TABLE_PATH, tableHTML);
        const output = cp.execSync(`links -dump ${RESULT_TABLE_PATH}`, { encoding: 'utf-8' })

        if (output.length !== 0) {
            const match = output.match(/.*\n/);

            if (match) {
                const bar = '-'
                const len = match[0].length
                console.log(`${bar.repeat(len)}\n`)
                console.log(output)
                console.log(`${bar.repeat(len)}`)
            }
        }
    }

    async authenticate() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        const prompt = (query: string) => new Promise((resolve) => rl.question(query, resolve));

        const credentials: Credentials = {
            username: "",
            password: ""
        }

        rl.on('close', () => {
            const file = fs.openSync(CREDENTIALS_FILE_PATH, 'w+')
            fs.writeFileSync(file, JSON.stringify(credentials))
            fs.close(file)
        })

        try {
            const username = await prompt(">> Username\n")
            credentials.username = username as string

            const password = await prompt(">> Password\n")
            credentials.password = password as string

            rl.close()
        } catch (e) {
            throw new Error("Something wrong just happened")
        }
    }

    private async _setup() {
        this.browser = await puppeteer.launch()
        this.page = await this.browser.newPage();
        fs.mkdirSync(DUMP_BASE_PATH, { recursive: true })

        await this._login()
    }

    private async _login() {
        try {
            const credentials = this._readCredentials()
            this.credentials = credentials as Credentials

            if (!this.browser) throw new Error("browser puppeteer not running")

            if (!this.page) throw new Error("page puppeteer not running")

            await this.page.goto('https://cas.iium.edu.my:8448/cas/login?service=https%3a%2f%2fimaluum.iium.edu.my%2fhome');

            const usernameInput = await this.page.$('#username')
            await usernameInput?.type(this.credentials.username)

            const passwordInput = await this.page.$('#password')
            await passwordInput?.type(this.credentials.password)

            const form = await this.page.$("#fm1")
            await form?.press("Enter")

            await this.page.waitForNavigation()

            //  if unable to login, throw error
            if (this.page.url() != 'https://imaluum.iium.edu.my/home') {
                throw new Error("Unable to proceed from login!")
            }
        } catch (e) {
            throw this.program.error("Unable to login to i-ma\'luum! Please run the `login` command to authenticate yourself.")
        }
    }

    private _readCredentials() {
        try {
            const credentialsStr = fs.readFileSync(CREDENTIALS_FILE_PATH, { encoding: "utf-8" })
            return JSON.parse(credentialsStr)
        } catch (e) {
            throw new Error("file not found")
        }
    }

    private async _finish() {
        if (!this.browser) throw new Error("browser puppeteer not running")
        await this.browser.close()
    }
}