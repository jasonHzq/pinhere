# Chrome Web Store privacy practices

## Single purpose

Pinhere lets a user explicitly select an element on the active webpage, review a visible-tab screenshot and limited DOM context, and submit that context as a structured defect to the user's private Pinhere workspace for a coding agent to process.

## Permission justifications

- `activeTab`: Accesses only the tab the user is actively viewing and only after the user clicks the Pinhere action. Required to start element selection and capture the visible tab.
- `scripting`: Injects the temporary DOM picker into the active HTTP/HTTPS page after the user clicks “圈选页面问题”. The picker is removed immediately after selection or cancellation.
- `storage`: Stores OAuth tokens, the user-initiated pending capture, and temporary screenshot-editor state locally. Tokens are removed on sign-out; temporary editor data is removed after use.
- `identity`: Opens Chrome's secure web authentication flow and returns the user to the extension after authorizing their Pinhere account.
- `https://pinhere.dev/*`: Calls the first-party Pinhere authorization and API endpoints to resolve projects and submit screenshots/issues.
- `https://pinhere-delta.vercel.app/*`: Supports the first-party legacy OAuth callback host while authentication traffic migrates fully to pinhere.dev. It is not used to access third-party webpages.

## Data disclosures

Declare these categories as collected:

- Personally identifiable information: account email/name/avatar when the user signs in.
- Authentication information: Pinhere access and refresh tokens, stored locally by the extension.
- Website content: user-selected DOM context and the visible-tab screenshot.
- Web browsing activity: the URL of the page on which the user explicitly creates an issue. Sensitive query/hash parameters are redacted before submission.
- User-generated content: issue title, description, screenshot crop, and annotation.

Do not declare collection of health, financial/payment, personal communications, precise location, or general browsing history. Pinhere does not sell data, use it for advertising, or collect browsing activity outside the user-facing issue capture flow.

## Required certifications

Confirm that:

- Data is used only to provide or improve Pinhere's single purpose.
- Data is not sold to third parties.
- Data is not used or transferred for personalized advertising, lending, or credit-worthiness.
- Humans do not read user data except with explicit consent, for security/abuse investigation, or where required by law.
- All transmitted user data uses HTTPS.

Privacy policy URL: https://pinhere.dev/zh-CN/privacy
