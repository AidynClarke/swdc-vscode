import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path = require("node:path");
import { getSoftwareDir, logIt } from "../Util";

interface UIInteraction {
	interaction_type: string;
	element_name: string;
	element_location: string;
	color: string | null;
	icon_name: string | null;
	cta_text: string;
	plugin_id: number;
	plugin_name: string;
	plugin_version: string;
	editor_name: string;
	editor_version: string;
	jwt: string;
}

interface Metrics {
	//codetime_entity
	keystrokes: number;
	lines_added: number;
	lines_deleted: number;
	characters_added: number;
	characters_deleted: number;
	single_deletes: number;
	multi_deletes: number;
	single_adds: number;
	multi_adds: number;
	auto_indents: number;
	replacements: number;
	start_time: string;
	end_time: string;

	// file_entity
	file_name: string;
	file_path: string;
	syntax: string;
	line_count: number;
	character_count: number;

	// projectInfo
	project_directory: string;
	project_name: string;

	// plugin params
	plugin_id: number;
	plugin_name: string;
	plugin_version: string;
	editor_name: string;
	editor_version: string;

	// jwt
	jwt: string;

	// repo params
	identifier: string;
	org_name?: string;
	owner_id?: string;
	repo_name: string;
	repo_identifier: string;
	git_branch: string;
	git_tag: string;
}

class DBFile {
	public readonly path: string;

	constructor(_path: string) {
		const dir = path.dirname(_path);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		this.path = _path;
	}

	public get(): string[] | null {
		try {
			return readFileSync(this.path, "utf8")?.split("\n") || null;
		} catch (err) {
			logIt(
				`Unable to read ${this.path} info: ${err instanceof Error ? err.message : err}`,
				true,
			);
			return null;
		}
	}

	public add(obj: object) {
		try {
			appendFileSync(this.path, `${JSON.stringify(obj)}\n`);
		} catch (err) {
			logIt(
				`Unable to write ${this.path} info: ${err instanceof Error ? err.message : err}`,
				true,
			);
		}
	}
}

// class DBFile {
// 	private stream: WriteStream;
// 	public readonly path: string;

// 	constructor(_path: string) {
// 		const dir = path.dirname(_path);
// 		if (!existsSync(dir)) {
// 			mkdirSync(dir, { recursive: true });
// 		}

// 		this.path = _path;
// 		this.stream = createWriteStream(_path);
// 	}

// 	public dispose() {
// 		this.stream.close();
// 	}

// 	public add(obj: object) {
// 		try {
// 			this.stream.write(`${JSON.stringify(obj)}\n`);
// 		} catch (err) {
// 			logIt(
// 				`Unable to write ${this.path} info: ${err instanceof Error ? err.message : err}`,
// 				true,
// 			);
// 		}
// 	}
// }

class DBManager {
	private readonly files: Map<string, DBFile> = new Map<string, DBFile>();

	constructor(public readonly dir: string) {
		mkdirSync(this.dir, { recursive: true });
	}

	public get(name: string): string[] | null {
		try {
			const data = JSON.parse(readFileSync(path.join(this.dir, name), "utf8"));
			return data;
		} catch (err) {
			if (err instanceof Error) {
				logIt(`Unable to read ${name} info: ${err.message}`, true);
			} else {
				logIt(`Unable to read ${name} info: ${err}`, true);
			}
			return null;
		}
	}

	public store(name: string, obj: object) {
		let file = this.files.get(name);

		if (!file) {
			file = new DBFile(path.join(this.dir, name));
			this.files.set(name, file);
		}

		file.add(obj);
	}

	public dispose() {}
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class Database {
	private static _instance: DBManager | null = null;

	public static dispose() {
		if (Database._instance) {
			Database._instance.dispose();
		}
	}

	public static get instance(): DBManager {
		if (!Database._instance) {
			const dbPath = getSoftwareDir(".code-time");
			mkdirSync(dbPath, { recursive: true });
			Database._instance = new DBManager(dbPath);
		}
		return Database._instance;
	}
}

export function storeMetrics(metrics: Metrics) {
	store("metrics", metrics);
}

export function storeUIInteraction(interaction: UIInteraction) {
	store("ui_interactions", interaction);
}

export function storeGitEvent(event: object) {
	store("git_events", event);
}

export function storeEditorActionEvent(event: object) {
	store("editor_actions", event);
}

export function storeEditorExtensionEvent(event: object) {
	store("editor_extensions", event);
}
// oienrogineogineroingeoirgoienrgoinerogieoinrgonierg

function store(name: string, obj: object) {
	// const { keys, values } = toKeysAndValues(obj);
	// const query = toQuery(name, keys, values);

	Database.instance.store(name, obj);

	// Database.instance.exec(
	// 	query,
	// );
}

// function toQuery(name: string, keys: string[], values: string[]) {
// 	return `INSERT INTO ${name} (${keys.join(", ")}) VALUES (${values.join(", ")})`;
// }

// function toKeysAndValues<T extends object>(
// 	obj: T,
// ): { keys: string[]; values: string[] } {
// 	const keys = Object.keys(obj) as (keyof T)[] as string[];
// 	const values: string[] = [];

// 	for (const key of keys) {
// 		if (typeof obj[key as keyof typeof obj] === "string") {
// 			values.push(`'${obj[key as keyof typeof obj]}'`);
// 		} else {
// 			values.push(`${obj[key as keyof typeof obj]}`);
// 		}
// 	}
// 	return { keys, values };
// }
