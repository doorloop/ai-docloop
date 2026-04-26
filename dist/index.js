"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var github = __toESM(require("@actions/github"));

// src/config/parser.ts
var core2 = __toESM(require("@actions/core"));

// src/lib/logger.ts
var core = __toESM(require("@actions/core"));
var logger = {
  debug: (message) => core.debug(message),
  info: (message) => core.info(message),
  warning: (message) => core.warning(message),
  error: (message) => core.error(message),
  setFailed: (message) => core.setFailed(message)
};

// src/config/parser.ts
function parseStringArray(input) {
  return input.split(/[,\n]/).map((s) => s.trim()).filter((s) => s.length > 0);
}
function parseDetailLevel(input) {
  const normalized = input.toLowerCase().trim();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }
  logger.warning(`Invalid detail_level "${input}", defaulting to "medium"`);
  return "medium";
}
function parseUpdateMode(input) {
  const normalized = input.toLowerCase().trim();
  if (normalized === "update" || normalized === "overwrite") {
    return normalized;
  }
  logger.warning(`Invalid update_mode "${input}", defaulting to "update"`);
  return "update";
}
function parseBoolean(input) {
  return input.toLowerCase().trim() === "true";
}
function parseInteger(input, defaultValue) {
  const parsed = parseInt(input.trim(), 10);
  if (isNaN(parsed)) {
    logger.warning(`Invalid integer "${input}", defaulting to ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}
function getConfig() {
  const baseBranches = parseStringArray(core2.getInput("base_branches", { required: true }));
  const pathScopes = parseStringArray(core2.getInput("path_scopes", { required: true }));
  const docRootDepthFromScope = parseInteger(
    core2.getInput("doc_root_depth_from_scope") || "1",
    1
  );
  const readmeFilename = core2.getInput("readme_filename") || "README.md";
  const detailLevel = parseDetailLevel(core2.getInput("detail_level") || "medium");
  const openaiModel = core2.getInput("openai_model") || "gpt-4o-mini";
  const openaiApiKey = core2.getInput("openai_api_key", { required: true });
  const updateMode = parseUpdateMode(core2.getInput("update_mode") || "update");
  const commitMessage = core2.getInput("commit_message") || "docs: update READMEs [skip ci]";
  const createPr = parseBoolean(core2.getInput("create_pr") || "false");
  if (baseBranches.length === 0) {
    throw new Error("base_branches must contain at least one branch name");
  }
  if (pathScopes.length === 0) {
    throw new Error("path_scopes must contain at least one path scope");
  }
  return {
    baseBranches,
    pathScopes,
    docRootDepthFromScope,
    readmeFilename,
    detailLevel,
    openaiModel,
    openaiApiKey,
    updateMode,
    commitMessage,
    createPr
  };
}

// src/git/files.ts
var import_github = require("@actions/github");
async function getChangedFilesForMergedPr(context2, token) {
  if (!context2.payload.pull_request) {
    throw new Error("This action must be run in the context of a pull_request event");
  }
  const pullNumber = context2.payload.pull_request.number;
  const owner = context2.repo.owner;
  const repo = context2.repo.repo;
  const octokit = (0, import_github.getOctokit)(token);
  logger.info(`Fetching changed files for PR #${pullNumber}`);
  const files = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: perPage,
      page
    });
    if (response.data.length === 0) {
      break;
    }
    for (const file of response.data) {
      files.push(file.filename);
    }
    if (response.data.length < perPage) {
      break;
    }
    page++;
  }
  logger.info(`Found ${files.length} changed files`);
  return files;
}

