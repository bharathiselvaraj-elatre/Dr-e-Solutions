@user @regression
Feature: User Creation Regression Suite

  # Regression testing for users ensures all supported user roles still work
  # correctly after changes to role setup, forms, or permissions.

  Background:
    Given user logs into dr.e solutions for branch flow

  @positive
  Scenario: Successful branch manager user creation with auto generated data
    Given user opens create user form
    When user fills create user form with auto generated "Branch Manager" data
    And user submits create user form
    Then user should see user result "user created"

  @positive
  Scenario: Successful provider user creation with auto generated data
    Given user opens create user form
    When user fills create user form with auto generated "Doctor" data
    And user submits create user form
    Then user should see user result "user created"

  @positive
  Scenario: Successful front desk user creation with auto generated data
    Given user opens create user form
    When user fills create user form with auto generated "Front Desk" data
    And user submits create user form
    Then user should see user result "user created"

  @negative
  Scenario: User creation shows required validations when mandatory fields are empty
    Given user opens create user form
    When user submits create user form
    Then user should see user result "required validations displayed"
