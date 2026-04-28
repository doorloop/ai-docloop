export interface PathScopeConfig {
	pattern: string;
	scopeRoot: string;
	scopeRootSegments: string[];
}

export interface MappingTarget {
	targetPath: string;
	captures: Record<string, string>;
	changedFiles: string[];
}
