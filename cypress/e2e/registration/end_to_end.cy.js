describe("Teacher Registration - End to End Flow", () => {
  beforeEach(() => {
    // Set up API mocks before visiting the page (excluding OTP mocks)
    cy.mockCitiesList();
    cy.mockSchoolsList();
    cy.mockTeacherRegistration();
    cy.mockWhatsAppKeyword();

    // Use real APIs for OTP
    cy.useRealAPIs(false);

    // Visit the page with a longer timeout
    cy.visitAndWaitForLoad();
  });
  
  //TODO: Helper function to handle OTP flow (extracted from working test)
  const handleOTPFlow = (firstName, lastName, phoneNumber, userType) => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");
    const otp_source_number = Cypress.env("OTP_SOURCE_NUMBER");
    const api_token = Cypress.env("API_TOKEN");
    const api_key = Cypress.env("REACT_APP_API_KEY");

    // Step 1: Fill personal information
    cy.get(".page11-text24").should("contain", "PERSONAL DETAILS");
    cy.fillPersonalInfo(firstName, lastName, phoneNumber, userType);

    // Send OTP through real API
    const sendOtpEndpoint = `${Cypress.env("API_BASE_URL")}.send_otp`;
  
    cy.log("📤 Sending OTP via API...");
    cy.log(`📞 Phone: ${otp_destination_number}`);
    cy.log(`🌐 Endpoint: ${sendOtpEndpoint}`);
    
    return cy.request({
      method: "POST",
      url: sendOtpEndpoint,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        api_key: api_key,
        phone: otp_destination_number,
      },
      failOnStatusCode: false,
    }).then((sendResponse) => {
      cy.log(`📟 Status Code: ${sendResponse.status}`);
      cy.log(`📝 Status Text: ${sendResponse.statusText}`);
      cy.log(`📤 Send OTP Body: ${JSON.stringify(sendResponse.body)}`);

      if (sendResponse.status !== 200) {
        cy.log(`❌ API Error: ${sendResponse.status}`);
        if (sendResponse.body?.message) {
          cy.log(`📋 Error Message: ${sendResponse.body.message}`);
        }
        if (sendResponse.body?.exc_type) {
          cy.log(`🚨 Exception Type: ${sendResponse.body.exc_type}`);
        }
      }

      if (sendResponse.status === 200) {
        cy.log("✅ OTP send request successful!");
      } else {
        cy.log("⚠️ OTP send request failed, but continuing...");
      }

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
    });
  };

  //TODO: Helper function to complete school selection
  const completeSchoolSelection = () => {
    // Select state using React-Select
    cy.get('[data-cy="state-dropdown"]').within(() => {
      cy.get(".react-select-container").click();
    });
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("KERALA").click();

    // Select district using React-Select
    cy.get('[data-cy="district-dropdown"]').within(() => {
      cy.get(".react-select-container").click();
    });
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("Palakkad").click();

    // Wait for cities to load
    cy.wait("@listCities");

    // Select city using React-Select
    cy.get('[data-cy="city-dropdown"]').within(() => {
      cy.get(".react-select-container").click();
    });
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("VANIYAMKULAM").click();

    cy.wait("@listSchools");

    // Select school using React-Select
    cy.get('[data-cy="school-dropdown"]').within(() => {
      cy.get(".react-select-container").click();
    });
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("Test School 1").click();

    // Click proceed button
    cy.get("button.page11-group2").click();
  };

  //TODO: Helper function to complete language selection
  const completeLanguageSelection = () => {
    cy.get(".page4-text11").should("contain", "LANGUAGE PREFERENCE");
    cy.get('input[name="language"][value="English"]').check();
    cy.get(".page4-group2").click();
  };

  //! TESTCASE: completes the entire registration process successfully
  it("completes the entire registration process successfully", () => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");

    handleOTPFlow("Arjun", "M S", otp_destination_number.slice(2), "teacher").then(() => {
      completeSchoolSelection();
      completeLanguageSelection();

      // Step 5: Preview and submit
      cy.get(".page5-text54").should("contain", "PREVIEW INFORMATION");

      // Verify preview information
      cy.get(".page5-group40").within(() => {
        cy.log(`otp_destination_number: ${otp_destination_number}`)
        cy.get(".page5-text08").should("contain", otp_destination_number.slice(2));
        cy.get(".page5-text14").should("contain", "Arjun M S");
      });

      cy.get(".page5-group37284").within(() => {
        cy.get(".page5-text26").should("contain", "KERALA");
        cy.get(".page5-text30").should("contain", "Palakkad");
        cy.get(".page5-text34").should("contain", "VANIYAMKULAM");
        cy.get(".page5-text38").should("contain", "Test School 1");
      });

      cy.get(".page5-group36").within(() => {
        cy.get(".page5-text42").should("contain", "English");
      });

      // Check terms and submit
      cy.get('input[name="agreeTerms"]').check();
      cy.get(".page5-group2").click();

      // Wait for API calls to complete
      cy.wait("@registerTeacher");

      //- cy.wait("@getWhatsappKeyword");  // THIS IS NOT IMPLEMENTED YET

      // Step 6: Verify success page (StatusPage)
      cy.get(".loading-state").should("not.exist");
      cy.get(".page6-text06").should("contain", "Registered Successfully");
      cy.get(".page6-text").should(
        "contain",
        "Thank you for registering with TAP Buddy"
      );
      cy.get(".page6-text08").should("contain", "Go to TAP Buddy");
      cy.get(".page6-group12").should("be.visible");

      // // Verify WhatsApp link
      // cy.get(".page6-link")
      //   .should("have.attr", "href")
      //   .and("include", "tapschool:teacher_success");
    });
  });

  //! TESTCASE: handles already registered scenario
  it("handles already registered scenario", () => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");

    // Override the mock to return already registered status
    cy.mockTeacherRegistration("already_registered", "TAP54321");
    cy.mockWhatsAppKeyword("teacher_already_registered");

    handleOTPFlow("Arjun", "M S", otp_destination_number.slice(2), "teacher").then(() => {
      completeSchoolSelection();
      completeLanguageSelection();

      // Submit form
      cy.get('input[name="agreeTerms"]').check();
      cy.get(".page5-group2").click();

      // Wait for API calls
      cy.wait("@registerTeacher");
      //- cy.wait("@getWhatsappKeyword");

      // Verify already registered page
      cy.get(".loading-state").should("not.exist");
      cy.get(".page6-text06").should("contain", "You are already registered");
      cy.get(".page6-text").should(
        "contain",
        "Click on the button below to continue with TAP Buddy"
      );
      cy.get(".page6-text08").should("contain", "Go to TAP Buddy");
    });
  });

  //! TESTCASE: handles registration failure scenario
  it("handles registration failure scenario", () => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");

    // Override the mock to return failure status
    cy.mockTeacherRegistration("failure");
    cy.mockWhatsAppKeyword("teacher_web_signup_failed");

    handleOTPFlow("Arjun", "M S", otp_destination_number.slice(2), "teacher").then(() => {
      completeSchoolSelection();
      completeLanguageSelection();

      // Submit form
      cy.get('input[name="agreeTerms"]').check();
      cy.get(".page5-group2").click();

      // Wait for API calls
      cy.wait("@registerTeacher");
      //- cy.wait("@getWhatsappKeyword");

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

  //! TESTCASE: validates user inputs at each step
  it("validates user inputs at each step", () => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");

    // Step 1: Try to proceed without filling required fields
    cy.get("button.page11-group2").click();
    cy.get(".page11-container")
      .contains(/first name is required|please enter your first name/i)
      .should("be.visible");

    // Complete OTP flow with valid data
    handleOTPFlow("Arjun", "M S", otp_destination_number.slice(2), "teacher").then(() => {
      // Step 3: Try to proceed without selecting school info
      cy.get("button.page11-group2").click();
      cy.get(".error").contains("State is required").should("be.visible");
      cy.get(".error").contains("District is required").should("be.visible");
      cy.get(".error").contains("City is required").should("be.visible");
      cy.get(".error").contains("School is required").should("be.visible");

      // Select school info correctly
      completeSchoolSelection();

      // Step 4: Try to proceed without selecting language
      cy.get(".page4-group2").click();
      cy.get(".lang-error .error")
        .should("be.visible")
        .and("contain", "Please select a language");

      // Select language and proceed
      completeLanguageSelection();

      // Step 5: Try to submit without agreeing to terms
      cy.get(".page5-group2").click();
      cy.get(".preview-error .error")
        .should("be.visible")
        .and("contain", "Please agree to the terms");

      // Agree to terms and submit
      cy.get('input[name="agreeTerms"]').check();
      cy.get(".page5-group2").click();

      // Wait for API calls
      cy.wait("@registerTeacher");
      //- cy.wait("@getWhatsappKeyword");

      // Verify success page
      cy.get(".loading-state").should("not.exist");
      cy.get(".page6-text06").should("be.visible");
    });
  });
});

//- DONE - for new UI