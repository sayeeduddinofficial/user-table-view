import { Header } from '@/components/layout/Header';
import { LiveConsole } from '@/components/console/LiveConsole';
import { RequestSelector } from '@/components/console/RequestSelector';

export default function Console() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Live Operations Console"
        subtitle="Real-time Terraform execution logs"
      />

      <div className="flex-1 p-6 flex gap-6 max-h-[90vh]">
        <div className="w-80 flex-shrink-0">
          <RequestSelector />
        </div>
        <div className="flex-1">
          <LiveConsole />
        </div>
      </div>
    </div>
  );
}
