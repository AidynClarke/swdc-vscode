import { getFileNameFromPath, logIt } from "../Util";
import { LocalStorageManager } from "./LocalStorageManager";

import * as fs from "node:fs";
import * as path from "node:path";

let storageMgr: LocalStorageManager | undefined = undefined;

function getStorageManager() {
	if (!storageMgr) {
		storageMgr = LocalStorageManager.getCachedStorageManager();
	}
	return storageMgr;
}

export function getBooleanJsonItem(file: string, key: string) {
	const value = getJsonItem(file, key);
	try {
		return !!JSON.parse(value);
	} catch (e) {
		return false;
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function getJsonItem(file: string, key: string, defaultValue: any = "") {
	return (
		getStorageManager()?.getValue(`${getFileNameFromPath(file)}_${key}`) ||
		defaultValue
	);
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function setJsonItem(file: string, key: string, value: any) {
	getStorageManager()?.setValue(`${getFileNameFromPath(file)}_${key}`, value);
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function getFileDataAsJson(filePath: string): any {
	try {
		const content: string = fs.readFileSync(filePath, "utf8")?.trim();
		return JSON.parse(content);
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} catch (e: any) {
		logIt(`Unable to read ${getBaseName(filePath)} info: ${e.message}`, true);
	}
	return null;
}

/**
 * Single place to write json data (json obj or json array)
 * @param filePath
 * @param json
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function storeJsonData(filePath: string, json: any) {
	try {
		const content: string = JSON.stringify(json);
		fs.writeFileSync(filePath, content, "utf8");
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} catch (e: any) {
		logIt(`Unable to write ${getBaseName(filePath)} info: ${e.message}`, true);
	}
}

function getBaseName(filePath: string) {
	let baseName = filePath;
	try {
		baseName = path.basename(filePath);
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} catch (e: any) {}
	return baseName;
}
