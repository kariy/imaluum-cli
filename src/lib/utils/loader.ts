import { Direction, WriteStream } from "node:tty";
import { EventEmitter } from "node:events";

async function sleep(duration: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, duration));
}

export class TTYSync {
	static moveCursorSync(dx: number, dy: number) {
		return new Promise<void>((resolve) => process.stdout.moveCursor(dx, dy, resolve));
	}

	static cursorToSync(x: number, y?: number) {
		return new Promise<void>((resolve) => process.stdout.cursorTo(x, y, resolve));
	}

	static clearLineSync(direction: Direction) {
		return new Promise<void>((resolve) => process.stdout.clearLine(1, resolve));
	}

	// clear number of rows above starting from the current row
	static clearAboveUntilSync(numberOfRowsToDelete: number) {
		return new Promise<void>(async (resolve) => {
			// assume that cursor might not be at the beginning of line
			await this.cursorToSync(0);

			for (let i = 0; i < numberOfRowsToDelete; i++) {
				await this.clearLineSync(1);
				await this.moveCursorSync(0, -1);
			}

			// cursor will always end up on the last deleted row
			await this.moveCursorSync(0, 1);
			resolve();
		});
	}
}

export class Loader {
	private text: string;
	private shouldRun: boolean;
	private eventEmitter: EventEmitter;

	constructor(text: string = "Loading") {
		this.text = text;
		this.shouldRun = false;
		this.eventEmitter = new EventEmitter();
	}

	async start() {
		this.shouldRun = true;

		console.log(this.text);
		await TTYSync.moveCursorSync(this.text.length, -1);

		this.eventEmitter.on("stop", async () => {
			this.shouldRun = false;
		});

		for (let i = 0; this.shouldRun == true; i++) {
			console.log(".".repeat((i % 3) + 1));
			await sleep(300);
			await TTYSync.moveCursorSync(this.text.length, -1);
			await TTYSync.clearLineSync(1);
		}

		await TTYSync.cursorToSync(0);
		await TTYSync.clearLineSync(1);
		this.eventEmitter.emit("animation finish");
	}

	async stop() {
		this.eventEmitter.emit("stop");

		await (() => {
			return new Promise<void>((resolve) =>
				this.eventEmitter.once("animation finish", () => resolve())
			);
		})();
	}

	async startAsyncTask<T>(action: () => Promise<T>): Promise<T> {
		this.start();
		const data = await action();
		await this.stop();
		return data;
	}
}
