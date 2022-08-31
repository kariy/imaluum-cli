import commander from "commander";
import puppeteer from "puppeteer";

import fs from "node:fs";
import cp from "child_process";
import readline from "node:readline";

import {
	CREDENTIALS_FILE_PATH,
	DUMP_BASE_PATH,
	IMALUUM_SUBPAGE_LINKS,
} from "./lib/constants";
import { CommandEnum, TCommandActionParams, TiMaluumLoginCredentials } from "./lib/types";

export interface Configurations {}

export class Runner {
	program: commander.Command;

	private readonly config: Configurations;
	private credentials: TiMaluumLoginCredentials | null;
	private browser: puppeteer.Browser | null;
	private page: puppeteer.Page | null;

	constructor(command: commander.Command) {
		this.program = command;
		this.browser = null;
		this.page = null;
		this.credentials = null;

		this.config = {};
	}

	async execute<T extends CommandEnum>(command: T, args?: TCommandActionParams<T>) {
		await this._setup();

		switch (command) {
			case CommandEnum.Result: {
				await this._result(args as TCommandActionParams<CommandEnum.Result>);
				break;
			}
			case CommandEnum.Timetable: {
				await this._timetable(
					args as TCommandActionParams<CommandEnum.Timetable>
				);
				break;
			}
			case CommandEnum.Test: {
				// await this._test()
				break;
			}
			default:
				throw this.program.error("[ERROR] Unknown command");
		}

		await this._finish();
	}

	async authenticate() {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const prompt = async (query: string) =>
			await new Promise((resolve) => rl.question(query, resolve));

		const credentials: TiMaluumLoginCredentials = {
			username: "",
			password: "",
		};

		rl.on("close", () => {
			const file = fs.openSync(CREDENTIALS_FILE_PATH, "w+");
			fs.writeFileSync(file, JSON.stringify(credentials));
			fs.close(file);
		});

		try {
			credentials.username = (await prompt(">> Username\n")) as string;
			credentials.password = (await prompt(">> Password\n")) as string;
			rl.close();
		} catch (e) {
			throw new Error("Something wrong just happened");
		}
	}

	private async _result({
		semester,
		year,
		options,
	}: TCommandActionParams<CommandEnum.Result>) {
		if (this.page == null) throw new Error("Puppeteer page not running");

		if (semester.match(/[123]/) == null) {
			throw this.program.error(
				"Invalid <semester>. <semester> must be in the range of 1 >= semester <= 3."
			);
		}

		if (year.match(/^([\d]*)\/([\d]*)*$/) == null) {
			throw this.program.error(
				"Invalid <year>. Hint: Make sure it is in the format XXXX/XXXX. (e.g. 2021/2022)"
			);
		}

		await this._navigateToPage(IMALUUM_SUBPAGE_LINKS.RESULT);

		await this._selectTimetableAndResultDropDownMenuItem(semester, year);

		const RESULT_TABLE_PATH = `${DUMP_BASE_PATH}/result_table.html`;

		const outputStr = await this._extractTimetableAndResultTableElement(
			this.page,
			RESULT_TABLE_PATH,
			{ width: options.width }
		);

		if (outputStr.length !== 0) {
			const match = outputStr.match(/.*\n/);

			if (match != null) {
				const bar = "-";
				const len = match[0].length;
				console.log(`${bar.repeat(len)}\n`);
				console.log(outputStr);
				console.log(`${bar.repeat(len)}`);
			}
		}
	}

	private async _timetable({
		semester,
		year,
		options,
	}: TCommandActionParams<CommandEnum.Timetable>) {
		if (this.page == null) throw new Error("Puppeteer page not running");

		if (semester.match(/[123]/) == null) {
			throw this.program.error(
				"Invalid <semester>. <semester> must be in the range of 1 >= semester <= 3."
			);
		}

		if (year.match(/^([\d]*)\/([\d]*)*$/) == null) {
			throw this.program.error(
				"Invalid <year>. Hint: Make sure it is in the format XXXX/XXXX. (e.g. 2021/2022)"
			);
		}

		await this._navigateToPage(IMALUUM_SUBPAGE_LINKS.TIMETABLE);

		await this._selectTimetableAndResultDropDownMenuItem(semester, year);

		const TIMETABLE_TABLE_PATH = `${DUMP_BASE_PATH}/timetable_table.html`;

		const outputStr = await this._extractTimetableAndResultTableElement(
			this.page,
			TIMETABLE_TABLE_PATH,
			{ width: options.width }
		);

		if (outputStr.length !== 0) {
			const match = outputStr.match(/.*\n/);

			if (match != null) {
				const bar = "-";
				const len = match[0].length;
				console.log(`${bar.repeat(len)}\n`);
				console.log(outputStr);
				console.log(`${bar.repeat(len)}`);
			}
		}
	}

