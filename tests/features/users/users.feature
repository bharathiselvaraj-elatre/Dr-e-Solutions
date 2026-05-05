Feature: User Creation Functionality

  Background:
    Given user logs into dr.e solutions for branch flow

  @user @positive
  Scenario: Successful branch manager user creation with auto generated data
    Given user opens create user form
    When user fills create user form with auto generated "Branch Manager" data
    And user submits create user form
    Then user should see user result "user created"

  @user @positive
  Scenario: Successful provider user creation with auto generated data
    Given user opens create user form
    When user fills create user form with auto generated "Provider" data
    And user submits create user form
    Then user should see user result "user created"

  @user @positive
  Scenario: Successful front desk user creation with auto generated data
    Given user opens create user form
    When user fills create user form with auto generated "Front Desk" data
    And user submits create user form
    Then user should see user result "user created"

  @user @negative
  Scenario: User creation shows required validations when mandatory fields are empty
    Given user opens create user form
    When user submits create user form
    Then user should see user result "required validations displayed"
