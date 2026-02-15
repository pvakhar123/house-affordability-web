"use client";

import { useState, useRef, useCallback } from "react";
import type { DocumentExtractionResult, ExtractedField } from "@/lib/types";

interface Props {
  onFieldsApplied: (fields: Array<{ field: string; value: string }>) => void;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

const FIELD_FORMATTERS: Record<string, (v: number) => string> = {
  annualGrossIncome: fmt,
  additionalIncome: fmt,
  monthlyDebtPayments: fmt,
  downPaymentSavings: fmt,
  additionalSavings: fmt,
  monthlyExpenses: fmt,
  creditScore: (v) => String(Math.round(v)),
};

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-green-100", text: "text-green-700", label: "High" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Medium" },
  low: { bg: "bg-red-100", text: "text-red-700", label: "Low" },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  pay_stub: "Pay Stub",
  w2: "W-2 Form",
  bank_statement: "Bank Statement",
  tax_return: "Tax Return",
  unknown: "Document",
};

export default function SmartFillUpload({ onFieldsApplied }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<DocumentExtractionResult[]>([]);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError("");
    setIsProcessing(true);
    setResults([]);
    setAppliedFields(new Set());

    try {
      const documents = await Promise.all(
        Array.from(files).map(async (file) => {
          return new Promise<{ data: string; mediaType: string; filename: string }>(
            (resolve, reject) => {
              if (file.size > 10 * 1024 * 1024) {
                reject(new Error(`${file.name} exceeds 10MB limit`));
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                // Strip the data:...;base64, prefix
                const base64 = result.split(",")[1];
                resolve({
                  data: base64,
                  mediaType: file.type,
                  filename: file.name,
                });
              };
              reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
              reader.readAsDataURL(file);
            }
          );
        })
      );

      const res = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Extraction failed");
      }

      const extractionResults: DocumentExtractionResult[] = data.results;
      setResults(extractionResults);

      // Check if any fields were found
      const totalFields = extractionResults.reduce(
        (sum, r) => sum + r.fields.length,
        0
      );
      if (totalFields === 0) {
        setError(
          "No financial data could be extracted. Try a clearer image or a different document."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process documents"
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const applyField = (field: ExtractedField) => {
    onFieldsApplied([{ field: field.field, value: String(field.value) }]);
    setAppliedFields((prev) => new Set(prev).add(field.field));
  };

  const applyAll = () => {
    const allFields: Array<{ field: string; value: string }> = [];
    for (const result of results) {
      for (const field of result.fields) {
        if (!appliedFields.has(field.field)) {
          allFields.push({ field: field.field, value: String(field.value) });
        }
      }
    }
    onFieldsApplied(allFields);
    setAppliedFields((prev) => {
      const next = new Set(prev);
      allFields.forEach((f) => next.add(f.field));
      return next;
    });
  };

  const allFieldsApplied =
    results.length > 0 &&
    results.every((r) => r.fields.every((f) => appliedFields.has(f.field)));

  const totalFields = results.reduce((sum, r) => sum + r.fields.length, 0);

  // Collapsed teaser
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl hover:from-violet-100 hover:to-blue-100 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-violet-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span className="text-sm font-medium text-violet-700">
            Have pay stubs or bank statements? Upload to auto-fill
          </span>
        </div>
        <svg
          className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="border border-violet-200 rounded-xl bg-gradient-to-b from-violet-50/50 to-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-100">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-violet-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-violet-800">
            Smart Fill from Documents
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setResults([]);
            setError("");
            setAppliedFields(new Set());
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {/* Drop zone (show when no results yet) */}
        {results.length === 0 && !isProcessing && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-violet-400 bg-violet-50"
                : "border-gray-300 hover:border-violet-300 hover:bg-violet-50/30"
            }`}
          >
            <svg
              className="w-10 h-10 text-gray-400 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Drag files here or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports: Pay stubs, W-2s, bank statements (PNG, JPG, PDF)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2">
              <svg
                className="animate-spin w-5 h-5 text-violet-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-sm font-medium text-violet-700">
                Analyzing your documents...
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError("");
                setResults([]);
                fileInputRef.current?.click();
              }}
              className="mt-2 text-xs text-red-600 underline hover:text-red-800"
            >
              Try another file
            </button>
          </div>
        )}

        {/* Results review */}
        {results.length > 0 && totalFields > 0 && (
          <div className="space-y-3">
            {results.map((result, ri) => (
              <div key={ri}>
                {results.length > 1 && (
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    {DOC_TYPE_LABELS[result.documentType] || "Document"}{" "}
                    {results.length > 1 ? `(${ri + 1}/${results.length})` : ""}
                  </p>
                )}
                {results.length === 1 && (
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Extracted from {DOC_TYPE_LABELS[result.documentType] || "document"}
                  </p>
                )}
                <div className="space-y-2">
                  {result.fields.map((field) => {
                    const isApplied = appliedFields.has(field.field);
                    const conf = CONFIDENCE_STYLES[field.confidence] || CONFIDENCE_STYLES.medium;
                    const formatter = FIELD_FORMATTERS[field.field] || ((v: number) => String(v));

                    return (
                      <div
                        key={field.field}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isApplied
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-gray-900">
                              {field.label}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${conf.bg} ${conf.text}`}
                            >
                              {conf.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-700">
                              {formatter(field.value)}
                            </span>
                            <span className="text-[11px] text-gray-400 truncate">
                              {field.source}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          {isApplied ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Applied
                            </span>
                          ) : (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => applyField(field)}
                                className="px-2.5 py-1 text-xs font-medium text-violet-700 bg-violet-100 rounded-md hover:bg-violet-200 transition-colors"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAppliedFields((prev) => {
                                    const next = new Set(prev);
                                    next.add(field.field);
                                    return next;
                                  })
                                }
                                className="px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                              >
                                Skip
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {result.warnings && result.warnings.length > 0 && (
                  <div className="mt-2">
                    {result.warnings.map((w, wi) => (
                      <p key={wi} className="text-xs text-amber-600">
                        {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Bulk actions */}
            {!allFieldsApplied && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={applyAll}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors"
                >
                  Apply All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResults([]);
                    setAppliedFields(new Set());
                    setError("");
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Upload different files
                </button>
              </div>
            )}

            {allFieldsApplied && (
              <div className="text-center pt-2">
                <p className="text-xs text-green-600 font-medium">
                  All fields processed. Review the form below.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
