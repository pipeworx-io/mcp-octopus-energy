# mcp-octopus-energy

Octopus Energy public API MCP — UK energy tariffs & products.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1679+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/octopus-energy/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1679+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/octopus_energy_list_products \
  -H 'Content-Type: application/json' \
  -d '{"is_variable":true}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/octopus_energy_list_products`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "octopus-energy": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-octopus-energy"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-octopus-energy
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Octopus Energy data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
