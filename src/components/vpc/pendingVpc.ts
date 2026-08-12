// Tracks a VPC provisioning request per user in localStorage.
// The list GET API does not include VPCs still in "provisioning" state,
// so we persist the requestId returned from the create POST and treat
// the user as having an active VPC until that requestId shows up in
// the list (meaning provisioning has completed) or is cleared.

const KEY = "pendingVpcByUser";
const MAX_PENDING_AGE_MS = 6 * 60 * 60 * 1000;

type PendingMap = Record<string, { requestId: string; createdAt: number }>;

function readAll(): PendingMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as PendingMap;
  } catch {
    return {};
  }
}

function writeAll(map: PendingMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function setPendingVpc(userId: string | number, requestId: string) {
  if (!userId || !requestId) return;
  const map = readAll();
  map[String(userId)] = { requestId, createdAt: Date.now() };
  writeAll(map);
}

export function getPendingVpc(userId: string | number | undefined | null) {
  if (!userId) return null;
  const key = String(userId);
  const map = readAll();
  const pending = map[key] ?? null;

  if (!pending) return null;

  if (
    typeof pending.createdAt !== "number" ||
    Date.now() - pending.createdAt > MAX_PENDING_AGE_MS
  ) {
    delete map[key];
    writeAll(map);
    return null;
  }

  return pending;
}

export function clearPendingVpc(userId: string | number) {
  if (!userId) return;
  const map = readAll();
  if (map[String(userId)]) {
    delete map[String(userId)];
    writeAll(map);
  }
}
