@frontdesk @smoke
Feature: Frontdesk Smoke Suite

  # Smoke testing verifies the most critical frontdesk paths are working.
  # It is a fast confidence suite used to confirm the build is stable enough
  # for deeper testing.

  Background:
    Given I open login page in a fresh session

  @FD-SMOKE-001 @manual
  Scenario: Verify application URL loads successfully
    Then I should see "required"

  @FD-SMOKE-002 @manual
  Scenario: Verify login page is displayed properly
    Then I should see "required"

  @FD-SMOKE-003 @FD-SMOKE-004
  Scenario: Verify user can log in with valid registered credentials and reach dashboard
    When I enter email "EXISTING_LOGIN_EMAIL"
    And I enter password "EXISTING_LOGIN_PASSWORD"
    And I click the Login Now button
    Then I should see "dashboard"

  @FD-SMOKE-005 @manual
  Scenario: Verify dashboard page loads without errors
    When I enter email "EXISTING_LOGIN_EMAIL"
    And I enter password "EXISTING_LOGIN_PASSWORD"
    And I click the Login Now button
    Then I should see "dashboard"
    And frontdesk dashboard should load without errors

  @FD-SMOKE-006 @manual
  Scenario: Verify main menu navigation options are visible
    When I enter email "EXISTING_LOGIN_EMAIL"
    And I enter password "EXISTING_LOGIN_PASSWORD"
    And I click the Login Now button
    Then I should see "dashboard"
    And frontdesk main menu options should be visible

  @FD-SMOKE-007 @FD-SMOKE-008
  Scenario: Verify user can open Board module and access boards list page
    Given user logs into dr.e solutions for branch flow
    And user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create board form

  @FD-SMOKE-009 @FD-SMOKE-010 @manual
  Scenario: Verify user can open Leads module and view leads list
    Given user logs into dr.e solutions for branch flow
    And frontdesk user opens leads list page
    Then frontdesk leads list should be displayed correctly

  @FD-SMOKE-011
  Scenario: Verify user can add a new lead with mandatory fields
    Given user logs into dr.e solutions for branch flow
    And user opens create branch form
    When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    And user submits branch form
    Then user should see branch result "branch created"
    Given user opens create board form
    When user fills board form with auto generated data
    And user submits board form
    Then user should see board result "board created"
    Given user opens add lead form
    When user fills lead form with auto generated data
    And user submits lead form
    Then user should see lead result "lead created"

  @FD-SMOKE-012 @manual
  Scenario: Verify user can edit an existing lead successfully
    Given user logs into dr.e solutions for branch flow
    And frontdesk user opens an existing lead
    When frontdesk user edits the lead with valid data
    Then frontdesk user should see lead updated successfully

  @FD-SMOKE-013 @manual
  Scenario: Verify restricted delete action is blocked or works based on permission
    Given user logs into dr.e solutions for branch flow
    And frontdesk user opens an existing lead
    When frontdesk user attempts to delete the lead
    Then frontdesk delete action should follow configured permissions

  @FD-SMOKE-014 @manual
  Scenario: Verify user profile page opens successfully
    Given user logs into dr.e solutions for branch flow
    When frontdesk user opens profile page
    Then frontdesk profile page should open successfully

  @FD-SMOKE-015 @manual
  Scenario: Verify user can change theme successfully
    Given user logs into dr.e solutions for branch flow
    When frontdesk user changes the application theme
    Then frontdesk theme should be updated successfully

  @FD-SMOKE-016 @manual
  Scenario: Verify user can change password with valid details
    Given user logs into dr.e solutions for branch flow
    When frontdesk user changes password with valid details
    Then frontdesk password should be updated successfully

  @FD-SMOKE-017 @FD-SMOKE-018 @manual
  Scenario: Verify user can log out successfully and return to login page
    Given user logs into dr.e solutions for branch flow
    When frontdesk user logs out
    Then frontdesk user should be redirected to login page
