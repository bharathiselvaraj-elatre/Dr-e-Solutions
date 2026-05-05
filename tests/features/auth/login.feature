Feature: Login Functionality

  Background:
    Given I open login page in a fresh session

  @login @positive
  Scenario: Login with valid credentials reaches dashboard
    When I enter email "EXISTING_LOGIN_EMAIL"
    And I enter password "EXISTING_LOGIN_PASSWORD"
    And I click the Login Now button
    Then I should see "dashboard"

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
