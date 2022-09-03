/*
	TODO:
	1. make sure that if requets rejected because auth cookie has expired,
		then delete saved cookie and throw the appropriate error 
*/

import fs from "node:fs";
import readline from "node:readline";
import { open } from "node:fs/promises";

import { COOKIE_FILE_PATH, CREDENTIALS_FILE_PATH, DUMP_BASE_PATH } from "./lib/constants";
import {
	AnsiColourEnum,
	AnsiTextStyleEnum,
	CommandEnum,
	TCommandActionParams,
	TiMaluumLoginCredentials,
} from "./lib/types";
import { Loader, TTYSync } from "./lib/utils/loader";
import { IMaluumPage, IMaluumSubPage } from "./imaluum";
import { readFromFileSync, styleText, writeToFileSync } from "./lib/utils";
import { ErrorOptions } from "commander";

export class CommandExecutor {
	private imaluum: IMaluumPage | null = null;
	private errorCallback:
		| ((message: string, errorOptions?: ErrorOptions) => never)
		| null = null;

	static async setup(): Promise<CommandExecutor> {
		// create dump dir
		fs.mkdirSync(DUMP_BASE_PATH, { recursive: true });

		const executor = new CommandExecutor();
		executor.imaluum = await IMaluumPage.launch();

		return executor;
	}

	async execute<T extends CommandEnum>(command: T, ...args: any[]) {
		if (command === CommandEnum.Authenticate) {
			await this.authenticate(...args);
		} else {
			try {
				// check if got cookie file
				// if yes, use `loginFromCookie`
				// else, throw error `unauthenticatd` or something
				await this.loginFromCookie();
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
					await this.result(...args);
					break;
				}
				case CommandEnum.Timetable: {
					await this.timetable(...args);
					break;
				}
				case CommandEnum.Test: {
					await this._test(command, ...args);
					break;
				}
				default:
					throw new Error("UNKNOWN COMMAND!");
			}
		}

