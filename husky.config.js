module.exports = {
  hooks: {
    'pre-commit': 'yarn husky:pre-commit',
    'commit-msg': 'yarn husky:commit-msg',
    'pre-push': 'yarn husky:pre-push',
  },
};
