import OpenAI, { ClientOptions } from 'openai';

import { logger } from '../lib';
import { ActionConfig, AiRequestContext, ReadmeStructure } from '../types';
import { formatReadmeToMarkdown } from './formatter';
import { buildPrompt } from './prompt';
import { getReadmeSchema } from './schema';

export async function generateReadme(ctx: AiRequestContext, cfg: ActionConfig): Promise<string> {
	const { system, user } = buildPrompt(ctx);

	const clientOptions: ClientOptions = {
		apiKey: cfg.openaiApiKey,
	};

	const openai = new OpenAI(clientOptions);

	logger.info(`Calling OpenAI API with model: ${cfg.openaiModel} using structured outputs`);

	try {
		const response = await openai.chat.completions.create({
			model: cfg.openaiModel,
			messages: [
				{
					role: 'system',
					content: system,
				},
				{
					role: 'user',
					content: user,
				},
			],
			temperature: 0.7,
			response_format: getReadmeSchema(ctx.detailLevel),
		});

		const content = response.choices[0]?.message?.content;

		if (!content) {
			throw new Error('No content in OpenAI API response');
		}

		// Parse the JSON response
		let readme: ReadmeStructure;
		try {
			readme = JSON.parse(content) as ReadmeStructure;
		} catch (parseError) {
			throw new Error(`Failed to parse structured output: ${parseError}`);
		}

		// Convert structured data to markdown
		return formatReadmeToMarkdown(readme);
	} catch (error) {
		if (error instanceof OpenAI.APIError) {
			throw new Error(`OpenAI API error (${error.status}): ${error.message}`);
		}
		throw error;
	}
}