// src/git/commit.ts
var import_exec = require("@actions/exec");
var import_github2 = require("@actions/github");
function generateBranchName() {
  const randomId = Math.random().toString(36).substring(2, 8);
  return `ai-docs/${randomId}`;
}
async function commitAndPush(updatedFiles, commitMessage, createPr, context2, token) {
  if (updatedFiles.length === 0) {
    logger.info("No files to commit");
    return;
  }
  const baseBranch = context2.payload.pull_request?.base?.ref;
  if (!baseBranch) {
    throw new Error("Could not determine base branch");
  }
  await (0, import_exec.exec)("git", ["checkout", baseBranch]);
  await (0, import_exec.exec)("git", ["config", "user.name", "github-actions[bot]"]);
  await (0, import_exec.exec)("git", ["config", "user.email", "github-actions[bot]@users.noreply.github.com"]);
  for (const file of updatedFiles) {
    await (0, import_exec.exec)("git", ["add", file]);
  }
  const exitCode = await (0, import_exec.exec)("git", ["diff", "--cached", "--quiet"], {
    ignoreReturnCode: true
  });
  const hasChanges = exitCode !== 0;
  if (!hasChanges) {
    logger.info("No staged changes to commit");
    return;
  }
  await (0, import_exec.exec)("git", ["commit", "-m", commitMessage]);
  logger.info(`Committed ${updatedFiles.length} file(s) with message: ${commitMessage}`);
  if (createPr) {
    const branchName = generateBranchName();
    await (0, import_exec.exec)("git", ["checkout", "-b", branchName]);
    await (0, import_exec.exec)("git", ["push", "--set-upstream", "origin", branchName]);
    logger.info(`Pushed changes to branch: ${branchName}`);
    const octokit = (0, import_github2.getOctokit)(token);
    const pr = await octokit.rest.pulls.create({
      owner: context2.repo.owner,
      repo: context2.repo.repo,
      title: "docs: update READMEs via AI",
      head: branchName,
      base: baseBranch,
      body: "This PR was automatically created to update README files based on recent changes."
    });
    logger.info(`Created PR #${pr.data.number}: ${pr.data.html_url}`);
  } else {
    await (0, import_exec.exec)("git", ["push", "origin", baseBranch]);
    logger.info(`Pushed changes directly to ${baseBranch}`);
  }
}

// src/lib/path-mapper.ts
var import_normalize_path = __toESM(require("normalize-path"));
var GLOB_PATTERN_SUFFIX = "/**";
var RELATIVE_PATH_PREFIX = "./";
function removeGlobPattern(path) {
  return path.endsWith(GLOB_PATTERN_SUFFIX) ? path.slice(0, -GLOB_PATTERN_SUFFIX.length) : path;
}
function removeRelativePrefix(path) {
  return path.startsWith(RELATIVE_PATH_PREFIX) ? path.slice(RELATIVE_PATH_PREFIX.length) : path;
}
function normalizePathString(path) {
  const normalized = (0, import_normalize_path.default)(path);
  const withoutGlob = removeGlobPattern(normalized);
  const withoutRelative = removeRelativePrefix(withoutGlob);
  return withoutRelative;
}
function buildPathScopeConfigs(pathScopes) {
  return pathScopes.map((pattern) => {
    const scopeRoot = normalizePathString(pattern);
    const scopeRootSegments = scopeRoot.split("/").filter((s) => s.length > 0);
    return {
      pattern,
      scopeRoot,
      scopeRootSegments
    };
  });
}
function normalizeFilePath(filePath) {
  return normalizePathString(filePath);
}
function isPathPrefix(prefixSegments, pathSegments) {
  if (prefixSegments.length > pathSegments.length) {
    return false;
  }
  for (let i = 0; i < prefixSegments.length; i++) {
    if (prefixSegments[i] !== pathSegments[i]) {
      return false;
    }
  }
  return true;
}
function findMatchingScope(fileSegments, scopes) {
  const matchingScopes = scopes.filter((scope) => isPathPrefix(scope.scopeRootSegments, fileSegments));
  if (matchingScopes.length === 0) {
    return null;
  }
  return matchingScopes.reduce(
    (prev, current) => current.scopeRootSegments.length > prev.scopeRootSegments.length ? current : prev
  );
}
function mapFilesToDocRoots(files, pathScopes, depthFromScope) {
  const docRootMap = /* @__PURE__ */ new Map();
  for (const file of files) {
    const normalizedFile = normalizeFilePath(file);
    const fileSegments = normalizedFile.split("/").filter((s) => s.length > 0);
    const matchingScope = findMatchingScope(fileSegments, pathScopes);
    if (!matchingScope) {
      logger.debug(`File "${file}" does not match any path scope, skipping`);
      continue;
    }
    const rootLen = matchingScope.scopeRootSegments.length;
    const docRootSegments = fileSegments.slice(0, rootLen + depthFromScope);
    if (docRootSegments.length <= rootLen) {
      logger.debug(`File "${file}" is not deep enough for depth ${depthFromScope} from scope root, skipping`);
      continue;
    }
    const docRootPath = docRootSegments.join("/");
    const existingFiles = docRootMap.get(docRootPath) || [];
    existingFiles.push(file);
    docRootMap.set(docRootPath, existingFiles);
  }
  return docRootMap;
}

