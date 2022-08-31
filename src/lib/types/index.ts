export enum CommandEnum {
	Result,
	Timetable,
	Test,
}

export type TCommandOptions = {
	flags: string;
	description: string;
	defaultValue?: string | boolean | string[];
};

export type TCommandArguments = {
	name: string;
	description: string;
	defaultValue?: unknown;
};

export type TCommand = {
	name: string;
	description: string;
	arguments: TCommandArguments[];
	options: TCommandOptions[];
};

export type TCommandCollections = {
	[Property in Lowercase<Exclude<keyof typeof CommandEnum, number>>]: TCommand;
};

export type TCommandActionParams<T extends CommandEnum> = T extends CommandEnum.Result
	? TResultCommandActionParams
	: T extends CommandEnum.Timetable
	? TTimetableCommandActionParams
	: undefined;

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
	[Property in Uppercase<Exclude<keyof typeof CommandEnum, number>>]: string;
};
