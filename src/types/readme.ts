export interface DocRoot {
	folderPath: string;
	featureName: string;
	changedFiles: string[];
	existingReadme?: string;
}

export interface ReadmeStructure {
	title: string;
	description: string;
	features?: string[];
	installation?: string;
	usage: string;
	examples?: string[];
	api?: string;
	configuration?: string;
	notes?: string;
}
