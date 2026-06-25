import type { DataMass, DataMassColumn, DataMassLine, DataMassTag } from "@/types";

export type { DataMass, DataMassColumn, DataMassLine, DataMassTag };

export interface FilteredDataMass extends DataMass {
  matchedLines: DataMassLine[];
}
