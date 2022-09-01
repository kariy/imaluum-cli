export enum CommandEnum {
	Test,
	Result,
	Timetable,
	Authenticate,
}

export type TCommandOption = {
	flags: string;
	description?: string;
	defaultValue?: string | boolean | string[];
};

export type TCommandArgument = {
	name: string;
	description?: string;
	defaultValue?: unknown;
};

type a = keyof typeof CommandEnum;

export type TCommand = {
	name: string;
	description: string;
	arguments: TCommandArgument[];
	options: TCommandOption[];
};

export type TCommandCollections = {
	[Property in Lowercase<keyof typeof CommandEnum>]: TCommand;
};

export type TCommandActionParams<T extends CommandEnum> = T extends CommandEnum.Result
	? TResultCommandActionParams
	: T extends CommandEnum.Timetable
	? TTimetableCommandActionParams
	: T extends CommandEnum.Authenticate
	? TAuthCommandActionParams
	: undefined;

export type TAuthCommandActionParams = {
	options: {
		interactive: string;
		username?: string;
		password?: string;
	};
};

export type TResultCommandActionParams = {
	semester: string;
	year: string;
	options: {
		width: string;
	};
};

export type TTimetableCommandActionParams = TResultCommandActionParams;

export type TiMaluumLoginCredentials = {
	username: string;
	password: string;
};

export type TiMaluumPageLinkCollections = {
	[Property in Uppercase<Exclude<keyof typeof CommandEnum, "Authenticate">>]: string;
};

export enum AnsiTextStyleEnum {
	BOLD = "\x1b[1m",
}

export enum AnsiColourEnum {
	RED = "\x1b[31m",
	GREEN = "\x1b[32m",
	YELLOW = "\x1b[33m",
	BLUE = "\x1b[34m",
	MAGENTA = "\x1b[35m",
	CYAN = "\x1b[36m",
	WHITE = "\x1b[37m",
}
