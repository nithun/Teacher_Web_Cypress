// Describe groups the related testcase | Pass the name of Testcase as parameter
describe("Teacher Registration - Step 1: Personal Information", () => {
  // A hook that run before every testcase
  beforeEach(() => {
    // Use real APIs for OTP
    cy.useRealAPIs(false);

    // Visit the page teacher register page with a longer timeout
    cy.visitAndWaitForLoad();
    // Remove cy.mockOTPSend() since we're using real API
  });

  // it - defines a single test case
  //! Testcase : Displays the Personal Information Form
  it("displays the personal information form", () => {
    cy.get(".page11-text24").should("contain", "PERSONAL DETAILS");
    cy.get('input[name="firstName"]').should("be.visible");
    cy.get('input[name="lastName"]').should("be.visible");
    cy.get('input[name="phone"]').should("be.visible");
    // cy.get('select[name="userType"]').should("be.visible");
  });

  //! Testcase: Click VERIFY button without filling required fields
  it("validates required fields before proceeding", () => {
    // Clicks the "VERIFY" button without filling required fields
    cy.get("button.page11-group2").click();

    // Check for validation errors next to each input
    cy.get('input[name="firstName"]')
      .parent()
      .parent()
      .find(".error")
      .should("contain", "First name is required");
    cy.get('input[name="lastName"]')
      .parent()
      .parent()
      .find(".error")
      .should("contain", "Last name is required");
    cy.get('input[name="phone"]')
      .parent()
      .parent()
      .find(".error")
      .should("contain", "Phone number must be 10 digits");
  });

  //! Testcase: Validate Phone No. Format (Invalid Phone Number)
  it("validates phone number format", () => {
    cy.fillPersonalInfo("Test", "User", "123"); //  Invalid phone, Too short

    cy.get("button.page11-group2").click();

    cy.get('input[name="phone"]')
      .parent()
      .parent()
      .find(".error")
      .should("contain", "Phone number must be 10 digits");
  });

  //! Testcase: Proceed to Step2 (OTP Verification)
  it("proceeds to OTP verification when form is valid", () => {
    const phoneNumber = Cypress.env("OTP_DESTINATION_NUMBER").slice(2);
    cy.fillPersonalInfo("Arjun", "M S", phoneNumber);

    cy.get("button.page11-group2").click();

    // Should now be on Step 2 (OTP verification)
    cy.get(".page21-group37272").should("be.visible");
    cy.get(".page21-rectangle2 .otp-input").should("be.visible");
    cy.get(".page21-rectangle3 .otp-input").should("be.visible");
    cy.get(".page21-rectangle4 .otp-input").should("be.visible");
    cy.get(".page21-rectangle5 .otp-input").should("be.visible");
  });
});

//- DONE - for new UI
