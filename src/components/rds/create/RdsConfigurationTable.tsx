/**
 * RdsConfigurationTable.tsx
 * Read-only configuration table with inline-editable fields for the create flow.
 */

import type { ReactNode } from 'react';
import { Pencil, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatAcu } from '@/utils/rds.utils';
import type { RdsCreateField } from '@/hooks/useRdsCreateForm';

export type ConfigRow = {
  config: string;
  value: ReactNode;
  hint?: string;
  modifiable: string;
  field?: RdsCreateField;
};

type FieldControl = { value: string; setValue: (v: string) => void; type?: string; unit?: string };

interface RdsConfigurationTableProps {
  values: {
    identifier: string;
    username: string;
    minCapacity: string;
    maxCapacity: string;
    pauseAfter: string;
  };
  fieldControls: Record<RdsCreateField, FieldControl>;
  errors: Record<RdsCreateField, string>;
  touched: boolean;
  editingField: RdsCreateField | null;
  setEditingField: (field: RdsCreateField | null) => void;
}

function buildRows(values: RdsConfigurationTableProps['values']): ConfigRow[] {
  return [
    { config: 'DB engine version', value: 'Version 17', modifiable: 'Yes, upgradable' },
    { config: 'DB cluster identifier', value: values.identifier, modifiable: 'Yes', field: 'identifier' },
    { config: 'Database master username', value: values.username, modifiable: 'Yes', field: 'username' },
    {
      config: 'DB instance type',
      value: (
        <>
          <span className="font-medium">Serverless*</span>
          <br />
          <span className="text-xs text-muted-foreground">Automated vertical (up/down) scaling</span>
        </>
      ),
      modifiable: 'Yes',
    },
    {
      config: 'Min capacity value',
      value: formatAcu(values.minCapacity),
      hint: 'Scales to 0 after 5min of inactivity',
      modifiable: 'Yes',
      field: 'minCapacity',
    },
    {
      config: 'Max capacity value',
      value: formatAcu(values.maxCapacity),
      hint: '1 to 256 in increments of 0.5',
      modifiable: 'Yes',
      field: 'maxCapacity',
    },
    {
      config: 'Pause after inactivity',
      value: `${values.pauseAfter} seconds`,
      hint: '300 to 86400 seconds (5 minutes to 24 hours)',
      modifiable: 'Yes',
      field: 'pauseAfter',
    },
    { config: 'Storage configuration', value: 'Aurora Standard*', modifiable: 'Yes' },
    { config: 'Encryption', value: 'Enabled with AWS/RDS owned key', modifiable: 'No' },
    { config: 'Internet access gateway', value: 'Enabled', modifiable: 'No' },
    { config: 'Private access/VPC', value: 'Disabled/No VPC used', modifiable: 'No' },
    { config: 'Authentication', value: 'IAM only', modifiable: 'No' },
  ];
}

export function RdsConfigurationTable({
  values,
  fieldControls,
  errors,
  touched,
  editingField,
  setEditingField,
}: RdsConfigurationTableProps) {
  const rows = buildRows(values);

  const renderEditableCell = (row: ConfigRow) => {
    const field = row.field!;
    const { value, setValue, type = 'text', unit } = fieldControls[field];
    const error = touched ? errors[field] : '';
    const displayValue =
      field === 'minCapacity' || field === 'maxCapacity'
        ? formatAcu(value)
        : field === 'pauseAfter'
          ? `${value} seconds`
          : value;

    if (editingField !== field) {
      return (
        <div>
          <div
            className="inline-flex items-center gap-1.5 cursor-pointer group"
            onClick={() => setEditingField(field)}
          >
            <span className="text-sm text-foreground">{displayValue}</span>
            <Pencil size={12} className="text-muted-foreground shrink-0" />
          </div>
          {row.hint && <p className="text-xs text-muted-foreground mt-0.5">{row.hint}</p>}
          {error && <FieldError message={error} className="mt-1" />}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            type={type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setEditingField(null)}
            className={`h-7 text-sm bg-card/50 w-[150px] ${
              error ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50'
            }`}
          />
          {unit && <span className="text-sm text-muted-foreground whitespace-nowrap">{unit}</span>}
        </div>
        {row.hint && <p className="text-xs text-muted-foreground">{row.hint}</p>}
        {error && <FieldError message={error} />}
      </div>
    );
  };

  return (
    <div className="border-t border-border mt-4 pt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
            <th className="px-5 py-3 text-left font-medium w-[220px]">Configuration</th>
            <th className="px-5 py-3 text-left font-medium">
              <span className="flex items-center gap-1">Value</span>
            </th>
            <th className="px-5 py-3 text-left font-medium w-[200px]">Modifiable post-creation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.config} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
              <td className="px-5 py-3 text-sm text-foreground">{row.config}</td>
              <td className="px-5 py-3">
                {row.field ? (
                  renderEditableCell(row)
                ) : (
                  <div>
                    <div className="text-sm text-foreground">{row.value}</div>
                    {row.hint && <p className="text-xs text-muted-foreground mt-0.5">{row.hint}</p>}
                  </div>
                )}
              </td>
              <td className="px-5 py-3 text-sm text-muted-foreground">{row.modifiable}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldError({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div className={`flex items-center gap-1 text-destructive text-xs ${className}`}>
      <XCircle size={12} className="shrink-0" />
      {message}
    </div>
  );
}
