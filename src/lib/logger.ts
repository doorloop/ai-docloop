import * as core from '@actions/core';

export const logger = {
	debug: (message: string) => core.debug(message),
	info: (message: string) => core.info(message),
	warning: (message: string) => core.warning(message),
	error: (message: string | Error) => core.error(message),
	setFailed: (message: string | Error) => core.setFailed(message),
};
