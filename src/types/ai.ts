import { DetailLevel, UpdateMode } from './config';

export interface AiRequestContext {
  featureName: string;
  detailLevel: DetailLevel;
  prTitle?: string;
  prBody?: string;
  changedFiles: string[];
  existingReadme?: string;
  updateMode: UpdateMode;
}

