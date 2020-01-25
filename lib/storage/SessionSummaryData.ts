import { SessionSummary, KeystrokeAggregate, TimeData } from "../model/models";
import {
    isWindows,
    getSoftwareDir,
    logIt,
    getNowTimes,
    getItem,
    showStatus,
    getFileDataAsJson
} from "../Util";
import { CacheManager } from "../cache/CacheManager";
import { DEFAULT_SESSION_THRESHOLD_SECONDS } from "../Constants";
import { WallClockManager } from "../managers/WallClockManager";
import { updateTimeData, getTodayTimeDataSummary } from "./TimeDataSummary";
const fs = require("fs");

const cacheMgr: CacheManager = CacheManager.getInstance();

export function getSessionThresholdSeconds() {
    const thresholdSeconds =
        getItem("sessionThresholdInSec") || DEFAULT_SESSION_THRESHOLD_SECONDS;
    return thresholdSeconds;
}

export function clearSessionSummaryData() {
    const sessionSummaryData = new SessionSummary();
    saveSessionSummaryToDisk(sessionSummaryData);
}

export function getSessionSummaryFile() {
    let file = getSoftwareDir();
    if (isWindows()) {
        file += "\\sessionSummary.json";
    } else {
        file += "/sessionSummary.json";
    }
    return file;
}

export function getSessionSummaryData(): SessionSummary {
    // let fileChangeInfoMap = cacheMgr.get("sessionSummary");
    let sessionSummaryData = getSessionSummaryFileAsJson();
    // make sure it's a valid structure
    if (!sessionSummaryData) {
        // set the defaults
        sessionSummaryData = new SessionSummary();
    }
    // fill in missing attributes
    sessionSummaryData = coalesceMissingAttributes(sessionSummaryData);
    return sessionSummaryData;
}

function coalesceMissingAttributes(data): SessionSummary {
    // ensure all attributes are defined
    const template: SessionSummary = new SessionSummary();
    Object.keys(template).forEach(key => {
        if (!data[key]) {
            data[key] = 0;
        }
    });
    return data;
}

export function getSessionSummaryFileAsJson(): SessionSummary {
    let sessionSummary: SessionSummary = cacheMgr.get("sessionSummary");
    if (!sessionSummary) {
        const file = getSessionSummaryFile();
        sessionSummary = getFileDataAsJson(file);
        if (!sessionSummary) {
            sessionSummary = new SessionSummary();
            saveSessionSummaryToDisk(sessionSummary);
        }
    }
    return sessionSummary;
}

export function saveSessionSummaryToDisk(sessionSummaryData) {
    const file = getSessionSummaryFile();
    try {
        // JSON.stringify(data, replacer, number of spaces)
        const content = JSON.stringify(sessionSummaryData, null, 4);
        fs.writeFileSync(file, content, err => {
            if (err)
                logIt(
                    `Deployer: Error writing session summary data: ${err.message}`
                );
        });
        // update the cache
        if (sessionSummaryData) {
            cacheMgr.set("sessionSummary", sessionSummaryData);
        }
    } catch (e) {
        //
    }
}

export function setSessionSummaryLiveshareMinutes(minutes) {
    let sessionSummaryData = cacheMgr.get("sessionSummary");
    if (!sessionSummaryData) {
        sessionSummaryData = getSessionSummaryData();
    }
    sessionSummaryData.liveshareMinutes = minutes;

    saveSessionSummaryToDisk(sessionSummaryData);
}

export function incrementSessionSummaryData(aggregates: KeystrokeAggregate) {
    const wallClkHandler: WallClockManager = WallClockManager.getInstance();
    let sessionSummaryData = cacheMgr.get("sessionSummary");
    if (!sessionSummaryData) {
        sessionSummaryData = getSessionSummaryData();
    }
    // fill in missing attributes
    sessionSummaryData = coalesceMissingAttributes(sessionSummaryData);

    // what is the gap from the previous start
    const nowTimes = getNowTimes();
    const nowInSec = nowTimes.now_in_sec;
    let incrementMinutes = 1;

    const lastPayloadEnd = getItem("lastPayloadEnd");
    if (lastPayloadEnd) {
        // get the diff from the prev end
        const diffInSec = nowInSec - lastPayloadEnd - 60;

        // If it's less or equal to the session threshold seconds
        // then add to the minutes increment. But check if it's a positive
        // number in case the system clock has been moved to the future
        if (diffInSec > 0 && diffInSec <= getSessionThresholdSeconds()) {
            // it's still the same session, add the gap time in minutes
            const diffInMin = diffInSec / 60;
            incrementMinutes += diffInMin;
        }
    }

    sessionSummaryData.currentDayMinutes += incrementMinutes;

    const session_seconds = sessionSummaryData.currentDayMinutes * 60;
    let editor_seconds = wallClkHandler.getWcTimeInSeconds();

    // check to see if the session seconds has gained before the editor seconds
    // if so, then update the editor seconds
    if (editor_seconds < session_seconds) {
        editor_seconds = session_seconds + 1;
        wallClkHandler.setWcTime(editor_seconds);
    }

    sessionSummaryData.currentDayKeystrokes += aggregates.keystrokes;
    sessionSummaryData.currentDayLinesAdded += aggregates.linesAdded;
    sessionSummaryData.currentDayLinesRemoved += aggregates.linesRemoved;

    saveSessionSummaryToDisk(sessionSummaryData);

    // get the current time data and update
    const timeData: TimeData = getTodayTimeDataSummary();
    const file_seconds = (timeData.file_seconds += 60);

    updateTimeData(editor_seconds, session_seconds, file_seconds);
}

export function updateStatusBarWithSummaryData() {
    let sessionSummaryData = cacheMgr.get("sessionSummary");
    if (!sessionSummaryData) {
        sessionSummaryData = getSessionSummaryData();
    }
    // update the session summary data with what is found in the sessionSummary.json
    sessionSummaryData = getSessionSummaryFileAsJson();

    let currentDayMinutes = sessionSummaryData.currentDayMinutes;
    let averageDailyMinutes = sessionSummaryData.averageDailyMinutes;

    let inFlowIcon = currentDayMinutes > averageDailyMinutes ? "🚀 " : "";
    const wcTime = WallClockManager.getInstance().getHumanizedWcTime();

    // const time = moment().format("h:mm a");
    const msg = `${inFlowIcon}${wcTime}`;
    showStatus(msg, null);
}
