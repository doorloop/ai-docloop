export interface MappingTarget {
	targetPath: string;
	captures: Record<string, string>;
	changedFiles: string[];
}
