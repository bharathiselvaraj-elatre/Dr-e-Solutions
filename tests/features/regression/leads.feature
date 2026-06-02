@leads @regression
Feature: Leads Regression Suite

  # Regression testing protects the lead workflows from breaking when the
  # product changes. It covers both successful and validation-driven behavior.

  Background:
    Given user logs into dr.e solutions for branch flow
    And user opens existing board page

  @positive
  Scenario: Successful lead creation with auto generated data
    Given user opens add lead form
    When user fills lead form with auto generated data
    And user submits lead form
    Then user should see lead result "lead created"

  @negative
  Scenario Outline: Lead creation shows required validations for each mandatory field
    Given user opens add lead form
    When user fills lead form with valid data except "<field>"
    And user submits lead form
    Then user should see lead validation message "<message>"

    Examples:
      | field       | message                   |
      | First Name  | First name is required    |
      | Last Name   | Last name is required     |
      | Email       | Email is required         |
      | Mobile      | Mobile number is required |
      | Postal Code | Postal code is required   |
