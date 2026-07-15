import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/auth/msalConfig';
import { Header } from '@/components/layout/Header';
import { buildDisplayRows, decodeTokenPayload } from '../utils/Runtimegovernance.utils';
import { useRuntimeGovernance } from '../hooks/useRuntimeGovernance';
import { RequestFiltersBar } from '../components/runtime-governance/RequestFilterBar';
import { RequestSummaryChips } from '../components/runtime-governance/RequestSummaryChips';
import { RequestsTable, RequestsPagination } from '../components/runtime-governance/RequestsTable';

const ROWS_PER_PAGE = 8;

export default function RuntimeGovernance() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { instance } = useMsal();

  // ── Current user (decoded once, synchronously) ────────────────────────────
  const [currentUserRole] = useState(() => decodeTokenPayload('role'));
  const [currentUserEmail] = useState(() => decodeTokenPayload('email'));

  // ── Filters & pagination ──────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, scopeFilter]);

  // ── Deep-link tokens from email ───────────────────────────────────────────
  const deepLinkToken = searchParams.get('token');
  const deepLinkRejectToken = searchParams.get('reject_token');
  const queryString = [
    deepLinkToken       && `token=${deepLinkToken}`,
    deepLinkRejectToken && `reject_token=${deepLinkRejectToken}`,
  ].filter(Boolean).join('&');

  // ── Auth redirect for unauthenticated email deep-link arrivals ────────────
  useEffect(() => {
    if (localStorage.getItem('token')) return;

    const email  = searchParams.get('email')  ?? '';
    const source = searchParams.get('source') ?? '';
    const returnUrl = `/admin/runtime-governance${queryString ? `?${queryString}` : ''}${email ? `&email=${encodeURIComponent(email)}` : ''}${source ? `&source=${encodeURIComponent(source)}` : ''}`;

    if (source === 'email') {
      sessionStorage.setItem('postLoginReturnUrl', returnUrl);
      sessionStorage.removeItem('emailLoginTriggered');
      instance.loginRedirect({ ...loginRequest, loginHint: email || undefined, prompt: 'select_account' })
        .catch(() => navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(email)}&source=${encodeURIComponent(source)}`, { replace: true }));
    } else {
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, [navigate]);

  // ── Data & actions ────────────────────────────────────────────────────────
  const {
    requests, loading, fetchRequests,
    actionInProgress, rejectInProgress,
    handleEmailApprove, handleEmailReject,
    handleUIApprove, handleUIReject,
  } = useRuntimeGovernance();

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Fire email deep-link actions once data is loaded
  useEffect(() => {
    if (!deepLinkToken || loading) return;
    setSearchParams({}, { replace: true });
    handleEmailApprove(deepLinkToken);
  }, [deepLinkToken, loading]);

  useEffect(() => {
    if (!deepLinkRejectToken || loading) return;
    setSearchParams({}, { replace: true });
    handleEmailReject(deepLinkRejectToken);
  }, [deepLinkRejectToken, loading]);

  // ── Build & filter display rows ───────────────────────────────────────────
  const allDisplayRows = buildDisplayRows(requests);

  const filteredRows = allDisplayRows.filter((row) => {
    const req = row.representativeRow;
    const q = search.trim().toLowerCase();

    const matchesSearch =
      !q ||
      req.request_id.toLowerCase().includes(q) ||
      (req.request_type === 'INSTANCE' && req.instance_id.toLowerCase().includes(q)) ||
      (req.vm_name ?? '').toLowerCase().includes(q) ||
      req.requester_email.toLowerCase().includes(q) ||
      (req.manager_email ?? '').toLowerCase().includes(q) ||
      req.reason.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || row.effectiveStatus === statusFilter;
    const matchesScope  =
      scopeFilter === 'all' ||
      (scopeFilter === 'single'   && req.request_type === 'INSTANCE') ||
      (scopeFilter === 'request'  && req.request_type === 'REQUEST');

    return matchesSearch && matchesStatus && matchesScope;
  });

  const totalPages    = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="overflow-x-hidden">
      <Header
        title="Runtime Governance"
        subtitle="Manage VM runtime extension requests"
        showNewRequest={false}
      />

      <RequestFiltersBar
        search={search}
        statusFilter={statusFilter}
        scopeFilter={scopeFilter}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onScopeChange={setScopeFilter}
      />

      <RequestSummaryChips displayRows={allDisplayRows} />

      <div className="px-4 md:px-6 pb-6 pt-2">
        <RequestsTable
          loading={loading}
          totalRequests={requests.length}
          paginatedRows={paginatedRows}
          actionInProgress={actionInProgress}
          rejectInProgress={rejectInProgress}
          currentUserRole={currentUserRole}
          currentUserEmail={currentUserEmail}
          onApprove={handleUIApprove}
          onReject={handleUIReject}
        />
        <RequestsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRows={filteredRows.length}
          rowsPerPage={ROWS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}