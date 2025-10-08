declare module 'pdf-parse' {
  export type PdfData = {
    text: string;
    numpages?: number;
    info?: any;
    metadata?: any;
    version?: string;
  };
  export default function pdf(dataBuffer: Buffer | Uint8Array): Promise<PdfData>;
}

declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdf from 'pdf-parse';
  export default pdf;
}