// src/lib/glob.ts
var REGEX_ANY_NON_SLASH_CHARACTERS = "[^/]*";
var REGEX_START_ANCHOR = "^";
var REGEX_END_ANCHOR = "$";
function escapeRegexSpecialChars(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function globToRegex(pattern) {
  const escaped = escapeRegexSpecialChars(pattern);
  const regexPattern = escaped.replace(/\\\*/g, REGEX_ANY_NON_SLASH_CHARACTERS);
  const anchoredPattern = REGEX_START_ANCHOR + regexPattern + REGEX_END_ANCHOR;
  return new RegExp(anchoredPattern);
}
function matchesGlob(text, pattern) {
  const regex = globToRegex(pattern);
  return regex.test(text);
}

// src/readme/service.ts
var import_fs = require("fs");
var import_path = require("path");
async function buildDocRoots(docRootMap, readmeFilename) {
  const docRoots = [];
  for (const [folderPath, changedFiles] of docRootMap.entries()) {
    const featureName = folderPath.split("/").pop() || folderPath;
    const readmePath = (0, import_path.join)(folderPath, readmeFilename);
    let existingReadme;
    try {
      existingReadme = await import_fs.promises.readFile(readmePath, "utf-8");
      logger.debug(`Found existing README at ${readmePath}`);
    } catch (error2) {
      logger.debug(`No existing README at ${readmePath}, will create new one`);
    }
    docRoots.push({
      folderPath,
      featureName,
      changedFiles,
      existingReadme
    });
  }
  return docRoots;
}
async function writeReadme(folderPath, readmeFilename, content) {
  await import_fs.promises.mkdir(folderPath, { recursive: true });
  const filePath = (0, import_path.join)(folderPath, readmeFilename);
  await import_fs.promises.writeFile(filePath, content, "utf-8");
  logger.info(`Wrote README to ${filePath}`);
  return filePath;
}

// src/ai/client.ts
var import_openai = __toESM(require("openai"));

// src/ai/prompt.ts
function buildPrompt(ctx) {
  const detailInstructions = {
    low: "Keep it concise and high-level. Focus on the main purpose and basic usage.",
    medium: "Provide a balanced overview with key features, usage examples, and important details.",
    high: "Be comprehensive. Include detailed explanations, multiple examples, API documentation, architecture notes, and best practices."
  };
  const detailInstruction = detailInstructions[ctx.detailLevel];
  const systemPrompt = `You are a technical documentation expert. Your task is to generate structured README content for software projects.

Guidelines:
- Write clear, well-structured content
- Use appropriate technical terminology
- Include relevant examples and usage instructions
- ${detailInstruction}
- Focus on helping developers understand and use the code effectively
- If updating an existing README, preserve valuable information while incorporating new changes
- Return structured JSON data that will be formatted into Markdown`;
  let userPrompt = `Generate structured README content for the feature/component: **${ctx.featureName}**

Detail Level: ${ctx.detailLevel}

Changed Files:
${ctx.changedFiles.map((f) => `- ${f}`).join("\n")}`;
  if (ctx.prTitle) {
    userPrompt += `

PR Title: ${ctx.prTitle}`;
  }
  if (ctx.prBody) {
    userPrompt += `

PR Description:
${ctx.prBody}`;
  }
  if (ctx.existingReadme && ctx.updateMode === "update") {
    userPrompt += `

---

Existing README:

${ctx.existingReadme}

---

Please update this README to reflect the recent changes while preserving valuable existing information.`;
  } else if (ctx.existingReadme && ctx.updateMode === "overwrite") {
    userPrompt += `

---

Previous README (for context only - you may reference it but should generate a fresh version):

${ctx.existingReadme}

---

Please generate a new README based on the current state of the code.`;
  } else {
    userPrompt += "\n\nPlease generate structured README content for this feature/component.";
  }
  return {
    system: systemPrompt,
    user: userPrompt
  };
}

// src/ai/schema.ts
function getReadmeSchema(detailLevel) {
  const baseSchema = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title/name of the feature or component"
      },
      description: {
        type: "string",
        description: "A clear, concise description of what this feature/component does"
      },
      usage: {
        type: "string",
        description: "How to use this feature/component, including code examples"
      }
    },
    required: ["title", "description", "usage"]
  };
  if (detailLevel === "low") {
    return {
      type: "json_schema",
      json_schema: {
        name: "readme_structure",
        strict: true,
        schema: baseSchema
      }
    };
  }
  const mediumSchema = {
    ...baseSchema,
    properties: {
      ...baseSchema.properties,
      features: {
        type: "array",
        items: { type: "string" },
        description: "List of key features or capabilities"
      },
      examples: {
        type: "array",
        items: { type: "string" },
        description: "Code examples demonstrating usage"
      }
    }
  };
  if (detailLevel === "medium") {
    return {
      type: "json_schema",
      json_schema: {
        name: "readme_structure",
        strict: true,
        schema: mediumSchema
      }
    };
  }
  return {
    type: "json_schema",
    json_schema: {
      name: "readme_structure",
      strict: true,
      schema: {
        ...mediumSchema,
        properties: {
          ...mediumSchema.properties,
          installation: {
            type: "string",
            description: "Installation or setup instructions if applicable"
          },
          api: {
            type: "string",
            description: "API documentation, method signatures, or interface details"
          },
          configuration: {
            type: "string",
            description: "Configuration options, environment variables, or settings"
          },
          notes: {
            type: "string",
            description: "Additional notes, best practices, or important considerations"
          }
        }
      }
    }
  };
}

