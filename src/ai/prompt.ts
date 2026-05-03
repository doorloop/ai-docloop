import { AiRequestContext } from '../types';

type DetailLevel = 'low' | 'medium' | 'high';
type PromptFormat = 'structured' | 'freeform';

interface PromptOptions {
	readonly userPrompt?: string;
	readonly format: PromptFormat;
}

export const NO_UPDATE_SENTINEL = '<!-- docloop:no-update -->';

const DETAIL_INSTRUCTIONS: Record<DetailLevel, string> = {
	low: 'Keep it concise and high-level. Focus on the main purpose and basic usage.',
	medium: 'Provide a balanced overview with key features, usage examples, and important details.',
	high: 'Be comprehensive. Include detailed explanations, multiple examples, API documentation, architecture notes, and best practices.',
};

const SYSTEM_BOUNDARIES_PREAMBLE = [
	'You are operating as part of an automated GitHub Action that maintains documentation files.',
	'You will receive a list of changed files, an optional existing document, and PR metadata in the user message that follows.',
];

const STRUCTURED_BOUNDARIES_TAIL = [
	'Return structured JSON matching the supplied schema.',
	'If you judge no meaningful documentation update is warranted (cosmetic-only changes, unrelated to anything documentable), set `should_update` to false and give a brief `update_reason`. Otherwise set `should_update` to true and fill the document fields normally.',
];

const FREEFORM_BOUNDARIES_TAIL = [
	'Return plain Markdown. Do not wrap your response in code fences.',
	`If you judge no meaningful documentation update is warranted, return only the literal sentinel \`${NO_UPDATE_SENTINEL}\` and nothing else.`,
];

const USER_TRAILER_UPDATE = 'Please update this document to reflect the recent changes while preserving valuable existing information.';
const USER_TRAILER_GENERATE = 'Please generate documentation for this feature/component.';

function buildStructuredDirective(detailLevel: DetailLevel): string {
	return `You are a technical documentation expert. Your task is to generate structured README content for software projects.

Guidelines:
- Write clear, well-structured content
- Use appropriate technical terminology
- Include relevant examples and usage instructions
- ${DETAIL_INSTRUCTIONS[detailLevel]}
- Focus on helping developers understand and use the code effectively
- If updating an existing README, preserve valuable information while incorporating new changes
- Return structured JSON data that will be formatted into Markdown`;
}

function buildFreeformDirective(detailLevel: DetailLevel): string {
	return `You are a technical documentation expert. Generate clear, well-structured Markdown documentation for the feature/component described below.

Guidelines:
- Write clear, well-structured Markdown
- Use appropriate technical terminology
- Include relevant examples and usage instructions
- ${DETAIL_INSTRUCTIONS[detailLevel]}
- Focus on helping developers understand and use the code effectively
- When updating an existing document, preserve valuable information while incorporating new changes`;
}

function buildBoundaries(format: PromptFormat): string {
	const tail = format === 'structured' ? STRUCTURED_BOUNDARIES_TAIL : FREEFORM_BOUNDARIES_TAIL;
	return [...SYSTEM_BOUNDARIES_PREAMBLE, ...tail].join('\n');
}

function buildUserMessage(ctx: AiRequestContext, hasCustomPrompt: boolean): string {
	const segments: string[] = [
		`Generate documentation for the feature/component: **${ctx.featureName}**

Detail Level: ${ctx.detailLevel}

Changed Files:
${ctx.changedFiles.map((f) => `- ${f}`).join('\n')}`,
	];

	if (ctx.prTitle) {
		segments.push(`PR Title: ${ctx.prTitle}`);
	}

	if (ctx.prBody) {
		segments.push(`PR Description:\n${ctx.prBody}`);
	}

	if (ctx.existingReadme !== undefined) {
		segments.push(`---\n\nExisting document:\n\n${ctx.existingReadme}\n\n---`);
		// Custom prompt_file encodes the update policy; the generic trailer would contradict it.
		if (!hasCustomPrompt) {
			segments.push(USER_TRAILER_UPDATE);
		}
	} else if (!hasCustomPrompt) {
		segments.push(USER_TRAILER_GENERATE);
	}

	return segments.join('\n\n');
}

export function buildPrompt(ctx: AiRequestContext, options: PromptOptions): { system: string; user: string } {
	const directive =
		options.userPrompt ?? (options.format === 'freeform' ? buildFreeformDirective(ctx.detailLevel) : buildStructuredDirective(ctx.detailLevel));
	const boundaries = buildBoundaries(options.format);

	return {
		system: `${directive}\n\n---\n\n${boundaries}`,
		user: buildUserMessage(ctx, options.userPrompt !== undefined),
	};
}
