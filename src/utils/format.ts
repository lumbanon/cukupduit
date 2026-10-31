export const money = (value: number, compact = false): string => {
  if (!Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
  }).format(value);
};
export const number = (value: number): string =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(value)
    : "—";
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
