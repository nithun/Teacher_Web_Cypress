// This file defines Custom Cypress Commands to simplify test cases and avoid code repetition.

//! ==========================================
//! UI INTERACTION COMMANDS
//! ==========================================

// Custom command to visit page and ensure it's loaded
Cypress.Commands.add("visitAndWaitForLoad", (path = "/") => {
  cy.visit(path, { timeout: 120000 });
  cy.get(".page11-text16", { timeout: 10000 }).should("be.visible");
});

// Custom command fillPersonalInfo(firstName, lastName, phone, userType) to fill out the personal information form (Step 1)
Cypress.Commands.add(
  "fillPersonalInfo",
  (firstName, lastName, phone, userType = "Teacher") => {
    cy.get('input[name="firstName"]').type(firstName);
    cy.get('input[name="lastName"]').type(lastName);
    cy.get('input[name="phone"]').type(phone);

    // Check if select exists before trying to use it
    cy.get("body").then(($body) => {
      if ($body.find('select[name="userType"]').length > 0) {
        cy.get('select[name="userType"]').select(userType);
      } else if ($body.find('input[name="userType"]').length > 0) {
        cy.get(`input[name="userType"][value="${userType}"]`).check();
      }
    });

    cy.get("button.page11-group2").click();
  }
);

// Custom command to enter OTP (Step 2)
// Cypress.Commands.add("enterOTP", (otp) => {
//   const digits = otp.split("");

//   // More robust entry with events
//   cy.get(".page21-rectangle2 .otp-input").clear().type(digits[0]).trigger('input');
//   cy.get(".page21-rectangle3 .otp-input").clear().type(digits[1]).trigger('input');
//   cy.get(".page21-rectangle4 .otp-input").clear().type(digits[2]).trigger('input');
//   cy.get(".page21-rectangle5 .otp-input").clear().type(digits[3]).trigger('input');

//   // Trigger the last input's change event to notify React
//   cy.get(".page21-rectangle5 .otp-input").trigger('change');
// });

//--------------------------------

//! Custom command to enter OTP digits into the 4-digit OTP input fields
Cypress.Commands.add("enterOTP", (otp) => {
  if (!otp || otp.length !== 4) {
    throw new Error("OTP must be exactly 4 digits");
  }

  // Focus first input and type each digit with a pause
  cy.get('[data-cy="otp-input-1"]').focus().type(otp[0]);
  cy.wait(250);

  cy.get('[data-cy="otp-input-2"]').focus().type(otp[1]);
  cy.wait(250);

  cy.get('[data-cy="otp-input-3"]').focus().type(otp[2]);
  cy.wait(250);

  cy.get('[data-cy="otp-input-4"]').focus().type(otp[3]);
  cy.wait(250);

  // Click outside any input to trigger blur
  cy.get("body").click(10, 10); // Click at coordinates to avoid hitting any button
  cy.wait(500);
});

//--------------------------------

// Custom command to select school (Step 3)
Cypress.Commands.add("selectSchool", (state, district, city, school) => {
  // Select state using React-Select
  cy.get('[data-cy="state-dropdown"]').within(() => {
    cy.get(".react-select-container").click();
  });
  cy.get(".react-select__menu").should("be.visible");
  cy.get(".react-select__option").contains(state).click();

  // Select district using React-Select
  cy.get('[data-cy="district-dropdown"]').within(() => {
    cy.get(".react-select-container").click();
  });
  cy.get(".react-select__menu").should("be.visible");
  cy.get(".react-select__option").contains(district).click();

  // Wait for cities to load
  cy.wait("@listCities");

  // Select city using React-Select
  cy.get('[data-cy="city-dropdown"]').within(() => {
    cy.get(".react-select-container").click();
  });
  cy.get(".react-select__menu").should("be.visible");
  cy.get(".react-select__option").contains(city).click();

  // Wait for schools to load
  cy.wait("@listSchools");

  // Select school using React-Select
  cy.get('[data-cy="school-dropdown"]').within(() => {
    cy.get(".react-select-container").click();
  });
  cy.get(".react-select__menu").should("be.visible");
  cy.get(".react-select__option").contains(school).click();

  // Click proceed button
  cy.get("button.page11-group2").click();
});

// Custom command to select language (Step 4)
Cypress.Commands.add("selectLanguage", (language) => {
  // Select the language
  cy.get(`input[name="language"][value="${language}"]`).check();

  // Click the proceed button
  cy.get(".page4-group2").click();
});

// Custom command to complete registration (Step 5)
Cypress.Commands.add("confirmRegistration", () => {
  // Check terms checkbox
  cy.get('input[name="agreeTerms"]').check();

  // Click submit button
  cy.get(".page5-group2").click();

  // Wait for API call
  cy.wait("@registerTeacher");
});

//! ==========================================
//! MOCK API COMMANDS
//! Use mock APIs during development and for testing edge cases
//! ==========================================

