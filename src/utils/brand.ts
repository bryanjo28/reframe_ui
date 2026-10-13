const LEGACY_BRAND_PATTERN = new RegExp(['re', 'frame'].join(''), 'gi')

export function withCurrentBrand(value: string) {
  return value.replace(LEGACY_BRAND_PATTERN, 'alurin')
}
