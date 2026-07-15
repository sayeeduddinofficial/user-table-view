import { Loader2, AlertCircle } from 'lucide-react';
import { Label }                            from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ManagerInfo, SuperAdminOption } from '@/hooks/useMyManager';

interface ManagerDisplayProps {
  manager:          ManagerInfo | null;
  superAdmins:      SuperAdminOption[];
  hasActiveManager: boolean;
  loading:          boolean;
  error:            string | null;
  selectedEmail?:   string;
  onEmailChange?:   (email: string) => void;
  /** Optional label override */
  label?:           string;
}

export function ManagerDisplay({ 
  manager, 
  superAdmins, 
  hasActiveManager, 
  loading, 
  error, 
  selectedEmail = '', 
  onEmailChange,
  label = 'Manager' 
}: ManagerDisplayProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Resolving manager…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-destructive py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Could not resolve manager. Please contact your administrator.</span>
        </div>
      ) : hasActiveManager && manager ? (
        // Show assigned active manager
        <>
          <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm justify-center">
            <span className="font-medium text-foreground">
              {manager.display_name
                ? `${manager.display_name}`
                : manager.email}
            </span>
          </div>
        </>
      ) : superAdmins && superAdmins.length > 0 ? (
        // Show Super Admin dropdown when no active manager
        <>
          <Select value={selectedEmail} onValueChange={onEmailChange}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue placeholder="Select a Super Admin…" />
            </SelectTrigger>
            <SelectContent>
              {superAdmins.map((admin) => (
                <SelectItem key={admin.email} value={admin.email}>
                  {admin.name !== admin.email ? `${admin.name} (${admin.email})` : admin.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : (
        // Fallback when no manager and no Super Admins
        <div className="flex items-center gap-2 text-sm text-destructive py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            No manager or Super Admin found.{' '}
            <a
              href="mailto:admin@yourcompany.com"
              className="underline hover:no-underline"
            >
              Contact your administrator.
            </a>
          </span>
        </div>
      )}
    </div>
  );
}
