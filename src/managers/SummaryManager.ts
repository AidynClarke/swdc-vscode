import { getSessionSummaryFile } from "../Util";
import { appGet, isResponseOk } from "../http/HttpClient";
import { setJsonItem } from "./FileManager";
import { updateStatusBarWithSummaryData } from "./StatusBarManager";

export class SummaryManager {
	private static instance: SummaryManager;

	static getInstance(): SummaryManager {
		if (!SummaryManager.instance) {
			SummaryManager.instance = new SummaryManager();
		}

		return SummaryManager.instance;
	}

	/**
	 * This is only called from the new day checker
	 */
	async updateSessionSummaryFromServer() {
		const result = await appGet("/api/v1/user/session_summary");
		if (isResponseOk(result) && result.data) {
			this.updateCurrentDayStats(result.data);
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	updateCurrentDayStats(summary: any) {
		if (summary) {
			for (const key in summary) {
				setJsonItem(getSessionSummaryFile(), key, summary[key]);
			}
		}
		updateStatusBarWithSummaryData();
	}
}
