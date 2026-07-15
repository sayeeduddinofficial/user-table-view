import { createContext, useContext, useState, ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Trash2,
  RotateCcw,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

type DialogType = "confirm";

type ConfirmIcon = "destroy" | "retry" | "info";

type AlertSeverity = "error" | "warning" | "success" | "loading";

type DialogState = {
  type: DialogType
  title: string
  description?: string
  icon?: ConfirmIcon
  resolve: (value: boolean) => void
}

type DialogContextType = {
  alert: (options: {
    title: string
    description?: string
    severity?: AlertSeverity
  }) => void
  confirm: (options: { title: string; description?: string, icon?: ConfirmIcon }) => Promise<boolean>
}



const DialogContext = createContext<DialogContextType | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [alerts, setAlerts] = useState<
    {
      id: number
      title: string
      description?: string
      severity?: AlertSeverity
      timeout?: ReturnType<typeof setTimeout>
    }[]
  >([])

  const alert = ({
    title,
    description,
    severity = "error",
  }: {
    title: string
    description?: string
    severity?: "error" | "warning" | "success" | "loading"
  }) => {
    // Check for duplicate alerts by title (prevent same message from showing multiple times)
    const existingAlert = alerts.find(a => a.title === title)
    if (existingAlert) {
      console.log('Duplicate alert prevented:', title)
      return
    }

    const id = Date.now() + Math.random() // Add random to ensure unique IDs

    const timeout = setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id))
    }, severity === "loading" ? 10000 : 3000)

    setAlerts(prev => [
      ...prev.slice(-3),
      { id, title, description, severity, timeout }
    ])
  }

  const confirm = ({ title, description, icon = "destroy" }: { title: string; description?: string, icon?: ConfirmIcon }) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        type: "confirm",
        title,
        description,
        icon,
        resolve,
      })
    })
  }

  const handleClose = (result: boolean) => {
    dialog?.resolve(result)
    setDialog(null)
  }

  // const isConfirm = dialog?.type === "confirm"

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}

      <div className="fixed top-[63px] right-2 z-[9999] space-y-3 pointer-events-none">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            onMouseEnter={() => {
              if (alert.timeout) clearTimeout(alert.timeout)
            }}
            onMouseLeave={() => {
              const timeout = setTimeout(() => {
                setAlerts(prev => prev.filter(a => a.id !== alert.id))
              }, 3000)

              setAlerts(prev =>
                prev.map(a =>
                  a.id === alert.id ? { ...a, timeout } : a
                )
              )
            }}
            className="pointer-events-auto relative w-[320px] rounded-lg border bg-background shadow-lg p-4 flex gap-3 animate-in slide-in-from-right fade-in duration-300"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (alert.timeout) clearTimeout(alert.timeout)
                setAlerts(prev => prev.filter(a => a.id !== alert.id))
              }}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mt-1">

              {alert.severity === "warning" && (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}

              {alert.severity === "loading" && (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}

              {alert.severity === "success" && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}

              {(alert.severity === "error" || !alert.severity) && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}

            </div>

            <div className="flex-1 min-w-0">

              <p
                className={cn(
                  "font-semibold text-sm",
                  alert.severity === "warning" && "text-yellow-600",
                  alert.severity === "success" && "text-green-600",
                  alert.severity === "error" && "text-red-600",
                  alert.severity === "loading" && "text-blue-600"
                )}
              >
                {alert.severity === "success"
                  ? "Success"
                  : alert.severity === "warning"
                    ? "Warning"
                    : alert.severity === "loading"
                      ? "Loading"
                      : "Error"}
              </p>

              <div className="text-sm break-words">{alert.title}</div>

              {alert.description && (
                <div className="text-xs text-muted-foreground mt-1">
                  {alert.description}
                </div>
              )}

            </div>

          </div>
        ))}
      </div>

      <Dialog open={!!dialog} onOpenChange={() => handleClose(false)}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0 bg-background border">

          {/* Top gradient header */}
          <div className="h-24 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pt-8 pb-6 flex justify-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 ring-4 ring-primary/5">
              {dialog?.icon === "destroy" && (
                <Trash2 className="h-6 w-6 text-primary" />
              )}

              {dialog?.icon === "retry" && (
                <RotateCcw className="h-6 w-6 text-primary" />
              )}

              {dialog?.icon === "info" && (
                <Info className="h-6 w-6 text-primary" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 text-center space-y-4">

            <DialogTitle className="text-lg font-semibold">
              Confirmation
            </DialogTitle>

            <DialogDescription asChild>
              <div className="space-y-2">
                <div className="font-medium text-foreground">
                  {dialog?.title}
                </div>

                {dialog?.description && (
                  <div className="text-sm text-muted-foreground">
                    {dialog.description}
                  </div>
                )}
              </div>
            </DialogDescription>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">

              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>

              <Button
                className="flex-1"
                onClick={() => handleClose(true)}
              >
                OK
              </Button>

            </div>

          </div>

        </DialogContent>
      </Dialog>

    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)

  if (!context) {
    throw new Error("useDialog must be used inside DialogProvider")
  }

  return context
}