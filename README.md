# Salary Crossing

**What a salary is actually worth abroad.** Enter what you earn and where you're thinking of going, and it works out the salary you'd need there to keep exactly what you keep now — after income tax and compulsory social contributions.

[![Live](https://img.shields.io/badge/live-salarycrossing.com-2FA98C?style=for-the-badge)](https://salarycrossing.com/)

## Jurisdictions

| | Covers | Source |
|---|---|---|
| United Kingdom | Income tax (England, Wales, NI and Scotland), National Insurance, student loans | HMRC / gov.uk |
| United States — New York City | Federal, FICA, NY State, NYC resident tax | IRS, NYS-50-T-NYS and NYS-50-T-NYC |
| United States — California | Federal, FICA, CA state tax, SDI | IRS, EDD 2026 withholding schedules |
| United States — Texas | Federal, FICA (no state income tax) | IRS |
| United Arab Emirates | No personal income tax on employment | UAE Federal Tax Authority |
| Australia | Resident rates, Medicare levy | ATO |

Every rate is taken from the authority that sets it, and every page links its sources.

## Why so few countries

Plenty of sites claim 150 countries. Nobody maintains 150 tax codes accurately, and a plausible-looking wrong tax figure is worse than a smaller set of figures a reader can verify.

Two examples of what accuracy costs:

- **New York** levies a supplemental tax above $107,650 that claws back the benefit of the lower brackets. Using the headline bracket table skips it and understates NYC tax by thousands. This uses the State's own annual withholding schedule, which has it built in — you can see it in the published rates, which run 5.90%, 7.03%, 7.53%, **6.40%**, 11.44%, 7.35%.
- **California SDI** lost its wage cap in 2024 — $6,500 a year at a $500,000 salary, routinely left out.

A US state that hasn't been encoded throws rather than quietly returning a number that's too low.

## How it works

- **Static site.** `build.mjs` generates ~450 pages into `public/`; nginx serves them. No server process, nothing to go down but nginx.
- **One engine, two runtimes.** The browser imports the exact modules the build uses, so the number a crawler reads is the number a visitor computes.
- **Equivalent salary by bisection** over each country's own `netPay` function, not by inverting each tax code algebraically. One method works for every jurisdiction, tapers and cliff edges included, and can't drift from the forward calculation.
- **Exchange rates** are European Central Bank reference rates fetched at build time and cached, so an API outage can't break a build. AED is derived through its fixed USD peg (3.6725), since the ECB doesn't publish it.
- **Assets are content-hashed** — the stylesheet by filename, the module tree by directory — so a redeploy can never be served a stale cached copy.
- **Optional living costs use the visitor's figures.** Housing, healthcare, childcare, transport and other essentials can be entered for both places; they are never silently replaced with a city average.
- **Shareable and embeddable comparisons.** A copied link restores the selected salary and costs, while publishers can configure a free iframe from `/use-our-numbers/`.
- **Retirement value stays separate.** Comparison pages distinguish spendable take-home from scheme-dependent pension, employer-funded Australian super and UAE end-of-service benefits instead of presenting all compulsory money as lost.

## Layout

    src/tax.mjs, rates.mjs        UK engine and 2026/27 rates
    src/countries/                 one module per jurisdiction, each citing its sources
    src/compare.mjs                cross-border equivalent-salary solver
    src/mortgage.mjs               UK affordability against real take-home pay
    src/insights.mjs               original analysis, tables computed at build time
    src/*_page.mjs, render.mjs     page templates
    build.mjs                      generates public/
    audit.mjs                      technical SEO audit over the built output
    findings.mjs                   the computations behind the analysis pieces

## Run it

    node --test src/*.test.mjs     # engine tests
    node build.mjs                 # writes public/
    node audit.mjs                 # titles, canonicals, duplicates, orphans, click depth

No dependencies — plain Node 18+.

## Limits

The tax model covers income tax and compulsory contributions. Retirement benefits are disclosed separately and do not change the headline take-home comparison unless a future input explicitly models an employee contribution. Living costs are included only when the visitor enters their own monthly estimates; the site does not claim that one city average represents every household. Figures assume a single person on ordinary employment income with standard allowances. An estimate, not tax advice.
