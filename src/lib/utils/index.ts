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
