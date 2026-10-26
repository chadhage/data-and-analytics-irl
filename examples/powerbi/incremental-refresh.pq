let
    Source = FactSalesSource,
    WindowedRows = Table.SelectRows(
        Source,
        each [OrderDateTime] >= RangeStart and [OrderDateTime] < RangeEnd
    )
in
    WindowedRows
