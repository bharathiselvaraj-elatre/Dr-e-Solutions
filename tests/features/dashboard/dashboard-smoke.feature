@dashboard @smoke
Feature: Dashboard Smoke Flow

  Background:
    Given I open login page in a fresh session

  @DB-SMOKE-001 @DB-SMOKE-002
  Scenario: Verify owner can log in and reach dashboard
    When I enter email "bharathiselvaraj.elatre@gmail.com"
    And I enter password "Bhar@123"
    And I click the Login Now button
    Then I should see "dashboard"

  @DB-SMOKE-003
  Scenario: Verify owner dashboard navigation options are visible
    When I enter email "bharathiselvaraj.elatre@gmail.com"
    And I enter password "Bhar@123"
    And I click the Login Now button
    Then I should see "dashboard"
    And owner dashboard navigation options should be visible

  @DB-SMOKE-004 @DB-SMOKE-005
  Scenario: Verify owner role sees all five dashboard cards
    When I enter email "bharathiselvaraj.elatre@gmail.com"
    And I enter password "Bhar@123"
    And I click the Login Now button
    Then I should see "dashboard"
    And owner dashboard should display these cards:
      | Active branches |
      | Managers |
      | Doctors |
      | Staff |
      | Patients |

  @DB-SMOKE-006
  Scenario: Verify owner can access each dashboard card
    When I enter email "bharathiselvaraj.elatre@gmail.com"
    And I enter password "Bhar@123"
    And I click the Login Now button
    Then I should see "dashboard"
    And owner can access each dashboard card:
      | Active branches |
      | Managers |
      | Doctors |
      | Staff |
      | Patients |
