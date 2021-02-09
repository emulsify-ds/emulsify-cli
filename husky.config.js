module.exports = {
  hooks: {
    'pre-commit': 'npm run husky:pre-commit',
    'commit-msg': 'npm run husky:commit-msg',
    'pre-push': 'npm run husky:pre-push',
  },
};
