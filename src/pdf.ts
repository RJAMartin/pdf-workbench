import type { PDFDocument as PdfDoc } from 'pdf-lib';
export type PageItem = {
  id: string;
  source: string;
  index: number;
  rotation: number;
  thumbnail: string;
  label: string;
  selected: boolean;
};
export async function exportPages(
  pages: PageItem[],
  sources: Map<string, Uint8Array>,
) {
  if (!pages.length) throw new Error('Select at least one page.');
  const { PDFDocument, degrees } = await import('pdf-lib');
  const out = await PDFDocument.create();
  const cache = new Map<string, PdfDoc>();
  for (const p of pages) {
    let source = cache.get(p.source);
    if (!source) {
      const data = sources.get(p.source);
      if (!data)
        throw new Error('The original file is missing. Please add it again.');
      source = await PDFDocument.load(data);
      cache.set(p.source, source);
    }
    const [copied] = await out.copyPages(source, [p.index]);
    copied.setRotation(
      degrees((copied.getRotation().angle + p.rotation) % 360),
    );
    out.addPage(copied);
  }
  return out.save();
}
export async function samplePdf() {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const [i, title] of [
    'A fresh perspective.',
    'Room for good ideas.',
    'Make something matter.',
  ].entries()) {
    const p = doc.addPage([420, 594]);
    p.drawRectangle({
      x: 0,
      y: 0,
      width: 420,
      height: 594,
      color: rgb(0.96, 0.96, 0.93),
    });
    p.drawText('FIELD NOTES  /  VOL. 01', {
      x: 38,
      y: 535,
      size: 10,
      font,
      color: rgb(0.3, 0.35, 0.5),
    });
    p.drawText(title, {
      x: 38,
      y: 460,
      size: 23,
      font: bold,
      color: rgb(0.15, 0.2, 0.34),
    });
    p.drawRectangle({
      x: 38,
      y: 165,
      width: 344,
      height: 240,
      color: [
        rgb(0.75, 0.81, 0.91),
        rgb(0.83, 0.84, 0.72),
        rgb(0.9, 0.76, 0.65),
      ][i],
    });
    p.drawCircle({ x: 210, y: 285, size: 70, color: rgb(0.96, 0.96, 0.93) });
    p.drawText('A small collection of thoughts, ready to find their order.', {
      x: 38,
      y: 125,
      size: 10,
      font,
    });
    p.drawText(
      `FOLIO                                     ${String(i + 1).padStart(2, '0')}`,
      { x: 38, y: 40, size: 10, font },
    );
  }
  return new File([new Uint8Array(await doc.save())], 'field-notes.pdf', {
    type: 'application/pdf',
  });
}
