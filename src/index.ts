import { Command } from "./command";
import { capitalize } from "./lib/utils";
import { CommandExecutor } from "./runner";
import commandlist from "./lib/commandList";
import { CommandEnum, TCommandCollections } from "./lib/types";

export default async (argv?: readonly string[] | undefined): Promise<void> => {
	const runner = await CommandExecutor.setup();
	const command = new Command(
		"imaluum",
		"A tool to access i-Ma'luum directly from your command line.",
		require("../package.json").version
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
