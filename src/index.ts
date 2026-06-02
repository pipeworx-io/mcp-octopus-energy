interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Octopus Energy public API MCP — UK energy tariffs & products.
 *
 * Keyless: only the public product/tariff/industry endpoints (no account auth).
 * Prices are in pence per kWh (p/kWh); standing charges in p/day. Both inc-VAT
 * and exc-VAT values are returned. Regions are GSP (Grid Supply Point) groups
 * "_A".."_P" — use grid_supply_point to map a UK postcode to its GSP group.
 * Tariff codes (e.g. "E-1R-AGILE-24-10-01-C") come from product_details.
 */


const BASE = 'https://api.octopus.energy/v1';
const UA = 'pipeworx-mcp-octopus-energy/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'list_products',
    description:
      'List Octopus Energy UK energy products (electricity & gas tariff families, e.g. "Agile Octopus", "Flexible Octopus"). Returns {count, results:[{code, display_name, direction, is_variable, is_green, is_tracker, is_prepay, is_business, term, available_from, available_to}]}. The "code" feeds product_details. Optional filters narrow the list.',
    inputSchema: {
      type: 'object',
      properties: {
        is_variable: { type: 'boolean', description: 'Only variable-rate products (prices change over time).' },
        is_green: { type: 'boolean', description: 'Only 100% renewable products.' },
        is_tracker: { type: 'boolean', description: 'Only wholesale-tracker products.' },
        available_at: {
          type: 'string',
          description: 'ISO-8601 timestamp; only products available at that moment, e.g. "2026-06-01T00:00Z".',
        },
      },
    },
  },
  {
    name: 'product_details',
    description:
      'Full detail for one product code, including its tariffs broken out by GSP region "_A".."_P" and payment method (e.g. direct_debit_monthly). Each tariff entry has a "code" (e.g. "E-1R-AGILE-24-10-01-C"), standing charges and unit rates (inc/exc VAT). Use the tariff "code" with tariff_unit_rates. Tariff sets returned: single_register_electricity_tariffs, dual_register_electricity_tariffs, four_rate_ev_electricity_tariffs, single_register_gas_tariffs.',
    inputSchema: {
      type: 'object',
      properties: {
        productCode: { type: 'string', description: 'Product code from list_products, e.g. "AGILE-24-10-01".' },
      },
      required: ['productCode'],
    },
  },
  {
    name: 'tariff_unit_rates',
    description:
      'Time-series of electricity unit rates for a specific tariff — for Agile this is the half-hourly wholesale-tracked pricing. Returns {count, results:[{value_exc_vat, value_inc_vat, valid_from, valid_to, payment_method}]} in p/kWh, newest first. Set kind="standing_charges" for the p/day standing charge instead. Defaults to the most recent rates; pass period_from/period_to to bound a window.',
    inputSchema: {
      type: 'object',
      properties: {
        productCode: { type: 'string', description: 'Product code, e.g. "AGILE-24-10-01".' },
        tariffCode: {
          type: 'string',
          description: 'Tariff code from product_details, e.g. "E-1R-AGILE-24-10-01-C" (the trailing letter is the GSP region).',
        },
        kind: {
          type: 'string',
          enum: ['standard_unit_rates', 'standing_charges'],
          description: 'Which series to fetch. Default "standard_unit_rates".',
        },
        period_from: { type: 'string', description: 'ISO-8601 start, e.g. "2026-06-01T00:00Z".' },
        period_to: { type: 'string', description: 'ISO-8601 end, e.g. "2026-06-02T00:00Z".' },
        page_size: { type: 'number', description: 'Results per page (default 100, max 1500).' },
      },
      required: ['productCode', 'tariffCode'],
    },
  },
  {
    name: 'grid_supply_point',
    description:
      'Map a UK postcode to its GSP (Grid Supply Point) group "_A".."_P". The group_id is the region suffix used in tariff codes and in product_details regional breakdowns. Returns {count, results:[{group_id}]}.',
    inputSchema: {
      type: 'object',
      properties: {
        postcode: { type: 'string', description: 'UK postcode, e.g. "SW1A 1AA" (spaces optional).' },
      },
      required: ['postcode'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'list_products': {
      const qs = new URLSearchParams();
      for (const k of ['is_variable', 'is_green', 'is_tracker'] as const) {
        if (typeof args[k] === 'boolean') qs.set(k, String(args[k]));
      }
      if (typeof args.available_at === 'string' && args.available_at.trim()) {
        qs.set('available_at', args.available_at.trim());
      }
      const q = qs.toString();
      return octGet(`/products/${q ? `?${q}` : ''}`);
    }
    case 'product_details': {
      const code = reqStr(args, 'productCode', '"AGILE-24-10-01"');
      return octGet(`/products/${encodeURIComponent(code)}/`);
    }
    case 'tariff_unit_rates': {
      const product = reqStr(args, 'productCode', '"AGILE-24-10-01"');
      const tariff = reqStr(args, 'tariffCode', '"E-1R-AGILE-24-10-01-C"');
      const kind = args.kind === 'standing_charges' ? 'standing-charges' : 'standard-unit-rates';
      const qs = new URLSearchParams();
      for (const k of ['period_from', 'period_to'] as const) {
        if (typeof args[k] === 'string' && (args[k] as string).trim()) qs.set(k, (args[k] as string).trim());
      }
      if (typeof args.page_size === 'number') qs.set('page_size', String(args.page_size));
      const q = qs.toString();
      return octGet(
        `/products/${encodeURIComponent(product)}/electricity-tariffs/${encodeURIComponent(tariff)}/${kind}/${q ? `?${q}` : ''}`,
      );
    }
    case 'grid_supply_point': {
      const postcode = reqStr(args, 'postcode', '"SW1A 1AA"').replace(/\s+/g, '');
      return octGet(`/industry/grid-supply-points/?postcode=${encodeURIComponent(postcode)}`);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function octGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Octopus: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
