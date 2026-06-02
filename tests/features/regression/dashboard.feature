@dashboard
Feature: Dashboard Functionality

  Background:
    Given I open login page in a fresh session

  @DB-001 @DB-002
  Scenario: Verify owner can log in and reach dashboard
    When I enter email "bharathiselvaraj.elatre@gmail.com"
    And I enter password "Bhar@123"
    And I click the Login Now button
    Then I should see "dashboard"

  @DB-003
  Scenario: Verify owner dashboard navigation options are visible
    When I enter email "bharathiselvaraj.elatre@gmail.com"
    And I enter password "Bhar@123"
    And I click the Login Now button
    Then I should see "dashboard"
    And owner dashboard navigation options should be visible

  @DB-004 @DB-005
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

  @DB-006
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
