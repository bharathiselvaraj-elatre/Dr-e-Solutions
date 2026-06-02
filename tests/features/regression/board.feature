@board @regression
Feature: Board Regression Suite

  # Regression testing confirms board creation behavior remains intact across
  # releases, including both happy path and required-field checks.

  Background:
    Given user logs into dr.e solutions for branch flow
    And user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"

  @positive
  Scenario: Successful board creation with auto generated data
    Given user opens create board form
    When user fills board form with auto generated data
    And user submits board form
    Then user should see board result "board created"

  @negative
  Scenario: Board creation shows required validations when mandatory fields are empty
    Given user opens create board form
    When user fills board form with valid data except "Board Name"
    And user submits board form
    Then user should see board result "required validations displayed"
