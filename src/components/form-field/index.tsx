import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"

interface FormFieldProps {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  required?: boolean
}

export function FormField({ label, hint, error, children, required }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
