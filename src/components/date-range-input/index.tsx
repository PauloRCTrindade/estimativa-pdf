import * as React from "react"
import { pt } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface DateRangeInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DateRangeInput({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className,
}: DateRangeInputProps) {
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<"single" | "range">("single")

  // Parse date from dd/mm/yyyy format
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined
    const [day, month, year] = dateStr.split("/").map(Number)
    if (!day || !month || !year) return undefined
    return new Date(year, month - 1, day)
  }

  // Parse range from "dd/mm/yyyy - dd/mm/yyyy" format
  const parseRange = (rangeStr: string): { from?: Date; to?: Date } => {
    if (!rangeStr) return {}
    const parts = rangeStr.split(" - ")
    if (parts.length !== 2) return {}
    return {
      from: parseDate(parts[0].trim()),
      to: parseDate(parts[1].trim()),
    }
  }

  // Format date to dd/mm/yyyy format
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Detect mode from value
  React.useEffect(() => {
    if (value.includes(" - ")) {
      setMode("range")
    } else if (value) {
      setMode("single")
    }
  }, [value])

  const selectedDate = parseDate(value)
  const { from: rangeFrom, to: rangeTo } = parseRange(value)

  const handleSingleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(formatDate(date))
      setOpen(false)
    }
  }

  const handleRangeDateSelect = (date: Date | undefined) => {
    if (!date) return

    if (!rangeFrom) {
      // First date selected
      onChange(formatDate(date))
    } else if (!rangeTo) {
      // Second date selected
      if (date < rangeFrom) {
        onChange(`${formatDate(date)} - ${formatDate(rangeFrom)}`)
      } else {
        onChange(`${formatDate(rangeFrom)} - ${formatDate(date)}`)
      }
      setOpen(false)
    } else {
      // Start new range
      onChange(formatDate(date))
    }
  }

  const displayValue = value || placeholder

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
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "range")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="single" className="text-xs">
              Um dia
            </TabsTrigger>
            <TabsTrigger value="range" className="text-xs">
              Período
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSingleDateSelect}
              locale={pt}
              disabled={(date) => date < new Date("1900-01-01")}
              initialFocus
            />
          </TabsContent>

          <TabsContent value="range">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {rangeFrom && rangeTo
                  ? `${formatDate(rangeFrom)} - ${formatDate(rangeTo)}`
                  : rangeFrom
                    ? `De: ${formatDate(rangeFrom)}`
                    : "Selecione o período"}
              </div>
              <Calendar
                mode="single"
                selected={rangeFrom || rangeTo}
                onSelect={handleRangeDateSelect}
                locale={pt}
                disabled={(date) => date < new Date("1900-01-01")}
                initialFocus
              />
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
