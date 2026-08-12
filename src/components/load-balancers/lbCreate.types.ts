/**
 * lbCreate.types.ts
 * Shared types for the Load Balancer create flow.
 */

export type LbKind = "ALB" | "NLB";
export type RoutingAction = "forward" | "redirect" | "fixed-response";
export type RedirectMode = "uri" | "full";

export type TagRow = {
  id: number;
  key: string;
  value: string;
};

export type TargetGroupRow = {
  id: number;
  group: string;
  weight: number;
};

export type ListenerConfig = {
  id: number;
  protocol: string;
  port: number;
  action: RoutingAction;
  redirectMode: RedirectMode;
  expanded: boolean;
  tags: TagRow[];
  stickiness: boolean;
  stickinessDurationType: "seconds" | "dhms";
  stickinessSeconds: number;
  stickinessDays: number;
  stickinessHours: number;
  stickinessMinutes: number;
  stickinessDhmsSecs: number;
  targetGroups: TargetGroupRow[];
  customHostPath: boolean;
  redirectHost: string;
  redirectPath: string;
  redirectQuery: string;
  redirectPort: string;
  redirectProtocol: string;
  fixedResponseCode: string;
  fixedResponseContentType: string;
  fixedResponseBody: string;
};

export interface LoadBalancerCreateProps {
  kind: LbKind;
}
