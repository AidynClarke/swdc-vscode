import { getStatusBarItem } from "../extension";
import * as spotify from "spotify-node-applescript";
import * as itunes from "itunes-node-applescript";
import { isTacoTime } from "./KpmGrubManager";
import { workspace } from "vscode";
import { isResponseOk, softwareGet, softwarePost } from "./HttpClient";
const { exec } = require("child_process");

const fs = require("fs");
const os = require("os");
const cp = require("child_process");
const crypto = require("crypto");

const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function getRootPath() {
    let rootPath =
        workspace.workspaceFolders &&
        workspace.workspaceFolders[0] &&
        workspace.workspaceFolders[0].uri &&
        workspace.workspaceFolders[0].uri.fsPath;

    return rootPath;
}

export function setItem(key, value) {
    const jsonObj = getSoftwareSessionAsJson();
    jsonObj[key] = value;

    const content = JSON.stringify(jsonObj);

    const sessionFile = getSoftwareSessionFile();
    fs.writeFileSync(sessionFile, content, err => {
        if (err)
            console.log(
                "Software.com: Error writing to the Software session file: ",
                err.message
            );
    });
}

export function getItem(key) {
    const jsonObj = getSoftwareSessionAsJson();

    return jsonObj[key] || null;
}

export function showErrorStatus() {
    let fullMsg = `$(${"alert"}) ${"Software.com"}`;
    showStatus(
        fullMsg,
        "To see your coding data in Software.com, please log in to your account."
    );
}

export function showStatus(fullMsg, tooltip) {
    if (!tooltip) {
        tooltip = "Click to see more from Software.com";
    }
    if (isTacoTime()) {
        fullMsg += " 🌮";
        getStatusBarItem().command === "extension.orderGrubCommand";
    } else {
        getStatusBarItem().command = "extension.softwareKpmDashboard";
    }
    updateStatusBar(fullMsg, tooltip);
}

export function showTacoTimeStatus(fullMsg, tooltip) {
    getStatusBarItem().command = "extension.orderGrubCommand";
    updateStatusBar(fullMsg, tooltip);
}

function updateStatusBar(msg, tooltip) {
    getStatusBarItem().tooltip = tooltip;
    getStatusBarItem().text = msg;
}

export function isEmptyObj(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}

// process.platform return the following...
//   -> 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
export function isWindows() {
    return process.platform.indexOf("win32") !== -1;
}

export function isMac() {
    return process.platform.indexOf("darwin") !== -1;
}

export function getSoftwareDir() {
    const homedir = os.homedir();
    let softwareDataDir = homedir;
    if (isWindows()) {
        softwareDataDir += "\\.software";
    } else {
        softwareDataDir += "/.software";
    }

    if (!fs.existsSync(softwareDataDir)) {
        fs.mkdirSync(softwareDataDir);
    }

    return softwareDataDir;
}

export function getSoftwareSessionFile() {
    let file = getSoftwareDir();
    if (isWindows()) {
        file += "\\session.json";
    } else {
        file += "/session.json";
    }
    return file;
}

export function getSoftwareDataStoreFile() {
    let file = getSoftwareDir();
    if (isWindows()) {
        file += "\\data.json";
    } else {
        file += "/data.json";
    }
    return file;
}

export function getSoftwareSessionAsJson() {
    let data = null;

    const sessionFile = getSoftwareSessionFile();
    if (fs.existsSync(sessionFile)) {
        const content = fs.readFileSync(sessionFile).toString();
        if (content) {
            data = JSON.parse(content);
        }
    }
    return data ? data : {};
}

export function nowInSecs() {
    return Math.round(Date.now() / 1000);
}

export function storePayload(payload) {
    fs.appendFile(
        getSoftwareDataStoreFile(),
        JSON.stringify(payload) + os.EOL,
        err => {
            if (err)
                console.log(
                    "Software.com: Error appending to the Software data store file: ",
                    err.message
                );
        }
    );
}

export function randomCode() {
    return crypto
        .randomBytes(16)
        .map(value =>
            alpha.charCodeAt(Math.floor((value * alpha.length) / 256))
        )
        .toString();
}

export function deleteFile(file) {
    // if the file exists, get it
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
    }
}

export async function getTrackInfo() {
    let trackInfo = {};

    let isSpotifyRunning = await getSpotifyRunningPromise();
    let isItunesRunning = await isItunesRunningPromise();

    if (isSpotifyRunning) {
        trackInfo = await getSpotifyTrackPromise();
        if (!trackInfo && isItunesRunning) {
            // get that track data.
            trackInfo = await getItunesTrackPromise();
        }
    } else if (isItunesRunning) {
        trackInfo = await getItunesTrackPromise();
    }

    return trackInfo || {};
}

