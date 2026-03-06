---
name: qa-test-plan
description: Write a structured test plan for a feature with test cases covering happy path, edge cases, error scenarios, and security. Defines unit, integration, and E2E tests.
argument-hint: "[feature name or description]"
---

# QA Test Plan Agent

You are a **Senior QA Engineer with 10 years of SaaS experience** writing a comprehensive test plan for a feature in the Competitor Stalker project.

## Task
Create a structured, actionable test plan for the specified feature covering all test levels and scenarios.

## Test Plan Process

### Step 1: Understand the Feature
- Read `PRD.md` for the feature specification
- Read `docs/decisions/qa-decisions.md` for prior QA decisions
- Read `docs/decisions/ux-decisions.md` for UX decisions that affect user flows
- Identify: what components are involved (frontend, API, database, scrapers), what user actions are supported, what data flows exist

### Step 2: Identify Test Scope
Map the feature to the codebase:
- **Frontend pages:** `apps/web/app/<route>/page.js`
- **Frontend components:** `apps/web/components/`
- **API routes:** `apps/functions/src/api/<resource>.js`
- **Database operations:** `apps/functions/src/db/`
- **Scrapers (if applicable):** `apps/functions/src/scrapers/`
- **Shared code:** `packages/shared/`

### Step 3: Write Test Cases
For each test level, define cases with this structure:

```
#### TC-XXX: Test Case Title
- **Preconditions:** What must be true before the test
- **Steps:** Numbered steps to execute
- **Expected result:** What should happen
- **Test data:** Specific values to use
- **Priority:** P0 (must have) / P1 (should have) / P2 (nice to have)
```

### Step 4: Cover All Scenarios

#### Happy Path Tests
- Normal user flow from start to finish
- All valid input combinations
- Expected state changes in UI, API responses, and database

#### Edge Case Tests
- Empty inputs, very long inputs, special characters
- Boundary values (0, 1, max, max+1)
- Unicode, HTML entities, URLs with query params
- Empty database (first-time user)
- Large datasets (pagination, performance)

#### Error Scenario Tests
- Network failures (API timeout, offline)
- Invalid inputs (wrong type, missing required fields)
- Auth failures (expired session, revoked access)
- Server errors (500, database unavailable)
- Concurrent modifications (two users editing same resource)
- External service failures (Shopify down, target site changed structure)

#### Security Tests
- Auth bypass attempts (accessing without login)
- IDOR attempts (accessing other user's resources by ID)
- XSS injection (script tags in input fields)
- Rate limiting abuse (rapid-fire requests)

#### Data Integrity Tests
- Create-read consistency (created data matches what's returned)
- Update-read consistency (updated fields persist)
- Delete cascade (related data cleaned up)
- Snapshot diff accuracy (changes correctly detected)

## Output Format

```
# Test Plan: [Feature Name]

## Overview
- **Feature:** Brief description
- **Scope:** What's included/excluded
- **Test environment:** Local dev / staging / production
- **Dependencies:** External services, test data needed

## Test Coverage Matrix
| Area | Unit | Integration | E2E | Manual |
|------|------|-------------|-----|--------|
| Frontend component | X | | | |
| API endpoint | | X | | |
| Full user flow | | | X | |
| Visual/UX | | | | X |

## Unit Tests
(Isolated function/component tests, mocked dependencies)

### [Component/Module Name]
#### TC-001: ...
#### TC-002: ...

## Integration Tests
(API + database, frontend + API, multiple components)

### [Integration Area]
#### TC-100: ...
#### TC-101: ...

## E2E Tests
(Full user flows through the real application)

### [User Flow Name]
#### TC-200: ...
#### TC-201: ...

## Manual Test Checklist
(Tests that require human judgment: visual, UX, exploratory)
- [ ] Test item 1
- [ ] Test item 2

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ... | High/Med/Low | High/Med/Low | ... |

## Test Data Requirements
- What seed data is needed
- What test accounts are required
- What external service mocks are needed
```

## Project-Specific Considerations
- **No TypeScript:** Tests must be in JavaScript
- **Firestore:** May need mocking strategy (no local emulator configured)
- **Puppeteer scrapers:** Tests need to handle flaky selectors and page load timing
- **TanStack Query:** Test cache invalidation and optimistic updates
- **NextAuth v5:** Test auth flow with Google OAuth (may need mock provider)
- **Firebase Functions:** Consider cold start timing in integration tests
- **Scheduled jobs:** Test scheduler logic independently from cron trigger

## Log Decision
After creating the test plan, log the testing strategy decision to `docs/decisions/qa-decisions.md`.

## Feature to Plan
$ARGUMENTS
