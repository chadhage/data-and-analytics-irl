-- Edit both approved three-part identifiers before deploying/running the bundle.
-- Source contract: order_timestamp TIMESTAMP, customer_key, product_key,
-- currency_code, and net_amount DECIMAL with business-approved precision.
-- Replacement is deliberate: review existing view grants/ownership before running.
CREATE OR REPLACE VIEW main.contoso_gold.powerbi_sales_daily
COMMENT 'Daily customer/product/currency grain for governed Power BI aggregates'
AS
SELECT
    CAST(order_timestamp AS DATE) AS sales_date,
    customer_key,
    product_key,
    currency_code,
    SUM(net_amount) AS net_amount,
    COUNT(*) AS source_row_count
FROM main.contoso_gold.fact_sales
GROUP BY
    CAST(order_timestamp AS DATE),
    customer_key,
    product_key,
    currency_code;
