export interface KBChunk {
  id: string;
  text: string;
  source_type: "selenium" | "playwright" | "test_cases" | "jira" | "docs" | "transcripts" | "prd" | "jenkins" | "glossary";
  path: string;
  heading?: string;
  line_start?: number;
  ticket_key?: string;
  tc_id?: string;
  build_id?: string;
}

export const knowledgeBase: KBChunk[] = [
  // SELENIUM FRAMEWORK
  {
    id: "sel-001",
    source_type: "selenium",
    path: "selenium-framework/src/main/java/pages/LoginPage.java",
    heading: "LoginPage > doLogin()",
    line_start: 45,
    text: `[selenium-framework] LoginPage.java > doLogin()
WebDriver-based login page implementation. Uses explicit waits with WebDriverWait for robust element interaction.

public void doLogin(String username, String password) {
  WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
  WebElement usernameField = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("username")));
  usernameField.clear();
  usernameField.sendKeys(username);
  driver.findElement(By.id("password")).sendKeys(password);
  driver.findElement(By.cssSelector("button[type='submit']")).click();
  wait.until(ExpectedConditions.urlContains("/dashboard"));
}

Best practice: Always use WebDriverWait instead of Thread.sleep() to avoid flaky tests. Chain ExpectedConditions for multi-step waits.`
  },
  {
    id: "sel-002",
    source_type: "selenium",
    path: "selenium-framework/src/main/java/utils/WaitUtils.java",
    heading: "WaitUtils",
    line_start: 10,
    text: `[selenium-framework] WaitUtils.java
Centralized wait utilities to avoid code duplication across page objects.

public static WebElement waitForElement(WebDriver driver, By locator, int timeoutSeconds) {
  return new WebDriverWait(driver, Duration.ofSeconds(timeoutSeconds))
    .until(ExpectedConditions.visibilityOfElementLocated(locator));
}

public static void waitForClickable(WebDriver driver, By locator) {
  new WebDriverWait(driver, Duration.ofSeconds(15))
    .until(ExpectedConditions.elementToBeClickable(locator));
}

public static boolean waitForInvisibility(WebDriver driver, By locator) {
  return new WebDriverWait(driver, Duration.ofSeconds(10))
    .until(ExpectedConditions.invisibilityOfElementLocated(locator));
}

Common wait strategies: visibilityOfElementLocated, elementToBeClickable, presenceOfElementLocated, invisibilityOfElementLocated, textToBePresentInElement`
  },
  {
    id: "sel-003",
    source_type: "selenium",
    path: "selenium-framework/src/main/java/base/BaseTest.java",
    heading: "BaseTest > setup/teardown",
    line_start: 1,
    text: `[selenium-framework] BaseTest.java — TestNG-based base class for all Selenium tests.

@BeforeMethod
public void setUp() {
  WebDriverManager.chromedriver().setup();
  ChromeOptions options = new ChromeOptions();
  options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");
  driver = new ChromeDriver(options);
  driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));
  driver.manage().window().maximize();
}

@AfterMethod
public void tearDown(ITestResult result) {
  if (result.getStatus() == ITestResult.FAILURE) {
    TakesScreenshot ts = (TakesScreenshot) driver;
    String screenshot = ts.getScreenshotAs(OutputType.BASE64);
    // attach to Allure report
  }
  if (driver != null) driver.quit();
}

Pattern: Every test inherits BaseTest. WebDriverManager handles driver binary management automatically.`
  },
  {
    id: "sel-004",
    source_type: "selenium",
    path: "selenium-framework/src/main/java/pages/BasePage.java",
    heading: "BasePage > Page Object Pattern",
    line_start: 1,
    text: `[selenium-framework] BasePage.java — Page Object Model base class.

Page Object Model (POM) is the core design pattern. Each web page has a corresponding Page class.

public abstract class BasePage {
  protected WebDriver driver;
  protected WebDriverWait wait;

  public BasePage(WebDriver driver) {
    this.driver = driver;
    this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    PageFactory.initElements(driver, this);
  }

  protected void click(WebElement element) {
    wait.until(ExpectedConditions.elementToBeClickable(element)).click();
  }

  protected void type(WebElement element, String text) {
    wait.until(ExpectedConditions.visibilityOf(element)).clear();
    element.sendKeys(text);
  }

  protected String getText(WebElement element) {
    return wait.until(ExpectedConditions.visibilityOf(element)).getText().trim();
  }
}

Use @FindBy annotations with PageFactory for element initialization. Avoid using By locators directly in test methods.`
  },
  {
    id: "sel-005",
    source_type: "selenium",
    path: "selenium-framework/src/test/java/tests/LoginTest.java",
    heading: "LoginTest — test scenarios",
    line_start: 1,
    text: `[selenium-framework] LoginTest.java — Login module test scenarios.

@Test(dataProvider = "loginData", dataProviderClass = DataProviders.class)
public void testValidLogin(String username, String password) {
  LoginPage loginPage = new LoginPage(driver);
  loginPage.navigate();
  loginPage.doLogin(username, password);
  DashboardPage dashboard = new DashboardPage(driver);
  Assert.assertTrue(dashboard.isLoaded(), "Dashboard should load after valid login");
}

@Test
public void testInvalidLogin() {
  LoginPage loginPage = new LoginPage(driver);
  loginPage.navigate();
  loginPage.doLogin("invalid@test.com", "wrongpassword");
  Assert.assertTrue(loginPage.isErrorMessageDisplayed());
  Assert.assertEquals(loginPage.getErrorMessage(), "Invalid credentials. Please try again.");
}

@Test
public void testLoginWithEmptyCredentials() {
  LoginPage loginPage = new LoginPage(driver);
  loginPage.navigate();
  loginPage.doLogin("", "");
  Assert.assertTrue(loginPage.isErrorMessageDisplayed());
}

Test IDs: TC-LOGIN-001 (valid), TC-LOGIN-002 (invalid credentials), TC-LOGIN-003 (empty fields)`
  },
  // PLAYWRIGHT FRAMEWORK
  {
    id: "pw-001",
    source_type: "playwright",
    path: "playwright-framework/tests/login.spec.ts",
    heading: "login.spec.ts — test blocks",
    line_start: 1,
    text: `[playwright-framework] login.spec.ts
Playwright test suite for login module. Uses fixtures from fixtures/auth.ts.

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Module', () => {
  test('should login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('user@vwo.com', 'SecurePass123');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByTestId('user-avatar')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('bad@email.com', 'wrongpass');
    await expect(page.getByRole('alert')).toContainText('Invalid credentials');
  });

  test('should maintain session after page refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginWithStoredAuth();
    await page.reload();
    await expect(page).toHaveURL(/dashboard/);
  });
});`
  },
  {
    id: "pw-002",
    source_type: "playwright",
    path: "playwright-framework/pages/LoginPage.ts",
    heading: "LoginPage POM class",
    line_start: 1,
    text: `[playwright-framework] pages/LoginPage.ts — Page Object Model for login.

export class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign In' }).click();
  }

  async loginWithStoredAuth() {
    await this.page.context().storageState({ path: 'auth/user.json' });
    await this.page.goto('/dashboard');
  }

  async getErrorMessage() {
    return this.page.getByRole('alert').textContent();
  }
}

Best practice: Use getByRole, getByLabel, getByTestId over CSS selectors. Prefer user-facing attributes for resilient locators.`
  },
  {
    id: "pw-003",
    source_type: "playwright",
    path: "playwright-framework/playwright.config.ts",
    heading: "Playwright configuration",
    line_start: 1,
    text: `[playwright-framework] playwright.config.ts — Main Playwright configuration.

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'results/junit.xml' }],
    ['allure-playwright']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://app.vwo.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});

Key config: retries=2 on CI to handle transient failures. fullyParallel=true for speed. Trace/screenshot/video captured on failure for debugging.`
  },
  {
    id: "pw-004",
    source_type: "playwright",
    path: "playwright-framework/fixtures/auth.ts",
    heading: "Auth fixtures and storage state",
    line_start: 1,
    text: `[playwright-framework] fixtures/auth.ts — Authentication fixtures using storageState.

import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type AuthFixtures = { authenticatedPage: Page };

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'auth/user.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

// Global setup: runs once before all tests to log in and save state
// playwright/global-setup.ts
async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.BASE_URL + '/login');
  await page.fill('[name=email]', process.env.TEST_USER_EMAIL!);
  await page.fill('[name=password]', process.env.TEST_USER_PASSWORD!);
  await page.click('button[type=submit]');
  await page.context().storageState({ path: 'auth/user.json' });
  await browser.close();
}

Pattern: Use storageState for session reuse. Create authenticated fixture to avoid login on every test. Significant speed improvement in parallel runs.`
  },
  {
    id: "pw-005",
    source_type: "playwright",
    path: "playwright-framework/tests/api/api.spec.ts",
    heading: "API testing with Playwright",
    line_start: 1,
    text: `[playwright-framework] tests/api/api.spec.ts — API testing with Playwright request context.

test.describe('Campaign API', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL,
      extraHTTPHeaders: {
        Authorization: \`Bearer \${process.env.API_TOKEN}\`,
        'Content-Type': 'application/json',
      },
    });
  });

  test('GET /campaigns returns 200 with campaigns list', async () => {
    const response = await apiContext.get('/api/v1/campaigns');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('POST /campaigns creates new campaign', async () => {
    const response = await apiContext.post('/api/v1/campaigns', {
      data: { name: 'Test Campaign', type: 'A/B', status: 'draft' }
    });
    expect(response.status()).toBe(201);
    const { data } = await response.json();
    expect(data.id).toBeTruthy();
  });
});

Playwright handles API testing natively — no need for Supertest or Axios in tests.`
  },
  // TEST CASES
  {
    id: "tc-001",
    source_type: "test_cases",
    path: "data/03_test_cases/testcases.csv",
    tc_id: "TC-VWO-0001",
    text: `TC-VWO-0001 | Login Module | Valid Login
Module: Authentication
Priority: P0 - Critical
Steps:
1. Navigate to https://app.vwo.com/login
2. Enter valid email: user@company.com
3. Enter valid password: ValidPass@123
4. Click "Sign In" button
Expected: User is redirected to dashboard. Session cookie is set. Welcome message displays user name.
Tags: smoke, regression, login`
  },
  {
    id: "tc-002",
    source_type: "test_cases",
    path: "data/03_test_cases/testcases.csv",
    tc_id: "TC-VWO-0002",
    text: `TC-VWO-0002 | Login Module | Invalid Password
Module: Authentication
Priority: P1 - High
Steps:
1. Navigate to login page
2. Enter valid email, incorrect password
3. Click Sign In
Expected: Error message "Invalid email or password" displayed. No redirect. Account not locked on first attempt.
Tags: regression, negative-testing, login`
  },
  {
    id: "tc-003",
    source_type: "test_cases",
    path: "data/03_test_cases/testcases.csv",
    tc_id: "TC-VWO-0010",
    text: `TC-VWO-0010 | A/B Testing | Create Campaign
Module: Campaigns
Priority: P0 - Critical
Steps:
1. Login as admin user
2. Navigate to Campaigns > Create New
3. Select "A/B Test" type
4. Enter campaign name: "Homepage CTA Test"
5. Set traffic split: Control 50%, Variant 50%
6. Set goal: Click on CTA button
7. Launch campaign
Expected: Campaign created with ID. Status = Running. Traffic routing active.
Tags: smoke, campaign-management`
  },
  {
    id: "tc-004",
    source_type: "test_cases",
    path: "data/03_test_cases/testcases.csv",
    tc_id: "TC-VWO-0050",
    text: `TC-VWO-0050 | Reports | Conversion Report
Module: Analytics
Priority: P1
Steps:
1. Open active campaign with conversions
2. Navigate to Reports tab
3. Select date range: last 7 days
4. Check statistical significance badge
Expected: Report shows visitors, conversions, conversion rate per variant. Statistical significance shown when p-value < 0.05. CSV export works.
Tags: reporting, analytics, regression`
  },
  // JIRA TICKETS
  {
    id: "jira-001",
    source_type: "jira",
    ticket_key: "VWO-1234",
    path: "data/04_jira_tickets/VWO-1234.json",
    text: `VWO-1234 | BUG | P1 | Status: Fixed | Login page flaky on Firefox
Summary: Login button click not registering in Firefox 120+ on CI. Passes locally but fails ~30% of CI runs.
Description: NoSuchElementException on button[@type='submit'] after 10s wait. Root cause identified as shadow DOM timing issue in Firefox — the submit button is inside a web component that hydrates asynchronously. Fix: added wait for shadow host to be fully initialized before interacting.
Components: Authentication, Firefox
Labels: flaky-test, browser-specific, shadow-dom
Resolution: Added waitForFunction(() => document.querySelector('auth-button')?.shadowRoot?.querySelector('button') !== null) before click.
Linked: VWO-1189 (duplicate), VWO-1301 (related flaky login on Edge)`
  },
  {
    id: "jira-002",
    source_type: "jira",
    ticket_key: "VWO-2891",
    path: "data/04_jira_tickets/VWO-2891.json",
    text: `VWO-2891 | BUG | P0 | Status: In Progress | Campaign dashboard shows incorrect conversion rate
Summary: Conversion rate displays 0% for campaigns with >10k visitors despite confirmed conversions in database.
Steps to reproduce:
1. Create campaign with >10000 visitors
2. Navigate to Reports
3. Conversion rate shows 0.00%
Root cause analysis: Integer overflow in legacy PHP conversion rate calculator. Query uses INT column for visitor count — overflows at 2^31 (2.1B) at daily level but at campaign level after ~32 days. Fix in progress: migrate to BIGINT, update aggregation queries.
Impact: All campaigns older than 30 days with high traffic showing incorrect rates. Customer-facing bug.
Labels: critical, data-accuracy, reporting`
  },
  {
    id: "jira-003",
    source_type: "jira",
    ticket_key: "VWO-3102",
    path: "data/04_jira_tickets/VWO-3102.json",
    text: `VWO-3102 | TASK | P2 | Status: Done | Add retry mechanism for API tests
Summary: API test suite has ~8% failure rate on CI due to transient network timeouts to staging environment. Need retry with exponential backoff.
Implementation: Added Playwright retries: 2 in config. Added custom retry logic for API calls:
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e) { if (i === maxRetries - 1) throw e; await delay(2**i * 1000); }
  }
}
Result: API test failure rate dropped from 8% to 0.3% on CI.
Labels: test-stability, api-testing, ci`
  },
  // COMPANY DOCS / PRD
  {
    id: "doc-001",
    source_type: "docs",
    path: "data/05_company_docs/testing-standards.md",
    heading: "Test Case Writing Standards",
    text: `Test Case Writing Standards — VWO QA Team

Every test case MUST include:
- Unique ID (format: TC-[MODULE]-[NUMBER])
- Module and sub-module
- Priority: P0 (critical/smoke), P1 (high/regression), P2 (medium), P3 (low)
- Preconditions (environment state, test data, auth)
- Step-by-step actions with exact data values
- Expected result (specific, measurable, not "should work")
- Tags: at minimum one of [smoke, regression, negative-testing, api, ui, accessibility]

Prohibited in test steps:
- Vague expectations: "Page loads correctly" -> BAD. "Dashboard URL contains /dashboard and user name displays in top-right" -> GOOD
- Implementation details in test IDs
- Hardcoded environment URLs (use env variables)

Test naming convention for automation:
- Playwright: describe('Module Name') > test('should [action] when [condition]')
- TestNG: @Test(groups={"smoke"}) methodName_scenario_expectedResult`
  },
  {
    id: "doc-002",
    source_type: "prd",
    path: "data/09_prd_srs_brd_frd/PRD_VWO_Campaigns.pdf",
    heading: "PRD: A/B Testing Campaign Module — p.3",
    text: `PRD: A/B Testing Campaign Module — Product Requirements Document

Feature: Campaign Hypothesis Testing
A/B test campaigns allow teams to test two or more variants against a control to determine statistical significance in conversion metrics.

Requirements:
- FR-001: System MUST support minimum 2 variants (control + 1 treatment), maximum 10 variants per campaign
- FR-002: Traffic split MUST sum to 100% with minimum 5% per variant
- FR-003: Statistical significance calculated using two-proportion z-test, p-value threshold 0.05
- FR-004: Campaign MUST support goals: click, form submit, page visit, revenue, custom event
- FR-005: Real-time visitor counts updated every 5 minutes via batch job
- FR-006: Campaign data retained 24 months post-completion

Acceptance Criteria:
- AC-001: Campaign creation completes in <2s response time
- AC-002: Traffic routing accuracy within 2% of configured split
- AC-003: Reports load in <3s for campaigns with up to 1M visitors`
  },
  {
    id: "doc-003",
    source_type: "docs",
    path: "data/05_company_docs/rtm-template.md",
    heading: "Requirements Traceability Matrix Template",
    text: `Requirements Traceability Matrix (RTM) — Template and Guidelines

An RTM maps requirements to test cases to verify complete coverage.

RTM Columns:
| Req ID | Requirement Description | Priority | Test Case IDs | Status | Automation |
|--------|------------------------|----------|---------------|--------|------------|
| FR-001 | Support 2-10 variants  | P0       | TC-VWO-0010, TC-VWO-0011 | Pass | Automated |

RTM Coverage Formula:
- Total Coverage % = (Requirements with 1 or more Test Cases / Total Requirements) x 100
- Target: 100% P0 coverage, 90% or more P1 coverage, 70% or more P2 coverage

When to update RTM:
- New feature added -> add requirement rows + test case links
- Bug found -> verify requirement row exists, add negative test case
- Feature changed -> update expected results in linked test cases

Tools: Maintained in JIRA via Xray plugin. Export to Excel weekly. RTM review required before every release.`
  },
  // JENKINS / BUILD
  {
    id: "jenkins-001",
    source_type: "jenkins",
    build_id: "BUILD-4521",
    path: "data/10_jenkins_logs/build-4521-failure.log",
    text: `BUILD-4521 | FAILURE | 2026-07-15 | Branch: feature/campaign-v2

FAILED TESTS (3/247):
1. LoginTest.testValidLogin[chrome] — FAILURE
   org.openqa.selenium.NoSuchElementException: Unable to locate element: {"method":"css selector","selector":"#username"}
   at LoginPage.doLogin(LoginPage.java:47)
   RCA: App deploy in progress during test run. Element selector valid, timing issue with partial deploy.

2. CampaignTest.testCreateCampaign — TIMEOUT
   org.openqa.selenium.TimeoutException: Expected condition failed after 30 seconds
   at CampaignPage.waitForCampaignList(CampaignPage.java:112)
   RCA: Campaign list API returning 503 due to DB migration lock.

3. ReportTest.testConversionReport — ASSERTION_ERROR
   Expected: [2.45%] but was: [0.00%]
   RCA: Known bug VWO-2891 — conversion rate shows 0% for high-traffic campaigns.

Root Cause Summary: 2 failures are infrastructure/deploy related (not test bugs). 1 is known product bug VWO-2891.
Recommendation: Mark BUILD-4521 as infrastructure failure, do not block merge.`
  },
  {
    id: "jenkins-002",
    source_type: "jenkins",
    build_id: "BUILD-4499",
    path: "data/10_jenkins_logs/build-4499-flaky.log",
    text: `BUILD-4499 | UNSTABLE | Flaky Test Report | 2026-07-12

Flaky Tests Analysis (tests that failed then passed on retry):
1. LoginTest.testSSOLogin — Failed 2/3 runs. Cause: Okta redirect timing varies 800ms-3000ms. Fix: increase wait timeout from 5s to 10s.
2. CartTest.testAddToCart — Failed 1/3 runs. Cause: Race condition between cart count update and assertion. Fix: poll for cart count stability before assertion.
3. SearchTest.testAutoComplete — Failed 1/3 runs. Cause: Debounce delay in search input (300ms). Fix: use waitFor with debounce consideration.

Flakiness Rate This Week: 4.2% (target <2%)
Most Flaky Module: Authentication (SSO flows)
Recommended Actions:
- Audit wait strategies in SSO test suite
- Add deterministic waits (waitForNetworkIdle after SSO redirects)
- Implement screenshot capture on first failure for all flaky tests`
  },
  // MEETING NOTES
  {
    id: "meet-001",
    source_type: "transcripts",
    path: "data/07_meeting_notes/2026-07-10-qa-standup.txt",
    text: `QA Daily Standup — 2026-07-10 10:00 AM

[Priya - QA Lead]: Blocking issue on the login flakiness. Firefox on CI is showing 30% failure rate on VWO-1234. Anand is looking at the shadow DOM timing fix.

[Anand - SDET]: I reproduced it locally. The shadow DOM component hydrates after our WebDriverWait timeout. Adding a custom waitForFunction in BaseTest. Should be fixed by EOD.

[Rahul - Dev]: The campaign API changes going in today — v2 endpoints. API tests need to be updated for new response schema. The /campaigns endpoint now returns paginated response.

[Priya]: Rahul, can you share the API spec doc? We need to update TC-API-200 through TC-API-215.

[Rahul]: I'll share the Postman collection. Key changes: meta.pagination object added, data array instead of direct items, status codes 404 now returns structured error.

[Meera - QA]: I have the automation scripts for the new campaign flow. Running them on staging now. 15 tests, 12 passing, 3 failing on the report generation step.

Action items:
- Anand: Fix VWO-1234 shadow DOM wait by EOD today
- Rahul: Share Postman collection for API v2
- Meera: Investigate 3 failing report tests on staging`
  },
  // GLOSSARY
  {
    id: "gloss-001",
    source_type: "glossary",
    path: "glossary.yaml",
    text: `QA Terminology Glossary — VWO Engineering

POM: Page Object Model — design pattern where each web page has a corresponding class encapsulating its locators and actions.
WebDriverWait: Selenium explicit wait that polls until condition met or timeout. Use instead of Thread.sleep().
ExpectedConditions: Selenium conditions for explicit waits (visibilityOfElementLocated, elementToBeClickable, etc.)
RCA: Root Cause Analysis — process of identifying the underlying cause of a test failure (product bug vs test bug vs infra).
RTM: Requirements Traceability Matrix — maps requirements to test cases to ensure coverage.
Flaky Test: A test that produces inconsistent results (passes/fails) on the same code. Primary causes: timing, shared state, environment.
SSE: Server-Sent Events — unidirectional streaming from server to client. Used for streaming LLM responses.
BVA: Boundary Value Analysis — testing technique focusing on boundary values (min, min+1, max-1, max).
EP: Equivalence Partitioning — divides inputs into groups expected to behave the same way.
Smoke Test: Quick subset of tests to verify basic functionality before full regression.
Regression Test: Full test suite run to verify existing functionality after changes.
VWO: Visual Website Optimizer — A/B testing and conversion optimization platform.
TC: Test Case identifier format: TC-[MODULE]-[NUMBER] e.g. TC-VWO-0001
P0: Priority 0 — Critical, must pass before release (smoke tests)
P1: Priority 1 — High, full regression suite
CI: Continuous Integration — automated build and test on each commit (Jenkins in this project)
Playwright locators: getByRole, getByLabel, getByPlaceholder, getByText, getByTestId — prefer over CSS/XPath`
  },
  {
    id: "gloss-002",
    source_type: "glossary",
    path: "glossary.yaml",
    text: `Advanced QA Patterns and Anti-patterns

ANTI-PATTERNS to avoid:
- Thread.sleep() / page.waitForTimeout() for fixed delays — causes slow and brittle tests
- Hardcoded test data in test methods — use data providers or fixtures
- Testing implementation details instead of behavior
- Ignoring flaky tests — quarantine and fix immediately
- Single large test methods — keep tests focused on one behavior

BEST PRACTICES:
- AAA Pattern: Arrange (setup) -> Act (execute) -> Assert (verify)
- Test isolation: each test should be independent, setup its own state
- Deterministic data: use unique timestamps or test IDs to avoid data conflicts
- Page Object Pattern: keep locators out of test methods
- Explicit waits: always prefer over implicit or fixed waits
- Test pyramid: many unit tests, fewer integration, fewer UI (costly)

PLAYWRIGHT-SPECIFIC:
- Use auto-waiting — Playwright waits automatically for elements to be ready
- Prefer getByRole over CSS selectors for accessibility-aware testing
- Use expect() assertions — they retry automatically until timeout
- Use test.step() for sub-grouping within a test for better reporting
- storageState for auth — log in once, reuse across tests`
  }
];
