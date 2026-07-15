import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

interface User {
  email: string;
  name?: string;
  profile_image_url?: string;
}

interface Props {
  user: User;
  onLogout: () => void;
}

export function UserProfileSection({ user, onLogout }: Props) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
    : "U";

  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar
            className="h-12 w-12 bg-primary/20"
            key={user.profile_image_url || "fallback"}
          >
            {user.profile_image_url && (
              <AvatarImage src={user.profile_image_url} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{user.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </section>
  );
}
