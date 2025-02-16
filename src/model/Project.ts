// ? marks that the parameter is optional
export default class Project {
	public directory = "";
	public name?: string = "";
	public identifier = "";
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	public resource: any = {};
}
