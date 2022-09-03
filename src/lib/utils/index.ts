import fs from "node:fs";

import { AnsiColourEnum, AnsiTextStyleEnum } from "../types";

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
