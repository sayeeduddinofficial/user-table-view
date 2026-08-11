/**
 * RdsConnectivityTab.tsx
 * "Connectivity & security" tab: connection snippets, endpoints and extras.
 */

import { CheckCircle2, ChevronRight, Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldWithCopy } from '@/components/rds/rdsShared';
import { useState } from 'react';
import {
  copyToClipboard,
  getConnectionSteps,
  type PsqlPlatform,
  type RdsConnectivityData,
  type RdsEndpoint,
} from '@/utils/rds.utils';

type ConnectUsing = 'code' | 'endpoints';

interface RdsConnectivityTabProps {
  connectivityData: RdsConnectivityData;
  endpoints: RdsEndpoint[];
  isInstance: boolean;
  secretArn: string;
  region: string;
  onGetToken: () => void;
}

export function RdsConnectivityTab({
  connectivityData,
  endpoints,
  isInstance,
  secretArn,
  region,
  onGetToken,
}: RdsConnectivityTabProps) {
  const [connectUsing, setConnectUsing] = useState<ConnectUsing>('code');
  const [psqlPlatform, setPsqlPlatform] = useState<PsqlPlatform>('macos');

  const steps = getConnectionSteps({
    platform: psqlPlatform,
    endpoint: connectivityData.endpoint,
    masterUsername: connectivityData.masterUsername,
    databaseName: connectivityData.databaseName,
    port: connectivityData.port,
    secretArn,
    region,
  });

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold">Connect using</h2>
          <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">Info</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ConnectOption
            selected={connectUsing === 'code'}
            onSelect={() => setConnectUsing('code')}
            title="Code snippets"
            description="Use when connecting through SDK, APIs, or third-party tools including agents."
          />
          <ConnectOption
            selected={connectUsing === 'endpoints'}
            onSelect={() => setConnectUsing('endpoints')}
            title="Endpoints"
            description="Use when connecting through any IDE interface."
          />
        </div>
      </div>

      {connectUsing === 'code' && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <EnabledPill label="Internet access gateway" value={connectivityData.internetAccessGateway} />
            <EnabledPill label="IAM Authentication" value={connectivityData.iamAuthentication} />
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-1">IAM authentication token</p>
            <button onClick={onGetToken} className="text-sm text-primary hover:underline font-medium">
              Get token
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">Programming language</label>
              <Select value={psqlPlatform} onValueChange={(v) => setPsqlPlatform(v as PsqlPlatform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="macos">psql (macOS)</SelectItem>
                  <SelectItem value="linux">psql (Linux)</SelectItem>
                  <SelectItem value="windows">psql (Windows)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">Connect to</label>
              <Select value="Writer" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Writer">Writer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-1">Connection steps</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Follow the steps below to paste the code of each step in your tool and run the commands.
            </p>
            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div key={step.label} className="flex gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      <button
                        onClick={() => copyToClipboard(step.code, step.label)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <pre className="bg-muted/20 border border-border rounded p-3 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                      {step.code}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {connectUsing === 'endpoints' && (
        <>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="grid grid-cols-4 gap-6 mb-4">
              <FieldWithCopy label="Database name" value={connectivityData.databaseName} />
              <FieldWithCopy label="Master username" value={connectivityData.masterUsername} />
              <div>
                <div className="text-xs text-muted-foreground mb-1">Internet access gateway</div>
                <div className="inline-flex items-center gap-1.5 text-emerald-400 text-sm">
                  <CheckCircle2 size={14} />
                  {connectivityData.internetAccessGateway}
                </div>
              </div>
              <FieldWithCopy label="Port" value={String(connectivityData.port)} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">IAM authentication token</div>
              <button onClick={onGetToken} className="text-sm text-primary hover:underline font-medium">
                Get token
              </button>
            </div>
          </div>

          {!isInstance && <RdsEndpointsTable endpoints={endpoints} />}
          {isInstance && <AdditionalConfigurations connectivityData={connectivityData} />}
        </>
      )}
    </div>
  );
}

function ConnectOption({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      onClick={onSelect}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/20 hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <input type="radio" name="connect" checked={selected} readOnly className="cursor-pointer" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </label>
  );
}

function EnabledPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium">
        <CheckCircle2 size={14} />
        {value}
      </div>
    </div>
  );
}

function RdsEndpointsTable({ endpoints }: { endpoints: RdsEndpoint[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold">Endpoints ({endpoints.length})</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
            {['Endpoint name', 'Status', 'Type', 'Port'].map((header) => (
              <th key={header} className="px-5 py-3 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {endpoints.map((ep) => (
            <tr
              key={`${ep.type}-${ep.name}`}
              className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <Copy
                    size={14}
                    className="text-muted-foreground cursor-pointer hover:text-primary shrink-0"
                    onClick={() => copyToClipboard(ep.name, 'Endpoint')}
                  />
                  <span className="font-mono text-xs text-primary">{ep.name}</span>
                </div>
              </td>
              <td className="px-5 py-3">
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={14} /> {ep.status}
                </span>
              </td>
              <td className="px-5 py-3">{ep.type}</td>
              <td className="px-5 py-3">{ep.port}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdditionalConfigurations({ connectivityData }: { connectivityData: RdsConnectivityData }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/20 transition-colors"
      >
        <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        Additional configurations
      </button>
      {open && (
        <div className="border-t border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Connectivity &amp; security</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Endpoint &amp; port</p>
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">Endpoint</div>
                <div className="flex items-center gap-1.5">
                  <Copy
                    size={13}
                    className="text-muted-foreground cursor-pointer hover:text-primary shrink-0"
                    onClick={() => copyToClipboard(connectivityData.endpoint, 'Endpoint')}
                  />
                  <span className="font-mono text-xs text-primary break-all">
                    {connectivityData.endpoint || '—'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Port</div>
                <div className="text-sm">{connectivityData.port}</div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Networking</p>
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">Availability Zone</div>
                <div className="text-sm">{connectivityData.availabilityZone}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Subnets</div>
                <div className="space-y-1">
                  {connectivityData.subnets.length > 0 ? (
                    connectivityData.subnets.map((subnet) => (
                      <div key={subnet} className="font-mono text-xs text-primary">
                        {subnet}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">—</div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Security</p>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Certificate authority</div>
                <div className="text-sm">{connectivityData.certificateAuthority || '—'}</div>
                {connectivityData.certificateAuthorityDate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {connectivityData.certificateAuthorityDate}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
