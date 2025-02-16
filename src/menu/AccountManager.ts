import { authentication } from "vscode";
import {
	getAuthCallbackState,
	getHostname,
	getItem,
	getOsUsername,
	getPluginUuid,
	setAuthCallbackState,
	setItem,
} from "../Util";
import { AUTH_TYPE, getAuthInstance } from "../auth/AuthProvider";
import { appPost, isResponseOk } from "../http/HttpClient";

let creatingAnonUser = false;

export async function authLogin() {
	const session = await authentication.getSession(AUTH_TYPE, [], {
		createIfNone: true,
	});
	if (session) {
		const latestUpdate = getItem("updatedAt");
		if (!latestUpdate || new Date().getTime() - latestUpdate > 1000 * 3) {
			await getAuthInstance().removeSession(session.account.id);
			await authentication.getSession(AUTH_TYPE, [], { createIfNone: true });
		}
	}
}

/**
 * create an anonymous user based on github email or mac addr
 */
export async function createAnonymousUser() {
	if (creatingAnonUser) {
		return;
	}
	const jwt = getItem("jwt");
	// check one more time before creating the anon user
	if (!jwt) {
		creatingAnonUser = true;
		// this should not be undefined if its an account reset
		const plugin_uuid = getPluginUuid();
		const auth_callback_state = getAuthCallbackState();
		const username = getOsUsername();
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const hostname = getHostname();

		const resp = await appPost("/api/v1/anonymous_user", {
			timezone,
			username,
			plugin_uuid,
			hostname,
			auth_callback_state,
		});
		if (isResponseOk(resp) && resp.data) {
			setItem("jwt", resp.data.plugin_jwt);
			if (!resp.data.registered) {
				setItem("name", null);
			}
			setAuthCallbackState("");
		}
	}
	creatingAnonUser = false;
}
