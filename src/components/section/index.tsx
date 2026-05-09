import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { pdfStyles } from '../../styles'

interface SectionProps {
  title: string
  text?: string
}

export function Section({ title, text }: SectionProps) {
  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {String(text || "").split("\n").filter(Boolean).map((line, index) => (
          <p key={`${title}-${index}`} className="text-sm leading-relaxed">{line}</p>
        ))}
      </CardContent>
    </Card>
  );
}