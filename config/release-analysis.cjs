/**
 * @file Shared conventional-commit analysis options for release automation.
 */

const parserOpts = {
  noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
};

const commitAnalyzerOptions = {
  preset: 'angular',
  parserOpts,
};

module.exports = {
  commitAnalyzerOptions,
  parserOpts,
};
