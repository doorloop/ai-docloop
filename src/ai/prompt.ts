import { AiRequestContext } from '../types';

const DETAIL_INSTRUCTIONS: Record<'low' | 'medium' | 'high', string> = {
	low: 'Keep it concise and high-level. Focus on the main purpose and basic usage.',
	medium: 'Provide a balanced overview with key features, usage examples, and important details.',
	high: 'Be comprehensive. Include detailed explanations, multiple examples, API documentation, architecture notes, and best practices.',
};

interface PromptOptions {
	readonly userPrompt?: string;
	readonly format?: 'structured' | 'freeform';
	readonly includeUpdateSignal?: boolean;
}

function buildLegacySystemPrompt(detailLevel: 'low' | 'medium' | 'high'): string {
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

function buildFreeformDirective(detailLevel: 'low' | 'medium' | 'high'): string {
	return `You are a technical documentation expert. Generate clear, well-structured Markdown documentation for the feature/component described below.

Guidelines:
- Write clear, well-structured Markdown
- Use appropriate technical terminology
- Include relevant examples and usage instructions
- ${DETAIL_INSTRUCTIONS[detailLevel]}
- Focus on helping developers understand and use the code effectively
- When updating an existing document, preserve valuable information while incorporating new changes`;
}

function buildContextBlock(ctx: AiRequestContext): string {
	let block = `Generate structured README content for the feature/component: **${ctx.featureName}**

Detail Level: ${ctx.detailLevel}

Changed Files:
${ctx.changedFiles.map((f) => `- ${f}`).join('\n')}`;

	if (ctx.prTitle) {
		block += `\n\nPR Title: ${ctx.prTitle}`;
	}

	if (ctx.prBody) {
		block += `\n\nPR Description:\n${ctx.prBody}`;
	}

	if (ctx.existingReadme && ctx.updateMode === 'update') {
		block += `\n\n---\n\nExisting README:\n\n${ctx.existingReadme}\n\n---\n\nPlease update this README to reflect the recent changes while preserving valuable existing information.`;
	} else if (ctx.existingReadme && ctx.updateMode === 'overwrite') {
		block += `\n\n---\n\nPrevious README (for context only - you may reference it but should generate a fresh version):\n\n${ctx.existingReadme}\n\n---\n\nPlease generate a new README based on the current state of the code.`;
	} else {
		block += '\n\nPlease generate structured README content for this feature/component.';
	}

	return block;
}

function buildBoundaries(format: 'structured' | 'freeform', includeUpdateSignal: boolean): string {
	const lines = [
		'You are operating as part of an automated GitHub Action that maintains README files.',
		'You will receive a list of changed files, an optional existing document, and PR metadata in the user message that follows.',
	];
	if (format === 'structured') {
		lines.push('Return structured JSON matching the supplied schema.');
		if (includeUpdateSignal) {
			lines.push(
				'If you judge no meaningful documentation update is warranted (cosmetic-only changes, unrelated to anything documentable), set `should_update` to false and give a brief `update_reason`. Otherwise set `should_update` to true and fill the README fields normally.',
			);
		}
	} else {
		lines.push('Return plain Markdown. Do not wrap your response in code fences.');
		lines.push(
			'If you judge no meaningful documentation update is warranted, return only the literal sentinel `<!-- docloop:no-update -->` and nothing else.',
		);
	}
	return lines.join('\n');
}

export function buildPrompt(ctx: AiRequestContext, options?: PromptOptions): { system: string; user: string } {
	if (options === undefined) {
		return {
			system: buildLegacySystemPrompt(ctx.detailLevel),
			user: buildContextBlock(ctx),
		};
	}

	const format = options.format ?? 'structured';
	const includeUpdateSignal = options.includeUpdateSignal ?? false;
	const directive = options.userPrompt ?? (format === 'freeform' ? buildFreeformDirective(ctx.detailLevel) : buildLegacySystemPrompt(ctx.detailLevel));
	const boundaries = buildBoundaries(format, includeUpdateSignal);

	return {
		system: `${directive}\n\n---\n\n${boundaries}`,
		user: buildContextBlock(ctx),
	};
}
