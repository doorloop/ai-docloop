# lib

The 'lib' component provides a collection of utility functions and classes for managing frontmatter-driven documentation routing. It facilitates the parsing of YAML frontmatter and enables flexible routing of documentation based on source file changes.

## Features

- YAML frontmatter parsing for title and paths
- Flexible documentation routing based on source file changes
- Support for multiple insight files from a single source directory
- Handles naming convention discrepancies between source directories and documentation files
- Maintains backward compatibility with existing 'readme:' functionality

## Usage

To use the 'lib' component in your project, import the necessary functions and utilize the 'readme_candidates' feature as follows:

```typescript
import { routeDocumentation } from './lib';

const result = routeDocumentation({
  readmeCandidates: 'docs/wiki/insights/*-feature.md',
  // other options...
});

console.log(result);
``` 
This will parse the YAML frontmatter of the specified markdown files and route the source files accordingly based on the defined paths.

## Examples

Example of defining frontmatter in a markdown file:
   ```yaml
   title: Inspections Feature
   paths:
     - apps/server/src/features/inspections/**
   ```

Example of usage in a TypeScript file:
   ```typescript
   const docFiles = routeDocumentation({
     readmeCandidates: 'docs/wiki/insights/*-feature.md'
   });
   console.log(docFiles);
   ```