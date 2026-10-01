import { it, expect } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';
import { exportPages, type PageItem } from './pdf';
it('merges selected pages in order and preserves plus applies rotation', async () => {
  const a = await PDFDocument.create();
  a.addPage([200, 300]);
  a.addPage([400, 500]).setRotation(degrees(90));
  const sources = new Map([['a', await a.save()]]);
  const item = (index: number, rotation: number): PageItem => ({
    id: String(index),
    source: 'a',
    index,
    rotation,
    thumbnail: '',
    label: '',
    selected: true,
  });
  const out = await PDFDocument.load(
    await exportPages([item(1, 90), item(0, 0)], sources),
  );
  expect(out.getPageCount()).toBe(2);
  expect(out.getPage(0).getWidth()).toBe(400);
  expect(out.getPage(0).getRotation().angle).toBe(180);
  expect(out.getPage(1).getWidth()).toBe(200);
});
it('rejects empty exports', async () => {
  await expect(exportPages([], new Map())).rejects.toThrow('Select');
});
