# Contributing

## Code and documentation style

Biome defines code and Markdown style in `biome.jsonc`, and CI enforces it.
Run `yarn fix` to apply formatting, organize imports, and apply safe lint fixes.
Run `yarn lint` to check the result. Some lint errors require manual changes.
The `lint:ts` and `lint:ts:fix` scripts remain compatibility aliases for these commands.

Markdown uses GitHub Flavored Markdown, preserves prose wrapping, and formats
supported fenced code blocks. Documents should have one top-level heading;
the README may place project badges before it. Embedded examples are formatted,
but not linted as standalone source files.

Biome does not replace Remark's checks for undefined, duplicate, or unused link
reference definitions. Review those references and rendered Markdown manually.

## Development

Run `yarn build` to compile the library and tests, `yarn test` to run the test suite,
and `yarn lint` to check code and Markdown.

PR descriptions should state which issue is resolved. Leave test validation details to CI.
