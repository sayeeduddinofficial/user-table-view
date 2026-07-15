import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

import { Info } from "lucide-react"
type ConfirmationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  subDescription?: string
  confirmLabel?: string
  variant?: "default" | "destructive"
}
export default function ConfirmationDialog({
  open,
  onOpenChange
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px] border-border/40 bg-card rounded-2xl p-0 overflow-hidden shadow-2xl shadow-black/30 gap-0">
        
        {/* Gradient header */}
        <div className="h-24 w-full relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
              <Info className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 pt-4">
          <AlertDialogHeader className="gap-2 text-center sm:text-center">
            <AlertDialogTitle className="text-base font-semibold tracking-tight text-foreground">
              Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-muted-foreground leading-relaxed">
              Approve request REQ-1021?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <p className="mt-3 text-center text-xs text-muted-foreground/70 leading-relaxed">
            The VM runtime will be extended as requested.
          </p>
        </div>

        {/* Footer */}
        <AlertDialogFooter className="flex-row gap-2.5 px-6 pb-5 pt-4 sm:justify-center">
          <AlertDialogCancel className="flex-1 h-9 rounded-lg border-border/50 bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground text-sm font-medium transition-all">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction className="flex-1 h-9 rounded-lg text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/85 shadow-sm shadow-primary/25">
            OK
          </AlertDialogAction>
        </AlertDialogFooter>

      </AlertDialogContent>
    </AlertDialog>
  )
}
