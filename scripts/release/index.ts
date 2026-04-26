import {
	getReleaseAnswers,
	determineNewVersion,
	createReleasePlan,
	displayReleasePlan,
	validateReleasePlan,
	runPreReleaseChecks,
	executeRelease,
	confirmRelease,
} from './release';
import { isGitRepository, hasUncommittedChanges, log, exec, getCurrentVersion } from './utils';

const main = async (): Promise<void> => {
	log('\n🚀 DocLoop AI Release Script\n', 'bright');
	log('📋 Running pre-flight checks...', 'cyan');

	if (!isGitRepository()) {
		log('❌ Error: Not in a git repository', 'red');
		process.exit(1);
	}

	if (hasUncommittedChanges()) {
		log('⚠️  Warning: You have uncommitted changes', 'yellow');
		const status = exec('git status --short', { silent: true });
		if (status) {
			console.log(status);
		}

		const { askQuestion } = await import('./prompts');
		const answer = await askQuestion('\nContinue anyway? (y/N): ');
		if (answer.toLowerCase() !== 'y') {
			log('❌ Release cancelled', 'red');
			process.exit(1);
		}
	}

	try {
		const answers = await getReleaseAnswers();
		const currentVersion = getCurrentVersion();
		const newVersion = determineNewVersion(answers, currentVersion);
		const plan = createReleasePlan(answers, newVersion);

		validateReleasePlan(plan);
		displayReleasePlan(plan);

		const confirmed = await confirmRelease();
		if (!confirmed) {
			log('❌ Release cancelled', 'red');
			process.exit(0);
		}

		await runPreReleaseChecks(answers);

		await executeRelease(plan);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		log(`\n❌ Error: ${errorMessage}`, 'red');
		process.exit(1);
	}
};

process.on('unhandledRejection', (error) => {
	const errorMessage = error instanceof Error ? error.message : String(error);
	log(`\n❌ Unhandled error: ${errorMessage}`, 'red');
	process.exit(1);
});

main();
