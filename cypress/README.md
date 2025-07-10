# Cypress Tests for Teacher Registration System

This directory contains automated end-to-end tests using Cypress for the Teacher Accreditation Program (TAP) project.

## Test Structure

- `e2e/` - Contains all end-to-end test specifications
  - `auth/` - Authentication related tests
  - `teacher/` - Teacher registration tests
  - `navigation/` - Navigation and UI tests
- `support/` - Contains support files (commands, utilities)
- `fixtures/` - Contains test data files to mock API responses or provide input data for test cases.
- `screenshots/` - Contains screenshots taken during test failures
- `videos/` - Contains recordings of test runs

## Running Tests

### Local Development

1. Open Cypress Test Runner:

   ```
   npm run cypress:open
   ```

2. Run headless tests:

   ```
   npm run cypress:run
   ```

3. Run tests with application startup:
   ```
   npm run test:e2e
   ```

### CI Pipeline

Tests automatically run in the CI pipeline for:

- All pushes to main and develop branches
- All pull requests to main and develop branches

## Test Best Practices

1. Use data attributes for element selection (e.g., `data-cy="login-button"`).
2. Create reusable commands in `support/commands.js`.
3. Keep tests independent from each other.
4. Use descriptive test and assertion names.
5. Mock API responses when needed using `cy.intercept()`.

## Debugging Failed Tests

When tests fail in CI:

1. Check the GitHub Actions output
2. Download and review screenshots and videos from artifacts
3. Try to reproduce the issue locally

## Adding New Tests

1. Create a new spec file in the appropriate directory under `e2e/`
2. Follow the existing patterns for describing test suites
3. Add data-cy attributes to relevant elements in your application
4. Run and verify your tests locally before pushing
