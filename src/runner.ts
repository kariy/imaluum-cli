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
	AnsiColourEnum,
	AnsiTextStyleEnum,
	CommandEnum,
	TCommandActionParams,
	TiMaluumLoginCredentials,
} from "./lib/types";
import { styleText } from "./lib/utils";
import { Loader, TTYSync } from "./lib/utils/loader";

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

	private _setup() {
		// create dump dir
		fs.mkdirSync(DUMP_BASE_PATH, { recursive: true });
		// create credentials file
		const file = fs.openSync(CREDENTIALS_FILE_PATH, "as+");
		fs.writeFileSync(file, "");
		fs.close(file);
	}

	async execute<T extends CommandEnum>(command: T, ...args: any[]) {
		await this._setup();
		await this._open();

		if (command === CommandEnum.Authenticate) {
			await this._authenticate(...args);
		} else {
			try {
				await this._login();
			} catch (e) {
				// console.error(e);
				throw this.error(
					`${styleText(
						"You are not yet authenticated!",
						AnsiColourEnum.RED,
						AnsiTextStyleEnum.BOLD
					)} Please run the ${styleText(
						"authenticate",
						AnsiColourEnum.CYAN
					)} command first.`
				);
			}

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

		const writeToFileSync = (path: string, data: string | NodeJS.ArrayBufferView) => {
			const file = fs.openSync(path, "w+");
			fs.writeFileSync(file, data);
			fs.close(file);
		};

		let username = options.username || "";
		let password = options.password || "";

		if (options.interactive) {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			const prompt = async (query: string) =>
				await new Promise((resolve) => rl.question(query, resolve));

			try {
				username = (await prompt(
					`${styleText("# Username >> ", AnsiTextStyleEnum.BOLD)}`
				)) as string;

				password = (await prompt(
					`${styleText("# Password >> ", AnsiTextStyleEnum.BOLD)}`
				)) as string;

				await TTYSync.clearAboveUntilSync(3);

				rl.close();
			} catch (error) {
				throw error;
			}
		}

		if (!username) throw this.error("Username is missing");
		if (!password) throw this.error("Password is missing");

		try {
			const loader = new Loader("Authenticating to i-Ma'luum");

			await loader.startAsyncTask(
				async () => await this._loginToIMaluum(username, password)
			);

			writeToFileSync(CREDENTIALS_FILE_PATH, `${username}\n${password}`);
			console.log("🎉 You are authenticated!");
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

		const loader = new Loader(`Fetching exam result for Sem ${semester} ${year}`);

		const outputStr = await loader.startAsyncTask(async () => {
			await this._navigateToPage(IMALUUM_SUBPAGE_LINKS.RESULT);
			await this._selectTimetableAndResultDropDownMenuItem(semester, year);

			const RESULT_TABLE_PATH = `${DUMP_BASE_PATH}/result_table.html`;

			return await this._extractTimetableAndResultTableElement(
				this.page as puppeteer.Page,
				RESULT_TABLE_PATH,
				{ width: options.width }
			);
		});

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

		const loader = new Loader(`Fetching timetable for Sem ${semester} ${year}`);

		const tableStr = await loader.startAsyncTask(async () => {
			await this._navigateToPage(IMALUUM_SUBPAGE_LINKS.TIMETABLE);

			await this._selectTimetableAndResultDropDownMenuItem(semester, year);

			const TIMETABLE_TABLE_PATH = `${DUMP_BASE_PATH}/timetable_table.html`;

			return await this._extractTimetableAndResultTableElement(
				this.page as puppeteer.Page,
				TIMETABLE_TABLE_PATH,
				{ width: options.width }
			);
		});

		if (tableStr.length !== 0) {
			const match = tableStr.match(/.*\n/);

			if (match != null) {
				const bar = "-";
				const len = match[0].length;
				console.log(`${bar.repeat(len)}\n`);
				console.log(tableStr);
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
			await this._getSavedCredentials();

		// if (username && password) throw new Error("Unable to fetch login credentials.");

		await this._loginToIMaluum(username, password);
	}

	private async _loginToIMaluum(username: string, password: string) {
		if (this.browser == null) throw new Error("browser puppeteer not running");
		if (this.page == null) throw new Error("page puppeteer not running");

		// if (!username) throw new Error("Username is missing");
		// if (!password) throw new Error("Password is missing");

		await this.page.goto(IMALUUM_LOGIN_PAGE);

		const usernameInput = await this.page.$("#username");
		await usernameInput?.type(username);

		const passwordInput = await this.page.$("#password");
		await passwordInput?.type(password);

		const form = await this.page.$("#fm1");
		await form?.press("Enter");

		await this.page.waitForNavigation();

		//  if unable to login, throw error
		if (this.page.url() != "https://imaluum.iium.edu.my/home") {
			const invalidStr = await this.page.$eval(
				"form#fm1 div.alert.alert-danger span",
				(elem) => elem.textContent
			);

			if (invalidStr)
				throw this.error(
					`⛔️ ${styleText(
						invalidStr,
						AnsiColourEnum.RED,
						AnsiTextStyleEnum.BOLD
					)}`
				);
			else throw new Error("‼️ Unable to proceed from login page");
		}
	}

	private async _getSavedCredentials(): Promise<TiMaluumLoginCredentials> {
		const values = [];

		try {
			// taken from https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
			const fileStream = fs.createReadStream(CREDENTIALS_FILE_PATH);

			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity,
			});
			// Note: we use the crlfDelay option to recognize all instances of CR LF
			// ('\r\n') in input.txt as a single line break.

			for await (const line of rl) {
				// Each line in input.txt will be successively available here as `line`.
				// console.log(`Line from file: ${line}`);
				values.push(line);
			}

			return {
				username: values[0],
				password: values[1],
			};
		} catch (e) {
			console.error(e);
			throw new Error("Unable to fetch credentials!");
		}
	}

	private async _test(command: any, ...args: any) {
		console.log("this is a test", command, args);
	}
}
