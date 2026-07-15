import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { useTopUsersByCost } from '@/hooks/useTopUsersByCost';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface TopUsersProps {
  startDate?: string;
  endDate?: string;
  userFilter?: string;
  shapeFilter?: string;
  regionFilter?: string;
}

export function TopUsersByCost({ 
  startDate, 
  endDate, 
  userFilter, 
  shapeFilter, 
  regionFilter 
}: TopUsersProps) {
  const defaultStartDate = useMemo(() => {
    return format(subDays(new Date(), 30), 'yyyy-MM-dd');
  }, []);

  const defaultEndDate = useMemo(() => {
    return format(new Date(), 'yyyy-MM-dd');
  }, []);

  const finalStartDate = startDate || defaultStartDate;
  const finalEndDate = endDate || defaultEndDate;

  const { data: topUsers, loading } = useTopUsersByCost(finalStartDate, finalEndDate, 5);

  const filteredUsers = useMemo(() => {
    if (!userFilter || userFilter === 'all') {
      return topUsers;
    }
    return topUsers.filter(u => u.owner_email === userFilter);
  }, [topUsers, userFilter]);

  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top 5 Users by Cost
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top 5 Users by Cost
        </CardTitle>
        <CardDescription>
          {finalStartDate} to {finalEndDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No billing data available
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <div key={user.owner_email} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      #{index + 1}
                    </Badge>
                    <p className="font-medium text-sm">{user.owner_email}</p>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{user.days_active} days active</span>
                    <span>{user.instance_types_used} instance types</span>
                    <span>{user.regions_used} regions</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    ${user.total_cost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
