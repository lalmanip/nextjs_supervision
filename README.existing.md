# nextjs_supervision

Supervision Module (Admin module) for Vivance Travels

# Requirement

1. Have a login page with Username and Password. Once Login credentials are entered, call this API - {{baseURL}}/vivapi-user/user/authenticate (POST)

Sample Request:
{
"userName" : "myUser",
"password" : "mypasswd"
}
Sample Response:
{
"response": {
"userId": 71,
"userType": 4,
"email": "createuser11@gmail.com",
"userName": "myUser",
"password": "mypasswd",
"status": 0,
"firstName": "Create",
"middleName": null,
"lastName": "User",
"countryCode": 92,
"phone": null,
"emailActivation": false,
"createdBy": null,
"createdOn": "2025-01-26T21:37:01.000+00:00",
"modifiedBy": null,
"modifiedOn": "2025-01-26T21:37:01.000+00:00"
},
"message": null,
"status": "success"
}

2. Login page should also have Forget Password link. Once clicked, it should ask for Email and Phone number. Once provided, it should call API - {{baseURL}}/vivapi-user/user/forgotpasswd (POST)

The response will have new password.
Send the new password through the email to the user (to the provided email address)

3. Once logged in, it should have avatar at top right corner with User Name(obtained from response). It should have option to edit profile, Change Password and Sign out

4. Since this is Administrator of the Vivance Application. It will have -

- Dashboard : It will show recent transactions, monthly, weekkly, daily charts (Needed API details will be provided later)
- Users (For B2C, Agents, Sub Agents, Corporate, Sub Corporate, Sub Admin)
- Queues : For Flight Cancellation, PNR Queue List, Non-issued Paid Ticket
- Reports ; For B2c, Agent, Corporate
- Account : Credit Balance, Debit Balance
- Commission : Agent Commission
- Markup : B2B, B2C, Corporate
- GST Master : for TDS & GST
- Master Balance Manager : For B2B, Corporate, B2B Credit Limit Request
- Email Subscription
- Bank Account Details
- B2C Enquiry
