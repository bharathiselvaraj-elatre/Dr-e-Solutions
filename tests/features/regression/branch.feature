@branch @regression
Feature: Branch Regression Suite

  # Regression testing verifies that previously working branch functionality
  # still behaves correctly after code changes, fixes, or enhancements.

  Background:
    Given user logs into dr.e solutions for branch flow
    And user opens create branch form

  @positive
  Scenario: Successful branch creation
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"

  @negative
  Scenario: Branch creation shows required validations when mandatory fields are empty
    When user submits branch form
    Then user should see branch result "required validations displayed"
