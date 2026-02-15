export interface ExtractedField {
  field: string;
  label: string;
  value: number;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface DocumentExtractionResult {
  success: boolean;
  documentType:
    | "pay_stub"
    | "w2"
    | "bank_statement"
    | "tax_return"
    | "unknown";
  fields: ExtractedField[];
  warnings?: string[];
}
