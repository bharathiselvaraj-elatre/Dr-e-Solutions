# Run Commands

## Definitions

- `HEADLESS='false'`: run the browser in visible mode.
- `HEADLESS='true'`: run the browser in headless mode.
- `SLOWMO='200'`: add delay between Playwright actions for debugging.
- `npm run <script>`: run one script from `package.json`.

## Common Environment Setup

```powershell
$env:HEADLESS='false'
```

```powershell
$env:HEADLESS='true'
```

```powershell
$env:HEADLESS='false'
$env:SLOWMO='200'
```

## Main Suite

- `npm run test`: run the default cucumber suite.
- `npm run test:ordered`: run the ordered suite flow.
- `npm run test:report`: run the ordered suite/report flow.
- `npm run report:cucumber`: generate cucumber report output.

## Feature Suites

- `npm run test:feature:login`: run login feature.
- `npm run test:feature:owner-access`: run owner access flow.
- `npm run test:feature:logout`: run logout feature.
- `npm run test:feature:branch`: run branch feature.
- `npm run test:feature:users`: run users feature.
- `npm run test:feature:board`: run board feature.
- `npm run test:feature:services`: run services feature mapping.
- `npm run test:feature:leads`: run leads feature.
- `npm run test:feature:frontdesk`: run frontdesk smoke feature.
- `npm run test:feature:flow:positive`: run positive flow feature.
- `npm run test:feature:flow:negative`: run negative flow feature.

## Profile Runs

- `npm run test:branch`: run cucumber branch profile.
- `npm run test:user`: run cucumber user profile.

## Positive / Negative Tag Runs

- `npm run test:positive`: run all `@positive` scenarios.
- `npm run test:positive:signup`: run `@positive and @signup`.
- `npm run test:positive:login`: run `@positive and @login`.
- `npm run test:positive:post`: run positive scenarios except signup/login.
- `npm run test:negative`: run all `@negative` scenarios.

## Scenario Tag Runs

- `npm run test:sc01`: run `@SC01`.
- `npm run test:sc02`: run `@SC02`.
- `npm run test:sc03`: run `@SC03`.
- `npm run test:sc04`: run `@SC04`.
- `npm run test:sc05`: run `@SC05`.
- `npm run test:sc06`: run `@SC06`.
- `npm run test:sc08-sc09`: run `@SC08 or @SC09`.

## Headed Browser Runs

- `npm run test:headed`: run full suite with headed browser.
- `npm run test:headed:chrome`: run full suite with headed Chrome.

## Example Commands

### Owner Access in visible browser

```powershell
$env:HEADLESS='false'
npm run test:feature:owner-access
```

### Leads in visible browser

```powershell
$env:HEADLESS='false'
npm run test:feature:leads
```

### Frontdesk smoke in visible browser

```powershell
$env:HEADLESS='false'
npm run test:feature:frontdesk
```


### Positive login only

```powershell
$env:HEADLESS='false'
npm run test:positive:login
```
