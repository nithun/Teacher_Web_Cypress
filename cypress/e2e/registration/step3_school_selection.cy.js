describe("Teacher Registration - Step 3: School Selection", () => {
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
      `?fields=[\"name\",\"message\",\"creation\"]` +
      `&filters=[[\"message\",\"like\",\"Your OTP is:%\"],[\"source\",\"=\",\"${otp_source_number}\"],[\"direction\",\"=\",\"Incoming\"],[\"destination\",\"=\",\"${otp_destination_number}\"]]` +
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
    cy.useRealAPIs(false);

    const phoneNumber = Cypress.env("OTP_DESTINATION_NUMBER").slice(2);
    cy.fillPersonalInfo("Arjun", "M S", phoneNumber, "teacher");

    sendFreshOTP().then(() => {
      fetchLatestOTP().then((otp) => {
        // Set up intercept for verify OTP API call
        cy.intercept('POST', '**/api/method/tap_lms.api.verify_otp', (req) => {
          console.log('📤 OTP Verify Request:', req.body);
          req.continue();
        }).as('verifyOTPRequest');

        cy.enterOTP(otp);

        // Wait a bit to ensure React state is updated
        cy.wait(2000);
        cy.get('body').click(10, 10); // clicking somewhere to trigger blur

        
        // Click CONTINUE button after entering OTP
        cy.get("button.page11-group2").should("not.be.disabled");
        cy.get(".page11-text22").should("contain", "CONTINUE");
        cy.get("button.page11-group2").click();

        // Wait for the API call to complete
        cy.wait('@verifyOTPRequest').then((interception) => {
          console.log('📥 OTP Verify Response:', interception.response.body);
        });

        cy.get(".page31-text15", { timeout: 20000 }).should(
          "contain",
          "SCHOOL DETAILS" //- GETTING ERROR WHEN DOING THIS
        );
        cy.log("✅ Successfully moved to next page after verification");
      });
    });
  });

  //! Testcase : Displays the School Selection Form
  it("displays the school selection form", () => {
    cy.get(".page31-text15").should("contain", "SCHOOL DETAILS");
    cy.get('[data-cy="state-dropdown"] .react-select-container').should(
      "be.visible"
    );
    cy.get('[data-cy="district-dropdown"] .react-select-container').should(
      "be.visible"
    );
    cy.get('[data-cy="city-dropdown"] .react-select-container').should(
      "be.visible"
    );
    cy.get('[data-cy="school-dropdown"] .react-select-container').should(
      "be.visible"
    );
    cy.get("button.page11-group2").should("be.visible");
    cy.get(".page11-text22").should("contain", "PROCEED");
  });

  //! Testcase : Validates Req. Fields (state,city,school)
  it("validates required fields before proceeding", () => {
    // Try to proceed without selecting required fields
    cy.get("button.page11-group2").click();

    // Should show validation errors
    cy.get(".error").should("be.visible");
    cy.get(".error").contains("State is required").should("be.visible");
    cy.get(".error").contains("District is required").should("be.visible");
    cy.get(".error").contains("City is required").should("be.visible");
    cy.get(".error").contains("School is required").should("be.visible");
  });

  //! Testcase : Whether Schools Load when State and City are selected
  it("loads schools when state and city are selected", () => {
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

    // Should trigger the API call
    cy.wait("@listSchools");

    cy.get('[data-cy="school-dropdown"] .react-select-container').click();
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").should("have.length.at.least", 1);
  });

  //! Testcase : Show message when no schools are found
  it("shows message when no schools are found", () => {
    // Override the mock to return no schools
    cy.mockSchoolsList(false);
    cy.get('[data-cy="state-dropdown"] .react-select-container').click();
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("KERALA").click();
    cy.get('[data-cy="district-dropdown"] .react-select-container').click();
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("Palakkad").click();
    cy.wait("@listCities");
    cy.get('[data-cy="city-dropdown"] .react-select-container').click();
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("VANIYAMKULAM").click();

    cy.wait("@listSchools");
    cy.get(".error-message").should("be.visible");
    cy.get(".error-message")
      .contains(/no schools found|not available/i)
      .should("be.visible");
  });

  //! Testcase: Proceeds to language selection when form is valid
  it("proceeds to language selection when form is valid", () => {
    cy.get('[data-cy="state-dropdown"] .react-select-container').click();
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("KERALA").click();
    cy.get('[data-cy="district-dropdown"] .react-select-container').click();
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("Palakkad").click();
    cy.wait("@listCities");
    cy.get('[data-cy="city-dropdown"] .react-select-container').click();
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("VANIYAMKULAM").click();

    cy.wait("@listSchools");
    cy.get('[data-cy="school-dropdown"] .react-select-container').click();
    cy.get(".react-select__menu").should("be.visible");
    cy.get(".react-select__option").contains("Test School 1").click();

    // Click proceed button
    cy.get("button.page11-group2").click();

    // Should now be on Step 4 (Language Selection)
    cy.get(".page4-text11").should("contain", "LANGUAGE PREFERENCE");
  });
});


//! DONE for the new UI

