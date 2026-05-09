import * as React from "react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse date from dd/mm/yyyy format
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined
    const [day, month, year] = dateStr.split("/").map(Number)
    if (!day || !month || !year) return undefined
    return new Date(year, month - 1, day)
  }

  // Format date to dd/mm/yyyy format
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const selectedDate = parseDate(value)

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(formatDate(date))
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? value : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={pt}
          disabled={(date) => date < new Date("1900-01-01")}
        />
      </PopoverContent>
    </Popover>
  )
}
