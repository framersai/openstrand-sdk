module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [1, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 120],
  },
};

