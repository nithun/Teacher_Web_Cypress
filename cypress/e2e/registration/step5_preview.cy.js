describe("Teacher Registration - Step 5: Preview and Submit", () => {
  // Helper function to send fresh OTP and wait
  const sendFreshOTP = () => {
    const api_key = Cypress.env("REACT_APP_API_KEY");
    const api_base_url = Cypress.env("API_BASE_URL");
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");

    return cy
      .request({
        method: "POST",
        url: `${api_base_url}.send_otp`,
        headers: { "Content-Type": "application/json" },
        body: { api_key, phone: otp_destination_number },
      })
      .then((sendResponse) => {
        expect(sendResponse.status).to.eq(200);
        cy.log("✅ Fresh OTP sent successfully");
        cy.wait(12000); // Wait for OTP delivery
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
        expect(data).to.have.length.greaterThan(0);
        const message = data[0].message;
        const otpMatch = message.match(/Your OTP is[:\- ]*\s*(\d{4})/);
        expect(otpMatch).to.not.be.null;
        const otp = otpMatch[1];
        cy.log(`✅ Fetched fresh OTP: ${otp}`);
        return cy.wrap(otp);
      });
  };

  beforeEach(() => {
    cy.visitAndWaitForLoad();
    cy.mockCitiesList();
    cy.mockSchoolsList();
    cy.mockTeacherRegistration();
    cy.mockWhatsAppKeyword();
    cy.useRealAPIs(false);

    const phoneNumber = Cypress.env("OTP_DESTINATION_NUMBER").slice(2);
    cy.fillPersonalInfo("Arjun", "M S", phoneNumber);

    sendFreshOTP().then(() => {
      fetchLatestOTP().then((otp) => {
        // Set up intercept for verify OTP API call
        cy.intercept("POST", "**/api/method/tap_lms.api.verify_otp", (req) => {
          console.log("📤 OTP Verify Request:", req.body);
          req.continue();
        }).as("verifyOTPRequest");

        cy.enterOTP(otp);

        // Wait a bit to ensure React state is updated
        cy.wait(2000);
        cy.get("body").click(10, 10); // clicking somewhere to trigger blur

        // Click CONTINUE button after entering OTP
        cy.get("button.page11-group2").should("not.be.disabled");
        cy.get(".page11-text22").should("contain", "CONTINUE");
        cy.get("button.page11-group2").click();

        // Wait for the API call to complete
        cy.wait("@verifyOTPRequest").then((interception) => {
          console.log("📥 OTP Verify Response:", interception.response.body);
        });

        cy.get(".page31-text15", { timeout: 20000 }).should(
          "contain",
          "SCHOOL DETAILS"
        );

        // Complete school selection
        cy.get('[data-cy="state-dropdown"] .react-select-container').click();
        cy.get(".react-select__menu").should("be.visible");
        cy.get(".react-select__option").contains("KERALA").click();

        cy.get('[data-cy="district-dropdown"] .react-select-container').click();
        cy.get(".react-select__menu").should("be.visible");
        cy.get(".react-select__option").contains("Palakkad").click();

        // Wait for cities to load
        cy.wait("@listCities");

        cy.get('[data-cy="city-dropdown"] .react-select-container').click();
        cy.get(".react-select__menu").should("be.visible");
        cy.get(".react-select__option").contains("VANIYAMKULAM").click();

        cy.wait("@listSchools");

        cy.get('[data-cy="school-dropdown"] .react-select-container').click();
        cy.get(".react-select__menu").should("be.visible");
        cy.get(".react-select__option").contains("Test School 1").click();

        cy.get("button.page11-group2").click();

        // Wait for language selection page
        cy.get(".page4-text11", { timeout: 15000 }).should(
          "contain",
          "LANGUAGE PREFERENCE"
        );

        // Select language and proceed to preview
        cy.get('input[name="language"][value="English"]').check();
        cy.get(".page4-group2").click();

        // Wait for preview page
        cy.get(".page5-text54", { timeout: 15000 }).should(
          "contain",
          "PREVIEW INFORMATION"
        );
        cy.log("✅ Successfully reached preview step");
      });
    });
  });

  //! Testcase - displays the preview form with correct information
  it("displays the preview form with correct information", () => {
    const phoneNumber = Cypress.env("OTP_DESTINATION_NUMBER").slice(2);

    // Check heading
    cy.get(".page5-text54").should("contain", "PREVIEW INFORMATION");

    // Check personal information section
    cy.get(".page5-group40").within(() => {
      cy.get(".page5-text08").should("contain", phoneNumber);
      cy.get(".page5-text14").should("contain", "Arjun M S");
      cy.get(".page5-text18").should("contain", "PERSONAL DETAILS");
    });

    // Check school information section
    cy.get(".page5-group37284").within(() => {
      cy.get(".page5-text22").should("contain", "SCHOOL DETAILS");
      cy.get(".page5-text26").should("contain", "KERALA");
      cy.get(".page5-text30").should("contain", "Palakkad");
      cy.get(".page5-text34").should("contain", "VANIYAMKULAM");
      cy.get(".page5-text38").should("contain", "Test School 1");
    });

    // Check language preference
    cy.get(".page5-group36").within(() => {
      cy.get(".page5-text42").should("contain", "English");
      cy.get(".page5-text46").should("contain", "LANGUAGE PREFERENCE");
    });

    // Check terms checkbox and submit button
    cy.get('input[name="agreeTerms"].page5-check').should("be.visible");
    cy.get(".page5-group2").should("be.visible");
    cy.get(".page5-text02").should("contain", "REGISTER");
  });

  //! Testcase - requires agreement to terms before submission
  it("requires agreement to terms before submission", () => {
    // Try to submit without checking terms
    cy.get(".page5-group2").click();

    // Should show validation error
    cy.get(".preview-error .error")
      .should("be.visible")
      .and("contain", "Please agree to the terms");
  });

  //! Testcase - allows navigation to previous steps using edit links
  it("allows navigation to previous steps using edit links", () => {
    // Click the edit link for language preference
    cy.get(".page5-text44").click();

    // Should go back to Step 4 (Language Selection)
    cy.get(".page4-text11").should("contain", "LANGUAGE PREFERENCE");

    // Go back to preview
    cy.get(".page4-group2").click();

    // Click the edit link for school details
    cy.get(".page5-text20").click();

    // Should go back to Step 3 (School Selection)
    cy.get(".page31-text15").should("contain", "SCHOOL DETAILS");

    // Go back to preview
    cy.get("button.page11-group2").click();
    cy.get(".page4-group2").click();

    // Click the edit link for personal details
    cy.get(".page5-text16").click();

    // Should go back to Step 1 (Personal Information)
    cy.get(".page11-text24").should("contain", "PERSONAL DETAILS");
  });

  //! Testcase - submits the form successfully
  it("submits the form successfully", () => {
    // First verify the button is initially enabled and shows "REGISTER"
    cy.get(".page5-group2").should("be.visible").and("not.be.disabled");
    cy.get(".page5-text02").should("contain", "REGISTER");

    // Check terms and submit
    cy.get('input[name="agreeTerms"].page5-check').check();

    // Click submit and verify it shows "REGISTERING..." immediately after click
    cy.get(".page5-group2")
      .click()
      .then(($btn) => {
        // This runs synchronously right after the click
        expect($btn.text()).to.include("REGISTERING...");
      });

    // Wait for API call to complete
    cy.wait("@registerTeacher");

    //- cy.wait("@getWhatsappKeyword");

    // Wait for loading state to disappear if it exists
    cy.get(".loading-state").should("not.exist");

    // Verify we're now on the StatusPage by checking for its content
    cy.get(".page6-text06").should("contain", "Registered Successfully");
    cy.get(".page6-text").should(
      "contain",
      "Thank you for registering with TAP Buddy"
    );
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