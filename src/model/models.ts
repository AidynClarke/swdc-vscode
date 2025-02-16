import { TreeItemCollapsibleState } from "vscode";
import { getOs, getPluginId, getVersion } from "../Util";

export enum UIInteractionType {
	Keyboard = "keyboard",
	Click = "click",
}

export class KpmItem {
	id = "";
	label = "";
	description: string | null = "";
	value = "";
	tooltip = "";
	command = "";
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	commandArgs: any[] = [];
	type = "";
	contextValue = "";
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	callback: any = null;
	icon: string | null = null;
	children: KpmItem[] = [];
	color: string | null = "";
	location = "";
	name = "";
	eventDescription: string | null = null;
	initialCollapsibleState: TreeItemCollapsibleState =
		TreeItemCollapsibleState.Collapsed;
	interactionType: UIInteractionType = UIInteractionType.Click;
	interactionIcon: string | null = "";
	hideCTAInTracker = false;
}

export class SessionSummary {
	currentDayMinutes = 0;
	averageDailyMinutes = 0;
}

export class DiffNumStats {
	file_name = "";
	insertions = 0;
	deletions = 0;
}

// example: {type: "window", name: "close", timestamp: 1234,
// timestamp_local: 1233, description: "OnboardPrompt"}
export class CodeTimeEvent {
	type = "";
	name = "";
	timestamp = 0;
	timestamp_local = 0;
	description = "";
	pluginId: number = getPluginId();
	os: string = getOs();
	version: string = getVersion();
	hostname = ""; // this is gathered using an await
	timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;
}
