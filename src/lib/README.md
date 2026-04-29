# lib

The 'lib' module contains utility functions and components that are essential for processing glob patterns in a consistent and reliable manner. This includes improvements to handling specific glob patterns and ensuring compatibility with various file structures.

## Features

- Improvements to glob pattern matching to prevent incorrect matches with flat file paths.
- Support for conventional minimatch/micromatch behavior for trailing `/**` patterns.
- Regression tests to ensure reliability and prevent future bugs related to glob patterns.

## Usage

To utilize the 'lib' module, import the relevant functions from the 'glob-with-captures.ts' file. For example:

```javascript
import { globWithCaptures } from './lib/glob-with-captures';

const pattern = 'src/<MODULE>/**';
const files = globWithCaptures(pattern);
console.log(files);
```

## Examples

Using `src/<MODULE>/**` to match all files in a directory, excluding flat file paths.

Running tests to confirm the correct behavior of glob patterns after updates.