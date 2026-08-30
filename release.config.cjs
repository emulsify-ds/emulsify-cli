const {
  commitAnalyzerOptions,
  parserOpts,
} = require('./config/release-analysis.cjs');

module.exports = {
  branches: ['main'],
  repositoryUrl: 'https://github.com/emulsify-ds/emulsify-cli.git',
  plugins: [
    ['@semantic-release/commit-analyzer', commitAnalyzerOptions],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'angular',
        parserOpts,
        writerOpts: {
          commitsSort: ['subject', 'scope'],
        },
      },
    ],
    ['@semantic-release/npm', { npmPublish: true }],
    '@semantic-release/github',
  ],
};
