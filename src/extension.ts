// Copyright (c) 2018 Software. All Rights Reserved.

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
	type ExtensionContext,
	authentication,
	commands,
	window,
} from "vscode";
import { getUser, initializeAuthProvider } from "./DataController";
import {
	displayReadme,
	getBooleanItem,
	getItem,
	getPluginName,
	getRandomNumberWithinRange,
	getVersion,
	getWorkspaceName,
	isPrimaryWindow,
	logIt,
	setItem,
} from "./Util";
import { AUTH_TYPE, AuthProvider } from "./auth/AuthProvider";
import { createCommands } from "./command-helper";
import { ChangeStateManager } from "./managers/ChangeStateManager";
import { ExtensionManager } from "./managers/ExtensionManager";
import { initializeFlowModeState } from "./managers/FlowManager";
import { KpmManager } from "./managers/KpmManager";
import { LocalStorageManager } from "./managers/LocalStorageManager";
import {
	initializeStatusBar,
	updateFlowModeStatusBar,
	updateStatusBarWithSummaryData,
} from "./managers/StatusBarManager";
import { SummaryManager } from "./managers/SummaryManager";
import { SyncManager } from "./managers/SyncManger";
import { TrackerManager } from "./managers/TrackerManager";
import { setEndOfDayNotification } from "./notifications/endOfDay";
import { Database } from "./store/sqllite";
import { onboardInit } from "./user/OnboardManager";
import { disposeWebsocketTimeouts, initializeWebsockets } from "./websockets";

let currentColorKind: number | undefined = undefined;
let storageManager: LocalStorageManager | undefined = undefined;
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
let user: any = null;

const tracker: TrackerManager = TrackerManager.getInstance();

//
// Add the keystroke controller to the ext ctx, which
// will then listen for text document changes.
//
const kpmController: KpmManager = KpmManager.getInstance();

export function deactivate(ctx: ExtensionContext) {
	// store the deactivate event
	tracker.trackEditorAction("editor", "deactivate");

	ChangeStateManager.getInstance().dispose();
	ExtensionManager.getInstance().dispose();
	Database.dispose();

	// dispose the file watchers
	kpmController.dispose();

	if (isPrimaryWindow()) {
		if (storageManager) storageManager.clearDupStorageKeys();
	}

	disposeWebsocketTimeouts();
}

export async function activate(ctx: ExtensionContext) {
	const authProvider: AuthProvider = new AuthProvider(ctx);
	storageManager = LocalStorageManager.getInstance(ctx);
	initializeSession(storageManager);
	initializeAuthProvider(authProvider);

	// add the code time commands
	ctx.subscriptions.push(createCommands(ctx, kpmController, storageManager));
	TrackerManager.storageMgr = storageManager;

	// session: {id: <String>, accessToken: <String>, account: {label: <String>, id: <Number>}, scopes: [<String>,...]}
	const session = await authentication.getSession(AUTH_TYPE, [], {
		createIfNone: false,
	});
	let jwt = getItem("jwt");
	user = await getUser();
	if (session) {
		// oiewrgnoinegr
		// fetch the user with the non-session jwt to compare
		if (!user || user.email !== session.account.label) {
			jwt = session.accessToken;
			// update the local storage with the new user
			setItem("name", session.account.label);
			setItem("jwt", jwt);
			user = await getUser(jwt);
		}
	} else if (jwt && user?.registered) {
		// update the session with the existing jwt
		authProvider.updateSession(jwt);
	}

	if (jwt) {
		intializePlugin();
	} else if (window.state.focused) {
		onboardInit(ctx, intializePlugin /*successFunction*/);
	} else {
		// 5 to 10 second delay
		const secondDelay = getRandomNumberWithinRange(6, 10);
		setTimeout(() => {
			onboardInit(ctx, intializePlugin /*successFunction*/);
		}, 1000 * secondDelay);
	}
}

export async function intializePlugin() {
	logIt(`Loaded ${getPluginName()} v${getVersion()}`);

	// INIT websockets
	try {
		initializeWebsockets();
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} catch (e: any) {
		logIt(`Failed to initialize websockets: ${e.message}`);
	}

	// INIT keystroke analysis tracker
	await tracker.init();

	// initialize user and preferences
	if (!user) user = await getUser();

	// show the sidebar if this is the 1st
	if (!getBooleanItem("vscode_CtInit")) {
		setItem("vscode_CtInit", true);

		setTimeout(() => {
			commands.executeCommand("codetime.displaySidebar");
		}, 1000);

		displayReadme();
	}

	initializeStatusBar();

	if (isPrimaryWindow()) {
		// store the activate event
		tracker.trackEditorAction("editor", "activate");
		// it's the primary window. initialize flow mode and session summary information
		initializeFlowModeState();
		SummaryManager.getInstance().updateSessionSummaryFromServer();
	} else {
		// it's a secondary window. update the statusbar
		updateFlowModeStatusBar();
		updateStatusBarWithSummaryData();
	}

	setTimeout(() => {
		// INIT doc change events
		ChangeStateManager.getInstance();

		// INIT extension manager change listener
		ExtensionManager.getInstance().initialize();

		// INIT session summary sync manager
		SyncManager.getInstance();
	}, 3000);

	setTimeout(() => {
		// Set the end of the day notification trigger if it's enabled
		setEndOfDayNotification();
	}, 5000);
}

export function getCurrentColorKind() {
	if (!currentColorKind) {
		currentColorKind = window.activeColorTheme.kind;
	}
	return currentColorKind;
}

function initializeSession(storageManager: LocalStorageManager) {
	if (window.state.focused) {
		setItem("vscode_primary_window", getWorkspaceName());
		if (storageManager) storageManager.clearDupStorageKeys();
	}
}