	// default value for `width` is already set through command `--width` option's default value
	private async _extractTimetableAndResultTableElement(
		page: puppeteer.Page,
		file: fs.PathOrFileDescriptor,
		options: { width: string }
	): Promise<string> {
		const tableHTMLString = await page.$eval(
			"section.content table",
			(elem) => elem.outerHTML
		);
		fs.writeFileSync(file, tableHTMLString);
		return cp.execSync(`links -width ${options.width} -dump ${file}`, {
			encoding: "utf-8",
		});
	}

	private async _selectTimetableAndResultDropDownMenuItem(
		semester: string,
		year: string
	) {
		if (this.page == null) throw new Error("Puppeteer page not running");

		const [elemHandles, elemTextContents] = await this._extractDropDownMenuItem(
			this.page
		);

		const selected = {
			fullStr: `Sem ${semester}, ${year}`,
			idx: -1,
		};

		elemTextContents.find((elem, idx) =>
			elem === selected.fullStr ? (selected.idx = idx) : null
		);

		if (selected.idx === -1) {
			throw this.program.error(
				`[ERROR] Result of ${selected.fullStr} does not exist!`
			);
		}

		elemHandles[selected.idx].evaluate((elem) =>
			// @ts-expect-error
			elem.click()
		);

		await this.page.waitForNavigation();
	}

	private async _extractDropDownMenuItem(
		page: puppeteer.Page
	): Promise<[Array<puppeteer.ElementHandle<Element>>, Array<string | null>]> {
		// make a check if dropdown menu elem exist

		const elemHandles = await page.$$("section.content ul.dropdown-menu a");
		const elemTextContent = await page.$$eval(
			"section.content ul.dropdown-menu a",
			(elems) => elems.map((elem) => elem.textContent)
		);
		return [elemHandles, elemTextContent];
	}

	// href="https://imaluum.iium.edu.my/MyAcademic/schedule"
	private async _navigateToPage(link: string) {
		if (this.page == null) throw new Error("Puppeteer page not running");

		await this.page.$eval(`a[href="${link}"]`, (elem) => {
			// @ts-expect-error
			elem.click();
		});

		await this.page.waitForNavigation();
	}

	private async _setup() {
		this.browser = await puppeteer.launch();
		this.page = await this.browser.newPage();
		fs.mkdirSync(DUMP_BASE_PATH, { recursive: true });

		await this._login();
	}

	private async _login() {
		try {
			const credentials = this._readCredentials();
			this.credentials = credentials as TiMaluumLoginCredentials;

			if (this.browser == null) throw new Error("browser puppeteer not running");

			if (this.page == null) throw new Error("page puppeteer not running");

			await this.page.goto(
				"https://cas.iium.edu.my:8448/cas/login?service=https%3a%2f%2fimaluum.iium.edu.my%2fhome"
			);

			const usernameInput = await this.page.$("#username");
			await usernameInput?.type(this.credentials.username);

			const passwordInput = await this.page.$("#password");
			await passwordInput?.type(this.credentials.password);

			const form = await this.page.$("#fm1");
			await form?.press("Enter");

			await this.page.waitForNavigation();

			//  if unable to login, throw error
			if (this.page.url() != "https://imaluum.iium.edu.my/home") {
				throw new Error("Unable to proceed from login!");
			}
		} catch (e) {
			throw this.program.error(
				"Unable to login to i-ma'luum! Please run the `login` command to authenticate yourself."
			);
		}
	}

	private _readCredentials() {
		try {
			const credentialsStr = fs.readFileSync(CREDENTIALS_FILE_PATH, {
				encoding: "utf-8",
			});
			return JSON.parse(credentialsStr);
		} catch (e) {
			throw new Error("file not found");
		}
	}

	private async _finish() {
		if (this.browser == null) throw new Error("browser puppeteer not running");
		await this.browser.close();
	}
}
