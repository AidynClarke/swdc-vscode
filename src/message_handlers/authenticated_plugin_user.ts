import { authenticationCompleteHandler } from "../DataController";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export async function handleAuthenticatedPluginUser(user: any) {
	authenticationCompleteHandler(user);
}
