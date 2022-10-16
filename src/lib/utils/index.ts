import fs from "node:fs";

import { AnsiColourEnum, AnsiTextStyleEnum } from "../types";

const HTMLTableToJson = require('html-table-to-json');

export function capitalize(str: string): string {
	const newStr = str.toLowerCase();
	return newStr.replace(/^\w/, newStr.charAt(0).toUpperCase());
}

export function styleText(
	text: string,
	...styles: (AnsiColourEnum | AnsiTextStyleEnum)[]
): string {
	const style: string = "".concat(...styles);
	return `${style}${text}\x1b[0m`;
}

export const writeToFileSync = (path: string, data: string | NodeJS.ArrayBufferView) => {
	const file = fs.openSync(path, "w+");
	fs.writeFileSync(file, data);
	fs.close(file);
};

export const readFromFileSync = (path: string): string => {
	const file = fs.openSync(path, "as+");
	const data = fs.readFileSync(file, { encoding: "utf8" });
	fs.close(file);
	return data;
};

export const parseHTMLTableJson = (tableHTMLString: string): string[][] => {
	const jsonTable = HTMLTableToJson.parse(tableHTMLString).results[0];
	const tableElem: string[][] = [];

	// fetch keys
	tableElem.push(Object.entries(jsonTable[0]).map((entry) => styleText(entry[0], AnsiColourEnum.GREEN, AnsiTextStyleEnum.BOLD)));

	for (let i = 0; i < jsonTable.length; i++) {
		tableElem.push(Object.entries(jsonTable[i]).map((entry) => entry[1] as string));
	}

	return tableElem;
};

