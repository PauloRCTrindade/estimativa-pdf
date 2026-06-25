import { DataMassRowGroup } from "./DataMassRowGroup";
import type { DataMassColumn, DataMassTag, FilteredDataMass } from "./types";

interface DataMassesTableProps {
  massas: FilteredDataMass[];
  customColumns: DataMassColumn[];
  availableTags: DataMassTag[];
  searchTerm: string;
  selectedTags: string[];
  onSaveMassa: (id: string, data: Partial<FilteredDataMass>) => void;
  onDeleteMassa: (id: string) => void;
  onCreateTag: (tag: Omit<DataMassTag, "id">) => Promise<DataMassTag | undefined>;
}

export function DataMassesTable({
  massas,
  customColumns,
  availableTags,
  searchTerm,
  selectedTags,
  onSaveMassa,
  onDeleteMassa,
  onCreateTag,
}: DataMassesTableProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="max-h-[calc(100vh-280px)] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr className="border-b border-border/60">
              <th className="min-w-[140px] px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                CPF
              </th>
              <th className="min-w-[140px] px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                Linha
              </th>
              <th className="min-w-[200px] px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                Tipo
              </th>
              <th className="min-w-[240px] px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                Observação
              </th>
              {customColumns.map((column) => (
                <th
                  key={column.id}
                  className="min-w-[140px] px-2 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                  {column.name}
                </th>
              ))}
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {massas.length === 0 ? (
              <tr>
                <td
                  colSpan={5 + customColumns.length}
                  className="px-2 py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhuma massa encontrada.
                </td>
              </tr>
            ) : (
              massas.map((massa) => (
                <DataMassRowGroup
                  key={massa.id}
                  massa={massa}
                  customColumns={customColumns}
                  availableTags={availableTags}
                  searchTerm={searchTerm}
                  selectedTags={selectedTags}
                  onSave={onSaveMassa}
                  onDelete={onDeleteMassa}
                  onCreateTag={onCreateTag}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
