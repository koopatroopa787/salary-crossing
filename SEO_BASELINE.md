# Search Console baseline — 22 September 2026

The first query-led optimisation pass used the Search Console performance report for `salarycrossing.com` with the three-month view. The site was only present in the report from 3 to 19 September, so this is an early baseline rather than a mature ranking sample.

## Baseline

- 5 clicks
- 3,320 impressions
- 0.2% sitewide click-through rate
- 76.8 average position
- 692 reported queries and 226 reported pages

Search Console omits some low-volume query detail for privacy, so the visible query rows account for fewer impressions and no attributed clicks even though the sitewide total contains five clicks.

## Query clusters

| Cluster | Queries | Visible impressions | Weighted average position |
|---|---:|---:|---:|
| Mortgage affordability | 177 | 2,098 | 94.9 |
| UK take-home and after-tax salaries | 425 | 647 | 63.6 |
| Cross-border salary and currency | 24 | 44 | 31.3 |
| Other | 66 | 77 | 68.2 |

## Page opportunities

- `/mortgage/`: 2,123 impressions, position 94.5. Queries repeatedly ask how much mortgage a salary supports, the salary multiple, the percentage of salary spent on a mortgage, and income needed for £200,000 or £250,000 loans.
- `/salary/{amount}/`: the clearest near-term wins are exact “after tax”, monthly take-home and hourly-rate searches. Several amount pages already appear between positions 4 and 20 on small samples.
- `/compare/{route}/{salary}/`: low volume, but many pages already appear between positions 3 and 10. UAE-to-Australia pages also receive exact AED-to-AUD searches, so the pages now state both the currency conversion and the after-tax salary comparison.

## Template changes in this pass

- Mortgage title, H1, description, FAQs, income-multiple table and required-income table now match the language people use in Search Console.
- Salary pages now answer annual, monthly, weekly and approximate hourly take-home questions in visible HTML and structured FAQ data.
- International comparison titles and headings use familiar search names such as UK, Dubai, Australia and New York.
- Cross-currency pages now answer the literal currency-conversion query before explaining why equal converted gross pay is different from equal take-home pay.

Recheck the same clusters after four weeks. The primary measures are impressions, average position and clicks for `/mortgage/`, the salary-page group and the comparison-page group.
