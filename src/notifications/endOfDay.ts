import { differenceInMilliseconds, format, startOfDay } from "date-fns";
import { commands, window } from "vscode";
import { getCachedUser, isRegistered } from "../DataController";
import {
	configureSettingsKpmItem,
	showMeTheDataKpmItem,
} from "../events/KpmItems";
import { configureSettings } from "../managers/ConfigManager";
import { TrackerManager } from "../managers/TrackerManager";
import { showDashboard } from "../managers/WebViewManager";

const MIN_IN_MILLIS = 60 * 1000;
const HOUR_IN_MILLIS = 60 * 60 * 1000;
const DEFAULT_WORK_HOURS = {
	mon: { ranges: [{ start: "09:00", end: "17:00" }], active: true },
	tue: { ranges: [{ start: "09:00", end: "17:00" }], active: true },
	wed: { ranges: [{ start: "09:00", end: "17:00" }], active: true },
	thu: { ranges: [{ start: "09:00", end: "17:00" }], active: true },
	fri: { ranges: [{ start: "09:00", end: "17:00" }], active: true },
	sat: { ranges: [{ start: "09:00", end: "17:00" }], active: false },
	sun: { ranges: [{ start: "09:00", end: "17:00" }], active: false },
};

let timer: NodeJS.Timeout | undefined = undefined;

export const setEndOfDayNotification = async () => {
	// clear any existing timer
	if (timer) {
		clearTimeout(timer);
	}

	const cachedUser = await getCachedUser();
	if (!cachedUser) {
		return;
	}
	const workHours = cachedUser?.profile?.work_hours
		? JSON.parse(cachedUser.profile.work_hours)
		: DEFAULT_WORK_HOURS;

	// If the end of day notification setting is turned on (if undefined or null, will default to true)
	if (cachedUser?.preferences_parsed?.notifications?.endOfDayNotification) {
		const d = new Date();
		const day = format(d, "EEE").toLowerCase();
		let msUntilEndOfTheDay = 0;

		// [[118800,147600],[205200,234000],[291600,320400],[378000,406800],[464400,493200]]
		// default of 5pm if the response or work_hours format doesn't have the {dow:...}
		if (day !== "sun" && day !== "sat") {
			msUntilEndOfTheDay = getMillisUntilEndOfTheDay(d, HOUR_IN_MILLIS * 17);
		}

		// get the day of the week that matches today
		const work_hours_today = workHours[day] || undefined;
		if (work_hours_today?.active) {
			// it's active, get the largest end range
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const endTimes = work_hours_today.ranges.map((n: any) => {
				// convert end to total seconds in a day
				return getEndTimeSeconds(n.end);
			});

			// sort milliseconds in descending order
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			endTimes.sort((a: any, b: any) => b - a);

			msUntilEndOfTheDay = getMillisUntilEndOfTheDay(d, endTimes[0]);
		}

		if (msUntilEndOfTheDay > 0) {
			// set the timer to fire in "n" milliseconds
			timer = setTimeout(showEndOfDayNotification, msUntilEndOfTheDay);
		}
	}
};

export const showEndOfDayNotification = async () => {
	const tracker: TrackerManager = TrackerManager.getInstance();
	if (!isRegistered()) {
		const selection = await window.showInformationMessage(
			"It's the end of the day. Sign up to see your stats.",
			...["Sign up"],
		);

		if (selection === "Sign up") {
			commands.executeCommand("codetime.registerAccount");
		}
	} else {
		const selection = await window.showInformationMessage(
			"It's the end of your work day! Would you like to see your code time stats for today?",
			...["Settings", "Show me the data"],
		);

		if (selection === "Show me the data") {
			tracker.trackUIInteraction(showMeTheDataKpmItem());
			showDashboard();
		} else if (selection === "Settings") {
			tracker.trackUIInteraction(configureSettingsKpmItem());
			configureSettings();
		}
	}
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function getEndTimeSeconds(end: any) {
	const hourMin = end.split(":");
	return (
		Number.parseInt(hourMin[0], 10) * HOUR_IN_MILLIS +
		Number.parseInt(hourMin[1], 10) * MIN_IN_MILLIS
	);
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function getMillisUntilEndOfTheDay(date: any, endMillis: number) {
	const startD = startOfDay(date);
	const millisDiff = differenceInMilliseconds(date, startD);
	return endMillis - millisDiff;
}
