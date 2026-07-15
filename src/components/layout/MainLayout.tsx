import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { Header } from './Header';

export function MainLayout() {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          sidebarOpen ? 'pl-64' : 'pl-20'
        )}
      > 
        <Outlet />
      </main>
    </div>
  );
}
