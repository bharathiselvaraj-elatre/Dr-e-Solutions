@auth @sanity
Feature: Authentication Sanity Suite

  # Sanity testing is a narrow validation run after a small change or bug fix.
  # It confirms the impacted authentication area is usable before deeper runs.

  Background:
    Given I open login page in a fresh session

  @login @positive
  Scenario: Login with valid credentials reaches dashboard
    When I enter email "EXISTING_LOGIN_EMAIL"
    And I enter password "EXISTING_LOGIN_PASSWORD"
    And I click the Login Now button
    Then I should see "dashboard"

  @login @uiux @desktop
  Scenario: Login page desktop UX baseline remains intact
    Then the login page should satisfy desktop UX expectations

  @login @uiux @mobile
  Scenario: Login page mobile UX baseline remains intact
    Then the login page should satisfy mobile UX expectations

  @login @uiux
  Scenario: Login page keeps key field affordances and inline validation
    When I toggle password visibility on the login page
    And I click the Login Now button
    Then I should see "required"

  @login @uiux @flow @desktop
  Scenario: Login desktop flow preserves UX through OTP and dashboard
    Then the login page should satisfy desktop UX expectations
    When I enter email "EXISTING_LOGIN_EMAIL"
    And I enter password "EXISTING_LOGIN_PASSWORD"
    And I click the Login Now button
    Then the login OTP page should satisfy UX expectations
    When I enter dynamic OTP if OTP page is displayed
    Then I should see "dashboard"

  @login @uiux @flow @mobile
  Scenario: Login mobile flow preserves UX through OTP and dashboard
    Then the login page should satisfy mobile UX expectations
    When I enter email "EXISTING_LOGIN_EMAIL"
    And I enter password "EXISTING_LOGIN_PASSWORD"
    And I click the Login Now button
    Then the login OTP page should satisfy UX expectations
    When I enter dynamic OTP if OTP page is displayed
    Then I should see "dashboard"

  @login @uiux @flow @tablet
  Scenario: Login tablet flow preserves UX through OTP and dashboard
    Then the login page should satisfy desktop UX expectations
    When I enter email "EXISTING_LOGIN_EMAIL"
    And I enter password "EXISTING_LOGIN_PASSWORD"
    And I click the Login Now button
    Then the login OTP page should satisfy UX expectations
    When I enter dynamic OTP if OTP page is displayed
    Then I should see "dashboard"

  @signup @uiux @flow @desktop
  Scenario: Signup desktop flow preserves UX through OTP and dashboard
    Given user is on signup page
    Then the signup page should satisfy desktop UX expectations
    When user fills signup form with runtime generated signup data
    And user clicks register button
    Then the signup OTP page should satisfy UX expectations
    When user enters valid OTP on signup page
    Then user should see signup state "dashboard"

  @signup @uiux @flow @mobile
  Scenario: Signup mobile flow preserves UX through OTP and dashboard
    Given user is on signup page
    Then the signup page should satisfy mobile UX expectations
    When user fills signup form with runtime generated signup data
    And user clicks register button
    Then the signup OTP page should satisfy UX expectations
    When user enters valid OTP on signup page
    Then user should see signup state "dashboard"

  @signup @uiux @flow @tablet
  Scenario: Signup tablet flow preserves UX through OTP and dashboard
    Given user is on signup page
    Then the signup page should satisfy desktop UX expectations
    When user fills signup form with runtime generated signup data
    And user clicks register button
    Then the signup OTP page should satisfy UX expectations
    When user enters valid OTP on signup page
    Then user should see signup state "dashboard"

  @login @negative
  Scenario Outline: Login negative validation and authentication cases
    When I enter email "<email>"
    And I enter password "<password>"
    And I click the Login Now button
    Then I should see "<result>"

    Examples:
      | email                             | password   | result                    |
      | bharathi@gmail.com                | Owner@123! | Invalid email or password |
      | bharathiselvaraj.elatre@gmail.com | 123ABC!23  | Invalid email or password |
      |                                   |            | required                  |

  @logout
  Scenario: Logout flow placeholder
    Given I open login page in a fresh session
