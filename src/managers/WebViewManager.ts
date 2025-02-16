import {
	ProgressLocation,
	ViewColumn,
	type WebviewPanel,
	commands,
	window,
} from "vscode";
import { checkRegistrationForReport, isPrimaryWindow } from "../Util";
import { appGet, isResponseOk } from "../http/HttpClient";
import { getConnectionErrorHtml } from "../local/404";

let currentPanel: WebviewPanel | undefined = undefined;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export async function showDashboard(params: any = {}) {
	if (!checkRegistrationForReport(true)) {
		return;
	}
	initiatePanel("Dashboard", "dashboard");
	if (isPrimaryWindow()) {
		window.withProgress(
			{
				location: ProgressLocation.Notification,
				title: "Loading dashboard...",
				cancellable: false,
			},
			async () => {
				loadDashboard(params);
			},
		);
	} else {
		// no need to show the loading notification for secondary windows
		loadDashboard(params);
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
async function loadDashboard(params: any) {
	const html = await getDashboardHtml(params);
	if (currentPanel) {
		currentPanel.webview.html = html;
		currentPanel.reveal(ViewColumn.One);
	}
}

function initiatePanel(title: string, viewType: string) {
	if (currentPanel) {
		// dipose the previous one
		currentPanel.dispose();
	}

	if (!currentPanel) {
		currentPanel = window.createWebviewPanel(viewType, title, ViewColumn.One, {
			enableScripts: true,
		});
		currentPanel.onDidDispose(() => {
			currentPanel = undefined;
		});
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	currentPanel.webview.onDidReceiveMessage(async (message: any) => {
		if (message?.action) {
			const cmd = message.action.includes("codetime.")
				? message.action
				: `codetime.${message.action}`;
			switch (message.command) {
				case "command_execute":
					if (message.payload && Object.keys(message.payload).length) {
						commands.executeCommand(cmd, message.payload);
					} else {
						commands.executeCommand(cmd);
					}
					break;
			}
		}
	});
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
async function getDashboardHtml(params: any) {
	const qryString = new URLSearchParams(params).toString();
	const resp = await appGet(`/plugin/dashboard?${qryString}`);
	if (isResponseOk(resp)) {
		return resp.data.html;
	}
	window.showErrorMessage(
		"Unable to generate dashboard. Please try again later.",
	);
	return await getConnectionErrorHtml();
}
