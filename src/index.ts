import * as github from "@actions/github";
import { getConfig } from "./config";
import { getChangedFilesForMergedPr, commitAndPush } from "./git";
import { buildPathScopeConfigs, mapFilesToDocRoots, matchesGlob } from "./lib";
import { buildDocRoots, writeReadme } from "./readme";
import { generateReadme } from "./ai";
import { logger } from "./lib";

async function run() {
  try {
    if (github.context.payload.action !== "closed") {
      logger.info("PR is not closed, skipping");
      return;
    }

    const pr = github.context.payload.pull_request;
    if (!pr) {
      logger.info("No pull request in context, skipping");
      return;
    }

    if (!pr.merged) {
      logger.info("PR was not merged, skipping");
      return;
    }

    logger.info(`Processing merged PR #${pr.number}: ${pr.title}`);

    const config = getConfig();

    const baseBranch = pr.base?.ref;
    if (!baseBranch) {
      throw new Error("Could not determine base branch from PR");
    }

    const baseBranchMatches = config.baseBranches.some((pattern) => matchesGlob(baseBranch, pattern));

    if (!baseBranchMatches) {
      logger.info(
        `Base branch "${baseBranch}" does not match any configured base branches: ${config.baseBranches.join(
          ", "
        )}`
      );
      return;
    }

    logger.info(`Base branch "${baseBranch}" matches configured branches`);

    const token = process.env.GITHUB_TOKEN || "";
    if (!token) {
      throw new Error(
        "GITHUB_TOKEN is required but not provided. Make sure the workflow has contents: write permission."
      );
    }

    const changedFiles = await getChangedFilesForMergedPr(github.context, token);

    if (changedFiles.length === 0) {
      logger.info("No changed files found in PR");
      return;
    }

    logger.info(`Found ${changedFiles.length} changed file(s)`);

    const pathScopeConfigs = buildPathScopeConfigs(config.pathScopes);
    logger.debug(`Built ${pathScopeConfigs.length} path scope config(s)`);

    const docRootMap = mapFilesToDocRoots(changedFiles, pathScopeConfigs, config.docRootDepthFromScope);

    if (docRootMap.size === 0) {
      logger.info("No changed files match the configured path scopes");
      return;
    }

    logger.info(`Mapped files to ${docRootMap.size} doc root(s)`);

    const docRoots = await buildDocRoots(docRootMap, config.readmeFilename);

    const updatedFiles: string[] = [];

    for (const docRoot of docRoots) {
      logger.info(`Processing doc root: ${docRoot.folderPath}`);

      try {
        const aiContext = {
          featureName: docRoot.featureName,
          detailLevel: config.detailLevel,
          prTitle: pr.title || undefined,
          prBody: pr.body || undefined,
          changedFiles: docRoot.changedFiles,
          existingReadme: config.updateMode === "update" ? docRoot.existingReadme : undefined,
          updateMode: config.updateMode,
        };

        const readmeContent = await generateReadme(aiContext, config);

        const filePath = await writeReadme(docRoot.folderPath, config.readmeFilename, readmeContent);

        updatedFiles.push(filePath);
      } catch (error) {
        logger.error(`Failed to generate README for ${docRoot.folderPath}: ${error}`);
      }
    }

    if (updatedFiles.length === 0) {
      logger.info("No README files were generated or updated");
      return;
    }

    logger.info(`Generated/updated ${updatedFiles.length} README file(s)`);

    await commitAndPush(updatedFiles, config.commitMessage, config.createPr, github.context, token);

    logger.info("Action completed successfully");
  } catch (error) {
    logger.setFailed(error instanceof Error ? error : String(error));
    throw error;
  }
}

run();
