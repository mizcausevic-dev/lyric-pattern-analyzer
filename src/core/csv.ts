const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function mitigateCell(value: string): string {
  const text = value.replace(/\r\n|\r|\n/g, " ").replace(/"/g, '""')
  const guarded = FORMULA_PREFIX.test(text) ? `'${text}` : text
  return `"${guarded}"`
}

export function rawCell(value: string): string {
  const text = value.replace(/\r\n|\r|\n/g, " ").replace(/"/g, '""')
  return `"${text}"`
}

export function csvRow(cells: string[], formulaMitigated: boolean): string {
  return cells.map((cell) => (formulaMitigated ? mitigateCell(cell) : rawCell(cell))).join(",")
}
