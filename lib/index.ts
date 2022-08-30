import commander from 'commander'
import puppeteer, { ConsoleMessage } from 'puppeteer'
import { writeFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import util from 'node:util'
import cp from 'child_process'

type Credentials = {
    username: string,
    password: string
}

type Commands = 'result' | 'test'

const DUMP_DATA_PATH = './dump'
const CREDENTIALS_FILE_PATH = `${DUMP_DATA_PATH}/credentials.json`

class Runner {

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

    async execute(command: Commands) {
        await this._setup()

        switch (command) {
            case "result": {
                await this._result()
                break;
            }
            case 'test': {
                // await this._test()
                break
            }
            default:
                throw this.program.error("Unknown command")
        }

        await this._finish()
    }

    private async _result() {
        if (!this.page) throw new Error("Puppeteer page not running")

        await this.page.$eval('a[href="https://imaluum.iium.edu.my/MyAcademic/result"]', (elem) => {
            // @ts-ignore
            elem.click();
        });

        await this.page.waitForNavigation();

        const yearElems = await this.page.$$('section.content ul.dropdown-menu a')
        const yearString = await this.page.$$eval('section.content ul.dropdown-menu a', (elems) => elems.map(elem => elem.textContent?.replaceAll(/\s/g, '').replace(/Sem/i, '').replace(',', ':')))

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        const prompt = (query: string) => new Promise((resolve) => rl.question(query, resolve));

        const tenure = await prompt("Specify semester <semester:year> (e.g. 2:2021/2020 ) : ")
        rl.close()
        let selected = 0;

        yearString.find((elem, idx) => {
            if (elem == tenure)
                selected = idx
        })

        yearElems[selected].evaluate(elem =>
            // @ts-ignore
            elem.click()
        )

        await this.page.waitForNavigation()

        const RESULT_TABLE_PATH = `${DUMP_DATA_PATH}/result.html`

        const tableHTML = await this.page.$eval('section.content table', (elem) => elem.outerHTML);
        writeFileSync(RESULT_TABLE_PATH, tableHTML);

        const output = cp.execSync(`links -dump ${RESULT_TABLE_PATH}`, { encoding: 'utf-8' })

        console.log('\n', output)
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
            writeFileSync(CREDENTIALS_FILE_PATH, JSON.stringify(credentials))
        })

        try {
            const username = await prompt(">> Username\n")
            credentials.username = username as string

            const password = await prompt(">> Password\n")
            credentials.password = password as string

            rl.close()
        } catch (e) {
            throw this.program.error("Process terminated")
        }
    }

    private async _setup() {
        this.browser = await puppeteer.launch()
        this.page = await this.browser.newPage();
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
            const credentialsStr = readFileSync(CREDENTIALS_FILE_PATH, { encoding: "utf-8" })
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

export default async () => {

    const program = new commander.Command()
    const runner = new Runner(program)

    runner.program.name('imaluum').description('A tool to access i-ma\'luum directly from your command line.').version('0.0.1')

    runner.program.command("result").description("Get your examination result.").action(async function () {
        await runner.execute('result')
    })

    runner.program.command("login").description("Authenticate by providing your username and password for i-ma\'luum").action(async function () {
        await runner.authenticate()
    })

    runner.program.command('test').action(async function () {
        await runner.execute('test')
    })

    await runner.program.parseAsync()
}
