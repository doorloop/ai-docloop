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

