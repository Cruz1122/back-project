module.exports = {
  testEnvironment: "node",
  testMatch: ["*/_tests_//.js", "*/?(.)+(spec|test).js"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/*/.js", "!*/node_modules/*", "!*/vendor/*"],
  coverageReporters: ["text", "lcov"],
};
