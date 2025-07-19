describe("Teacher Registration - Step 4: Language Selection", () => {
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


    // cy.mockCitiesList();
    // cy.mockSchoolsList();


    cy.useRealAPIs(true);



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
        cy.get(".react-select__option").contains("UTTAR PRADESH").click();

        cy.get('[data-cy="district-dropdown"] .react-select-container').click();
        cy.get(".react-select__menu").should("be.visible");
        cy.get(".react-select__option").contains("Varanasi").click();

        // Wait for cities to load
        cy.wait("@listCities");

        cy.get('[data-cy="city-dropdown"] .react-select-container').click();
        cy.get(".react-select__menu").should("be.visible");
        cy.get(".react-select__option").contains("City 1:Varanasi").click();

        cy.wait("@listSchools");

        cy.get('[data-cy="school-dropdown"] .react-select-container').click();
        cy.get(".react-select__menu").should("be.visible");
        cy.get(".react-select__option").contains("Green Valley School").click();

        cy.get("button.page11-group2").click();

        // Wait for language selection page
        cy.get(".page4-text11", { timeout: 15000 }).should(
          "contain",
          "LANGUAGE PREFERENCE"
        );
        cy.log("✅ Successfully reached language selection step");
      });
    });
  });

  //! Testcase: Language Selection Form Displayed or not
  it("displays the language selection form", () => {
    // Check heading and instruction text
    cy.get(".page4-text11").should("contain", "LANGUAGE PREFERENCE");
    cy.get(".page4-text08").should(
      "contain",
      "Select the language you would like to use with TAP Buddy"
    );

    // Check all radio buttons are present
    cy.get(".page4-radiobuttons").within(() => {
      cy.get('input[name="language"][value="Hindi"]').should("be.visible");
      cy.get('input[name="language"][value="Marathi"]').should("be.visible");
      cy.get('input[name="language"][value="English"]').should("be.visible");
      cy.get('input[name="language"][value="Punjabi"]').should("be.visible");
    });

    // Check proceed button
    cy.get(".page4-group2").should("be.visible");
    cy.get(".page4-text10").should("contain", "PROCEED");
  });

  //! Testcase: Show Error when no Language is selected
  it("validates language selection before proceeding", () => {
    // Try to proceed without selecting a language
    cy.get(".page4-group2").click();

    // Check for the error message inside the .lang-error div
    cy.get(".lang-error .error").should("be.visible");
    cy.get(".lang-error .error").should("contain", "Please select a language");
  });

  //! Testcase: Test selection of languages
  it("allows selecting different languages", () => {
    // Test each language option
    const languages = ["Hindi", "Marathi", "English", "Punjabi"];

    languages.forEach((language) => {
      cy.get(`input[name="language"][value="${language}"]`).check();
      cy.get(`input[name="language"][value="${language}"]`).should(
        "be.checked"
      );
    });
  });

  //! Testcase - Proceed to preview when language is selected
  it("proceeds to preview when language is selected", () => {
    // Select a language
    cy.get('input[name="language"][value="English"]').check();

    // Click proceed
    cy.get(".page4-group2").click();

    // Should now be on Step 5 (Preview)
    cy.get(".page5-text54", { timeout: 15000 }).should(
      "contain",
      "PREVIEW INFORMATION"
    );
  });

  //! Testcase: Verify language selection persists
  it("maintains language selection when changing options", () => {
    // Select Hindi first
    cy.get('input[name="language"][value="Hindi"]').check();
    cy.get('input[name="language"][value="Hindi"]').should("be.checked");

    // Then change to English
    cy.get('input[name="language"][value="English"]').check();
    cy.get('input[name="language"][value="English"]').should("be.checked");

    // Hindi should no longer be checked
    cy.get('input[name="language"][value="Hindi"]').should("not.be.checked");

    // Change back to Hindi
    cy.get('input[name="language"][value="Hindi"]').check();
    cy.get('input[name="language"][value="Hindi"]').should("be.checked");

    // English should no longer be checked
    cy.get('input[name="language"][value="English"]').should("not.be.checked");
  });

  //! Testcase: Verify radio button state and associated text
  it("shows proper state for selected language", () => {
    // Select English
    cy.get('input[name="language"][value="English"]').check();

    // Verify the radio button is checked
    cy.get('input[name="language"][value="English"]').should("be.checked");

    // Verify the associated text is visible - find the label that contains English
    cy.get(".page4-radiobuttons").within(() => {
      cy.contains("English").should("be.visible");
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

//- DONE for live server