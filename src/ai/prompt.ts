import { AiRequestContext } from '../types';

export function buildPrompt(ctx: AiRequestContext): { system: string; user: string } {
	const detailInstructions: Record<typeof ctx.detailLevel, string> = {
		low: 'Keep it concise and high-level. Focus on the main purpose and basic usage.',
		medium: 'Provide a balanced overview with key features, usage examples, and important details.',
		high: 'Be comprehensive. Include detailed explanations, multiple examples, API documentation, architecture notes, and best practices.',
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
${ctx.changedFiles.map((f) => `- ${f}`).join('\n')}`;

	if (ctx.prTitle) {
		userPrompt += `\n\nPR Title: ${ctx.prTitle}`;
	}

	if (ctx.prBody) {
		userPrompt += `\n\nPR Description:\n${ctx.prBody}`;
	}

	if (ctx.existingReadme && ctx.updateMode === 'update') {
		userPrompt += `\n\n---\n\nExisting README:\n\n${ctx.existingReadme}\n\n---\n\nPlease update this README to reflect the recent changes while preserving valuable existing information.`;
	} else if (ctx.existingReadme && ctx.updateMode === 'overwrite') {
		userPrompt += `\n\n---\n\nPrevious README (for context only - you may reference it but should generate a fresh version):\n\n${ctx.existingReadme}\n\n---\n\nPlease generate a new README based on the current state of the code.`;
	} else {
		userPrompt += '\n\nPlease generate structured README content for this feature/component.';
	}

	return {
		system: systemPrompt,
		user: userPrompt,
	};
}
