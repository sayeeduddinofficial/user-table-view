import { useEffect, useState } from 'react';

export type LbResource = {
  id: string;
  name: string;
  region: string;
  createdAt: string;
  status?: string;
  meta?: Record<string, any>;
  terraform?: string;
};

const state: Record<string, LbResource[]> = {
  lb: [],
};

const subs = new Set<() => void>();
function notify() {
  subs.forEach((s) => s());
}

export function getResources(kind = 'lb') {
  return state[kind] ?? [];
}

export function addResource(kind: string, r: LbResource) {
  state[kind] = [...(state[kind] ?? []), r];
  notify();
}

export function removeResource(kind: string, id: string) {
  state[kind] = (state[kind] ?? []).filter((x) => x.id !== id);
  notify();
}

export function useResources(kind = 'lb') {
  const [items, setItems] = useState<LbResource[]>(() => getResources(kind));
  useEffect(() => {
    const cb = () => setItems(getResources(kind));
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  }, [kind]);

  return {
    resources: items,
    add: (r: LbResource) => addResource(kind, r),
    remove: (id: string) => removeResource(kind, id),
  } as const;
}
