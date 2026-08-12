/**
 * lbCreate.constants.ts
 * Static config, defaults and row/listener factories for the Load Balancer create flow.
 */

import type { SubnetItem } from "@/services/lbApi";
import type { ListenerConfig, TagRow, TargetGroupRow } from "./lbCreate.types";

export const LB_NAME_REGEX = /^[a-zA-Z0-9-]+$/;
export const DEFAULT_SG_NAME = "splunk-poc-sg";

export const ALB_PROTOCOLS = ["HTTP", "HTTPS"];

export const ALLOWED_VPCS: Record<string, string> = {
  "us-east-2": "vpc-02e99db96569078e6",
  "us-east-1": "vpc-00f1dd2c4bab98af5",
};

export const STATIC_SUBNETS_BY_REGION: Record<string, SubnetItem[]> = {
  "us-east-2": [
    {
      id: "subnet-093d40d08c73d4a60",
      name: "splunk-poc-public-subnet-3",
      az: "us-east-2c",
      cidr: "10.0.3.0/24",
    },
    {
      id: "subnet-09edfe5b54b85d2c8",
      name: "splunk-poc-public-subnet-2",
      az: "us-east-2b",
      cidr: "10.0.2.0/24",
    },
    {
      id: "subnet-03dffb510edb7ab4e",
      name: "splunk-poc-public-subnet-1",
      az: "us-east-2a",
      cidr: "10.0.1.0/24",
    },
  ],
  "us-east-1": [
    {
      id: "subnet-0012ebab3c854f686",
      name: "splunk-poc-public-subnet-4",
      az: "us-east-1c",
      cidr: "10.0.4.0/24",
    },
    {
      id: "subnet-0e86b2ff8dbb39142",
      name: "splunk-poc-public-subnet-2",
      az: "us-east-1a",
      cidr: "10.0.2.0/24",
    },
    {
      id: "subnet-099455525bf2dcc2a",
      name: "splunk-poc-public-subnet-5",
      az: "us-east-1d",
      cidr: "10.0.5.0/24",
    },
    {
      id: "subnet-0f9f4f1f4d17b998c",
      name: "Splunk-Poc-Public-Subnet-1",
      az: "us-east-1e",
      cidr: "10.0.1.0/24",
    },
    {
      id: "subnet-001dd87543f9c1402",
      name: "splunk-poc-public-subnet-3",
      az: "us-east-1b",
      cidr: "10.0.3.0/24",
    },
    {
      id: "subnet-0f6b10e5760a9e210",
      name: "splunk-poc-public-subnet-6",
      az: "us-east-1f",
      cidr: "10.0.6.0/24",
    },
  ],
};

export const createTagRow = (): TagRow => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  key: "",
  value: "",
});

export const createTargetGroup = (): TargetGroupRow => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  group: "",
  weight: 1,
});

export const createListener = (id: number, isAlb: boolean, port = 80): ListenerConfig => ({
  id,
  protocol: isAlb ? "HTTP" : "TCP",
  port,
  action: "forward",
  redirectMode: "uri",
  expanded: true,
  tags: [],
  stickiness: false,
  stickinessDurationType: "dhms",
  stickinessSeconds: 3600,
  stickinessDays: 0,
  stickinessHours: 1,
  stickinessMinutes: 0,
  stickinessDhmsSecs: 0,
  targetGroups: [createTargetGroup()],
  customHostPath: false,
  redirectHost: "#{host}",
  redirectPath: "/#{path}",
  redirectQuery: "#{query}",
  redirectPort: "#{port}",
  redirectProtocol: "#{protocol}",
  fixedResponseCode: "503",
  fixedResponseContentType: "text/plain",
  fixedResponseBody: "",
});
