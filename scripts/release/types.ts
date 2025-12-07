export interface ReleaseAnswers {
  versionType: "major" | "minor" | "patch" | "custom";
  customVersion?: string;
  runTests: boolean;
  runTypeCheck: boolean;
  dryRun: boolean;
}

export interface ReleasePlan {
  currentVersion: string;
  newVersion: string;
  tag: string;
  branch: string;
  dryRun: boolean;
}

export interface ExecOptions {
  silent?: boolean;
  ignoreError?: boolean;
}

export type VersionType = "major" | "minor" | "patch";

export type Color = "reset" | "bright" | "green" | "yellow" | "red" | "blue" | "cyan";
