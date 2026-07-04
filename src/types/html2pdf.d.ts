declare module 'html2pdf' {
  interface Html2PdfOptions {
    margin?: number | number[]
    filename?: string
    image?: { type?: string; quality?: number }
    html2canvas?: { scale?: number; useCORS?: boolean; logging?: boolean }
    jsPDF?: { unit?: string; format?: string; orientation?: string }
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf
    from(element: HTMLElement | string): Html2Pdf
    outputPdf(): Promise<Blob>
    outputPdf(type: 'blob'): Promise<Blob>
    outputPdf(type: 'datauristring'): Promise<string>
    outputPdf(type: 'arraybuffer'): Promise<ArrayBuffer>
    save(): Promise<void>
    then(onFulfilled?: (pdf: { blob: Blob }) => void, onRejected?: (error: Error) => void): void
  }

  interface html2pdfFunction {
    (): Html2Pdf
  }

  const html2pdf: html2pdfFunction
  export default html2pdf
}
