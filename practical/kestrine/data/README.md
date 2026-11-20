# Kestrine's numbers

All amounts are US dollars. Months run January 2024 to October 2026.

## sales-monthly.csv
One row per month and channel.
- `channel`: Downtown café, North Shore café, Airport café (from June 2025), Online shop, Subscription, Wholesale
- `units`, `unit`: drinks for the cafés, 12 oz bags for the online shop and the subscription, kg for wholesale
- `revenue_usd`, `cost_of_goods_usd`: what the channel sold and what the coffee, milk, cups and packaging cost

## costs-monthly.csv
One row per month: `green_coffee_usd_per_lb` (unroasted coffee), `coffee_roasted_kg`, `roast_loss_pct` (weight lost
in roasting), `bag_and_label_usd_each`, `staff_hours` and `avg_hourly_wage_usd` (all staff), `rent_usd` (all sites),
`marketing_usd`.

## orders-online.csv
Every online order, January 2025 to October 2026, one-off shop orders and subscription deliveries. Each month's orders
add up to that month's Online shop and Subscription rows in sales-monthly.csv.
- `subscription`: yes for a subscription delivery (always one bag at 10% off, code SUB10)
- `first_order`: yes for a customer's first one-off order
- `discount_code`: WELCOME10 (10% off a first order), HOLIDAY15 (15% off in December), SUB10, or empty
- `unit_price_usd` is the list price; `total_usd` is what the customer paid (bags x price, less any discount)
