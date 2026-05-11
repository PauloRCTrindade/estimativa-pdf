import * as React from "react"
import { pt } from "date-fns/locale"
import { CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DateRangeListProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DateRangeList({
  value,
  onChange,
  placeholder = "Clique para adicionar",
  className,
}: DateRangeListProps) {
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<"single" | "range">("single")
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>()
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [description, setDescription] = React.useState("")

  // Reset dateRange when mode changes to "range"
  React.useEffect(() => {
    if (mode === "range") {
      setDateRange(undefined)
    } else if (mode === "single") {
      setSelectedDate(undefined)
    }
  }, [mode])

  // Reset form when popover closes
  React.useEffect(() => {
    if (!open) {
      setDescription("")
    }
  }, [open])

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

  // Split lines from value
  const items = value
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim())

  const handleAddSingleDay = () => {
    if (!selectedDate) return
    const newItem = `${formatDate(selectedDate)}${description ? " - " + description : ""}`
    const newValue = value ? `${value}\n${newItem}` : newItem
    onChange(newValue)
    resetForm()
  }

  const handleAddPeriod = () => {
    if (!dateRange?.from || !dateRange?.to) return
    const from = dateRange.from < dateRange.to ? dateRange.from : dateRange.to
    const to = dateRange.from < dateRange.to ? dateRange.to : dateRange.from
    const newItem = `${formatDate(from)} - ${formatDate(to)}${description ? " - " + description : ""}`
    const newValue = value ? `${value}\n${newItem}` : newItem
    onChange(newValue)
    resetForm()
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems.join("\n"))
  }

  const resetForm = () => {
    setSelectedDate(undefined)
    setDateRange(undefined)
    setDescription("")
    setOpen(false)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Add Button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {placeholder}
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

            <TabsContent value="single" className="space-y-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={pt}
                disabled={(date) => date < new Date("1900-01-01")}
              />
              <div className="space-y-2">
                <Input
                  placeholder="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs"
                />
                <Button
                  onClick={handleAddSingleDay}
                  disabled={!selectedDate}
                  className="w-full text-xs"
                >
                  Adicionar dia
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="range" className="space-y-3">
              <div className="text-xs space-y-2">
                <div className="font-medium text-muted-foreground">
                  {dateRange?.from && dateRange?.to
                    ? `✓ ${formatDate(dateRange.from)} até ${formatDate(dateRange.to)}`
                    : dateRange?.from
                      ? `✓ Início: ${formatDate(dateRange.from)}\n⊚ Clique no fim do período`
                      : "⊚ Clique para escolher o início"}
                </div>
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={pt}
                disabled={(date) => date < new Date("1900-01-01")}
                numberOfMonths={1}
              />
              <div className="space-y-2">
                <Input
                  placeholder="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs"
                />
                <Button
                  onClick={handleAddPeriod}
                  disabled={!dateRange?.from || !dateRange?.to}
                  className="w-full text-xs"
                >
                  Adicionar período
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      {/* Items List */}
      {items.length > 0 && (
        <Card className="p-3 space-y-2 bg-muted/50 max-h-48 overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs p-2 bg-background rounded border"
            >
              <span>{item}</span>
              <button
                onClick={() => handleRemoveItem(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

