@flow @positive
Feature: Full Positive Business Flow

  # Flow testing validates an end-to-end business journey across multiple
  # modules. This file keeps the complete positive path in one place.

  @SC01
  Scenario: Signup positive flow creates branch and all required users
    Given user is on signup page
    When user fills signup form with runtime generated signup data
    And user clicks register button
    Then user should see signup state "dashboard"
    Given user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create user form
    When user fills create user form with auto generated "Branch Manager" data
    And user submits create user form
    Then user should see user result "user created"
    Given user opens create user form
    When user fills create user form with auto generated "Provider" data
    And user submits create user form
    Then user should see user result "user created"
    Given user opens create user form
    When user fills create user form with auto generated "Front Desk" data
    And user submits create user form
    Then user should see user result "user created"
    Given user opens create board form
    When user fills board form with auto generated data
    And user submits board form
    Then user should see board result "board created"
    Given user opens add lead form
    When user fills lead form with auto generated data
    And user submits lead form
    Then user should see lead result "lead created"

  @SC02
  Scenario: Existing user login positive flow creates branch and all required users
    Given I open login page in a fresh session
    When I enter email "bharathiselvaraj.elatre@gmail.com"
    And I enter password "Bhar@123"
    And I click the Login Now button
    Then I should see "dashboard"
    Given user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create user form
    When user fills create user form with auto generated "Branch Manager" data
    And user submits create user form
    Then user should see user result "user created"
    Given user opens create user form
    When user fills create user form with auto generated "Provider" data
    And user submits create user form
    Then user should see user result "user created"
    Given user opens create user form
    When user fills create user form with auto generated "Front Desk" data
    And user submits create user form
    Then user should see user result "user created"
    Given user opens create board form
    When user fills board form with auto generated data
    And user submits board form
    Then user should see board result "board created"
    Given user opens add lead form
    When user fills lead form with auto generated data
    And user submits lead form
    Then user should see lead result "lead created"
