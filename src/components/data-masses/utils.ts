import type { DataMass, DataMassLine } from "@/types";

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getContrastColor(hexColor: string): "text-black" | "text-white" {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "text-black" : "text-white";
}

export function isLightColor(hexColor: string): boolean {
  return getContrastColor(hexColor) === "text-black";
}

// ================================
// Migração de dados legados
// ================================

export interface LegacyDataMass {
  id: string;
  cpf: string;
  linha?: string;
  observacao?: string;
  tipos?: string[];
  customFields?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export function createDataMassLine(
  numero: string = "",
  tipos: string[] = [],
  observacao?: string,
  customFields?: Record<string, string>
): DataMassLine {
  return {
    id: generateId(),
    numero,
    tipos,
    observacao,
    customFields,
  };
}

export function migrateLegacyDataMasses(items: LegacyDataMass[]): DataMass[] {
  const grouped = new Map<string, LegacyDataMass[]>();

  for (const item of items) {
    const cpf = item.cpf || "";
    if (!grouped.has(cpf)) grouped.set(cpf, []);
    grouped.get(cpf)!.push(item);
  }

  return Array.from(grouped.entries()).map(([cpf, groupItems]) => {
    const first = groupItems[0];
    const lines: DataMassLine[] = groupItems
      .filter((item) => item.linha || item.observacao || (item.tipos && item.tipos.length > 0))
      .map((item) =>
        createDataMassLine(
          item.linha || "",
          item.tipos || [],
          item.observacao,
          item.customFields
        )
      );

    return {
      id: first.id,
      cpf,
      lines: lines.length > 0 ? lines : [createDataMassLine("")],
      customFields: first.customFields || {},
      createdAt: (first.createdAt || new Date().toISOString()) as string,
      updatedAt: (first.updatedAt || new Date().toISOString()) as string,
    };
  });
}

export function normalizeDataMasses(items: DataMass[] | LegacyDataMass[]): DataMass[] {
  if (items.length === 0) return [];

  const hasNewFormat = "lines" in items[0];
  if (hasNewFormat) {
    return (items as DataMass[]).map((item) => ({
      ...item,
      lines: item.lines?.length > 0 ? item.lines : [createDataMassLine("")],
    }));
  }

  return migrateLegacyDataMasses(items as LegacyDataMass[]);
}

// ================================
// Filtros
// ================================

export interface FilteredDataMass extends DataMass {
  matchedLines: DataMassLine[];
}

export function lineMatchesSearch(line: DataMassLine, term: string): boolean {
  const searchable = [
    line.numero,
    line.observacao,
    ...line.tipos,
  ];
  return searchable.some((value) => (value || "").toLowerCase().includes(term));
}

export function lineMatchesTags(line: DataMassLine, selectedTags: string[]): boolean {
  if (selectedTags.length === 0) return true;
  return selectedTags.every((tag) => line.tipos.includes(tag));
}

export function filterDataMasses(
  massas: DataMass[],
  searchTerm: string,
  selectedTags: string[]
): FilteredDataMass[] {
  const term = searchTerm.trim().toLowerCase();

  return massas
    .map((massa) => {
      const cpfMatches = !term || (massa.cpf || "").toLowerCase().includes(term);
      const customFieldsMatch =
        !term ||
        Object.values(massa.customFields || {}).some((value) =>
          (value || "").toLowerCase().includes(term)
        );

      const matchedLines = massa.lines.filter((line) => {
        const lineMatches = term ? lineMatchesSearch(line, term) : true;
        const tagsMatch = lineMatchesTags(line, selectedTags);
        return lineMatches && tagsMatch;
      });

      // Se o CPF ou custom fields baterem, exibe todas as linhas (respeitando filtro de tags)
      if (cpfMatches || customFieldsMatch) {
        const allMatchedByTags = massa.lines.filter((line) => lineMatchesTags(line, selectedTags));
        return {
          ...massa,
          matchedLines: allMatchedByTags,
        };
      }

      return {
        ...massa,
        matchedLines,
      };
    })
    .filter((massa) => massa.matchedLines.length > 0);
}

// ================================
// Helpers de atualização
// ================================

export function updateLineInDataMass(
  massa: DataMass,
  lineId: string,
  changes: Partial<DataMassLine>
): DataMass {
  return {
    ...massa,
    lines: massa.lines.map((line) => (line.id === lineId ? { ...line, ...changes } : line)),
  };
}

export function addLineToDataMass(massa: DataMass, line?: DataMassLine): DataMass {
  return {
    ...massa,
    lines: [...massa.lines, line || createDataMassLine("")],
  };
}

export function removeLineFromDataMass(massa: DataMass, lineId: string): DataMass {
  const remaining = massa.lines.filter((line) => line.id !== lineId);
  return {
    ...massa,
    lines: remaining.length > 0 ? remaining : [createDataMassLine("")],
  };
}