// Custom command to mock OTP send API response (including WhatsApp integration)
Cypress.Commands.add(
  "mockOTPSend",
  (status = "success", phone = "1234567890") => {
    cy.intercept("POST", "**/api/method/tap_lms.api.send_otp", (req) => {
      // Capture the actual request body for validation if needed
      const requestBody = req.body;

      // Return mock response
      req.reply({
        statusCode: 200,
        body: {
          message: {
            status: status,
            message:
              status === "success"
                ? "OTP sent successfully via WhatsApp"
                : "Failed to send OTP",
            whatsapp_message_id:
              status === "success" ? "mock-whatsapp-msg-id-12345" : undefined,
          },
        },
      });
    }).as("sendOTP");
  }
);

// Custom command to mock OTP verification API response
Cypress.Commands.add("mockOTPVerify", (status = "success") => {
  cy.intercept("POST", "**/api/method/tap_lms.api.verify_otp", {
    statusCode: 200,
    body: {
      status: status,
      message:
        status === "success" ? "OTP verified successfully" : "Invalid OTP",
    },
  }).as("verifyOTP");
});

//TODO: command for teacher already reagistered testcase
Cypress.Commands.add("mockOTPSendAlreadyRegistered", () => {
  cy.intercept("POST", "**/api/method/tap_lms.api.send_otp", (req) => {
    req.reply({
      statusCode: 409,
      body: {
        message: {
          status: "failure",
          code: "ALREADY_IN_BATCH",
          teacher_id: "TAP54321",
          batch_id: "BA001",
          message: "You are already registered for this batch",
        },
      },
    });
  }).as("sendOTP"); // Use the same alias as your working command
});

// Custom command to mock schools list API response
Cypress.Commands.add("mockSchoolsList", (hasSchools = true) => {
  cy.intercept("POST", "**/api/method/tap_lms.api.list_schools", {
    statusCode: 200,
    body: hasSchools
      ? {
          status: "success",
          schools: [
            { school_name: "Green Valley School" },
            { school_name: "Test School 2" },
            { school_name: "Test School 3" },
          ],
        }
      : {
          status: "failure",
          message: "No schools found for this city",
        },
  }).as("listSchools");
});

// Custom command to mock teacher registration API response
Cypress.Commands.add(
  "mockTeacherRegistration",
  (status = "success", teacherId = "TAP12345") => {
    cy.intercept("POST", "**/api/method/tap_lms.api.create_teacher_web", {
      statusCode: 200,
      body: {
        message: {
          status: status,
          message:
            status === "success"
              ? "Teacher registered successfully"
              : status === "already_registered"
              ? "A teacher with this phone number already exists"
              : "Registration failed",
          teacher_id: status === "success" ? teacherId : undefined,
          existing_teacher_id:
            status === "already_registered" ? teacherId : undefined,
        },
      },
    }).as("registerTeacher");
  }
);

// Custom command to mock city list API response
Cypress.Commands.add("mockCitiesList", () => {
  cy.intercept("POST", "**/api/method/tap_lms.api.list_cities", {
    statusCode: 200,
    body: {
      message: {
        status: "success",
        data: {
          VANIYAMKULAM: "VANIYAMKULAM",
          OTTAPALAM: "OTTAPALAM",
          PATTAMBI: "PATTAMBI",
          SHORANUR: "SHORANUR",
          Varanasi: "PALAKKAD",
        },
      },
    },
  }).as("listCities");
});

// Custom command to mock WhatsApp keyword API response
Cypress.Commands.add(
  "mockWhatsAppKeyword",
  (useCase = "teacher_web_signup_success") => {
    cy.intercept("POST", "**/api/method/tap_lms.api.get_whatsapp_keyword", {
      statusCode: 200,
      body: {
        message: {
          status: "success",
          keyword:
            useCase === "teacher_web_signup_success"
              ? "tapschool:teacher_success"
              : useCase === "teacher_already_registered"
              ? "tapschool:teacher_already"
              : "tapschool:teacher_failed",
        },
      },
    }).as("getWhatsappKeyword");
  }
);

/**
 * Command to toggle between mock and real APIs
 * This allows you to easily switch between mock and real APIs in your tests
 
 * Example:
      beforeEach(() => {
          // Use mock APIs (default)
          cy.useRealAPIs(false);   
      });

**/
Cypress.Commands.add("useRealAPIs", (useReal = true) => {
  Cypress.env("USE_MOCKS", !useReal);

  const baseApiUrl = Cypress.env("API_BASE_URL");

  const apiEndpoints = {
    sendOTP: "send_otp",
    verifyOTP: "verify_otp",
    listCities: "list_cities",
    listSchools: "list_schools",
    registerTeacher: "create_teacher_web",
    getWhatsappKeyword: "get_whatsapp_keyword",
  };

  if (useReal) {
    Object.entries(apiEndpoints).forEach(([alias, method]) => {
      cy.intercept("POST", `${baseApiUrl}.${method}`).as(alias);
    });
  } else {
    cy.mockOTPSend();
    cy.mockOTPVerify();
    cy.mockCitiesList();
    cy.mockSchoolsList();
    cy.mockTeacherRegistration();
    cy.mockWhatsAppKeyword();
  }
});

//TODO This custom command will call our Cypress task "fetchOTPFromWA"
Cypress.Commands.add("fetchOTPFromWA", () => {
  return cy.task("fetchOTPFromWA");
});
