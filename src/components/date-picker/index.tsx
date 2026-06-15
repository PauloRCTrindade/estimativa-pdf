import * as React from "react"
import { pt } from "date-fns/locale"
import { Calendar as CalendarIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { isHoliday, isPostRelease } from "@/utils"
import { Legend } from "@/components/legend"
import { CALENDAR_CATEGORIES } from "@/styles"

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  className?: string
  feriados?: string[]
  releases?: string[]
  /** Formato da data: "br" = dd/mm/yyyy (padrão), "iso" = yyyy-mm-dd */
  dateFormat?: "br" | "iso"
  disabled?: boolean
}

function parseBR(dateStr: string): Date | undefined {
  if (!dateStr) return undefined
  const [day, month, year] = dateStr.split("/").map(Number)
  if (!day || !month || !year) return undefined
  return new Date(year, month - 1, day)
}

function parseISO(dateStr: string): Date | undefined {
  if (!dateStr) return undefined
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const [, year, month, day] = match.map(Number)
  return new Date(year, month - 1, day)
}

function formatBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatISO(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${year}-${month}-${day}`
}

function toDisplayValue(value: string): string {
  if (!value) return ""
  // Se já estiver no formato brasileiro, mantém
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value
  // Converte ISO (yyyy-mm-dd) para exibição brasileira
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return value
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className,
  feriados,
  releases,
  dateFormat = "br",
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const parseDate = React.useCallback(
    (dateStr: string): Date | undefined => {
      if (dateFormat === "iso") return parseISO(dateStr)
      return parseBR(dateStr)
    },
    [dateFormat]
  )

  const formatDate = React.useCallback(
    (date: Date): string => {
      if (dateFormat === "iso") return formatISO(date)
      return formatBR(date)
    },
    [dateFormat]
  )

  const selectedDate = parseDate(value)

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(formatDate(date))
      setOpen(false)
    }
  }

  const modifiers: Record<string, (date: Date) => boolean> = {}
  if (feriados?.length) modifiers.feriado = (date: Date) => isHoliday(date, feriados)
  if (releases?.length) {
    modifiers.tombamento = (date: Date) => isPostRelease(date, releases)
    modifiers.releaseSunday = (date: Date) => {
      if (date.getDay() !== 0) return false
      const nextDay = new Date(date.getTime())
      nextDay.setDate(nextDay.getDate() + 1)
      return isPostRelease(date, releases) || isPostRelease(nextDay, releases)
    }
  }

  const isSelectedReleaseSunday = selectedDate
    ? modifiers.releaseSunday?.(selectedDate) ?? false
    : false

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
            isSelectedReleaseSunday && "bg-blue-700 text-blue-100 border-blue-600 hover:bg-blue-800 hover:text-blue-50 dark:bg-blue-700 dark:text-blue-100 dark:border-blue-500 dark:hover:bg-blue-800 dark:hover:text-blue-50",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? toDisplayValue(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={pt}
          disabled={(date) => date < new Date("1900-01-01")}
          modifiers={modifiers}
        />
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
          {feriados && feriados.length > 0 && (
            <Legend category={CALENDAR_CATEGORIES.feriado.key} />
          )}
          {releases && releases.length > 0 && (
            <>
              <Legend category={CALENDAR_CATEGORIES.tombamento.key} />
              <Legend category={CALENDAR_CATEGORIES.releaseDay.key} />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
