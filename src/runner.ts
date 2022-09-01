import puppeteer from "puppeteer";
import { ErrorOptions } from "commander";

import fs from "node:fs";
import cp from "child_process";
import readline from "node:readline";

import {
	CREDENTIALS_FILE_PATH,
	DUMP_BASE_PATH,
	IMALUUM_LOGIN_PAGE,
	IMALUUM_SUBPAGE_LINKS,
} from "./lib/constants";
import {
	CommandEnum,
	TAuthCommandActionParams,
	TCommandActionParams,
	TiMaluumLoginCredentials,
} from "./lib/types";

class IMaluumSite {
	protected browser: puppeteer.Browser | null;
	protected page: puppeteer.Page | null;
	protected errorCallback:
		| ((message: string, errorOptions?: ErrorOptions) => never)
		| null;

	protected constructor() {
		this.browser = null;
		this.page = null;
		this.errorCallback = null;
	}

	protected async _open() {
		this.browser = await puppeteer.launch();
		this.page = await this.browser.newPage();
		fs.mkdirSync(DUMP_BASE_PATH, { recursive: true });
	}

	setErrorCallback(fn: typeof this.errorCallback): void {
		this.errorCallback = fn;
	}

	protected async _close() {
		if (this.browser == null) throw new Error("browser puppeteer not running");
		await this.browser.close();
	}
}

export class IMaluumRunner extends IMaluumSite {
	constructor() {
		super();
	}

	async execute<T extends CommandEnum>(command: T, ...args: any[]) {
		await this._open();

		if (command === CommandEnum.Authenticate) {
			await this._authenticate(...args);
		} else {
			await this._login();

			switch (command) {
				case CommandEnum.Result: {
					await this._result(...args);
					break;
				}
				case CommandEnum.Timetable: {
					await this._timetable(...args);
					break;
				}
				case CommandEnum.Test: {
					await this._test(command, ...args);
					break;
				}
				default:
					throw this.error("[ERROR] Unknown command");
			}
		}

		await this._close();
	}

	private error(message: string, errorOptions?: ErrorOptions): Error {
		return this.errorCallback
			? this.errorCallback(message, errorOptions)
			: new Error(message);
	}

	private async _authenticate(...args: any[]) {
		const { options }: TCommandActionParams<CommandEnum.Authenticate> = {
			options: args[0],
		};

		const writeToFileSync = (path: string, data: any) => {
			const file = fs.openSync(path, "w+");
			fs.writeFileSync(file, JSON.stringify(data));
			fs.close(file);
		};

		const credentials = {
			username: options.username,
			password: options.password,
		};

		if (options.interactive) {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			const prompt = async (query: string) =>
				await new Promise((resolve) => rl.question(query, resolve));

			try {
				credentials.username = (await prompt("# Username >> ")) as string;
				credentials.password = (await prompt("# Password >> ")) as string;
				rl.close();
			} catch (error) {
				throw error;
			}
		} else {
			if (!credentials.username) throw this.error("Username is missing");
			if (!credentials.password) throw this.error("Password is missing");
		}

		try {
			await this._loginToIMaluum(credentials.username, credentials.password);
			writeToFileSync(
				CREDENTIALS_FILE_PATH,
				credentials as TiMaluumLoginCredentials
			);
			console.log("\n🎉 You are authenticated!");
		} catch (e) {
			throw e;
		}
	}

	private async _result(...args: any[]) {
		if (this.page == null) throw new Error("Puppeteer page not running");

		const { semester, year, options }: TCommandActionParams<CommandEnum.Result> = {
			semester: args[0],
			year: args[1],
			options: args[2],
		};

		if (semester.match(/^[123]$/) == null) {
			throw this.error(
				"Invalid <semester>. <semester> must be in the range of 1 >= semester <= 3."
			);
		}
		if (year.match(/^([\d]*)\/([\d]*)*$/) == null) {
			throw this.error(
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

	private async _timetable(...args: any[]) {
		if (this.page == null) throw new Error("Puppeteer page not running");

		const { semester, year, options }: TCommandActionParams<CommandEnum.Result> = {
			semester: args[0],
			year: args[1],
			options: args[2],
		};

		if (semester.match(/^[123]$/) == null) {
			throw this.error(
				"Invalid <semester>. <semester> must be in the range of 1 >= semester <= 3."
			);
		}

		if (year.match(/^([\d]*)\/([\d]*)*$/) == null) {
			throw this.error(
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
			throw this.error(`[ERROR] Result of ${selected.fullStr} does not exist!`);
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

	private async _navigateToPage(link: string) {
		if (this.page == null) throw new Error("Puppeteer page not running");

		await this.page.$eval(`a[href="${link}"]`, (elem) => {
			// @ts-expect-error
			elem.click();
		});

		await this.page.waitForNavigation();
	}

	private async _login() {
		const { username, password }: TiMaluumLoginCredentials =
			this._getSavedCredentials();
		await this._loginToIMaluum(username, password);
	}

	private async _loginToIMaluum(username: string, password: string) {
		if (this.browser == null) throw new Error("browser puppeteer not running");
		if (this.page == null) throw new Error("page puppeteer not running");

		await this.page.goto(IMALUUM_LOGIN_PAGE);

		const usernameInput = await this.page.$("#username");
		await usernameInput?.type(username);

		const passwordInput = await this.page.$("#password");
		await passwordInput?.type(password);

		const form = await this.page.$("#fm1");
		await form?.press("Enter");

		await this.page.waitForNavigation();

		try {
			//  if unable to login, throw error
			if (this.page.url() != "https://imaluum.iium.edu.my/home") {
				throw new Error("Unable to proceed from the login page!");
			}
		} catch (e) {
			throw e;
		}
	}

	private _getSavedCredentials() {
		try {
			const credentialsStr = fs.readFileSync(CREDENTIALS_FILE_PATH, {
				encoding: "utf-8",
			});
			return JSON.parse(credentialsStr);
		} catch (e) {
			throw new Error("file not found");
		}
	}

	private async _test(command: any, ...args: any) {
		console.log("this is a test", command, args);
	}
}
