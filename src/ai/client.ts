import OpenAI, { ClientOptions } from 'openai';

import { logger } from '../lib';
import { AiRequestContext, ReadmeStructure } from '../types';
import { formatReadmeToMarkdown } from './formatter';
import { buildPrompt } from './prompt';
import { getReadmeSchema, StructuredOutput } from './schema';

interface AiClientConfig {
	openaiApiKey: string;
	openaiModel: string;
}

type GenerateResult = { kind: 'update'; content: string } | { kind: 'skip'; reason: string };

interface GenerateOptions {
	readonly format: 'structured' | 'freeform';
	readonly userPrompt?: string;
}

const NO_UPDATE_SENTINEL = '<!-- docloop:no-update -->';

async function callOpenAI(system: string, user: string, cfg: AiClientConfig, responseFormat?: StructuredOutput): Promise<string> {
	const clientOptions: ClientOptions = {
		apiKey: cfg.openaiApiKey,
	};

	const openai = new OpenAI(clientOptions);

	logger.info(`Calling OpenAI API with model: ${cfg.openaiModel}${responseFormat ? ' using structured outputs' : ''}`);

	try {
		const response = await openai.chat.completions.create({
			model: cfg.openaiModel,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user },
			],
			temperature: 0.7,
			...(responseFormat ? { response_format: responseFormat } : {}),
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error('No content in OpenAI API response');
		}
		return content;
	} catch (error) {
		if (error instanceof OpenAI.APIError) {
			throw new Error(`OpenAI API error (${error.status}): ${error.message}`, { cause: error });
		}
		throw error;
	}
}

function parseStructuredResponse(raw: string): ReadmeStructure {
	try {
		return JSON.parse(raw) as ReadmeStructure;
	} catch (parseError) {
		throw new Error(`Failed to parse structured output: ${parseError}`, { cause: parseError });
	}
}

export async function generateMappingReadme(ctx: AiRequestContext, cfg: AiClientConfig, options: GenerateOptions): Promise<GenerateResult> {
	const { system, user } = buildPrompt(ctx, {
		userPrompt: options.userPrompt,
		format: options.format,
	});

	if (options.format === 'freeform') {
		const raw = await callOpenAI(system, user, cfg);
		const trimmed = raw.trim();
		if (trimmed === NO_UPDATE_SENTINEL) {
			return { kind: 'skip', reason: 'model returned no-update sentinel' };
		}
		return { kind: 'update', content: raw };
	}

	const schema = getReadmeSchema(ctx.detailLevel);
	const raw = await callOpenAI(system, user, cfg, schema);
	const readme = parseStructuredResponse(raw);
	if (readme.should_update === false) {
		return { kind: 'skip', reason: readme.update_reason ?? 'model judged no meaningful update needed' };
	}
	return { kind: 'update', content: formatReadmeToMarkdown(readme) };
}
