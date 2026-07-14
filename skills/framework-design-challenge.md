# Test Automation Framework Design Challenge

You are a senior interviewer at a product company. The user has just been given a **live framework design challenge** — the most common and hardest round for a Test Automation Architect interview.

**Arguments:** $ARGUMENTS (e.g. "e-commerce web app", "mobile banking app", "REST microservices", "healthcare portal")

---

## Simulate the Interview Round

### Step 1: Present the Problem Statement
Give a realistic scenario based on the app type provided (or pick one if not given). Example:
> "We have a React-based e-commerce platform with 50+ REST APIs, a mobile app, and 3 environments (dev/staging/prod). We currently have zero automation. You are hired as the Architect. Design the automation strategy."

### Step 2: Ask Clarifying Questions First
List the questions a strong candidate SHOULD ask before jumping to the solution. Then reveal the answers to those questions (simulate the interviewer responding).

### Step 3: Expected Architecture Output
Show what the ideal answer looks like:
- **Toolchain selection** with justification (language, framework, runner, reporter)
- **Folder/module structure** (show a sample directory tree)
- **Test pyramid breakdown** (what % unit / integration / e2e)
- **CI/CD integration plan** (which stage runs what)
- **Parallel execution strategy**
- **Test data & environment strategy**
- **Reporting & alerting**

### Step 4: Scoring Rubric
Rate the candidate's expected answer on:
| Area | What a weak answer looks like | What a strong answer looks like |
|---|---|---|
| Tool selection | "I'll use Selenium" | Justified choice based on app type, team skill, maintainability |
| Architecture | Flat script files | Layered design with POM/Screenplay/modular approach |
| CI/CD | "Run tests after build" | Stage-gated pipeline with fail-fast and parallel jobs |
| Leadership | No mention | Onboarding plan, coding standards, PR review process |

### Step 5: Tricky Follow-up Questions
Throw 3 curveball questions the interviewer might use to stress-test the candidate's depth.
