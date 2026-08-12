export function SecurityTab({ securityGroupIds }: { securityGroupIds: string[] }) {
  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Security groups</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="p-3 text-left">Security Group ID</th>
          </tr>
        </thead>
        <tbody>
          {(securityGroupIds ?? []).length === 0 && (
            <tr><td className="p-3 text-muted-foreground">No security groups.</td></tr>
          )}
          {(securityGroupIds ?? []).map((sg) => (
            <tr key={sg} className="border-b">
              <td className="p-3 font-mono">{sg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
