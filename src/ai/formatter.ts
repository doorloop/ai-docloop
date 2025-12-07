import { ReadmeStructure } from '../types';

export function formatReadmeToMarkdown(readme: ReadmeStructure): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${readme.title}\n`);

  // Description
  sections.push(readme.description);
  sections.push('');

  // Features
  if (readme.features && readme.features.length > 0) {
    sections.push('## Features\n');
    readme.features.forEach((feature) => {
      sections.push(`- ${feature}`);
    });
    sections.push('');
  }

  // Installation
  if (readme.installation) {
    sections.push('## Installation\n');
    sections.push(readme.installation);
    sections.push('');
  }

  // Usage
  sections.push('## Usage\n');
  sections.push(readme.usage);
  sections.push('');

  // Examples
  if (readme.examples && readme.examples.length > 0) {
    sections.push('## Examples\n');
    readme.examples.forEach((example) => {
      sections.push(example);
      sections.push('');
    });
  }

  // API
  if (readme.api) {
    sections.push('## API\n');
    sections.push(readme.api);
    sections.push('');
  }

  // Configuration
  if (readme.configuration) {
    sections.push('## Configuration\n');
    sections.push(readme.configuration);
    sections.push('');
  }

  // Notes
  if (readme.notes) {
    sections.push('## Notes\n');
    sections.push(readme.notes);
    sections.push('');
  }

  return sections.join('\n').trim();
}

