import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Save, Loader2, Trash2, Globe, Clock } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-context";
import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProfile } from "@/components/profile/useProfile";
import { compressImage, validateImageFile, MAX_IMAGE_SIZE_MB } from "@/utils/imageUtils";
import { useAuth } from "@/hooks/useLogin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TIMEZONES,
  to24Hour,
  from24Hour,
  validateShiftDuration,
  DEFAULT_SHIFT_BY_TIMEZONE,
} from "@/utils/workSchedule";
import { TimePicker } from "@/utils/TimePicker";

export default function Profile() {
  const navigate = useNavigate();
  const { alert } = useDialog();
  const { profile, loading, updateProfile } = useProfile();
  const { user: authUser } = useAuth();
  const isSuperAdmin = authUser?.role === "SuperAdmin";

  const [fullName, setFullName] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  // Schedule state (SuperAdmin only)
  const [timeZone, setTimeZone] = useState("");
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");
  const [endHour, setEndHour] = useState("06");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState("PM");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const from = location.state?.from;

  useEffect(() => {
    if (profile) {
      setFullName(profile.display_name);
      if (isSuperAdmin) {
        setTimeZone(profile.time_zone ?? TIMEZONES[0].value);
        const s = from24Hour(profile.work_start_time ?? "09:00");
        const e = from24Hour(profile.work_end_time ?? "18:00");
        setStartHour(s.hour); setStartMinute(s.minute); setStartPeriod(s.period);
        setEndHour(e.hour); setEndMinute(e.minute); setEndPeriod(e.period);
      }
    }
  }, [profile, isSuperAdmin]);

  const workStartTime24 = to24Hour(startHour, startMinute, startPeriod);
  const workEndTime24 = to24Hour(endHour, endMinute, endPeriod);
  const shiftError = isSuperAdmin ? validateShiftDuration(workStartTime24, workEndTime24) : null;

  function handleTimezoneChange(tz: string) {
    setTimeZone(tz);
    const defaults = DEFAULT_SHIFT_BY_TIMEZONE[tz];
    if (defaults) {
      const s = from24Hour(defaults.start);
      const e = from24Hour(defaults.end);
      setStartHour(s.hour); setStartMinute(s.minute); setStartPeriod(s.period);
      setEndHour(e.hour); setEndMinute(e.minute); setEndPeriod(e.period);
    }
  }

  useEffect(() => {
    if (!profile) return;

    const nameChanged = fullName.trim() !== profile.display_name;
    const imageChanged = selectedImage !== null;
    const imageRemoved = isImageRemoved;
    const scheduleChanged = isSuperAdmin && (
      timeZone !== (profile.time_zone ?? TIMEZONES[0].value) ||
      workStartTime24 !== (profile.work_start_time ?? "09:00") ||
      workEndTime24 !== (profile.work_end_time ?? "18:00")
    );

    setHasChanges(nameChanged || imageChanged || imageRemoved || scheduleChanged);
  }, [fullName, selectedImage, isImageRemoved, profile, isSuperAdmin, timeZone, workStartTime24, workEndTime24]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert({
        title: validation.error || "Invalid image",
        severity: "warning",
      });
      return;
    }

    try {
      const compressedBase64 = await compressImage(file);
      setSelectedImage(file);
      setIsImageRemoved(false);
      setPreviewImage(compressedBase64);
    } catch (error) {
      alert({
        title: "Failed to process image",
        severity: "error",
      });
    }
  };

  const handleCancel = () => {
    setSelectedImage(null);
    setPreviewImage(null);
    setIsImageRemoved(false);
    setFullName(profile?.display_name ?? "");
    if (isSuperAdmin && profile) {
      setTimeZone(profile.time_zone ?? TIMEZONES[0].value);
      const s = from24Hour(profile.work_start_time ?? "09:00");
      const e = from24Hour(profile.work_end_time ?? "18:00");
      setStartHour(s.hour); setStartMinute(s.minute); setStartPeriod(s.period);
      setEndHour(e.hour); setEndMinute(e.minute); setEndPeriod(e.period);
    }
    if (from) navigate(from);
    else navigate("/");
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setFullNameError("Full name is required");
      alert({ title: "Full name is required", severity: "warning" });
      return;
    }
    if (isSuperAdmin && shiftError) {
      alert({ title: shiftError, severity: "error" });
      return;
    }

    const payload = {
      displayName: fullName,
      ...(previewImage && !isImageRemoved && { imageBase64: previewImage }),
      ...(isSuperAdmin && { timeZone, workStartTime: workStartTime24, workEndTime: workEndTime24 }),
    };

    const success = await updateProfile(payload, isImageRemoved);
    if (success) {
      setSelectedImage(null);
      setPreviewImage(null);
      setIsImageRemoved(false);
    }
  };

  const handleRemovePhoto = () => {
    setIsImageRemoved(true);

    setSelectedImage(null);
    setPreviewImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!profile) return null;

  const initials = profile?.display_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Profile Settings"
        subtitle="Manage your account"
        showNewRequest={false}
      />

      <div className="flex-1 p-4 md:p-6 max-w-2xl space-y-6">
        {/* Profile Picture */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Picture</CardTitle>
            <CardDescription>
              Upload a photo to personalize your account (max {MAX_IMAGE_SIZE_MB}MB)
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar
                className="h-24 w-24 border-2 border-border"
                key={profile.profile_image || "fallback"}
              >
                {(profile.profile_image || previewImage) && !isImageRemoved && (
                  <AvatarImage
                    src={
                      previewImage
                        ? previewImage
                        : !isImageRemoved && profile.profile_image
                          ? profile.profile_image
                          : undefined
                    }
                  />
                )}

                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* If image exists → show remove */}
                {!isImageRemoved && profile.profile_image ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleRemovePhoto}
                        className="p-2 rounded-full bg-white/20 hover:bg-red-500"
                      >
                        <Trash2 className="h-5 w-5 text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove photo</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  /* If no image → show upload */
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                            fileInputRef.current.click();
                          }
                        }}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30"
                      >
                        <Camera className="h-5 w-5 text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload photo</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="text-center sm:text-left">
              <p className="font-medium text-foreground">
                {profile.display_name}
              </p>

              <p className="text-sm text-muted-foreground">{profile.email}</p>

              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Photo
              </Button>
            </div>
          </CardContent>

          {/* Separator */}
          <div className="border-t border-border/50 mx-6" />

          {/* Personal Info */}
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>

            <CardDescription>Update your display name</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Full Name
              </Label>

              <Input
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setFullNameError("");
                }}
                aria-required
                aria-invalid={Boolean(fullNameError)}
              />
              {fullNameError && (
                <p className="text-xs text-destructive">{fullNameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>

              <Input
                value={profile.email}
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>
          </CardContent>

          {/* Separator */}
          <div className="border-t border-border/50 mx-6" />

          {/* Timezone & Work Hours */}
          <CardHeader>
            <CardTitle className="text-lg">Timezone & Work Hours</CardTitle>
            <CardDescription>
              {isSuperAdmin
                ? "Configure your timezone and working hours for VM auto-stop behavior"
                : "Assigned by manager. Determines VM auto-stop behavior based on your working hours"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isSuperAdmin ? (
              <>
                {/* Editable Timezone */}
                <div className="space-y-2">
                  <Label htmlFor="timeZone">
                    <span className="flex items-center gap-1">
                      <Globe size={17} /> Timezone
                    </span>
                  </Label>
                  <Select value={timeZone} onValueChange={handleTimezoneChange}>
                    <SelectTrigger id="timeZone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Editable Work Schedule */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Work Start Time</Label>
                    <TimePicker
                      idPrefix="start"
                      value={{ hour: startHour, minute: startMinute, period: startPeriod }}
                      onChange={(h, m, p) => { setStartHour(h); setStartMinute(m); setStartPeriod(p); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Work End Time (EOD)</Label>
                    <TimePicker
                      idPrefix="end"
                      value={{ hour: endHour, minute: endMinute, period: endPeriod }}
                      onChange={(h, m, p) => { setEndHour(h); setEndMinute(m); setEndPeriod(p); }}
                    />
                  </div>
                </div>

                {shiftError && <p className="text-xs text-destructive -mt-2">{shiftError}</p>}
                <p className="text-xs text-muted-foreground -mt-2">
                  Instances will automatically stop at End of Day based on your timezone.
                </p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Timezone</Label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">{profile.time_zone ?? "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Shift Start Time</Label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">{profile.work_start_time ?? "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Shift End Time</Label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">{profile.work_end_time ?? "—"}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    VM runtime and auto-stop are controlled based on your configured working hours.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    To change your timezone or work hours, please contact your manager via Outlook.
                  </p>
                </div>
              </>
            )}
            <div className="border-t border-border/50" />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCancel()}
                disabled={loading}
                style={{ height: "42px" }}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={loading || !hasChanges}
                className="min-w-[140px]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
