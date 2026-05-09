import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"

interface FormSectionProps {
  title: string
  icon?: string
  children: ReactNode
  collapsible?: boolean
  expanded?: boolean
}

export function FormSection({ title, icon, children, collapsible }: FormSectionProps) {
  return (
    <Card className="border-zinc-200">
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          {title}
        </h3>
        <div className="space-y-3">
          {children}
        </div>
      </div>
    </Card>
  )
}
