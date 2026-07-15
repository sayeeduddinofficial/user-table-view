import { useAppStore } from '@/store/appStore';

export function useStore<T>(selector: (s: any) => T): T {
  return useAppStore(selector as any) as T;
}

export const getStoreState = () => useAppStore.getState();