		await this.imaluum?.close();
	}

	setErrorCallback(fn: typeof this.errorCallback): void {
		this.errorCallback = fn;
	}

	private error(message: string, errorOptions?: ErrorOptions): Error {
		return this.errorCallback
			? this.errorCallback(message, errorOptions)
			: new Error(message);
	}

	async loginFromCookie() {
		const str = await readFromFileSync(COOKIE_FILE_PATH);
		const cookeis = JSON.parse(str);

		await this.imaluum?.page?.setCookie(...cookeis);

		const homePage = "https://imaluum.iium.edu.my/home";
		await this.imaluum?.page?.goto(homePage);

		const currentUrl = this.imaluum?.page?.url();
		if (currentUrl !== homePage)
			throw new Error(`Wrong page. Expected ${homePage} but got ${currentUrl}.`);
	}

	async login() {
		const { username, password } = await this._getSavedCredentials();
		try {
			await this._loginWithUsername(username, password);
		} catch (e) {
			throw e;
		}
	}

	async _loginWithUsername(username: string, password: string) {
		const data = await this.imaluum?.login(username, password);
		// save cookies
		writeToFileSync(COOKIE_FILE_PATH, JSON.stringify(data?.cookies || ""));
	}

	async authenticate(...args: any) {
		try {
			const { username, password }: TiMaluumLoginCredentials =
				await this._authenticate({ options: args[0] });

			writeToFileSync(CREDENTIALS_FILE_PATH, `${username}\n${password}`);

			console.log(
				`🎉 ${styleText(
					"You are authenticated!",
					AnsiColourEnum.GREEN,
					AnsiTextStyleEnum.BOLD
				)}`
			);
		} catch (e) {
			// console.error(e);
			throw e;
		}
	}

	private _authenticate({ options }: TCommandActionParams<CommandEnum.Authenticate>) {
		return new Promise<TiMaluumLoginCredentials>(async (resolve, reject) => {
			const credentials = {
				username: options.username,
				password: options.password,
			};

			try {
				if (options.interactive) {
					const userInputs = await this._promptForUserCredentials();
					credentials.username = userInputs[0];
					credentials.password = userInputs[1];
				}

				if (!credentials.username) throw new Error("Username is missing");
				if (!credentials.password) throw new Error("Password is missing");

				const loader = new Loader("Authenticating to i-Ma'luum");

				await loader.startAsyncTask(
					async () =>
						await this._loginWithUsername(
							credentials.username as string,
							credentials.password as string
						)
				);

				resolve(credentials as TiMaluumLoginCredentials);
			} catch (error) {
				reject(error);
			}
		});
	}

	private async _promptForUserCredentials() {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const prompt = async (query: string) =>
			await new Promise((resolve) => rl.question(query, resolve));

		try {
			const username = (await prompt(
				`${styleText("# Username >> ", AnsiTextStyleEnum.BOLD)}`
			)) as string;

			const password = (await prompt(
				`${styleText("# Password >> ", AnsiTextStyleEnum.BOLD)}`
			)) as string;

			await TTYSync.clearAboveUntilSync(3);

			rl.close();

			return [username, password];
		} catch (error) {
			throw error;
		}
	}

	async result(...args: any[]) {
		if (this.imaluum?.page == null) throw new Error("i-Ma'luum page not running!");

		const resultArgs: TCommandActionParams<CommandEnum.Result> = {
			semester: args[0],
			year: args[1],
			options: args[2],
		};

		const loader = new Loader(
			`Fetching exam result for Sem ${resultArgs.semester} ${resultArgs.year}`
		);

		const output = await loader.startAsyncTask(async () => {
			const resultPage = await this.imaluum?.goToSubPage("RESULT");
			return await this._result(resultPage as IMaluumSubPage, resultArgs);
		});

		this._displayTable(output);
	}

	private _result(
		page: IMaluumSubPage,
		{ semester, year, options }: TCommandActionParams<CommandEnum.Result>
	) {
		return new Promise<string>(async (resolve, reject) => {
			if (semester.match(/^[123]$/) == null)
				throw new Error(
					"Invalid <semester>. <semester> must be in the range of 1 >= semester <= 3."
				);

			if (year.match(/^([\d]*)\/([\d]*)*$/) == null)
				throw new Error(
					"Invalid <year>. Hint: Make sure it is in the format XXXX/XXXX. (e.g. 2021/2022)"
				);

			await page.selectTimetableOrResultDropDownMenuItem(semester, year);

			const filePath = `${DUMP_BASE_PATH}/result_table.html`;
			const tableStr = await page.extractTimetableAndResultTableElement(filePath, {
				width: options.width,
			});

			if (tableStr.length !== 0) resolve(tableStr);
			else reject();
		});
	}

	async timetable(...args: any[]) {
		if (this.imaluum?.page == null) throw new Error("i-Ma'luum page not running!");

		const timetableArgs: TCommandActionParams<CommandEnum.Timetable> = {
			semester: args[0],
			year: args[1],
			options: args[2],
		};

		const loader = new Loader(
			`Fetching timetable for Sem ${timetableArgs.semester} ${timetableArgs.year}`
		);

		const output = await loader.startAsyncTask(async () => {
			const timetablePage = await this.imaluum?.goToSubPage("TIMETABLE");
			return await this._timetable(timetablePage as IMaluumSubPage, timetableArgs);
		});

		this._displayTable(output);
	}

	private async _timetable(
		page: IMaluumSubPage,
		{ semester, year, options }: TCommandActionParams<CommandEnum.Result>
	) {
		return new Promise<string>(async (resolve, reject) => {
			if (semester.match(/^[123]$/) == null) {
				throw new Error(
					"Invalid <semester>. <semester> must be in the range of 1 >= semester <= 3."
				);
			}

			if (year.match(/^([\d]*)\/([\d]*)*$/) == null) {
				throw new Error(
					"Invalid <year>. Hint: Make sure it is in the format XXXX/XXXX. (e.g. 2021/2022)"
				);
			}

			await page.selectTimetableOrResultDropDownMenuItem(semester, year);

			const filePath = `${DUMP_BASE_PATH}/timetable_table.html`;
			const tableStr = await page.extractTimetableAndResultTableElement(filePath, {
				width: options.width,
			});

			if (tableStr.length !== 0) resolve(tableStr);
			else reject();
		});
	}

	private _displayTable(table: string) {
		const firstLine = table.match(/.*\n/);
		const line = "-";

		let tableLen;
		if (firstLine != null) tableLen = firstLine[0]?.length;

		tableLen ? console.log(`${line.repeat(tableLen)}\n`) : null;
		console.log(table);
		tableLen ? console.log(`${line.repeat(tableLen)}\n`) : null;
	}

	private async _getSavedCredentials(): Promise<TiMaluumLoginCredentials> {
		const values = [];

		try {
			const file = await open(CREDENTIALS_FILE_PATH, "as+");
			const fileStream = file.createReadStream({ encoding: "utf8" });

			// taken from https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
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
			throw e;
		}
	}

	private async _test(command: any, ...args: any) {
		console.log("this is a test", command, args);
	}
}
