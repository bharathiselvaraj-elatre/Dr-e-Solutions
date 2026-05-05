Feature: Branch Creation Functionality

  Background:
    Given user logs into dr.e solutions for branch flow
    And user opens create branch form

  @branch @positive
  Scenario: Successful branch creation, view validation, and delete
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    #### And user deletes the created branch

  @branch @negative
  Scenario: Branch creation shows required validations when mandatory fields are empty
    When user submits branch form
    Then user should see branch result "required validations displayed"
