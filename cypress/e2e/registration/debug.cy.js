describe("Teacher Registration - End to End Flow", () => {
    beforeEach(() => {
      // Set up API mocks (excluding OTP APIs which use real endpoints)
      cy.mockCitiesList();
      cy.mockSchoolsList();
      cy.mockTeacherRegistration();
      cy.mockWhatsAppKeyword();
      cy.useRealAPIs(false);
      cy.visitAndWaitForLoad();
    });
    
    // TESTCASE - completes the entire teacher registration process -
    it("completes the entire teacher registration process", () => {
      // Environment variables
      const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");
      const otp_source_number = Cypress.env("OTP_SOURCE_NUMBER");
      const api_token = Cypress.env("API_TOKEN");
      const api_key = Cypress.env("REACT_APP_API_KEY");
      const api_base_url = Cypress.env("API_BASE_URL");
  
      // Step 1: Fill Personal Information
      cy.log("🎯 STEP 1: Filling Personal Information");
      cy.get(".page11-text24").should("contain", "PERSONAL DETAILS");
      cy.fillPersonalInfo("Arjun", "M S", otp_destination_number.slice(2), "teacher");
  
      // Step 2: Send OTP via API
      cy.log("🎯 STEP 2: Sending OTP");
      cy.request({
        method: "POST",
        url: `${api_base_url}.send_otp`,
        headers: { "Content-Type": "application/json" },
        body: { api_key, phone: otp_destination_number },
      }).then((sendResponse) => {
        expect(sendResponse.status).to.eq(200);
        cy.log("✅ OTP sent successfully");
      });
  
      // Wait for OTP delivery
      cy.wait(10000);
  
      // Step 3: Retrieve OTP from WhatsApp API
      cy.log("🎯 STEP 3: Retrieving OTP from WhatsApp");
      const getOtpEndpoint = 
        `https://smartschool.prismaticsoft.com/api/resource/WhatsApp%20Message` +
        `?fields=["name","message"]` +
        `&filters=[["message","like","Your OTP is:%"],["source","=","${otp_source_number}"],["direction","=","Incoming"],["destination","=","${otp_destination_number}"]]` +
        `&order_by=creation desc&limit=1`;
  
      cy.request({
        method: "GET",
        url: getOtpEndpoint,
        headers: {
          Authorization: `token ${api_token}`,
          "Content-Type": "application/json",
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.have.length.greaterThan(0);
  
        const message = response.body.data[0].message;
        const otpMatch = message.match(/Your OTP is[:\- ]*\s*(\d{4})/);
        expect(otpMatch).to.not.be.null;
        
        const otp = otpMatch[1];
        expect(otp).to.have.length(4);
        expect(otp).to.match(/^\d{4}$/);
        
        cy.log(`✅ OTP retrieved: ${otp}`);
  
        // Store OTP for later use
        cy.wrap(otp).as('retrievedOTP');
      });
  
      // Step 4: Enter and Verify OTP
      cy.log("🎯 STEP 4: Entering and Verifying OTP");
      cy.contains("VERIFY").should("be.visible");
      
      // Wait for OTP input fields to be visible
      cy.get('[data-cy="otp-input-1"]').should("be.visible");
  
      // Set up console log capture
      cy.on('window:console', (consoleLog) => {
        const message = consoleLog.args.join(' ');
        if (message.includes('OTP') || message.includes('FormData') || message.includes('verify')) {
          cy.log(`Console: ${message}`);
        }
      });
  
      // Set up alert capture
      cy.on('window:alert', (alertText) => {
        cy.log(`🚨 Alert: "${alertText}"`);
      });
  
      // Intercept the verify OTP API call
      cy.intercept('POST', '**/api/method/tap_lms.api.verify_otp', (req) => {
        // Use console.log instead of cy.log inside intercept
        console.log('📤 OTP Verify Request:', req.body);
        req.continue();
      }).as('verifyOTPRequest');
  
      // Get the OTP and enter it
      cy.get('@retrievedOTP').then((otp) => {
        // Use the custom enterOTP command
        cy.enterOTP(otp);
        
        // Verify OTP was entered correctly
        cy.get('[data-cy="otp-input-1"]').should("have.value", otp[0]);
        cy.get('[data-cy="otp-input-2"]').should("have.value", otp[1]);
        cy.get('[data-cy="otp-input-3"]').should("have.value", otp[2]);
        cy.get('[data-cy="otp-input-4"]').should("have.value", otp[3]);
      });
  
      // Wait a bit to ensure React state is updated
      cy.wait(2000);
      cy.get('body').click(10, 10); //! clicking somewhere -- added by me
  
      // Click the continue button
      cy.log("🔄 Clicking CONTINUE button...");
      cy.get("button.page11-group2").contains("CONTINUE").click();
  
      // Wait for the API call
      cy.wait('@verifyOTPRequest').then((interception) => {
        console.log('📥 OTP Verify Response:', interception.response.body);
      });
  
    //   // Check if we've moved to the next page or still on OTP page
    //   cy.get('body').then($body => {
    //     // If still on OTP page, try alternative method
    //     if ($body.find('.page21-text15:contains("VERIFY")').length > 0) {
    //       cy.log("❌ Still on OTP page - trying alternative method");
          
    //       // Get the OTP again and try manual entry
    //       cy.get('@retrievedOTP').then((otp) => {
    //         cy.window().then((win) => {
    //           const digits = otp.split("");
    //           digits.forEach((digit, index) => {
    //             const input = win.document.querySelector(`[data-cy="otp-input-${index + 1}"]`);
    //             if (input) {
    //               input.value = digit;
                  
    //               // Dispatch events
    //               const inputEvent = new Event('input', { bubbles: true });
    //               const changeEvent = new Event('change', { bubbles: true });
                  
    //               input.dispatchEvent(inputEvent);
    //               input.dispatchEvent(changeEvent);
    //             }
    //           });
    //         });
    //       });
          
    //       // Wait and try clicking again
    //       cy.wait(1000);
    //       cy.get("button.page11-group2").contains("CONTINUE").click();
    //     }
    //   });
  
      // Wait for successful navigation to school details page
      cy.get(".page31-text15", { timeout: 15000 }).should("contain", "SCHOOL DETAILS");
      cy.log("✅ OTP verification successful - Advanced to School Details");
  
      // Step 5: School Selection
      cy.log("🎯 STEP 5: Selecting School Details");
  
      // Select State
      cy.get(".page3-inputfield .react-select-container").click();
      cy.get(".react-select__menu").should("be.visible");
      cy.get(".react-select__option").contains("KERALA").click();
  
      // Select District
      cy.get(".page3-inputfield1 .react-select-container").click();
      cy.get(".react-select__menu").should("be.visible");
      cy.get(".react-select__option").contains("Palakkad").click();
      cy.wait("@listCities");
  
      // Select City
      cy.get(".page3-inputfield2 .react-select-container").click();
      cy.get(".react-select__menu").should("be.visible");
      cy.get(".react-select__option").contains("VANIYAMKULAM").click();
      cy.wait("@listSchools");
  
      // Select School
      cy.get(".page3-inputfield3 .react-select-container").click();
      cy.get(".react-select__menu").should("be.visible");
      cy.get(".react-select__option").contains("Test School 1").click();
  
      // Proceed to next step
      cy.get("button.page11-group2").click();
      cy.log("✅ School details selected successfully");
  
      // Step 6: Language Selection
      cy.log("🎯 STEP 6: Selecting Language Preference");
      cy.get(".page4-text11").should("contain", "LANGUAGE PREFERENCE");
      cy.get('input[name="language"][value="English"]').check();
      cy.get(".page4-group2").click();
      cy.log("✅ Language preference selected");
  
      // Step 7: Preview and Submit
      cy.log("🎯 STEP 7: Reviewing and Submitting Registration");
      cy.get(".page5-text54").should("contain", "PREVIEW INFORMATION");
  
      // Verify personal information
      cy.get(".page5-group40").within(() => {
        cy.get(".page5-text08").should("contain", otp_destination_number.slice(2));
        cy.get(".page5-text14").should("contain", "Arjun M S");
      });
  
      // Verify school information
      cy.get(".page5-group37284").within(() => {
        cy.get(".page5-text26").should("contain", "KERALA");
        cy.get(".page5-text30").should("contain", "Palakkad");
        cy.get(".page5-text34").should("contain", "VANIYAMKULAM");
        cy.get(".page5-text38").should("contain", "Test School 1");
      });
  
      // Verify language preference
      cy.get(".page5-group36").within(() => {
        cy.get(".page5-text42").should("contain", "English");
      });
  
      // Accept terms and submit
      cy.get('input[name="agreeTerms"]').check();
      cy.get(".page5-group2").click();
  
      // Wait for registration API calls
      cy.wait("@registerTeacher");
      
      // Wait longer and see what API calls are made
      cy.wait(5000); // Give it time to make calls

      cy.wait("@getWhatsappKeyword");  //! FAILED AT THIS POINT
      cy.log("✅ Registration submitted successfully");
  
      // Step 8: Verify Success Page
      cy.log("🎯 STEP 8: Verifying Registration Success");
      cy.get(".loading-state").should("not.exist");
      cy.get(".page6-text06").should("contain", "Registered Successfully");
      cy.get(".page6-text").should("contain", "Thank you for registering with TAP Buddy");
      cy.get(".page6-text08").should("contain", "Go to TAP Buddy");
      cy.get(".page6-group12").should("be.visible");
      cy.get(".page6-link")
        .should("have.attr", "href")
        .and("include", "tapschool:teacher_success");
  
      cy.log("🎉 Teacher registration completed successfully!");
    });
  });


  // it("handles already registered scenario", () => {
  // it("handles registration failure scenario", () => {
  // it("validates user inputs at each step", () => {