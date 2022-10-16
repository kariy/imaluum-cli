import puppeteer from "puppeteer";
import { table } from "table";

import fs from "node:fs";
import cp from "child_process";

import {
	IMALUUM_HOME_PAGE,
	IMALUUM_LOGIN_PAGE,
	IMALUUM_SUBPAGE_LINKS,
} from "./lib/constants";
import { capitalize, parseHTMLTableJson } from "./lib/utils";
import { TiMaluumSubPage } from "./lib/types";


class Page {
	browser: puppeteer.Browser | null = null;
	page: puppeteer.Page | null = null;

	protected async _open() {
		this.browser = await puppeteer.launch({
			headless: true,
		});
		this.page = await this.browser.newPage();
	}

	protected async _close() {
		if (this.browser == null)
			throw new Error("Unable to close browser. No browser is running!");
		await this.browser.close();
	}
}

export class IMaluumPage extends Page {
	// static async launch(): Promise<IMaluumPage> {
	// 	const page = await Page.launch();
	// }

	async close() {
		await this._close();
	}

	static async launch() {
		const page = new IMaluumPage();
		await page._open();
		return page;
	}

	async login(
		username: string,
		password: string
	): Promise<{
		response: puppeteer.HTTPResponse | null | undefined;
		cookies: puppeteer.Protocol.Network.Cookie[];
	}> {
		if (!username || !password) throw new Error("User credentials missing!");
		return await this._loginToIMaluum(username, password);
	}

	// this function will always assume that `username` & `password` is not null,
	private async _loginToIMaluum(
		username: string,
		password: string
	): Promise<{
		response: puppeteer.HTTPResponse | null | undefined;
		cookies: puppeteer.Protocol.Network.Cookie[];
	}> {
		await this.goToLoginPage();

		await this.page?.$eval(
			"#username",
			// @ts-ignore
			(node, value) => (node.value = value),
			username
		);

		await this.page?.$eval(
			"#password",
			// @ts-ignore
			(node, value) => (node.value = value),
			password
		);

		const [response] = await Promise.all([
			this.page?.waitForNavigation({
				waitUntil: "networkidle0",
			}),
			this.page?.$eval("#fm1 input.btn-submit", (node) => {
				// @ts-ignore
				node.disabled = false;
				// @ts-ignore
				node.click();
			}),
		]);

		if (response?.status() == 401) {
			const invalidStr = await this.page?.$eval(
				"form#fm1 div.alert.alert-danger span",
				(elem) => elem.textContent
			);

			if (invalidStr == "Invalid credentials.")
				throw new Error("Invalid credentials");
			else throw new Error("Unable to proceed from login page");
		}

		// check that we have landed in the expected page (home page)
		const currentUrl = this.page?.url();

		if (currentUrl !== IMALUUM_HOME_PAGE) {
			console.log("test");
			throw new Error(
				`Wrong page. Expected ${IMALUUM_HOME_PAGE} but got ${currentUrl}.`
			);
		}

		const cookies = (await this.page?.cookies())?.filter((value) => {
			if (value.name == "XSRF-TOKEN" || value.name == "laravel_session")
				return value;
			else if (value.name == "MOD_AUTH_CAS") {
				value.expires = 10000000000;
				value.session = false;
				value.secure = false;
				return value;
			}
		});

		return {
			response,
			cookies: cookies || [],
		};
	}

	private async goToLoginPage() {
		await this.page?.goto(IMALUUM_LOGIN_PAGE, {});
	}

	// should only be used when on domain http://imaluum.iium.edu.my
	async goToSubPage(page: TiMaluumSubPage): Promise<IMaluumSubPage> {
		if (this.page == null) throw new Error("Puppeteer page not running");

		const url = IMALUUM_SUBPAGE_LINKS[page];

		await this.page.$eval(`a[href="${url}"]`, (elem) => {
			// @ts-expect-error
			elem.click();
		});

		await this.page.waitForNavigation();

		const currentUrl = this.page.url();
		if (currentUrl !== url)
			throw new Error(`Wrong page. Expected ${url} but got ${currentUrl}.`);

		return new IMaluumSubPage(this.page, page);
	}
}

export class IMaluumSubPage {
	page: puppeteer.Page;
	type: TiMaluumSubPage;

	constructor(page: puppeteer.Page, type: TiMaluumSubPage) {
		this.page = page;
		this.type = type;
	}

	// `width` the extracted table width
	async extractTableElement(): Promise<string> {
		const tableHTMLString = await this.page?.$eval(
			"section.content table",
			(elem) => elem.outerHTML
		);

		if (this.type == "TIMETABLE")
			return table(parseHTMLTableJson(tableHTMLString));
		else {
			let tableJson = parseHTMLTableJson(tableHTMLString);
			// remove last elem bcs not valid table elem
			// TODO: parse this last elem
			tableJson.pop()
			return table(tableJson);
		}
	}

	async selectTimetableOrResultDropDownMenuItem(semester: string, year: string) {
		const [elemHandles, elemTextContents] = await this._extractDropDownMenuItem();

		const selected = {
			fullStr: `Sem ${semester}, ${year}`,
			idx: -1,
		};

		elemTextContents.find((elem, idx) =>
			elem === selected.fullStr ? (selected.idx = idx) : null
		);

		if (selected.idx === -1)
			throw new Error(
				`[ERROR] ${capitalize(this.type)} for ${selected.fullStr} does not exist!`
			);

		// @ts-ignore
		elemHandles[selected.idx].evaluate((elem) => elem.click());

		await this.page.waitForNavigation();
	}

	private async _extractDropDownMenuItem(): Promise<
		[Array<puppeteer.ElementHandle<Element>>, Array<string | null>]
	> {
		// make a check if dropdown menu elem exist
		const elemHandles = await this.page.$$("section.content ul.dropdown-menu a");
		const elemTextContent = await this.page.$$eval(
			"section.content ul.dropdown-menu a",
			(elems) => elems.map((elem) => elem.textContent)
		);
		return [elemHandles, elemTextContent];
	}
}
