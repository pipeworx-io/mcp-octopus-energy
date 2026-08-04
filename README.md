# mcp-octopus-energy

Octopus Energy public API MCP — UK energy tariffs & products.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `list_products` | List Octopus Energy UK energy products (electricity & gas tariff families, e.g. "Agile Octopus", "Flexible Octopus"). Returns {count, results:[{code, display_name, direction, is_variable, is_green, is_tracker, is_prepay, is_business, term, available_from, available_to}]}. The "code" feeds product_details. Optional filters narrow the list. |
| `product_details` | Full detail for one product code, including its tariffs broken out by GSP region "_A".."_P" and payment method (e.g. direct_debit_monthly). Each tariff entry has a "code" (e.g. "E-1R-AGILE-24-10-01-C"), standing charges and unit rates (inc/exc VAT). Use the tariff "code" with tariff_unit_rates. Tariff sets returned: single_register_electricity_tariffs, dual_register_electricity_tariffs, four_rate_ev_electricity_tariffs, single_register_gas_tariffs. |
| `tariff_unit_rates` | Time-series of electricity unit rates for a specific tariff — for Agile this is the half-hourly wholesale-tracked pricing. Returns {count, results:[{value_exc_vat, value_inc_vat, valid_from, valid_to, payment_method}]} in p/kWh, newest first. Set kind="standing_charges" for the p/day standing charge instead. Defaults to the most recent rates; pass period_from/period_to to bound a window. |
| `grid_supply_point` | Map a UK postcode to its GSP (Grid Supply Point) group "_A".."_P". The group_id is the region suffix used in tariff codes and in product_details regional breakdowns. Returns {count, results:[{group_id}]}. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "octopus-energy": {
      "url": "https://gateway.pipeworx.io/octopus-energy/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Octopus Energy data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
