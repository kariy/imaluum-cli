import { Command } from "./command";
import { IMaluumRunner } from "./runner";
import commandlist from "./lib/commandList";
import { CommandEnum, TCommandCollections } from "./lib/types";

export default async (argv?: readonly string[] | undefined): Promise<void> => {
	const runner = new IMaluumRunner();
	const command = new Command(
		"imaluum",
		"A tool to access i-ma'luum directly from your command line.",
		"0.0.1"
	);

	// This is so that `Runner` class can have access to the `Command` error function
	// throwing a normal error would not allows `Command` to handle it.
	// Somewhat a janky solution, but it should be okay for now.
	runner.setErrorCallback((message) => command.program.error(message));

	for (const item in commandlist) {
		command.createCommand(
			commandlist[item as keyof TCommandCollections],
			async (...args: any[]) => {
				const enumKey = capitalize(item);
				runner.execute(CommandEnum[enumKey as keyof typeof CommandEnum], ...args);
			}
		);
	}
	await command.program.parseAsync(argv);
};

function capitalize(str: string): string {
	const newStr = str.toLowerCase();
	return newStr.replace(/^\w/, newStr.charAt(0).toUpperCase());
}
