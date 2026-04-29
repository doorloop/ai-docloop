import { DetailLevel } from './config';

export interface AiRequestContext {
	featureName: string;
	detailLevel: DetailLevel;
	prTitle?: string;
	prBody?: string;
	changedFiles: string[];
	existingReadme?: string;
}