/**
 * returns true or an error.
 */
function getSpotifyRunningPromise() {
    return new Promise((resolve, reject) => {
        spotify.isRunning((err, isRunning) => {
            if (err) {
                resolve(false);
            } else {
                resolve(isRunning);
            }
        });
    });
}

/**
 * returns i.e.
 * track = {
        artist: 'Bob Dylan',
        album: 'Highway 61 Revisited',
        disc_number: 1,
        duration: 370,
        played count: 0,
        track_number: 1,
        starred: false,
        popularity: 71,
        id: 'spotify:track:3AhXZa8sUQht0UEdBJgpGc',
        name: 'Like A Rolling Stone',
        album_artist: 'Bob Dylan',
        artwork_url: 'http://images.spotify.com/image/e3d720410b4a0770c1fc84bc8eb0f0b76758a358',
        spotify_url: 'spotify:track:3AhXZa8sUQht0UEdBJgpGc' }
    }
 */
function getSpotifyTrackPromise() {
    return new Promise((resolve, reject) => {
        spotify.getTrack((err, track) => {
            if (err || !track) {
                resolve(null);
            } else {
                let trackInfo = {
                    id: track.id,
                    name: track.name,
                    artist: track.artist,
                    genre: "", // spotify doesn't provide genre from their app.
                    start: 0,
                    end: 0,
                    state: "playing",
                    duration: track.duration,
                    type: "spotify"
                };
                resolve(trackInfo);
            }
        });
    });
}

function isItunesRunningPromise() {
    return new Promise((resolve, reject) => {
        itunes.isRunning((err, isRunning) => {
            if (err) {
                resolve(false);
            } else {
                resolve(isRunning);
            }
        });
    });
}

/**
 * returns an array of data, i.e.
 * { genre, artist, album, id, index, name, time }
 * 0:"Dance"
    1:"Martin Garrix"
    2:"High on Life (feat. Bonn) - Single"
    3:4938 <- is this the track ID?
    4:375
    5:"High on Life (feat. Bonn)"
    6:"3:50"
 */
function getItunesTrackPromise() {
    return new Promise((resolve, reject) => {
        itunes.track((err, track) => {
            if (err || !track) {
                resolve(null);
            } else {
                itunes.isPaused;
                let trackInfo = {
                    id: "",
                    name: "",
                    artist: "",
                    genre: "", // spotify doesn't provide genre from their app.
                    start: 0,
                    end: 0,
                    state: "playing",
                    duration: 0,
                    type: "itunes"
                };
                if (track.length > 0) {
                    trackInfo["genre"] = track[0];
                }
                if (track.length >= 1) {
                    trackInfo["artist"] = track[1];
                }
                if (track.length >= 3) {
                    trackInfo["id"] = `itunes:track:${track[3]}`;
                }
                if (track.length >= 5) {
                    trackInfo["name"] = track[5];
                }
                if (track.length >= 6) {
                    // get the duration "4:41"
                    let durationParts = track[6].split(":");
                    if (durationParts && durationParts.length === 2) {
                        let durationInMin =
                            parseInt(durationParts[0], 10) * 60 +
                            parseInt(durationParts[1]);
                        trackInfo["duration"] = durationInMin;
                    }
                }
                // stopped/‌playing/‌paused
                resolve(trackInfo);
            }
        });
    });
}

function execPromise(command, opts) {
    return new Promise(function(resolve, reject) {
        exec(command, opts, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(stdout.trim());
        });
    });
}

export async function wrapExecPromise(cmd, projectDir) {
    let prop = null;
    try {
        prop = await execPromise(cmd, {
            cwd: projectDir
        });
    } catch (e) {
        // console.error(e.message);
        prop = null;
    }
    return prop;
}

export function launchWebUrl(url) {
    let open = "open";
    let args = [`${url}`];
    if (isWindows()) {
        open = "cmd";
        // adds the following args to the beginning of the array
        args.unshift("/c", "start", '""');
    } else if (!isMac()) {
        open = "xdg-open";
    }

    let process = cp.execFile(open, args, (error, stdout, stderr) => {
        if (error != null) {
            console.log(
                "Software.com: Error launching Software web url: ",
                error.toString()
            );
        }
    });
}
