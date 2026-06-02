@owner @smoke
Feature: Owner Smoke Suite

  # Smoke testing checks the highest-risk owner journey after a new build.
  # These scenarios focus on fast validation of the primary business flow.

  @OWNER-SMOKE-001
  Scenario: Verify owner smoke flow for branch users board and lead in same login
    Given I open login page in a fresh session
    When I enter email "bharathiselvaraj.elatre@gmail.com"
    And I enter password "Bhar@123"
    And I click the Login Now button
    Then I should see "dashboard"
    # And owner dashboard navigation options should be visible
    And owner dashboard should display these cards:
      | Doctors |
      | Staff |
      | Patients |
    And owner dashboard cards should show numeric counts:
      | Doctors |
      | Staff |
      | Patients |
    And owner dashboard card counts should match backend data:
      | Doctors |
      | Staff |
      | Patients |
    # Given user opens create branch form
    # When user fills branch form with "AUTO" "AUTO" "AUTO" "Elatre" "Perungudi" "600032"
    # And user submits branch form
    # Then user should see branch result "branch created"
    Given user opens create user form
    When user fills create user form with auto generated "Branch Manager" data
    And user submits create user form
    Then user should see user result "user created"
    Given user opens create user form
    When user fills create user form with auto generated "Doctor" data
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
