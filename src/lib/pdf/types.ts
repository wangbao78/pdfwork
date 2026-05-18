export interface ConversionResult {
  resultKey: string
  downloadUrl: string
}

export interface PdfConverter {
  convert(r2Key: string): Promise<ConversionResult>
}
