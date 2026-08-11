/**
 * RdsCreate.tsx
 * Express-configuration page for creating an Aurora PostgreSQL serverless cluster.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, FileText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Textarea } from '@/components/ui/textarea';
import { RdsConfigurationTable } from '@/components/rds/create/RdsConfigurationTable';
import { RdsConfirmDialog } from '@/components/rds/create/RdsConfirmDialog';
import { MIN_JUSTIFICATION_LENGTH, useRdsCreateForm } from '@/hooks/useRdsCreateForm';

export function RdsCreate() {
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const form = useRdsCreateForm();
  const showJustificationError = form.justificationTouched && form.justificationError;

  return (
    <div>
      <Header
        title="Create with express configuration in seconds"
        subtitle="Quickly create an Aurora PostgreSQL serverless database with optimized default settings."
        showSearch={false}
      />

      <div className="flex items-center gap-2 text-sm text-muted-foreground px-6 py-3">
        <Link to="/aws/rds" className="hover:text-foreground transition-colors">
          RDS
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground">Create DB Cluster</span>
      </div>

      <div className="max-w-5xl mx-auto pb-10 px-6 space-y-6">
        <section className="glass-panel rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Database configuration</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Aurora PostgreSQL with Serverless instance (Version 17)
          </p>

          <button
            onClick={() => setDetailsOpen((v) => !v)}
            className="w-full flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors"
          >
            {detailsOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Configuration Details
          </button>

          {detailsOpen && (
            <RdsConfigurationTable
              values={form.values}
              fieldControls={form.fieldControls}
              errors={form.errors}
              touched={form.touched}
              editingField={form.editingField}
              setEditingField={form.setEditingField}
            />
          )}

          <p className="text-xs text-muted-foreground mt-5">
            *Aurora Capacity Unit (ACU) pricing is $0.12 per ACU-Hour and storage is $0.10 per GB-month.
          </p>
        </section>

        <section className="glass-panel rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Business Justification</h2>
          </div>

          <div className="space-y-3">
            <Textarea
              id="justification"
              className={`w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-1 text-sm ${
                showJustificationError ? 'border-red-500 ring-1 ring-red-200' : 'border-input'
              }`}
              placeholder="Provide a brief justification for this RDS request."
              value={form.values.justification}
              onChange={(e) => form.handleJustificationChange(e.target.value)}
              onBlur={form.handleJustificationBlur}
              rows={3}
              maxLength={250}
            />
            <div className="flex justify-between items-center">
              {showJustificationError ? (
                <div className="text-xs text-red-600">
                  Business justification must contain at least {MIN_JUSTIFICATION_LENGTH} characters.
                </div>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">{form.values.justification.length}/250</p>
            </div>
          </div>
        </section>

        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => navigate('/aws/rds')}>
            Cancel
          </Button>
          <Button
            onClick={form.openConfirmDialog}
            disabled={!form.isJustificationValid}
            className="bg-primary hover:bg-primary/90"
          >
            Create database
          </Button>
        </div>

        <RdsConfirmDialog
          open={form.isDialogOpen}
          onOpenChange={form.setIsDialogOpen}
          isSubmitting={form.isSubmitting}
          onConfirm={form.submit}
          values={form.values}
        />
      </div>
    </div>
  );
}
