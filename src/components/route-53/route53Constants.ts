import type { HostedZone, SelectOption } from "./route53Types";

/** Hosted zones available in the console (no list endpoint is exposed yet). */
export const HOSTED_ZONES: HostedZone[] = [
  {
    id: "Z27YR27SJSDXLT",
    name: "prusplunk.com",
    type: "Public",
    createdBy: "Route 53",
    records: 28,
    description: "Hosted zone created by Route53 Registrar",
  },
];

export const DEFAULT_HOSTED_ZONE = HOSTED_ZONES[0];
export const DEFAULT_HOSTED_ZONE_NAME = DEFAULT_HOSTED_ZONE.name;
export const DEFAULT_HOSTED_ZONE_ID = "e028d1bc-abef-44b4-91ae-efa139e4d2af";

/** Upper bound a user can request for their DNS record quota. */
export const MAX_ROUTE53_QUOTA = 10;
export const MAX_HOSTED_ZONES = 20;

export const ENDPOINT_OPTIONS: SelectOption[] = [
  {
    value: "Alias to Application and Classic Load Balancer",
    label: "Alias to Application and Classic Load Balancer",
  },
  {
    value: "Alias to Network Load Balancer",
    label: "Alias to Network Load Balancer",
  },
];

export const REGION_OPTIONS: SelectOption[] = [
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-east-1", label: "US East (N. Virginia)" },
];
