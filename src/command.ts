import commander from "commander";

import { TCommand, TCommandArgument, TCommandOption } from "./lib/types";

export class Command {
	program: commander.Command;

	constructor(name: string, description: string, version: string) {
		this.program = new commander.Command()
			.name(name)
			.description(description)
			.version(version);
	}

	createCommand(
		command: TCommand,
		action: (...args: any[]) => void | Promise<void> = () => {}
	) {
		const subCommand = new commander.Command()
			.command(command.name)
			.description(command.description);

		this._addOptions(
			this._addArguments(subCommand, command.arguments, command.arguments.length),
			command.options,
			command.options.length
		).action(action);

		this.program.addCommand(subCommand);
	}

	private _addArguments(
		command: commander.Command,
		args: TCommandArgument[],
		len: number
	): commander.Command {
		if (len == 0) return command;

		const currentArg = args[args.length - len];

		return this._addArguments(
			command.argument(
				currentArg.name,
				currentArg.description,
				currentArg.defaultValue
			),
			args,
			len - 1
		);
	}

	private _addOptions(
		command: commander.Command,
		opts: TCommandOption[],
		len: number
	): commander.Command {
		if (len == 0) return command;

		const currentOpt = opts[opts.length - len];

		return this._addOptions(
			command.option(
				currentOpt.flags,
				currentOpt.description,
				currentOpt.defaultValue
			),
			opts,
			len - 1
		);
	}
}
