Feature: Ordered Auth To Setup Flows

  @flow @SC03 @negative @signup
  Scenario Outline: Signup negative flow shows validation messages without proceeding
    Given user is on signup page
    When user fills signup form with "<firstName>" "<lastName>" "<organization>" "<email>" "<mobile>" "<password>" "<confirmPassword>"
    And user clicks register button
    Then user should see signup state "<result>"

    Examples:
      | firstName | lastName | organization | email     | mobile | password | confirmPassword | result                     |
      |           | User     | QA Org       | bad-email | AUTO   | Bhar@123 | Bhar@123        | First name is required     |
      | Test      | User     | QA Org       | bad-email | AUTO   | Bhar@123 | Bhar@123        | Invalid Email address      |
      | Test      | User     | QA Org       | AUTO      | AUTO   | Bhar@123 | Other@123       | Passwords must match       |
      | Test      | User     | QA Org       | AUTO      |        | Bhar@123 | Bhar@123        | Mobile Number is required  |

  @flow @SC04 @negative @login
  Scenario Outline: Login negative flow shows validation and authentication errors
    Given I open login page in a fresh session
    When I enter email "<email>"
    And I enter password "<password>"
    And I click the Login Now button
    Then I should see "<result>"

    Examples:
      | email                             | password   | result                    |
      | bharathi@gmail.com                | Owner@123! | Invalid email or password |
      | bharathiselvaraj.elatre@gmail.com | 123ABC!23  | Invalid email or password |
      |                                   |            | required                  |

  @flow @SC05 @negative
  Scenario Outline: Signup flow validates each required branch field
    Given runtime signup user is authenticated for setup flow
    Given user opens create branch form
    When user fills branch form with valid data except "<field>"
    And user submits branch form
    Then user should see branch validation message "<message>"

    Examples:
      | field          | message                    |
      | Branch Name    | Branch name is required    |
      | Branch Email   | Branch email is required   |
      | Prefix         | Prefix is required         |
      | Phone          | Phone number is required   |
      | Address Line 1 | Address line 1 is required |
      | State          | State is required          |
      | City           | City is required           |
      | Postal Code    | Postal code is required    |

  @flow @SC05 @negative
  Scenario Outline: Signup flow creates branch then validates each required user field
    Given runtime signup user is authenticated for setup flow
    Given user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create user form
    When user fills create user form with valid "Branch Manager" data except "<field>"
    And user submits create user form
    Then user should see user validation message "<message>"

    Examples:
      | field          | message                    |
      | Branch         | Branch is required         |
      | Role           | Role is required           |
      | Title          | Title is required          |
      | First Name     | First name is required     |
      | Last Name      | Last name is required      |
      | Email          | Email is required          |
      | Mobile Number  | Mobile number is required  |
      | Gender         | Gender is required         |
      | Address Line 1 | Address line 1 is required |
      | Country        | Country is required        |
      | State          | State is required          |
      | City           | City is required           |
      | Postal Code    | Postal code is required    |

  @flow @SC06 @negative
  Scenario Outline: Existing user flow validates each required branch field
    Given user logs into dr.e solutions for branch flow
    Given user opens create branch form
    When user fills branch form with valid data except "<field>"
    And user submits branch form
    Then user should see branch validation message "<message>"

    Examples:
      | field          | message                    |
      | Branch Name    | Branch name is required    |
      | Branch Email   | Branch email is required   |
      | Prefix         | Prefix is required         |
      | Phone          | Phone number is required   |
      | Address Line 1 | Address line 1 is required |
      | State          | State is required          |
      | City           | City is required           |
      | Postal Code    | Postal code is required    |

  @flow @SC06 @negative
  Scenario Outline: Existing user flow creates branch then validates each required user field
    Given user logs into dr.e solutions for branch flow
    Given user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create user form
    When user fills create user form with valid "Branch Manager" data except "<field>"
    And user submits create user form
    Then user should see user validation message "<message>"

  @flow @SC07 @negative
  Scenario Outline: Signup flow validates each required board field
    Given runtime signup user is authenticated for setup flow
    Given user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create board form
    When user fills board form with valid data except "<field>"
    And user submits board form
    Then user should see board result "required validations displayed"

    Examples:
      | field       |
      | Board Name  |
      | Description |
      | Status      |

  @flow @SC08 @negative
  Scenario Outline: Existing user flow validates each required board field
    Given user logs into dr.e solutions for branch flow
    Given user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create board form
    When user fills board form with valid data except "<field>"
    And user submits board form
    Then user should see board result "required validations displayed"

    Examples:
      | field       |
      | Board Name  |
      | Description |
      | Status      |

  @flow @SC09 @negative
  Scenario Outline: Signup flow validates each required lead field
    Given runtime signup user is authenticated for setup flow
    Given user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create board form
    When user fills board form with auto generated data
    And user submits board form
    Then user should see board result "board created"
    Given user opens add lead form
    When user fills lead form with valid data except "<field>"
    And user submits lead form
    Then user should see lead result "required validations displayed"

    Examples:
      | field       |
      | First Name  |
      | Last Name   |
      | Mobile      |
      | Email       |
      | Postal Code |

  @flow @SC10 @negative
  Scenario Outline: Existing user flow validates each required lead field
    Given user logs into dr.e solutions for branch flow
    Given user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create board form
    When user fills board form with auto generated data
    And user submits board form
    Then user should see board result "board created"
    Given user opens add lead form
    When user fills lead form with valid data except "<field>"
    And user submits lead form
    Then user should see lead result "required validations displayed"

    Examples:
      | field       |
      | First Name  |
      | Last Name   |
      | Mobile      |
      | Email       |
      | Postal Code |

    Examples:
      | field          | message                    |
      | Branch         | Branch is required         |
      | Role           | Role is required           |
      | Title          | Title is required          |
      | First Name     | First name is required     |
      | Last Name      | Last name is required      |
      | Email          | Email is required          |
      | Mobile Number  | Mobile number is required  |
      | Gender         | Gender is required         |
      | Address Line 1 | Address line 1 is required |
      | Country        | Country is required        |
      | State          | State is required          |
      | City           | City is required           |
      | Postal Code    | Postal code is required    |
