export const PRODUCT_AUDIENCES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "child", label: "Child" },
] as const;

export function productAudienceLabel(value: unknown): string {
  return (
    PRODUCT_AUDIENCES.find((option) => option.value === value)?.label ?? "—"
  );
}
