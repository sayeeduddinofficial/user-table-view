export type PsqlClient = 'psql-macos' | 'psql-linux' | 'psql-windows';

export interface RdsConnectionParams {
  endpoint: string;
  port: number | string;
  databaseName: string;
  masterUsername: string;
  secretArn: string;
}

const BASH_TEMPLATE = `export RDSHOST="{{ENDPOINT}}"

psql "host=$RDSHOST port={{PORT}} dbname={{DATABASE_NAME}} user={{MASTER_USERNAME}} sslmode=verify-full sslrootcert=./global-bundle.pem password=$(aws secretsmanager get-secret-value --secret-id '{{SECRET_ARN}}' --query SecretString --output text | jq -r '.password')"`;

const POWERSHELL_TEMPLATE = `psql "host={{ENDPOINT}} port={{PORT}} dbname={{DATABASE_NAME}} user={{MASTER_USERNAME}} sslmode=verify-full sslrootcert=./global-bundle.pem password=$(($s = aws secretsmanager get-secret-value --secret-id {{SECRET_ARN}} | ConvertFrom-Json).SecretString | ConvertFrom-Json | Select-Object -ExpandProperty password)"`;

type ScriptDef = { label: string; language: 'bash' | 'powershell'; template: string };

const SCRIPTS: Record<PsqlClient, ScriptDef> = {
  'psql-macos':   { label: 'PSQL (macOS)',   language: 'bash',       template: BASH_TEMPLATE },
  'psql-linux':   { label: 'PSQL (Linux)',   language: 'bash',       template: BASH_TEMPLATE },
  'psql-windows': { label: 'PSQL (Windows)', language: 'powershell', template: POWERSHELL_TEMPLATE },
};

export const PSQL_CLIENT_OPTIONS: { value: PsqlClient; label: string }[] = [
  { value: 'psql-macos',   label: 'PSQL (macOS)'   },
  { value: 'psql-linux',   label: 'PSQL (Linux)'   },
  { value: 'psql-windows', label: 'PSQL (Windows)' },
];

export function buildConnectionScript(
  client: PsqlClient,
  params: RdsConnectionParams,
): { script: string; language: 'bash' | 'powershell' } {
  const def = SCRIPTS[client];
  const script = def.template
    .replace(/{{ENDPOINT}}/g,        params.endpoint)
    .replace(/{{PORT}}/g,            String(params.port))
    .replace(/{{DATABASE_NAME}}/g,   params.databaseName)
    .replace(/{{MASTER_USERNAME}}/g, params.masterUsername)
    .replace(/{{SECRET_ARN}}/g,      params.secretArn);
  return { script, language: def.language };
}
