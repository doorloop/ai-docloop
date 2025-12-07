import {
  getCurrentVersion,
  incrementVersion,
  normalizeVersion,
  getGitBranch,
  checkRemoteTagExists,
  updatePackageJsonVersion,
  stageFiles,
  createCommit,
  createTag,
  runTypeCheck,
  runTests,
  buildProject,
  log,
} from "./utils";
import {
  promptUserForRelease,
  parseVersionFromArgs,
  createReleaseAnswersFromArgs,
  askQuestion,
} from "./prompts";
import { ReleaseAnswers, ReleasePlan } from "./types";
import { DIST_DIRECTORY, PACKAGE_JSON_PATH } from "./constants";

/** Determine the new version based on answers */
export const determineNewVersion = (answers: ReleaseAnswers, currentVersion: string): string => {
  if (answers.versionType === "custom") {
    return normalizeVersion(answers.customVersion!.trim());
  }
  return incrementVersion(currentVersion, answers.versionType);
};

/** Create release plan from answers */
export const createReleasePlan = (answers: ReleaseAnswers, newVersion: string): ReleasePlan => {
  const currentVersion = getCurrentVersion();
  const tag = `v${newVersion}`;
  const branch = getGitBranch();

  return {
    currentVersion,
    newVersion,
    tag,
    branch,
    dryRun: answers.dryRun,
  };
};

/** Display release plan */
export const displayReleasePlan = (plan: ReleasePlan): void => {
  log("\n📦 Release Plan:", "bright");
  log(`   Current version: ${plan.currentVersion}`, "cyan");
  log(`   New version:     ${plan.newVersion}`, "green");
  log(`   Tag:             ${plan.tag}`, "cyan");
  log(`   Branch:          ${plan.branch}`, "cyan");
  log(`   Dry run:         ${plan.dryRun ? "Yes" : "No"}`, plan.dryRun ? "yellow" : "cyan");

  if (plan.dryRun) {
    log("\n⚠️  DRY RUN MODE - No changes will be committed", "yellow");
  }
};

/** Validate release plan */
export const validateReleasePlan = (plan: ReleasePlan): void => {
  if (checkRemoteTagExists(plan.tag)) {
    throw new Error(`Tag ${plan.tag} already exists on remote`);
  }
};

/** Run pre-release checks */
export const runPreReleaseChecks = async (answers: ReleaseAnswers): Promise<void> => {
  if (answers.runTypeCheck) {
    log("\n🔍 Running type check...", "cyan");
    runTypeCheck();
  }

  if (answers.runTests) {
    log("\n🧪 Running tests...", "cyan");
    runTests();
  }

  log("\n📦 Building action...", "cyan");
  buildProject();
};

/** Execute release */
export const executeRelease = async (plan: ReleasePlan): Promise<void> => {
  if (plan.dryRun) {
    log("\n✅ Dry run completed successfully!", "green");
    log("   No changes were made. Run without dry-run to create the release.", "cyan");
    return;
  }

  log("\n📝 Updating package.json...", "cyan");
  updatePackageJsonVersion(plan.newVersion);

  log("\n📁 Staging files...", "cyan");
  stageFiles([`-f ${DIST_DIRECTORY}`, PACKAGE_JSON_PATH]);

  log("\n💾 Committing changes...", "cyan");
  const commitMessage = `chore: release ${plan.tag}`;
  createCommit(commitMessage);

  log(`\n🏷️  Creating tag ${plan.tag}...`, "cyan");
  createTag(plan.tag, `Release ${plan.tag}`);

  log("\n✅ Release prepared successfully!", "green");
  displayNextSteps(plan.tag);
};

/** Display next steps after release */
const displayNextSteps = (tag: string): void => {
  log("\n📋 Next steps:", "bright");
  log("   1. Review changes: git log --oneline -5", "cyan");
  log("   2. Push commits:    git push", "cyan");
  log(`   3. Push tag:        git push origin ${tag}`, "cyan");
  log("\n   The release workflow will automatically create a GitHub release.", "cyan");
};

/** Get release answers (from prompts or command line) */
export const getReleaseAnswers = async (): Promise<ReleaseAnswers> => {
  const answers = await promptUserForRelease();

  if (answers) {
    return answers;
  }

  const version = parseVersionFromArgs();
  if (!version) {
    throw new Error(
      "Version required. Usage: npm run release [version]\n" +
        "   Example: npm run release 1.0.1\n" +
        "   Or install inquirer for interactive mode: npm install --save-dev inquirer"
    );
  }

  return createReleaseAnswersFromArgs(version);
};

/** Confirm release with user */
export const confirmRelease = async (): Promise<boolean> => {
  const confirm = await askQuestion("\nProceed with release? (y/N): ");
  return confirm.toLowerCase() === "y";
};
