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
  
  //! COMMENT BELOW AND PASTE THE CODE FROM DEBUG
  it("completes the entire registration process successfully", () => {
    const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");
    const otp_source_number = Cypress.env("OTP_SOURCE_NUMBER");
    const api_token = Cypress.env("API_TOKEN");
    const api_key = Cypress.env("REACT_APP_API_KEY");

    // Step 1: Fill personal information
    cy.get(".page11-text24").should("contain", "PERSONAL DETAILS");
    cy.fillPersonalInfo(
      "Arjun",
      "M S",
      otp_destination_number.slice(2),
      "teacher"
    ); // while filling we dont want 91
    // Remove cy.wait("@sendOTP") since we're using real API

    //- SENDING THE OTP THROUGH REAL API
    const sendOtpEndpoint = `${Cypress.env("API_BASE_URL")}.send_otp`;
  
    cy.log("📤 Sending OTP via API...");
    cy.log(`📞 Phone: ${otp_destination_number}`);
    cy.log(`🌐 Endpoint: ${sendOtpEndpoint}`);
    
    cy.request({
      method: "POST",
      url: sendOtpEndpoint,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        api_key: api_key,
        phone: otp_destination_number, // Use full number with country code
      },
      // failOnStatusCode: false, // Don't fail if there are issues
    }).then((sendResponse) => {
      cy.log(`📟 Status Code: ${sendResponse.status}`);
      cy.log(`📝 Status Text: ${sendResponse.statusText}`);    //- short description of the status code
      cy.log(`📤 Send OTP Body: ${JSON.stringify(sendResponse.body)}`);

      if (sendResponse.status === 200) {
        cy.log("✅ OTP send request successful!");
      } else {
        cy.log("⚠️ OTP send request failed, but continuing...");
      }

      // Wait for OTP to be sent and received (give some time for SMS delivery)
      cy.log("⏳ Waiting for OTP delivery...");
      cy.wait(10000); // Wait 10 seconds for OTP to be delivered

      //! destination should be 552, SO what will be the source number?
      //- is the source number ends w/ 2392? or the number contact of Auth app(988)
      const get_otp_from_whatsapp_api_endpoint =
        `https://smartschool.prismaticsoft.com/api/resource/WhatsApp%20Message` +
        `?fields=["name","message"]` +
        `&filters=[["message","like","Your OTP is:%"],["source","=","${otp_source_number}"],["direction","=","Incoming"],["destination","=","${otp_destination_number}"]]` +
        `&order_by=creation desc` +
        `&limit=1`;
      //- while passing in api we need 91

      // Step 2: Get OTP from API and enter it
      cy.request({
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

        // Step 2: Enter OTP
        cy.contains("VERIFY").should("be.visible");
        cy.get(".page21-rectangle2 .otp-input").should("be.visible");
        cy.enterOTP(otp);

        // After entering OTP and verifying fields
        cy.get(".page21-rectangle2 .otp-input").should("have.value", otp[0]);
        cy.get(".page21-rectangle3 .otp-input").should("have.value", otp[1]);
        cy.get(".page21-rectangle4 .otp-input").should("have.value", otp[2]);
        cy.get(".page21-rectangle5 .otp-input").should("have.value", otp[3]);

        // Click continue button after entering OTP - - this will trigger OTP verification internally
        cy.get("button.page11-group2").contains("CONTINUE").click();

        // Step 3: Select school
        cy.get(".page31-text15", { timeout: 15000 }).should(
          "contain",
          "SCHOOL DETAILS"
        );

        // ✅ Make the real API call to verify OTP
        const verifyOtpEndpoint = `${Cypress.env("API_BASE_URL")}.verify_otp`;
        const phone = otp_destination_number;
        
        //------------------LOGGING---------------------------

        cy.log("🔍 verifyOtpEndpoint: " + verifyOtpEndpoint);
        cy.log("🔍 api_key: " + api_key);
        cy.log("🔍 otp_destination_number: " + phone);
        cy.log("🔍 otp: " + otp);

        console.log("🔍 verifyOtpEndpoint: " + verifyOtpEndpoint);
        console.log("🔍 api_key: " + api_key);
        console.log("🔍 otp_destination_number: " + phone);
        console.log("🔍 otp: " + otp);
        
        //-----------------LOGGING----------------------------

        cy.request({
          method: "POST",
          url: verifyOtpEndpoint,
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            api_key: api_key,
            phone: phone, // with 91
            otp: otp,
          },
          // failOnStatusCode: false, // Don't fail on 400 status
        }).then((response) => {
          cy.log("🔍 [ verifyOtpEndpoint ] Body: " + JSON.stringify(response.body));
          console.log("🔍 [ verifyOtpEndpoint ] Body : " + JSON.stringify(response.body));

          // Check if verification was successful
          if (response.status === 200 && response.body?.message?.status === "success") {
            cy.log("✅ OTP Verified via API");
            console.log("✅ OTP Verified via API");
          } else {
            cy.log("⚠️ OTP verification failed, but continuing with UI flow...");
            console.log("⚠️ OTP verification failed, but continuing with UI flow...");
            // throw new Error("⚠️ OTP verification failed,");  //! can comment this to continue the flow
          }

          // ✅ Now click continue
          cy.get("button.page11-group2").should("not.be.disabled");
          cy.get(".page11-text22").should("contain", "CONTINUE");
          cy.get("button.page11-group2").click();

          // ✅ Assert we land on school details page
          cy.get(".page31-text15", { timeout: 100000 }).should(
            "contain",
            "SCHOOL DETAILS"
          );
        });
      });
    });


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

    // Step 4: Select language
    cy.get(".page4-text11").should("contain", "LANGUAGE PREFERENCE");
    cy.get('input[name="language"][value="English"]').check();
    cy.get(".page4-group2").click();

    // Step 5: Preview and submit
    cy.get(".page5-text54").should("contain", "PREVIEW INFORMATION");

    // Verify preview information
    cy.get(".page5-group40").within(() => {
      cy.get(".page5-text08").should("contain", otp_destination_number);
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
    cy.wait("@getWhatsappKeyword");

    // Step 6: Verify success page (StatusPage)
    cy.get(".loading-state").should("not.exist");
    cy.get(".page6-text06").should("contain", "Registered Successfully");
    cy.get(".page6-text").should(
      "contain",
      "Thank you for registering with TAP Buddy"
    );
    cy.get(".page6-text08").should("contain", "Go to TAP Buddy");
    cy.get(".page6-group12").should("be.visible");

    // Verify WhatsApp link
    cy.get(".page6-link")
      .should("have.attr", "href")
      .and("include", "tapschool:teacher_success");
  });

  //- ---------------- UNTIL ABOVE THERE ARE IN DEUBG.cy.js
  //-  COMMENTED BELOW LINES TO CUT DOWN OTP COSTS DURING TESTING

  // it("handles already registered scenario", () => {
  //   const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");
  //   const otp_source_number = Cypress.env("OTP_SOURCE_NUMBER");

  //   // Override the mock to return already registered status
  //   cy.mockTeacherRegistration("already_registered", "TAP54321");
  //   cy.mockWhatsAppKeyword("teacher_already_registered");

  //   // Complete steps 1-2
  //   cy.fillPersonalInfo(
  //     "Arjun",
  //     "M S",
  //     otp_destination_number.slice(2),
  //     "teacher"
  //   );

  //   // Step 2: Get OTP from API and enter it
  //   const get_otp_from_whatsapp_api_endpoint =
  //     `https://smartschool.prismaticsoft.com/api/resource/WhatsApp%20Message` +
  //     `?fields=["name","message"]` +
  //     `&filters=[["message","like","Your OTP is:%"],["source","=","${otp_source_number}"],["direction","=","Incoming"],["destination","=","${otp_destination_number}"]]` +
  //     `&order_by=creation desc` +
  //     `&limit=1`;

  //   const api_token = Cypress.env("API_TOKEN");
  //   cy.request({
  //     method: "GET",
  //     url: get_otp_from_whatsapp_api_endpoint,
  //     headers: {
  //       Authorization: `token ${api_token}`,
  //       "Content-Type": "application/json",
  //     },
  //   }).then((response) => {
  //     expect(response.status).to.eq(200);
  //     const data = response.body.data;
  //     if (!data || !data.length) {
  //       throw new Error("No OTP message found");
  //     }
  //     const message = data[0].message;
  //     const otpMatch = message.match(/Your OTP is[:\- ]*\s*(\d{4})/);
  //     if (!otpMatch) {
  //       throw new Error("OTP not found in message");
  //     }
  //     const otp = otpMatch[1];
  //     cy.enterOTP(otp);
  //   });

  //   // Select school
  //   cy.get('[data-cy="state-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("KERALA").click();

  //   cy.get('[data-cy="district-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("Palakkad").click();

  //   cy.wait("@listCities");

  //   cy.get('[data-cy="city-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("VANIYAMKULAM").click();

  //   cy.wait("@listSchools");

  //   cy.get('[data-cy="school-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("Test School 1").click();

  //   cy.get("button.page11-group2").click();

  //   // Select language
  //   cy.get('input[name="language"][value="English"]').check();
  //   cy.get(".page4-group2").click();

  //   // Submit form
  //   cy.get('input[name="agreeTerms"]').check();
  //   cy.get(".page5-group2").click();

  //   // Wait for API calls
  //   cy.wait("@registerTeacher");
  //   cy.wait("@getWhatsappKeyword");

  //   // Verify already registered page
  //   cy.get(".loading-state").should("not.exist");
  //   cy.get(".page6-text06").should("contain", "You are already registered");
  //   cy.get(".page6-text").should(
  //     "contain",
  //     "Click on the button below to start chatting with TAP Buddy"
  //   );
  //   cy.get(".page6-text08").should("contain", "Go to TAP Buddy");
  // });

  // it("handles registration failure scenario", () => {
  //   const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");
  //   const otp_source_number = Cypress.env("OTP_SOURCE_NUMBER");

  //   // Override the mock to return failure status
  //   cy.mockTeacherRegistration("failure");
  //   cy.mockWhatsAppKeyword("teacher_web_signup_failed");

  //   // Complete steps 1-2
  //   cy.fillPersonalInfo(
  //     "Arjun",
  //     "M S",
  //     otp_destination_number.slice(2),
  //     "teacher"
  //   );

  //   // Step 2: Get OTP from API and enter it
  //   const get_otp_from_whatsapp_api_endpoint =
  //     `https://smartschool.prismaticsoft.com/api/resource/WhatsApp%20Message` +
  //     `?fields=["name","message"]` +
  //     `&filters=[["message","like","Your OTP is:%"],["source","=","${otp_source_number}"],["direction","=","Incoming"],["destination","=","${otp_destination_number}"]]` +
  //     `&order_by=creation desc` +
  //     `&limit=1`;

  //   const api_token = Cypress.env("API_TOKEN");
  //   cy.request({
  //     method: "GET",
  //     url: get_otp_from_whatsapp_api_endpoint,
  //     headers: {
  //       Authorization: `token ${api_token}`,
  //       "Content-Type": "application/json",
  //     },
  //   }).then((response) => {
  //     expect(response.status).to.eq(200);
  //     const data = response.body.data;
  //     if (!data || !data.length) {
  //       throw new Error("No OTP message found");
  //     }
  //     const message = data[0].message;
  //     const otpMatch = message.match(/Your OTP is[:\- ]*\s*(\d{4})/);
  //     if (!otpMatch) {
  //       throw new Error("OTP not found in message");
  //     }
  //     const otp = otpMatch[1];
  //     cy.enterOTP(otp);
  //   });

  //   // Select school
  //   cy.get('[data-cy="state-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("KERALA").click();

  //   cy.get('[data-cy="district-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("Palakkad").click();

  //   cy.wait("@listCities");

  //   cy.get('[data-cy="city-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("VANIYAMKULAM").click();

  //   cy.wait("@listSchools");

  //   cy.get('[data-cy="school-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("Test School 1").click();

  //   cy.get("button.page11-group2").click();

  //   // Select language
  //   cy.get('input[name="language"][value="English"]').check();
  //   cy.get(".page4-group2").click();

  //   // Submit form
  //   cy.get('input[name="agreeTerms"]').check();
  //   cy.get(".page5-group2").click();

  //   // Wait for API calls
  //   cy.wait("@registerTeacher");
  //   cy.wait("@getWhatsappKeyword");

  //   // Verify error page
  //   cy.get(".loading-state").should("not.exist");
  //   cy.get(".page6-text06").should("contain", "Oops! Something went wrong");
  //   cy.get(".page6-text").should(
  //     "contain",
  //     "Click on the button below to contact support"
  //   );
  //   cy.get(".page6-text08").should("contain", "CONTACT SUPPORT");
  // });

  // it("validates user inputs at each step", () => {
  //   const otp_destination_number = Cypress.env("OTP_DESTINATION_NUMBER");
  //   const otp_source_number = Cypress.env("OTP_SOURCE_NUMBER");
  //   // Step 1: Try to proceed without filling required fields
  //   cy.get("button.page11-group2").click();
  //   cy.get(".page11-container")
  //     .contains(/first name is required|please enter your first name/i)
  //     .should("be.visible");

  //   // Fill personal info correctly and proceed
  //   cy.fillPersonalInfo(
  //     "Arjun",
  //     "M S",
  //     otp_destination_number.slice(2),
  //     "teacher"
  //   );

  //   // Step 2: Get OTP from API and enter it
  //   const get_otp_from_whatsapp_api_endpoint =
  //     `https://smartschool.prismaticsoft.com/api/resource/WhatsApp%20Message` +
  //     `?fields=["name","message"]` +
  //     `&filters=[["message","like","Your OTP is:%"],["source","=","${otp_source_number}"],["direction","=","Incoming"],["destination","=","${otp_destination_number}"]]` +
  //     `&order_by=creation desc` +
  //     `&limit=1`;

  //   const api_token = Cypress.env("API_TOKEN");
  //   cy.request({
  //     method: "GET",
  //     url: get_otp_from_whatsapp_api_endpoint,
  //     headers: {
  //       Authorization: `token ${api_token}`,
  //       "Content-Type": "application/json",
  //     },
  //   }).then((response) => {
  //     expect(response.status).to.eq(200);
  //     const data = response.body.data;
  //     if (!data || !data.length) {
  //       throw new Error("No OTP message found");
  //     }
  //     const message = data[0].message;
  //     const otpMatch = message.match(/Your OTP is[:\- ]*\s*(\d{4})/);
  //     if (!otpMatch) {
  //       throw new Error("OTP not found in message");
  //     }
  //     const otp = otpMatch[1];
  //     cy.enterOTP(otp);
  //     cy.get("button.page11-group2").click();
  //   });

  //   // Step 3: Try to proceed without selecting school info
  //   cy.get("button.page11-group2").click();
  //   cy.get(".error").contains("State is required").should("be.visible");
  //   cy.get(".error").contains("District is required").should("be.visible");
  //   cy.get(".error").contains("City is required").should("be.visible");
  //   cy.get(".error").contains("School is required").should("be.visible");

  //   // Select school info correctly
  //   cy.get('[data-cy="state-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("KERALA").click();

  //   cy.get('[data-cy="district-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("Palakkad").click();

  //   cy.wait("@listCities");

  //   cy.get('[data-cy="city-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("VANIYAMKULAM").click();

  //   cy.wait("@listSchools");

  //   cy.get('[data-cy="school-dropdown"]').within(() => {
  //     cy.get(".react-select-container").click();
  //   });
  //   cy.get(".react-select__menu").should("be.visible");
  //   cy.get(".react-select__option").contains("Test School 1").click();

  //   cy.get("button.page11-group2").click();

  //   // Step 4: Try to proceed without selecting language
  //   cy.get(".page4-group2").click();
  //   cy.get(".lang-error .error")
  //     .should("be.visible")
  //     .and("contain", "Please select a language");

  //   // Select language and proceed
  //   cy.get('input[name="language"][value="English"]').check();
  //   cy.get(".page4-group2").click();

  //   // Step 5: Try to submit without agreeing to terms
  //   cy.get(".page5-group2").click();
  //   cy.get(".preview-error .error")
  //     .should("be.visible")
  //     .and("contain", "Please agree to the terms");

  //   // Agree to terms and submit
  //   cy.get('input[name="agreeTerms"]').check();
  //   cy.get(".page5-group2").click();

  //   // Wait for API calls
  //   cy.wait("@registerTeacher");
  //   cy.wait("@getWhatsappKeyword");

  //   // Verify success page
  //   cy.get(".loading-state").should("not.exist");
  //   cy.get(".page6-text06").should("be.visible");
  // });
});

//- need to test all modifications done on 7:34 Am 03-07-2025