// src/ai/formatter.ts
function formatReadmeToMarkdown(readme) {
  const sections = [];
  sections.push(`# ${readme.title}
`);
  sections.push(readme.description);
  sections.push("");
  if (readme.features && readme.features.length > 0) {
    sections.push("## Features\n");
    readme.features.forEach((feature) => {
      sections.push(`- ${feature}`);
    });
    sections.push("");
  }
  if (readme.installation) {
    sections.push("## Installation\n");
    sections.push(readme.installation);
    sections.push("");
  }
  sections.push("## Usage\n");
  sections.push(readme.usage);
  sections.push("");
  if (readme.examples && readme.examples.length > 0) {
    sections.push("## Examples\n");
    readme.examples.forEach((example) => {
      sections.push(example);
      sections.push("");
    });
  }
  if (readme.api) {
    sections.push("## API\n");
    sections.push(readme.api);
    sections.push("");
  }
  if (readme.configuration) {
    sections.push("## Configuration\n");
    sections.push(readme.configuration);
    sections.push("");
  }
  if (readme.notes) {
    sections.push("## Notes\n");
    sections.push(readme.notes);
    sections.push("");
  }
  return sections.join("\n").trim();
}

// src/ai/client.ts
async function generateReadme(ctx, cfg) {
  const { system, user } = buildPrompt(ctx);
  const clientOptions = {
    apiKey: cfg.openaiApiKey
  };
  const openai = new import_openai.default(clientOptions);
  logger.info(`Calling OpenAI API with model: ${cfg.openaiModel} using structured outputs`);
  try {
    const response = await openai.chat.completions.create({
      model: cfg.openaiModel,
      messages: [
        {
          role: "system",
          content: system
        },
        {
          role: "user",
          content: user
        }
      ],
      temperature: 0.7,
      response_format: getReadmeSchema(ctx.detailLevel)
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenAI API response");
    }
    let readme;
    try {
      readme = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Failed to parse structured output: ${parseError}`);
    }
    return formatReadmeToMarkdown(readme);
  } catch (error2) {
    if (error2 instanceof import_openai.default.APIError) {
      throw new Error(
        `OpenAI API error (${error2.status}): ${error2.message}`
      );
    }
    throw error2;
  }
}

// src/index.ts
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
    const updatedFiles = [];
    for (const docRoot of docRoots) {
      logger.info(`Processing doc root: ${docRoot.folderPath}`);
      try {
        const aiContext = {
          featureName: docRoot.featureName,
          detailLevel: config.detailLevel,
          prTitle: pr.title || void 0,
          prBody: pr.body || void 0,
          changedFiles: docRoot.changedFiles,
          existingReadme: config.updateMode === "update" ? docRoot.existingReadme : void 0,
          updateMode: config.updateMode
        };
        const readmeContent = await generateReadme(aiContext, config);
        const filePath = await writeReadme(docRoot.folderPath, config.readmeFilename, readmeContent);
        updatedFiles.push(filePath);
      } catch (error2) {
        logger.error(`Failed to generate README for ${docRoot.folderPath}: ${error2}`);
      }
    }
    if (updatedFiles.length === 0) {
      logger.info("No README files were generated or updated");
      return;
    }
    logger.info(`Generated/updated ${updatedFiles.length} README file(s)`);
    await commitAndPush(updatedFiles, config.commitMessage, config.createPr, github.context, token);
    logger.info("Action completed successfully");
  } catch (error2) {
    logger.setFailed(error2 instanceof Error ? error2 : String(error2));
    throw error2;
  }
}
run();
