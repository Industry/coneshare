Feature: Share Link Multi-Step Authentication
  As a document owner
  I want to protect a share link with email, password, and NDA requirements
  So that I can enforce sequential viewer verification

  Scenario: A viewer successfully navigates an email and password flow
    Given I am an authenticated user
    And I have a document with a share link that requires a password and email
    When a viewer first accesses the link
    Then they should be prompted for an email
    When they submit the email "viewer@example.com"
    Then they should be prompted for a password
    When they submit the correct password "password123"
    Then they should be granted access to the document

  Scenario: A viewer successfully navigates an email, password, and NDA flow
    Given I am an authenticated user
    And I have a document with a share link that requires email, password, and NDA
    When a viewer first accesses the link
    Then they should be prompted for an email
    When they submit the email "viewer@example.com"
    Then they should be prompted for a password
    When they submit the correct password "password123"
    Then they should be prompted for an NDA
    When they submit the NDA acceptance
    Then they should be granted access to the document
