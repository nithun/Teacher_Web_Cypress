describe("Teacher Registration - End to End Flow", () => {
  beforeEach(() => {
    // Use real APIs for OTP
    cy.useRealAPIs(true);

    // Visit the page with a longer timeout
    cy.visitAndWaitForLoad();
  });

  //TODO: Helper function to handle OTP flow (extracted from working test)
  const handleOTPFlow = (firstName, lastName, phoneNumber, userType) => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");
    const otp_source_number = Cypress.env("OTP_SOURCE_NUMBER");
    const api_token = Cypress.env("API_TOKEN");
    const api_key = Cypress.env("REACT_APP_API_KEY");

    // Step 1: Fill personal information (this will automatically trigger OTP sending)
    cy.get(".page11-text24").should("contain", "PERSONAL DETAILS");
    cy.fillPersonalInfo(firstName, lastName, phoneNumber, userType);

    // Wait for the automatic OTP API call to complete
    cy.wait("@sendOTP", { timeout: 15000 }).then((interception) => {
      cy.log(`📟 Status Code: ${interception.response.statusCode}`);
      cy.log(`📝 Status Text: ${interception.response.statusText}`);
      cy.log(
        `📤 Send OTP Response: ${JSON.stringify(interception.response.body)}`
      );

      if (interception.response.statusCode !== 200) {
        cy.log(`❌ API Error: ${interception.response.statusCode}`);
        if (interception.response.body?.message) {
          cy.log(`📋 Error Message: ${interception.response.body.message}`);
        }
        if (interception.response.body?.exc_type) {
          cy.log(`🚨 Exception Type: ${interception.response.body.exc_type}`);
        }
      }

      if (interception.response.statusCode === 200) {
        cy.log("✅ OTP send request successful!");
      } else {
        cy.log("⚠️ OTP send request failed, but continuing...");
      }
    });

    // Wait for OTP to be sent and received
    cy.log("⏳ Waiting for OTP delivery...");
    cy.wait(10000);

    const get_otp_from_whatsapp_api_endpoint =
      `https://smartschool.prismaticsoft.com/api/resource/WhatsApp%20Message` +
      `?fields=["name","message"]` +
      `&filters=[["message","like","Your OTP is:%"],["source","=","${otp_source_number}"],["direction","=","Incoming"],["destination","=","${otp_destination_number}"]]` +
      `&order_by=creation desc` +
      `&limit=1`;

    // Get OTP from API and enter it
    return cy
      .request({
        method: "GET",
        url: get_otp_from_whatsapp_api_endpoint,
        headers: {
          Authorization: `token ${api_token}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        expect(response.status).to.eq(200);

        const data = response.body.data;
        cy.log("\n  DATA: " + JSON.stringify(data));
        console.log(" DATA: " + JSON.stringify(data));
        if (!data || !data.length) {
          throw new Error("No OTP message found");
        }

        const message = data[0].message;
        cy.log(`\n  Message:  ${message}`);

        // Extract OTP using regex (4 digits)
        const otpMatch = message.match(/Your OTP is[:\- ]*\s*(\d{4})/);
        cy.log(`\n  OTP MATCH : ${otpMatch}`);
        if (!otpMatch) {
          throw new Error("OTP not found in message");
        }

        const otp = otpMatch[1];

        // Enter OTP
        cy.contains("VERIFY").should("be.visible");
        cy.get(".page21-rectangle2 .otp-input").should("be.visible");
        cy.enterOTP(otp);

        // Verify OTP fields are filled
        cy.get(".page21-rectangle2 .otp-input").should("have.value", otp[0]);
        cy.get(".page21-rectangle3 .otp-input").should("have.value", otp[1]);
        cy.get(".page21-rectangle4 .otp-input").should("have.value", otp[2]);
        cy.get(".page21-rectangle5 .otp-input").should("have.value", otp[3]);

        // Click continue button after entering OTP
        cy.get("button.page11-group2").contains("CONTINUE").click();

        // Wait for school details page
        cy.get(".page31-text15", { timeout: 15000 }).should(
          "contain",
          "SCHOOL DETAILS"
        );

        return cy.wrap(otp);
      });
  };

  //TODO: Helper function to complete school selection
  const completeSchoolSelection = () => {
    // Select state using React-Select
    cy.get('[data-cy="state-dropdown"]').within(() => {
      cy.get(".react-select-container").click();
    });
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("UTTAR PRADESH").click();

    // Select district using React-Select
    cy.get('[data-cy="district-dropdown"]').within(() => {
      cy.get(".react-select-container").click();
    });
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("Varanasi").click();

    // Wait for cities to load
    cy.wait("@listCities");

    // Select city using React-Select
    cy.get('[data-cy="city-dropdown"]').within(() => {
      cy.get(".react-select-container").click();
    });
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("City 1:Varanasi").click();

    cy.wait("@listSchools");

    // Select school using React-Select
    cy.get('[data-cy="school-dropdown"]').within(() => {
      cy.get(".react-select-container").click();
    });
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("Green Valley School").click();

    // Click proceed button
    cy.get("button.page11-group2").click();
  };

  //TODO: Helper function to complete language selection
  const completeLanguageSelection = () => {
    cy.get(".page4-text11").should("contain", "LANGUAGE PREFERENCE");
    cy.get('input[name="language"][value="English"]').check();
    cy.get(".page4-group2").click();
  };

  //!- TESTCASE: completes the entire registration process successfully - with validation checks
  it("handles registration failure scenario", () => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");

    handleOTPFlow(
      "Arjun",
      "M S",
      otp_destination_number.slice(2),
      "teacher"
    ).then(() => {
      completeSchoolSelection();
      completeLanguageSelection();

      // Temporarily mock just the registration API to simulate failure
      cy.intercept("POST", "**/api/method/tap_lms.api.create_teacher_web", {
        statusCode: 500,
        body: {
          message: {
            status: "failure",
            message: "Internal server error",
          },
        },
      }).as("registerTeacher");

      // Submit form
      cy.get('input[name="agreeTerms"]').check();
      cy.get(".page5-group2").click();

      // Wait for API calls
      cy.wait("@registerTeacher");

      // Verify error page
      cy.get(".loading-state").should("not.exist");
      cy.get(".page6-text06").should("contain", "Oops! Something went wrong");
      cy.get(".page6-text").should(
        "contain",
        "Click on the button below to contact support"
      );
      cy.get(".page6-text08").should("contain", "CONTACT SUPPORT");
    });
  });

  //!- TESTCASE: handles registration failure scenario - validation checks
  it("completes the entire registration process successfully with validation checks", () => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");

    // === VALIDATION CHECK 1: Personal Details ===
    cy.get(".page11-text24").should("contain", "PERSONAL DETAILS");

    // Try to proceed without filling required fields
    cy.get("button.page11-group2").click();
    cy.get(".page11-container")
      .contains(/first name is required|please enter your first name/i)
      .should("be.visible");
    cy.log("✅ Personal details validation working");

    // Now proceed with the normal flow
    handleOTPFlow(
      "Arjun",
      "M S",
      otp_destination_number.slice(2),
      "teacher"
    ).then(() => {
      // === VALIDATION CHECK 2: School Details ===
      cy.get(".page31-text15").should("contain", "SCHOOL DETAILS");

      // Try to proceed without selecting school info
      cy.get("button.page11-group2").click();
      cy.get(".error").contains("State is required").should("be.visible");
      cy.get(".error").contains("District is required").should("be.visible");
      cy.get(".error").contains("City is required").should("be.visible");
      cy.get(".error").contains("School is required").should("be.visible");
      cy.log("✅ School details validation working");

      // Complete school selection
      completeSchoolSelection();

      // === VALIDATION CHECK 3: Language Selection ===
      cy.get(".page4-text11").should("contain", "LANGUAGE PREFERENCE");

      // Try to proceed without selecting language
      cy.get(".page4-group2").click();
      cy.get(".lang-error .error")
        .should("be.visible")
        .and("contain", "Please select a language");
      cy.log("✅ Language selection validation working");

      // Complete language selection
      completeLanguageSelection();

      // === VALIDATION CHECK 4: Terms Agreement ===
      cy.get(".page5-text54").should("contain", "PREVIEW INFORMATION");

      // Try to submit without agreeing to terms
      cy.get(".page5-group2").click();
      cy.get(".preview-error .error")
        .should("be.visible")
        .and("contain", "Please agree to the terms");
      cy.log("✅ Terms agreement validation working");

      // === CONTINUE WITH NORMAL SUCCESS FLOW ===
      // Verify preview information
      cy.get(".page5-group40").within(() => {
        cy.log(`otp_destination_number: ${otp_destination_number}`);
        cy.get(".page5-text08").should(
          "contain",
          otp_destination_number.slice(2)
        );
        cy.get(".page5-text14").should("contain", "Arjun M S");
      });

      cy.get(".page5-group37284").within(() => {
        cy.get(".page5-text26").should("contain", "UTTAR PRADESH");
        cy.get(".page5-text30").should("contain", "Varanasi");
        cy.get(".page5-text34").should("contain", "City 1:Varanasi");
        cy.get(".page5-text38").should("contain", "Green Valley School");
      });

      cy.get(".page5-group36").within(() => {
        cy.get(".page5-text42").should("contain", "English");
      });

      // Check terms and submit
      cy.get('input[name="agreeTerms"]').check();
      cy.get(".page5-group2").click();

      // Wait for API calls to complete
      cy.wait("@registerTeacher");

      // Step 6: Verify success page (StatusPage)
      cy.get(".loading-state").should("not.exist");
      cy.get(".page6-text06").should("contain", "Registered Successfully");
      cy.get(".page6-text").should(
        "contain",
        "Thank you for registering with TAP Buddy"
      );
      cy.get(".page6-text08").should("contain", "Go to TAP Buddy");
      cy.get(".page6-group12").should("be.visible");

      cy.log("🎉 Complete flow with validation checks passed!");
    });
  });

  //!- TESTCASE: handles already registered scenario
  it("handles already registered scenario and verifies 409 API response", () => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");
    const api_base_url = Cypress.env("API_BASE_URL");

    // Mock the OTP endpoint to return 409 for already registered users
    cy.mockOTPSendAlreadyRegistered();

    // Fill form and submit (this will trigger the API call)
    cy.get(".page11-text24").should("contain", "PERSONAL DETAILS");
    cy.fillPersonalInfo(
      "Arjun",
      "M S",
      otp_destination_number.slice(2),
      "teacher"
    );

    // Wait for and validate the intercepted API call
    cy.wait("@sendOTP", { timeout: 15000 }).then((interception) => {
      expect(interception.response.statusCode).to.eq(409);

      const message = interception.response.body.message;
      expect(message).to.have.property("status", "failure");
      expect(message).to.have.property("code", "ALREADY_IN_BATCH");

      console.log("✅ 409 Conflict handled correctly");
    });

    // Validate UI response to the 409 error
    cy.get(".loading-state", { timeout: 20000 }).should("not.exist");

    cy.get(".page6-text06", { timeout: 20000 })
      .should("be.visible")
      .and("contain", "You are already registered 🤓");

    cy.get(".page6-text").should(
      "contain",
      "Click on the button below to continue with TAP Buddy"
    );

    cy.get(".page6-text08").should("contain", "Go to TAP Buddy");
    cy.get(".page6-group12").should("be.visible");
  });
});

//-  DONE for live server
