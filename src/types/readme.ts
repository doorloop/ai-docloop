export interface ReadmeStructure {
	title: string;
	description: string;
	usage: string;
	// Optional fields are nullable because the OpenAI strict-mode schema
	// requires every property to be present; absent content is sent as null.
	features?: string[] | null;
	examples?: string[] | null;
	installation?: string | null;
	api?: string | null;
	configuration?: string | null;
	notes?: string | null;
	// Update signal — only present when the schema is built with withUpdateSignal=true.
	should_update?: boolean;
	update_reason?: string;
}
