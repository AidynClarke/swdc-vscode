import { ProgressLocation, window } from "vscode";

export class ProgressManager {
	private static instance: ProgressManager;

	public doneWriting = true;

	static getInstance(): ProgressManager {
		if (!ProgressManager.instance) {
			ProgressManager.instance = new ProgressManager();
		}

		return ProgressManager.instance;
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function progressIt(msg: string, asyncFunc: any, args: any[] = []) {
	window.withProgress(
		{
			location: ProgressLocation.Notification,
			title: msg,
			cancellable: false,
		},
		async (progress) => {
			if (typeof asyncFunc === "function") {
				if (args?.length) {
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					await asyncFunc(...args).catch((e: any) => {});
				} else {
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					await asyncFunc().catch((e: any) => {});
				}
			} else {
				await asyncFunc;
			}
		},
	);
}
