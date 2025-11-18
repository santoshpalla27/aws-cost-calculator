// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/database/**',
    '!src/config/**',
    '!src/**/dto/**',
    '!src/modules/**/dto/**',
  ],
  coverageDirectory: '../coverage',
  testTimeout: 10000,
};