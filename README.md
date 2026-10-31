# CukupDuit

**Know when you've got enough.**

A financial freedom and retirement simulator built for Malaysian Ringgit. Explore how savings, investment accounts, inflation, retirement spending, children and inheritance change the earliest retirement age your plan can support.

- Repository: [lumbanon/cukupduit](https://github.com/lumbanon/cukupduit)
- Production URL: [lumbanon.github.io/cukupduit](https://lumbanon.github.io/cukupduit/)
- Hosting: static GitHub Pages; no production backend or account required.

[![Validate and deploy CukupDuit](https://github.com/lumbanon/cukupduit/actions/workflows/deploy.yml/badge.svg)](https://github.com/lumbanon/cukupduit/actions/workflows/deploy.yml)

Pushes to `main` validate the application and deploy it to GitHub Pages. See the linked workflow for the current deployment status.

## Features

- Guided personal profile, assets, retirement, family and legacy questionnaire, with Quick and Advanced modes.
- Configure savings only in Assets & Savings: enter a fixed monthly amount or a percentage of take-home income, with a read-only calculated MYR summary for percentage savings.
- Multiple investment accounts, configurable returns, fees, contribution growth, withdrawal ages and priorities.
- EPF / KWSP restrictions and ASB / ASNB assumptions are editable; defaults are illustrative modelling assumptions.
- Separate liquid, restricted and illiquid assets, liabilities and property cash flows.
- Monthly deterministic projections and a full simulation for every candidate retirement age.
- Independent support, education, university funding and gifts for existing and planned children.
- Inheritance goals evaluated when they are due, including inflation-adjusted targets.
- Wealth growth, allocation, cash flow and family expense charts, with nominal and real views.
- Conservative, base, optimistic and custom scenarios, plus calculated retirement optimization suggestions.
- Explicit JSON import/export, a copyable summary and a locally generated share image.
- Responsive layouts, keyboard controls and reduced-motion support.

## Run locally

Use Node.js 24 LTS (or a supported Node.js version >=22.13) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, including `/cukupduit/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check application and tooling TypeScript |
| `npm run test -- --run` | Run the financial engine unit tests |
| `npm run test` | Run tests in watch mode |
| `npm run build` | Type-check and build static assets into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test:e2e` | Run desktop and mobile browser smoke tests against the production build |

For browser tests, first build the app and install Chromium:

```sh
npm run build
npx playwright install chromium
npm run test:e2e
```

Set `PLAYWRIGHT_BASE_URL` to test an existing deployment instead of starting the local preview server. For example, use `https://lumbanon.github.io/cukupduit/` after deployment.

## Technology and structure

React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui-compatible Radix components, Lucide, Recharts, Motion, Vitest, ESLint and Playwright. Dependencies are locked in `package-lock.json`.

The shared seven-color palette and section themes live in `src/styles.css`. `src/data/visualTheme.ts` maps investment categories and scenario identities to those tokens; scenarios also use distinct line patterns. The footer keeps its disclaimer and links together in a centered, 1,000px container and stacks them on smaller screens.

```text
src/
  components/   # Accessible forms, charts and UI components
  data/         # Illustrative defaults and account definitions
  engine/       # Pure simulation, validation, search and optimization
  types/        # Financial model and result contracts
  utils/        # Formatting and browser-only helpers
  App.tsx       # Guided planner and results dashboard
  styles.css    # Responsive design system
e2e/            # Desktop and mobile browser checks
.github/workflows/deploy.yml
```

## Financial model

All calculations execute locally in TypeScript. Monetary inputs and displayed results use MYR. Internal calculations retain floating-point precision; formatting rounds only the displayed values.

An effective annual return `r` becomes a monthly return:

```text
monthlyReturn = (1 + r)^(1/12) - 1
```

The same effective conversion is used for inflation. The purchasing power of a future nominal amount is:

```text
realValue = nominalValue / (1 + annualInflation)^(monthsElapsed / 12)
```

Savings are a total contribution budget, already net of ordinary working-life household expenses. The expenses input describes that budget and supports the expense-reduction optimizer; it is not deducted again from entered savings. Account allocations consume the savings budget; unallocated savings go to cash, preventing a second contribution of the same savings. Contributions cease at retirement. Annual savings and account contribution growth are applied geometrically over elapsed time to the corresponding inputs.

`monthlySavingsBudget` derives the single active budget for the form, simulation, retirement search, scenarios and optimizer. Fixed mode uses the entered monthly amount; percentage mode uses take-home income multiplied by the saved fraction (`0.25` means 25%) and follows income growth. The calculated RM amount is never stored separately. Fixed and percentage inputs remain available when changing methods, but only the selected method contributes to the budget. Existing JSON plans remain compatible, and changing Quick/Advanced mode does not change either input or the selected method.

Within each month, boundary events (property sales, retirement purchases, legacy and one-time child costs) are processed first. Pre-retirement contributions are invested at the start of the month, followed by investment returns and fees; ordinary spending withdrawals occur at month end. The effective monthly fee factor is `(1 - annualFee)^(1/12)`. Optional account tax applies to positive growth after fees each month, with no refund for losses. This is a simplified tax assumption, not a tax return calculation.

Child costs, debt service and property costs reduce working savings unless explicitly marked as already included in the household budget. Rent and other positive cash flows accumulate in cash. Loans accrue effective monthly interest before their scheduled payment. A property sale deducts the configured sale cost and remaining mortgage before the proceeds become liquid.

Every monthly retirement candidate is tested individually through the complete planning horizon. The search does not assume that feasibility always improves with a later retirement age. A candidate must fund spending, family obligations and legacy distributions while respecting account accessibility and preserving the requested emergency reserve. A missing feasible age is reported as an unachievable plan under the selected assumptions.

The required retirement capital is the minimum total accessible opening capital found by simulation and bisection, conditional on existing restricted assets unlocking later and on reaching retirement solvent. This figure is the total capital needed at retirement, not an additional amount to add to the projected retirement balance. The emergency reserve must remain accessible throughout retirement and rises with inflation when entered in today's money. A 4% comparison, when shown, is a heuristic; the monthly simulation is the primary result.

EPF accessibility is user-configurable and is not a claim about current withdrawal policy. Property is excluded from liquid retirement funding until a configured sale. Mortgage payments and family expenses have explicit options for costs already included in the household budget, to avoid counting them again. Planned children incur no costs before birth. Legacy targets are paid at the chosen distribution age, rather than automatically reserved in full at retirement.

## Assumptions and limitations

- Expected returns, fees, taxes and inflation are user assumptions. Returns and dividends are not guaranteed.
- The model uses deterministic monthly averages and does not estimate sequence-of-returns risk or a probability of success. No Monte Carlo result is implied.
- Optional account taxes use a simplified configured rate. The model does not calculate individual Malaysian or foreign tax liabilities, EPF eligibility, ASNB product eligibility or legal entitlements.
- Property sale timing, appreciation, rental income, financing and transaction costs are simplified assumptions; sales are not guaranteed.
- Expenses entered in today's money grow with inflation. Future nominal targets do not receive a second inflation adjustment. Education uses each child's education inflation assumption.
- Estate values are financial projections and do not replace wills, trusts, probate, inheritance law or professional estate planning.
- Unfunded cash flows remain shortfalls; restricted assets cannot be borrowed against automatically.
- Very high growth assumptions or unrealistic combinations can make long-range results misleading. Validation rejects invalid and nonfinite inputs.

CukupDuit is an educational planning tool, not personalized professional financial advice. Investment returns, inflation, withdrawal rules, life expectancy and retirement outcomes are uncertain. Review assumptions periodically and consult qualified professionals for decisions requiring financial, tax or legal advice.

## Privacy

Financial inputs stay in browser memory. There is no database, analytics, account, API key, automatic localStorage, cookie saving or automatic transmission of questionnaire responses. Refreshing starts a new session. Export and import are explicit user actions. Summary copying and image downloads happen locally; check the contents before sharing personal financial information.

Inter and Plus Jakarta Sans are self-hosted from the bundled Fontsource packages; the app does not fetch webfonts from a third-party font service. Both font families are distributed under the SIL Open Font License.

The app's static files are served by GitHub Pages. Hosting providers may process ordinary website request metadata under their own policies, but questionnaire values are not sent to them.

## Validation

Unit tests cover independently calculated financial examples and the engine's edge cases: effective monthly compounding, contributions, inflation, multiple accounts, retirement search, withdrawals, depletion, children, future births, education, inheritance, access restrictions, negative returns, scenarios and optimization. Browser smoke tests exercise the rendered planner on desktop and mobile.

The deployment workflow requires installation, lint, TypeScript, unit tests and production build to pass before publishing. A successful build alone is not a verification of a live deployment.

## GitHub Pages

Vite uses `base: '/cukupduit/'`. The app uses an in-page guided flow, so refreshing does not depend on server-side routing.

Pushes to `main` run `.github/workflows/deploy.yml`. Pull requests run validation without publishing. Official GitHub actions build and upload `dist/`, then deploy it using the `github-pages` environment. Repository Pages settings must select **GitHub Actions** as the build source. The workflow uses only `contents: read`, `pages: write` and `id-token: write` permissions and a Node.js 24 runner.

After publishing, verify the workflow result, the production HTTP response, asset loading and planner interactions at the public URL. No paid infrastructure is needed.
