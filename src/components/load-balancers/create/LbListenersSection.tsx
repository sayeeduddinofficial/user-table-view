/**
 * LbListenersSection.tsx
 * "Listeners and Routing" section of the Load Balancer create flow.
 */

import { ChevronDown, ChevronUp, RefreshCw, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManagedTargetGroup } from "@/services/lbApi";
import type { ListenerConfig, TargetGroupRow } from "../lbCreate.types";
import { isValidStatusCode, sanitizePort, sanitizeStatusCode } from "@/utils/lb.utils";
import { Field, Section } from "../lbCreateShared";

interface LbListenersSectionProps {
  isAlb: boolean;
  listeners: ListenerConfig[];
  updateListener: (id: number, changes: Partial<ListenerConfig>) => void;
  removeListener: (id: number) => void;
  addListener: () => void;
  remainingListeners: number;
  portErrorIds: number[];
  setPortErrorIds: React.Dispatch<React.SetStateAction<number[]>>;
  fixedResponseErrorIds: number[];
  setFixedResponseErrorIds: React.Dispatch<React.SetStateAction<number[]>>;
  listenerTgError: number[];
  submitted: boolean;
  getFilteredTgOptions: (listenerProtocol: string) => ManagedTargetGroup[];
  handleCreateTargetGroup: () => void;
  deletingTgId: string | null;
  handleDeleteTargetGroup: (tg: ManagedTargetGroup, e: React.SyntheticEvent) => void;
  addTargetGroup: (listenerId: number) => void;
  updateTargetGroup: (listenerId: number, tgId: number, changes: Partial<TargetGroupRow>) => void;
  removeTargetGroup: (listenerId: number, tgId: number) => void;
}

