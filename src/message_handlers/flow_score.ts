import { isRegistered } from "../DataController";
import { logIt } from "../Util";
import { enableFlow } from "../managers/FlowManager";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export async function handleFlowScoreMessage(message: any) {
	try {
		if (isRegistered()) {
			enableFlow({ automated: true });
		}
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} catch (e: any) {
		logIt(`Error handling flow score message: ${e.message}`);
	}
}
