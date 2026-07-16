import { Search, Filter, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  uniqueRoles: string[];
  onSearchChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onStatusChange: (v: string) => void;
}

export function VMFilterBar({
  searchQuery, roleFilter, statusFilter, uniqueRoles,
  onSearchChange, onRoleChange, onStatusChange,
}: Props) {
  const navigate = useNavigate();
  return (
    <Card className="sticky top-16 z-30 bg-card/80 backdrop-blur border-border/50 p-0 mb-2">
      <CardContent className="py-0 px-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-end p-4 px-6 flex-wrap flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, IP, Instance type, or request ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
          <div className="flex gap-3">
            <Select value={roleFilter} onValueChange={onRoleChange}>
              <SelectTrigger className="w-[140px] bg-background/50">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map((role) => (
                  <SelectItem key={role} value={role.toLowerCase()}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[140px] bg-background/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="starting">Starting</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="stopping">Stopping</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="terminating">Terminating</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => navigate("/requests/new")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create VM
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
