export type DetailLevel = 'low' | 'medium' | 'high';

export type UpdateMode = 'overwrite' | 'update';

export interface ActionConfig {
	baseBranches: string[];
	pathScopes: string[];
	docRootDepthFromScope: number;
	readmeFilename: string;
	detailLevel: DetailLevel;
	openaiModel: string;
	openaiApiKey: string;
	updateMode: UpdateMode;
	commitMessage: string;
	createPr: boolean;
}

export type OutputFormat = 'structured' | 'freeform';

export type OnMissingReadme = 'create' | 'skip';

export type DeliveryMode = 'direct_commit' | 'pr' | 'pr_comment' | 'pr_branch_commit';

export interface DocloopDefaults {
	detailLevel: DetailLevel;
	model: string;
	format: OutputFormat;
	onMissingReadme: OnMissingReadme;
	exclude: string[];
}

export interface MappingConfig {
	name: string;
	watch: string[];
	readme: string;
	prompt?: string;
	detailLevel?: DetailLevel;
	model?: string;
	format?: OutputFormat;
	onMissingReadme?: OnMissingReadme;
	exclude?: string[];
}

export interface PrMergedTrigger {
	type: 'pr_merged';
	enabled: boolean;
	baseBranches: string[];
	delivery: 'direct_commit' | 'pr';
	commitMessage: string;
}

export interface PrOpenedTrigger {
	type: 'pr_opened';
	enabled: boolean;
	baseBranches: string[];
	delivery: 'pr_comment' | 'pr_branch_commit';
	commitMessage: string;
}

export interface WorkflowDispatchTrigger {
	type: 'workflow_dispatch';
	enabled: boolean;
	delivery: 'direct_commit' | 'pr';
	baseBranch: string;
}

export interface DocloopTriggers {
	prMerged?: PrMergedTrigger;
	prOpened?: PrOpenedTrigger;
	workflowDispatch?: WorkflowDispatchTrigger;
}

export interface DocloopConfig {
	version: 1;
	prompt?: string;
	defaults: DocloopDefaults;
	triggers: DocloopTriggers;
	mappings: MappingConfig[];
}