export function LbListenersSection({
  isAlb,
  listeners,
  updateListener,
  removeListener,
  addListener,
  remainingListeners,
  portErrorIds,
  setPortErrorIds,
  fixedResponseErrorIds,
  setFixedResponseErrorIds,
  listenerTgError,
  submitted,
  getFilteredTgOptions,
  handleCreateTargetGroup,
  deletingTgId,
  handleDeleteTargetGroup,
  addTargetGroup,
  updateTargetGroup,
  removeTargetGroup,
}: LbListenersSectionProps) {
  return (
    <Section id="listeners-routing" title="Listeners and Routing">
      <p className="text-xs text-muted-foreground mb-3">
        A listener is a process that checks for connection requests using the protocol and port you configure.
      </p>
      <div className="space-y-3">
        {listeners.map((listener) => (
          <div key={listener.id} className="border border-border rounded-md bg-card/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background/30">
              <button
                type="button"
                onClick={() => updateListener(listener.id, { expanded: !listener.expanded })}
                className="flex items-center gap-2 font-medium text-sm"
              >
                {listener.expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} className="rotate-90" />}
                Listener {listener.protocol}:{listener.port}
              </button>
              <Button variant="outline" size="sm" disabled={listeners.length === 1} onClick={() => removeListener(listener.id)}>Remove</Button>
            </div>

            {listener.expanded && (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Field label="Protocol" inline>
                    <select
                      value={listener.protocol}
                      onChange={(e) => updateListener(listener.id, { protocol: e.target.value })}
                      className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                    >
                      {(isAlb ? ["HTTP", "HTTPS"] : ["TCP", "UDP", "TCP_UDP", "TLS"]).map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Port" inline>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={listener.port === 0 ? "" : listener.port}
                      onChange={(e) => {
                        const cleaned = sanitizePort(e.target.value);
                        const num = cleaned === "" ? 0 : Number(cleaned);
                        updateListener(listener.id, { port: num });
                        // live-clear the error once it's valid again
                        if (num >= 1 && num <= 65535) {
                          setPortErrorIds((prev) => prev.filter((id) => id !== listener.id));
                        }
                      }}
                      className={`w-full bg-input/40 border rounded-md px-3 py-2 text-sm ${portErrorIds.includes(listener.id)
                        ? "border-red-500 ring-2 ring-red-200"
                        : "border-border"
                        }`}
                    />
                    {submitted && portErrorIds.includes(listener.id) ? (
                      <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                        <XCircle size={14} className="mt-0.5 shrink-0" />
                        <span>Port must be an integer between 1 and 65535, inclusive.</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-1">1 - 65535</p>
                    )}
                  </Field>
                </div>

                {isAlb && (
                  <Field label="Default action">
                    <p className="text-xs text-muted-foreground mb-3">The default action is used if no other rules apply. Choose the default action for traffic on this listener.</p>
                    <div className="text-xs font-medium mb-3">Routing action</div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {([
                        { id: "forward", label: "Forward to target groups", disabled: false },
                        { id: "redirect", label: "Redirect to URL", disabled: true },
                        { id: "fixed-response", label: "Return fixed response", disabled: false },
                      ] as const).map((a) => (
                        <label key={a.id} className={`flex items-center gap-2 px-3 py-2 text-xs border rounded-md cursor-pointer ${listener.action === a.id ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                          <input
                            type="radio"
                            name={`action-${listener.id}`}
                            checked={listener.action === a.id}
                            disabled={a.disabled}
                            onChange={() => !a.disabled && updateListener(listener.id, { action: a.id })}
                            className="accent-primary"
                          />
                          {a.label}
                        </label>
                      ))}
                    </div>
                  </Field>
                )}

                {(!isAlb || listener.action === "forward") && (
                  <div className="border-l-2 border-border pl-4">
                    <Field label="Forward to target group">
                      <p className="text-xs text-muted-foreground mb-3">
                        Choose a target group and specify routing weight or{" "}
                        <button
                          type="button"
                          onClick={handleCreateTargetGroup}
                          className="text-primary hover:underline text-xs cursor-pointer"
                        >
                          Create target group
                        </button>
                      </p>
                      <div className="space-y-2">
                        {listener.targetGroups.map((tg) => {
                          const totalWeight = listener.targetGroups.reduce((s: number, t: TargetGroupRow) => s + (Number(t.weight) || 0), 0);
                          const pct = totalWeight > 0 ? Math.round(((Number(tg.weight) || 0) / totalWeight) * 100) : 0;
                          const selectedElsewhere = new Set(
                            listener.targetGroups
                              .filter((other) => other.id !== tg.id && other.group)
                              .map((other) => other.group)
                          );
                          return (
                            <div key={tg.id} className="grid grid-cols-[1fr_auto_110px_70px_auto] gap-2 items-end">
                              <div>
                                <Select
                                  value={tg.group}
                                  onValueChange={(value) =>
                                    updateTargetGroup(listener.id, tg.id, { group: value })
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a target group" />
                                  </SelectTrigger>

                                  <SelectContent className="min-w-[420px]">
                                    {
                                      getFilteredTgOptions(listener.protocol).length === 0 ? (
                                        <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                          No resource to display
                                        </div>
                                      ) :
                                        (getFilteredTgOptions(listener.protocol).map((opt) => {
                                          const isUsedElsewhere = selectedElsewhere.has(opt.arn ?? "");
                                          const isDisabled = opt.is_used || isUsedElsewhere;
                                          return (
                                            <SelectItem
                                              key={opt.id}
                                              value={opt.arn ?? ""}
                                              disabled={isDisabled}
                                              actions={
                                                !opt.is_used && (
                                                  <span
                                                    role="button"
                                                    tabIndex={-1}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onPointerUp={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteTargetGroup(opt, e);
                                                    }}
                                                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive shrink-0 ml-auto"
                                                    title="Delete target group"
                                                  >
                                                    {deletingTgId === opt.id ? (
                                                      <RefreshCw size={12} className="animate-spin" />
                                                    ) : (
                                                      <Trash2 size={12} />
                                                    )}
                                                  </span>
                                                )
                                              }
                                            >
                                              {opt.name} ({opt.protocol}:{opt.port})
                                              {opt.is_used ? " — already in use" : isUsedElsewhere ? " — already selected" : ""}
                                            </SelectItem>
                                          );
                                        }))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <div className="text-[11px] text-muted-foreground mb-1">Weight</div>
                                <input
                                  type="number"
                                  min={0}
                                  max={999}
                                  value={tg.weight}
                                  onChange={(e) => updateTargetGroup(listener.id, tg.id, { weight: Number(e.target.value) })}
                                  className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <div className="text-[11px] text-muted-foreground mb-1">Percent</div>
                                <div className="px-2 py-2 text-sm">{pct}%</div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={listener.targetGroups.length === 1}
                                onClick={() => removeTargetGroup(listener.id, tg.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      {submitted && listenerTgError.includes(listener.id) && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                          <XCircle size={12} /> A target group is required.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => addTargetGroup(listener.id)}
                        disabled={listener.targetGroups.length >= 5}
                        className="mt-2 inline-flex items-center gap-1 text-xs px-4 py-1.5 border border-primary/60 text-primary rounded-full hover:bg-primary/10 font-medium"
                      >
                        Add target group
                      </button>
                      <p className="text-xs text-muted-foreground mt-1.5">You can add up to {Math.max(0, 5 - listener.targetGroups.length)} more target group{5 - listener.targetGroups.length === 1 ? "" : "s"}.</p>
                    </Field>
                  </div>
                )}

                {isAlb && listener.action === "redirect" && (
                  <div className="border-l-2 border-border pl-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-medium">Redirect to URL</span>
                      <a className="text-xs text-primary hover:underline">Info</a>
                    </div>
                    <div className="inline-flex rounded-md border border-border overflow-hidden mb-3 text-xs">
                      <button type="button" onClick={() => updateListener(listener.id, { redirectMode: "uri" })} className={`px-3 py-1.5 ${listener.redirectMode === "uri" ? "bg-primary text-primary-foreground" : "bg-background/40"}`}>URI parts</button>
                      <button type="button" disabled onClick={() => updateListener(listener.id, { redirectMode: "full" })} className={`px-3 py-1.5 ${listener.redirectMode === "full" ? "bg-primary text-primary-foreground" : "bg-background/40"}`}>Full URL</button>
                    </div>
                    {listener.redirectMode === "full" ? (
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium mb-1">Full URL</div>
                          <p className="text-xs text-muted-foreground mb-1.5">Enter the full destination URL, including protocol, hostname, path, and query string.</p>
                          <input defaultValue="https://#{host}/#{path}?#{query}" className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <div className="text-sm font-medium mb-1">Status code</div>
                          <select className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
                            <option>301 - Permanently moved</option>
                            <option>302 - Found</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm font-medium mb-1">Protocol</div>
                            <p className="text-xs text-muted-foreground mb-1.5">Used for connections from clients to the load balancer.</p>
                            <select
                              value={listener.redirectProtocol}
                              onChange={(e) => updateListener(listener.id, { redirectProtocol: e.target.value })}
                              className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                            >
                              {listener.protocol === 'HTTPS' ? (
                                <option value="HTTPS">HTTPS</option>
                              ) : (
                                <>
                                  <option value="HTTP">HTTP</option>
                                  <option value="HTTPS">HTTPS</option>
                                </>
                              )}
                            </select>

                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Port</div>
                            <p className="text-xs text-muted-foreground mb-1.5">The port on which the load balancer is listening for connections.</p>
                            <input
                              placeholder="Port number"
                              value={listener.redirectPort}
                              onChange={(e) => updateListener(listener.id, { redirectPort: e.target.value })}
                              className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground mt-0.5">1-65535 or to retain the original port enter {"#{port}"}</p>
                          </div>
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer mt-3">
                          <input
                            type="checkbox"
                            checked={listener.customHostPath}
                            onChange={(e) => updateListener(listener.id, { customHostPath: e.target.checked })}
                            className="mt-1 accent-primary"
                          />
                          <div>
                            <div className="text-sm">Custom host, path, query</div>
                            <div className="text-xs text-muted-foreground">Select to modify host, path and query. If no changes are made, settings from the request URL are retained.</div>
                          </div>
                        </label>
                        {listener.customHostPath && (
                          <div className="mt-3 pl-6 grid grid-cols-1 gap-3">
                            <div>
                              <div className="text-sm font-medium mb-1">Host</div>
                              <div className="text-xs text-muted-foreground">Specify a host or retain the original host by using. Not case sensitive.</div>
                              <input
                                value={listener.redirectHost}
                                onChange={(e) => updateListener(listener.id, { redirectHost: e.target.value })}
                                className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                              />
                              <p className="text-[11px] text-muted-foreground mt-0.5">Maximum 128 characters. Allowed characters are a-z, A-Z, 0-9; the following special characters: -.; and wildcards (* and ?). At least one “.” is required. Only alphabetical characters are allowed after the final “.” character.</p>
                            </div>
                            <div>
                              <div className="text-sm font-medium mb-1">Path</div>
                              <div className="text-xs text-muted-foreground">Specify a path or retain the original path by using. Case sensitive.</div>
                              <input
                                value={listener.redirectPath}
                                onChange={(e) => updateListener(listener.id, { redirectPath: e.target.value })}
                                className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                              />
                              <p className="text-[11px] text-muted-foreground mt-0.5">Maximum 128 characters. Allowed characters are a-z, A-Z, 0-9; the following special characters: _-.$/~"'@:+; & (using &amp;); and wildcards (* and ?).</p>
                            </div>
                            <div>
                              <div className="text-sm font-medium mb-1">Query</div>
                              <div className="text-xs text-muted-foreground">Specify a query or retain the original query by using. Not case sensitive.</div>
                              <input
                                value={listener.redirectQuery}
                                onChange={(e) => updateListener(listener.id, { redirectQuery: e.target.value })}
                                className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                              />
                              <p className="text-[11px] text-muted-foreground mt-0.5">Maximum 128 characters.</p>
                            </div>
                          </div>
                        )}
                        <div className="mt-3">
                          <div className="text-sm font-medium mb-1">Status code</div>
                          <select className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm">
                            <option>301 - Permanently moved</option>
                            <option>302 - Found</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {isAlb && listener.action === "fixed-response" && (
                  <div className="border-l-2 border-border pl-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-sm font-medium mb-0.5">Response code</div>
                        <p className="text-xs text-muted-foreground mb-1.5">The type of message you want to send.</p>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={listener.fixedResponseCode}
                          onChange={(e) => {
                            const cleaned = sanitizeStatusCode(e.target.value);
                            updateListener(listener.id, { fixedResponseCode: cleaned });
                            if (isValidStatusCode(cleaned)) {
                              setFixedResponseErrorIds((prev) => prev.filter((id) => id !== listener.id));
                            }
                          }}
                          className={`w-full bg-input/40 border rounded-md px-3 py-2 text-sm ${fixedResponseErrorIds.includes(listener.id) ? "border-red-500 ring-2 ring-red-200" : "border-border"
                            }`}
                        />
                        {submitted && fixedResponseErrorIds.includes(listener.id) ? (
                          <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                            <XCircle size={14} className="mt-0.5 shrink-0" />
                            <span>Response code must be a valid HTTP status code (2xx, 4xx, or 5xx).</span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-0.5">2xx, 4xx, 5xx</p>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-0.5">Content type</div>
                        <p className="text-xs text-muted-foreground mb-1.5">The format of your message.</p>
                        <select
                          value={listener.fixedResponseContentType}
                          onChange={(e) => updateListener(listener.id, { fixedResponseContentType: e.target.value })}
                          className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="text/plain">text/plain</option>
                          <option value="text/html">text/html</option>
                          <option value="application/json">application/json</option>
                          <option value="application/javascript">application/javascript</option>
                          <option value="text/css">text/css</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-medium">Response body - <span className="italic font-normal">optional</span></div>
                      <p className="text-xs text-muted-foreground mb-1.5">Enter your response message.</p>
                      <textarea
                        value={listener.fixedResponseBody}
                        onChange={(e) => updateListener(listener.id, { fixedResponseBody: e.target.value })}
                        className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm min-h-[90px]"
                      />
                      <p className="text-[11px] text-muted-foreground mt-0.5">1024 character maximum</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={addListener} className="inline-flex items-center gap-1 text-xs px-4 py-1.5 border border-primary/60 text-primary rounded-full hover:bg-primary/10 font-medium">
        Add listener
      </button>
      <p className="text-[11px] text-muted-foreground"> You can add up to {remainingListeners} more listeners.</p>
    </Section>
  );
}
