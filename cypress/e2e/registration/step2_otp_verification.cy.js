describe("Teacher Registration - Step 2: OTP Verification", () => {
  let phoneNumber;

  beforeEach(() => {
    // Set up API mocks (excluding OTP APIs which use real endpoints)
    cy.mockCitiesList();
    cy.mockSchoolsList();
    cy.mockTeacherRegistration();
    cy.mockWhatsAppKeyword();
    cy.useRealAPIs(false);

    // Visit the page teacher register page with a longer timeout
    cy.visitAndWaitForLoad();

    // Wait for the page to be fully loaded
    cy.get(".page11-text16", { timeout: 10000 }).should("be.visible");

    phoneNumber = Cypress.env("OTP_DESTINATION_NUMBER").slice(2);
    // Fill personal info to get to OTP verification step
    cy.fillPersonalInfo("Arjun", "M S", phoneNumber);

    // Wait for OTP to be sent and received (give some time for SMS delivery)
    cy.wait(2000);
  });

  // Helper function to send fresh OTP and wait
  const sendFreshOTP = () => {
    const api_key = Cypress.env("REACT_APP_API_KEY");
    const api_base_url = Cypress.env("API_BASE_URL");
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");

    return cy.request({
      method: "POST",
      url: `${api_base_url}.send_otp`,
      headers: { "Content-Type": "application/json" },
      body: { api_key, phone: otp_destination_number },
    }).then((sendResponse) => {
      expect(sendResponse.status).to.eq(200);
      cy.log("✅ Fresh OTP sent successfully");
      cy.wait(12000); // Wait longer for OTP delivery
    });
  };

  // Helper function to fetch latest OTP
  const fetchLatestOTP = () => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");
    const otp_source_number = Cypress.env("OTP_SOURCE_NUMBER");
    const api_token = Cypress.env("API_TOKEN");

    const get_otp_from_whatsapp_api_endpoint =
      `https://smartschool.prismaticsoft.com/api/resource/WhatsApp%20Message` +
      `?fields=["name","message","creation"]` +
      `&filters=[["message","like","Your OTP is:%"],["source","=","${otp_source_number}"],["direction","=","Incoming"],["destination","=","${otp_destination_number}"]]` +
      `&order_by=creation desc` +
      `&limit=1`;

    return cy.request({
      method: "GET",
      url: get_otp_from_whatsapp_api_endpoint,
      headers: {
        Authorization: `token ${api_token}`,
        "Content-Type": "application/json",
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      const data = response.body.data;
      expect(data).to.have.length.greaterThan(0);
      
      const message = data[0].message;
      const otpMatch = message.match(/Your OTP is[:\- ]*\s*(\d{4})/);
      expect(otpMatch).to.not.be.null;
      
      const otp = otpMatch[1];
      expect(otp).to.have.length(4);
      expect(otp).to.match(/^\d{4}$/);
      
      cy.log(`✅ Fetched fresh OTP: ${otp}`);
      return cy.wrap(otp);
    });
  };

  // Testcase - displays the OTP verification form - working (02-07-2025)
  it("displays the OTP verification form", () => {
    // Check page title and message
    cy.get(".page21-text15").should("contain", "VERIFY");
    cy.get(".page2-text38").should(
      "contain",
      `A 4 digit code has been sent to your mobile number +91 ${phoneNumber}`
    );

    // Check OTP input fields using correct data-cy selectors
    cy.get(".page21-group37272").should("be.visible");
    cy.get('[data-cy="otp-input-1"]').should("be.visible");
    cy.get('[data-cy="otp-input-2"]').should("be.visible");
    cy.get('[data-cy="otp-input-3"]').should("be.visible");
    cy.get('[data-cy="otp-input-4"]').should("be.visible");

    // Check continue button
    cy.get(".page11-group2").should("be.visible");
    cy.get(".page11-group2 .page11-text22").should("contain", "CONTINUE");

    // Check resend timer text or resend link
    cy.get(".page21-text08").should("exist");
  });

  // Testcase - allows entering OTP digits - working (02-07-2025)
  it("allows entering OTP digits", () => {
    // Type into each OTP input field using correct selectors
    cy.get('[data-cy="otp-input-1"]').type("1");
    cy.get('[data-cy="otp-input-2"]').type("2");
    cy.get('[data-cy="otp-input-3"]').type("3");
    cy.get('[data-cy="otp-input-4"]').type("4");

    // Verify each field has the correct value
    cy.get('[data-cy="otp-input-1"]').should("have.value", "1");
    cy.get('[data-cy="otp-input-2"]').should("have.value", "2");
    cy.get('[data-cy="otp-input-3"]').should("have.value", "3");
    cy.get('[data-cy="otp-input-4"]').should("have.value", "4");
  });

  // Testcase - auto-focuses next input after entering a digit - working (02-07-2025)
  it("auto-focuses next input after entering a digit", () => {
    // Type in first field and verify focus moves to second
    cy.get('[data-cy="otp-input-1"]').type("1");
    cy.get('[data-cy="otp-input-2"]').should("be.focused");

    // Type in second field and verify focus moves to third
    cy.get('[data-cy="otp-input-2"]').type("2");
    cy.get('[data-cy="otp-input-3"]').should("be.focused");

    // Type in third field and verify focus moves to fourth
    cy.get('[data-cy="otp-input-3"]').type("3");
    cy.get('[data-cy="otp-input-4"]').should("be.focused");
  });

  // Testcase - fetch OTP from API and use it for verification - working (04-07-2025)
  it("fetches OTP from WhatsApp API and verifies successfully", () => {
    // Set up intercept for verify OTP API call
    cy.intercept('POST', '**/api/method/tap_lms.api.verify_otp', (req) => {
      console.log('📤 OTP Verify Request:', req.body);
      req.continue();
    }).as('verifyOTPRequest');

    // Send fresh OTP
    sendFreshOTP().then(() => {
      // Fetch the OTP
      fetchLatestOTP().then((otp) => {
        // Enter the OTP using the custom command
        cy.enterOTP(otp);

        // Verify OTP was entered correctly
        cy.get('[data-cy="otp-input-1"]').should("have.value", otp[0]);
        cy.get('[data-cy="otp-input-2"]').should("have.value", otp[1]);
        cy.get('[data-cy="otp-input-3"]').should("have.value", otp[2]);
        cy.get('[data-cy="otp-input-4"]').should("have.value", otp[3]);

        // Wait a bit to ensure React state is updated
        cy.wait(2000);
        cy.get('body').click(10, 10); // clicking somewhere to trigger blur

        // Click CONTINUE button after entering OTP
        cy.get("button.page11-group2").should("not.be.disabled");
        cy.get(".page11-text22").should("contain", "CONTINUE");
        cy.get("button.page11-group2").click();

        // Wait for the API call
        cy.wait('@verifyOTPRequest').then((interception) => {
          console.log('📥 OTP Verify Response:', interception.response.body);
        });

        // Verify we proceed to the next step
        cy.get(".page31-text15", { timeout: 15000 }).should(
          "contain",
          "SCHOOL DETAILS"
        );
      });
    });
  });

  // Testcase - handles resend OTP functionality - FIXED
  it("handles resend OTP functionality", () => {
    // Wait 10 seconds between tests that rely on OTP services
    cy.wait(10000);

    // Set up intercepts
    cy.intercept('POST', '**/api/method/tap_lms.api.send_otp').as('resendOTP');

    // First, send an initial OTP to start the timer
    sendFreshOTP().then(() => {
      // Now check the resend functionality
      cy.get(".page21-text08").should("be.visible");

      // Check current state of resend functionality
      cy.get(".page21-text08").then(($el) => {
        if ($el.text().includes("Resend OTP in")) {
          // Timer is running - wait for it to complete or simulate
          cy.log("Timer is running, waiting for resend to become available");
          
          // Wait for resend to become available (with reasonable timeout)
          cy.get(".page21-text08", { timeout: 35000 }).should("contain", "Didn't receive OTP?");
          cy.get(".page21-text31").should("contain", "Resend").click();
          
        } else if ($el.text().includes("Didn't receive OTP?")) {
          // Resend is already available
          cy.get(".page21-text31").should("contain", "Resend").click();
        }
      });

      // Wait for resend API call
      cy.wait('@resendOTP').then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.log("✅ Resend OTP API called successfully");
      });

      // Verify timer has reset (should show "Resend OTP in" again)
      cy.get(".page21-text08", { timeout: 5000 }).should("contain", "Resend OTP in");
      cy.log("✅ Resend functionality working correctly");
    });
  });

  // Testcase - shows loading state during verification - FIXED
  it("shows loading state during verification", () => {
    // // Wait 10 seconds between tests that rely on OTP services
    // cy.wait(10000);

    // Add delay to verify API call to see loading state
    cy.intercept('POST', '**/api/method/tap_lms.api.verify_otp', (req) => {
      // Add artificial delay to see loading state
      return new Promise((resolve) => {
        setTimeout(() => {
          req.continue();
          resolve();
        }, 2000);
      });
    }).as('verifyOTPRequest');

    // Send fresh OTP and fetch it
    sendFreshOTP().then(() => {
      fetchLatestOTP().then((otp) => {
        // Enter OTP using custom command
        cy.enterOTP(otp);

        // Wait for React state update
        cy.wait(2000);
        cy.get('body').click(10, 10);

        // Click continue and immediately check for loading state
        cy.get("button.page11-group2").contains("CONTINUE").click();
        
        // Check for loading/verifying state
        cy.get(".page11-text22").should("contain", "VERIFYING...");
        cy.log("✅ Loading state displayed correctly");

        // Wait for verification to complete
        cy.wait('@verifyOTPRequest');
        
        // Verify we move to next page after loading
        cy.get(".page31-text15", { timeout: 15000 }).should(
          "contain",
          "SCHOOL DETAILS"
        );
        cy.log("✅ Successfully moved to next page after verification");
      });
    });
  });

  afterEach(() => {
    let appStorage = {};

    cy.window().then((win) => {
      appStorage.localStorage = { ...win.localStorage };
      appStorage.sessionStorage = { ...win.sessionStorage };
    });
    cy.getCookies().then((cookies) => {
      appStorage.cookies = cookies;
    });
  });
});

//- DONE FOR NEW UI