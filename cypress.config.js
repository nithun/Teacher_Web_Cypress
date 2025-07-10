const { defineConfig } = require("cypress");
const axios = require("axios");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000", //- frontend
    pageLoadTimeout: 120000, // Increase to 2 minutes
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.js", // Cypress automatically loads this file before running tests (for global commands/running setup tasks)
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false, // Disable video recording in CI to speed up execution
    screenshotOnRunFailure: true, // Capture screenshots when a test fails
    //! Turn off retries while testing
    retries: {
      runMode: 2,
      openMode: 1,
    },
    // video: false, // Disable video recording in CI to speed up execution
    // screenshotOnRunFailure: true, // Capture screenshots when a test fails
  },
});
