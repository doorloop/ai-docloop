export type DetailLevel = 'low' | 'medium' | 'high';

export type OutputFormat = 'structured' | 'freeform';

export type OnMissingReadme = 'create' | 'skip';

export type DeliveryMode = 'direct_commit' | 'pr' | 'pr_comment' | 'pr_branch_commit';

export type DocloopEvent = 'pr_merged' | 'pr_open' | 'workflow_dispatch';

export interface MappingIntent {
	name: string;
	watch: string[];
	readme?: string;
	readmeCandidates?: string;
	promptFile?: string;
	detailLevel: DetailLevel;
	format: OutputFormat;
	onMissingReadme: OnMissingReadme;
	exclude: string[];
	delivery?: DeliveryMode;
	commitMessage: string;
	formatCommand?: string;
	prTitle?: string;
	requestReviewFromPrAuthor: boolean;
	openaiApiKey: string;
	openaiModel: string;
}
