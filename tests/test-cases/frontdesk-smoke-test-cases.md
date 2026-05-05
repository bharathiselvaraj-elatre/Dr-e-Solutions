# Frontdesk Smoke Test Cases

Application: `dr.e solutions`
Module: `Frontdesk`
Suite Type: `Smoke`

## Preconditions

- Frontdesk user account is registered and active.
- Valid frontdesk login credentials are available.
- Frontdesk user has access to Dashboard, Board, Leads, Profile, Theme, Change Password, and Logout actions.
- Test environment URL is reachable.
- At least one editable lead exists for the edit test case.
- Expected delete behavior for the logged-in frontdesk role is known before execution.

## Smoke Test Cases

| TC ID | Test Case | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| FD-SMOKE-001 | Verify application URL loads successfully | Application URL is available | 1. Open browser. 2. Enter application URL. 3. Press Enter. | Application loads successfully without browser or server error. |
| FD-SMOKE-002 | Verify login page is displayed properly | Application URL is reachable | 1. Open application URL. | Login page is displayed with email field, password field, and login button visible. |
| FD-SMOKE-003 | Verify user can log in with valid registered credentials | Valid frontdesk credentials are available | 1. Open login page. 2. Enter valid email. 3. Enter valid password. 4. Click `Login Now`. | User is authenticated successfully. |
| FD-SMOKE-004 | Verify user is redirected to dashboard after login | User enters valid credentials | 1. Complete valid login. | User is redirected to the dashboard page after login. |
| FD-SMOKE-005 | Verify dashboard page loads without errors | User is logged in | 1. Observe dashboard after login. 2. Refresh the page once. | Dashboard loads correctly with no visible error, crash, or blank state. |
| FD-SMOKE-006 | Verify main menu or navigation options are visible | User is logged in | 1. View the main navigation area. | Main menu and expected navigation options are visible and accessible. |
| FD-SMOKE-007 | Verify user can open Board module successfully | User is logged in and has Board access | 1. Click `Board` from the menu or navigation. | Board module opens successfully. |
| FD-SMOKE-008 | Verify user can access Boards list page | User has opened Board module | 1. Navigate to Board module. 2. Observe board listing area. | Boards list or board page is displayed correctly. |
| FD-SMOKE-009 | Verify user can open Leads module successfully | User is logged in and has Leads access | 1. Click `Leads` from the menu or navigation. | Leads module opens successfully. |
| FD-SMOKE-010 | Verify leads list is displayed correctly | User has opened Leads module | 1. Navigate to Leads module. 2. Observe leads grid or list. | Leads list is displayed with records, columns, or empty-state message as designed. |
| FD-SMOKE-011 | Verify user can add a new lead with mandatory fields | User is on Leads page and has create permission | 1. Click `Add Lead`. 2. Enter all mandatory fields only. 3. Save the lead. | New lead is created successfully and appears in the list or success confirmation is shown. |
| FD-SMOKE-012 | Verify user can edit an existing lead successfully | An existing lead is available and editable | 1. Open an existing lead. 2. Edit one or more fields. 3. Save changes. | Lead updates are saved successfully and updated values are shown. |
| FD-SMOKE-013 | Verify restricted delete action is blocked or works based on permission | An existing lead is available | 1. Try to delete a lead. | If delete permission is enabled, the lead is deleted successfully. If delete permission is restricted, delete action is hidden, disabled, or blocked with proper validation. |
| FD-SMOKE-014 | Verify user profile page opens successfully | User is logged in | 1. Open profile menu or profile page. | Profile page opens successfully and user details are displayed. |
| FD-SMOKE-015 | Verify user can change theme successfully | User is logged in and theme option is available | 1. Open theme settings. 2. Change theme. | Selected theme is applied successfully. |
| FD-SMOKE-016 | Verify user can change password with valid details | User is logged in and knows current password | 1. Open change password page. 2. Enter current password. 3. Enter new password. 4. Confirm new password. 5. Save changes. | Password is updated successfully with a success message or confirmation. |
| FD-SMOKE-017 | Verify user can log out successfully | User is logged in | 1. Open profile or account menu. 2. Click `Logout`. | User is logged out successfully. |
| FD-SMOKE-018 | Verify user is redirected to login page after logout | User has clicked logout | 1. Perform logout. | User is redirected to the login page and protected pages are no longer accessible without logging in again. |

## Recommended Execution Order

1. `FD-SMOKE-001` to `FD-SMOKE-006`
2. `FD-SMOKE-007` to `FD-SMOKE-013`
3. `FD-SMOKE-014` to `FD-SMOKE-018`

## Notes

- `FD-SMOKE-013` must be validated according to the frontdesk role permission configured in the environment.
- `FD-SMOKE-016` should use a reversible test password strategy or a controlled test account.
- These cases are written as smoke test cases for execution and future automation planning.
