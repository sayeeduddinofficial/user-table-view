/**
 * useRdsCreateForm.ts
 * Owns form state, validation and submission for the RDS express-create page.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProvisionRds } from '@/hooks/useRds';
import { useAppStore } from '@/store/appStore';

export const RDS_CREATE_DEFAULTS = {
  identifier: 'database-2',
  username: 'postgres',
  minCapacity: '0',
  maxCapacity: '16',
  pauseAfter: '300',
  databaseName: 'postgres',
  region: 'us-east-1' as const,
};

export const MIN_JUSTIFICATION_LENGTH = 20;

export type RdsCreateField = 'identifier' | 'username' | 'minCapacity' | 'maxCapacity' | 'pauseAfter';

export function useRdsCreateForm() {
  const navigate = useNavigate();
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);
  const { provision, isSubmitting } = useProvisionRds();

  const [touched, setTouched] = useState(false);
  const [editingField, setEditingField] = useState<RdsCreateField | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [identifier, setIdentifier] = useState(RDS_CREATE_DEFAULTS.identifier);
  const [username, setUsername] = useState(RDS_CREATE_DEFAULTS.username);
  const [minCapacity, setMinCapacity] = useState(RDS_CREATE_DEFAULTS.minCapacity);
  const [maxCapacity, setMaxCapacity] = useState(RDS_CREATE_DEFAULTS.maxCapacity);
  const [pauseAfter, setPauseAfter] = useState(RDS_CREATE_DEFAULTS.pauseAfter);

  const [justification, setJustification] = useState('');
  const [justificationError, setJustificationError] = useState(false);
  const [justificationTouched, setJustificationTouched] = useState(false);

  const isJustificationValid = justification.trim().length >= MIN_JUSTIFICATION_LENGTH;

  const errors: Record<RdsCreateField, string> = {
    identifier: !identifier.trim() ? 'The DB cluster identifier field is required.' : '',
    username: !username.trim() ? 'The Database master username field is required.' : '',
    minCapacity: !minCapacity.trim()
      ? 'The minimum capacity (ACUs) field is required.'
      : parseFloat(minCapacity) < 0 || parseFloat(minCapacity) > 256
        ? 'Min capacity must be between 0 and 256.'
        : '',
    maxCapacity: !maxCapacity.trim()
      ? 'The maximum capacity (ACUs) field is required.'
      : parseFloat(maxCapacity) < 1 || parseFloat(maxCapacity) > 256
        ? 'Max capacity must be between 1 and 256.'
        : parseFloat(maxCapacity) < parseFloat(minCapacity)
          ? 'Max capacity must be greater than or equal to min capacity.'
          : '',
    pauseAfter: !pauseAfter.trim()
      ? 'The pause after inactivity field is required.'
      : parseFloat(pauseAfter) < 300 || parseFloat(pauseAfter) > 86400
        ? 'Value must be between 300 and 86400 seconds.'
        : '',
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const fieldControls: Record<
    RdsCreateField,
    { value: string; setValue: (v: string) => void; type?: string; unit?: string }
  > = {
    identifier: { value: identifier, setValue: setIdentifier },
    username: { value: username, setValue: setUsername },
    minCapacity: { value: minCapacity, setValue: setMinCapacity, type: 'number', unit: 'ACU' },
    maxCapacity: { value: maxCapacity, setValue: setMaxCapacity, type: 'number', unit: 'ACU' },
    pauseAfter: { value: pauseAfter, setValue: setPauseAfter, type: 'number', unit: 'seconds' },
  };

  const openConfirmDialog = () => {
    setTouched(true);
    setJustificationTouched(true);

    const invalidJustification = !isJustificationValid;
    setJustificationError(invalidJustification);
    if (hasErrors || invalidJustification) return;

    setIsDialogOpen(true);
  };

  const handleJustificationChange = (value: string) => {
    setJustification(value);
    if (justificationTouched) {
      setJustificationError(value.trim().length < MIN_JUSTIFICATION_LENGTH);
    }
  };

  const handleJustificationBlur = () => {
    setJustificationTouched(true);
    setJustificationError(justification.trim().length < MIN_JUSTIFICATION_LENGTH);
  };

  const submit = async () => {
    const requestId = await provision({
      cluster_identifier: identifier,
      master_username: username,
      database_name: RDS_CREATE_DEFAULTS.databaseName,
      region: RDS_CREATE_DEFAULTS.region,
      min_acu: Number(minCapacity),
      max_acu: Number(maxCapacity),
      auto_pause_seconds: Number(pauseAfter),
      justification: justification.trim(),
    });
    if (!requestId) return;

    setActiveRequest(requestId, 'rds-service', 'create');
    setIsDialogOpen(false);
    navigate(`/console?request=${encodeURIComponent(requestId)}&service=rds-service`);
  };

  return {
    values: { identifier, username, minCapacity, maxCapacity, pauseAfter, justification },
    fieldControls,
    errors,
    touched,
    editingField,
    setEditingField,
    isDialogOpen,
    setIsDialogOpen,
    isSubmitting,
    isJustificationValid,
    justificationError,
    justificationTouched,
    handleJustificationChange,
    handleJustificationBlur,
    openConfirmDialog,
    submit,
  };
}
