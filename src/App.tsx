import { useRef, useState } from 'react';
import {
  BookOpen,
  Plus,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Trash2,
  GripVertical,
  LoaderCircle,
  CheckCheck,
  Files,
} from 'lucide-react';
import JSZip from 'jszip';
import { Header, Footer, Dropzone, download } from './ui';
import { exportPages, samplePdf, type PageItem } from './pdf';
export default function App() {
  const [pages, setPages] = useState<PageItem[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false),
    [name, setName] = useState('my-document'),
    [drag, setDrag] = useState<string | null>(null);
  const sources = useRef(new Map<string, Uint8Array>()),
    input = useRef<HTMLInputElement>(null);
  const selected = pages.filter((p) => p.selected);
  async function add(files: File[]) {
    if (busy) return;
    setBusy(true);
    setMessage('Reading your documents…');
    setError(false);
    let next: PageItem[] = [];
    const problems: string[] = [];
    try {
      const [{ PDFDocument }, pdfjs, { default: worker }] = await Promise.all([
        import('pdf-lib'),
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker;
      for (const file of files) {
        if (file.size > 30 * 1024 * 1024) {
          problems.push(`${file.name}: exceeds 30 MB.`);
          continue;
        }
        try {
          let data: Uint8Array;
          if (file.type === 'image/png' || file.type === 'image/jpeg') {
            const doc = await PDFDocument.create();
            const bitmap = await createImageBitmap(file);
            const pixels = bitmap.width * bitmap.height;
            bitmap.close();
            if (pixels > 40_000_000)
              throw new Error('Image exceeds 40 megapixels.');
            const image =
              file.type === 'image/png'
                ? await doc.embedPng(await file.arrayBuffer())
                : await doc.embedJpg(await file.arrayBuffer());
            const scale = Math.min(
              1,
              1600 / Math.max(image.width, image.height),
            );
            doc
              .addPage([image.width * scale, image.height * scale])
              .drawImage(image, {
                x: 0,
                y: 0,
                width: image.width * scale,
                height: image.height * scale,
              });
            data = new Uint8Array(await doc.save());
          } else {
            if (!file.name.toLowerCase().endsWith('.pdf'))
              throw new Error('Choose a PDF, PNG or JPEG.');
            data = new Uint8Array(await file.arrayBuffer());
          }
          const source = await PDFDocument.load(data);
          if (pages.length + next.length + source.getPageCount() > 100)
            throw new Error('A workspace can hold up to 100 pages.');
          const task = pdfjs.getDocument({ data: data.slice() });
          const preview = await task.promise;
          const id = crypto.randomUUID();
          const incoming: PageItem[] = [];
          try {
            for (let i = 0; i < source.getPageCount(); i++) {
              const page = await preview.getPage(i + 1);
              const base = page.getViewport({ scale: 1 }),
                viewport = page.getViewport({
                  scale: Math.min(1, 320 / Math.max(base.width, base.height)),
                });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({
                canvas,
                canvasContext: canvas.getContext('2d')!,
                viewport,
              }).promise;
              incoming.push({
                id: crypto.randomUUID(),
                source: id,
                index: i,
                rotation: 0,
                thumbnail: canvas.toDataURL('image/jpeg', 0.75),
                label: `${file.name} · ${i + 1}`,
                selected: true,
              });
            }
            sources.current.set(id, data);
            next.push(...incoming);
          } finally {
            await preview.destroy();
          }
        } catch (e) {
          problems.push(
            `${file.name}: ${e instanceof Error && /exceeds|Choose|workspace/.test(e.message) ? e.message : 'Could not read this document. It may be damaged or password protected.'}`,
          );
        }
      }
      setPages((v) => [...v, ...next]);
      setError(!!problems.length);
      setMessage(
        problems.length
          ? problems.join(' ')
          : `${next.length} pages added. Drag them into order, then export.`,
      );
    } finally {
      setBusy(false);
    }
  }
  function move(id: string, delta: number) {
    setPages((v) => {
      const a = [...v],
        i = a.findIndex((p) => p.id === id),
        target = i + delta;
      if (target < 0 || target >= a.length) return v;
      [a[i], a[target]] = [a[target], a[i]];
      return a;
    });
  }
  function reorder(target: string) {
    if (!drag || drag === target) return;
    setPages((v) => {
      const from = v.findIndex((p) => p.id === drag),
        to = v.findIndex((p) => p.id === target),
        a = [...v];
      a.splice(to, 0, a.splice(from, 1)[0]);
      return a;
    });
    setDrag(null);
  }
  function rotate(id?: string) {
    setPages((v) =>
      v.map((p) =>
        (id ? p.id === id : p.selected)
          ? { ...p, rotation: (p.rotation + 90) % 360 }
          : p,
      ),
    );
  }
  function removeSelected() {
    const keep = pages.filter((p) => !p.selected);
    const used = new Set(keep.map((p) => p.source));
    sources.current.forEach((_, id) => {
      if (!used.has(id)) sources.current.delete(id);
    });
    setPages(keep);
    setMessage('Selected pages removed.');
  }
  async function save(split = false) {
    setBusy(true);
    setError(false);
    setMessage('Preparing your download…');
    try {
      const safe = name.trim().replace(/[<>:"/\\|?*]/g, '-') || 'my-document';
      if (split) {
        const zip = new JSZip();
        for (const [p, i] of selected.map((p, i) => [p, i] as const)) {
          zip.file(
            `${safe}-${i + 1}.pdf`,
            await exportPages([p], sources.current),
          );
        }
        download(
          await zip.generateAsync({ type: 'blob' }),
          `${safe}-pages.zip`,
        );
      } else {
        download(
          new Blob(
            [new Uint8Array(await exportPages(selected, sources.current))],
            { type: 'application/pdf' },
          ),
          `${safe}.pdf`,
        );
      }
      setMessage(
        split ? 'Your individual pages are ready.' : 'Your PDF is ready.',
      );
    } catch (e) {
      setError(true);
      setMessage(
        e instanceof Error
          ? e.message
          : 'Export failed. Try a smaller selection.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header name="folio" icon={<BookOpen size={22} />} />
      <main className="shell">
        <section className="intro">
          <div>
            <div className="eyebrow">A little order for your documents</div>
            <h1>
              Every page.
              <br />
              In its right place.
            </h1>
            <p>Bring PDFs together. Keep what matters. Make it one.</p>
          </div>
          <button disabled={busy} onClick={() => input.current?.click()}>
            <Plus size={16} />
            Add documents
          </button>
          <input
            className="sr-only"
            tabIndex={-1}
            type="file"
            ref={input}
            multiple
            accept=".pdf,image/png,image/jpeg"
            onChange={(e) => {
              void add(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </section>
        <div className="workspace">
          <section className="panel">
            <div className="panel-title">
              <h2 className="row">
                <Files size={17} />
                Page collection{' '}
                <small>{pages.length ? `/ ${pages.length}` : ''}</small>
              </h2>
              {pages.length > 0 && (
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() =>
                    setPages((v) =>
                      v.map((p) => ({
                        ...p,
                        selected: selected.length !== pages.length,
                      })),
                    )
                  }
                >
                  <CheckCheck size={16} />
                  {selected.length === pages.length
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
              )}
            </div>
            {!pages.length ? (
              <div className="panel-body">
                <Dropzone
                  disabled={busy}
                  accept=".pdf,image/png,image/jpeg"
                  onFiles={add}
                  title="Your next document starts here"
                  description="Drop PDFs or images here. Up to 30 MB per file and 100 pages total."
                >
                  <button
                    disabled={busy}
                    onClick={async () => add([await samplePdf()])}
                  >
                    Try a sample <ArrowRight size={14} />
                  </button>
                </Dropzone>
                <div className="pdf-instructions">
                  <span>
                    <GripVertical size={15} />
                    Arrange
                  </span>
                  <span>
                    <RotateCw size={15} />
                    Rotate
                  </span>
                  <span>
                    <ArrowDownToLine size={15} />
                    Export
                  </span>
                </div>
              </div>
            ) : (
              <div className="page-grid">
                {pages.map((p, i) => (
                  <article
                    key={p.id}
                    className={'page-card ' + (p.selected ? 'selected' : '')}
                    draggable={!busy}
                    onDragStart={() => setDrag(p.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => reorder(p.id)}
                    onDragEnd={() => setDrag(null)}
                  >
                    <div className="page-top">
                      <label className="check">
                        <input
                          disabled={busy}
                          type="checkbox"
                          checked={p.selected}
                          aria-label={`Select page ${i + 1}`}
                          onChange={() =>
                            setPages((v) =>
                              v.map((a) =>
                                a.id === p.id
                                  ? { ...a, selected: !a.selected }
                                  : a,
                              ),
                            )
                          }
                        />
                        <span>{String(i + 1).padStart(2, '0')}</span>
                      </label>
                      <GripVertical size={15} />
                    </div>
                    <div className="page-preview">
                      <img
                        src={p.thumbnail}
                        alt={`Page ${i + 1} preview`}
                        style={{
                          transform: `rotate(${p.rotation}deg)`,
                          maxWidth: p.rotation % 180 ? '75%' : undefined,
                        }}
                      />
                    </div>
                    <div className="page-source" title={p.label}>
                      {p.label}
                    </div>
                    <div className="page-actions">
                      <button
                        className="icon ghost"
                        disabled={busy || i === 0}
                        aria-label={`Move page ${i + 1} earlier`}
                        onClick={() => move(p.id, -1)}
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <button
                        className="icon ghost"
                        disabled={busy}
                        aria-label={`Rotate page ${i + 1}`}
                        onClick={() => rotate(p.id)}
                      >
                        <RotateCw size={14} />
                      </button>
                      <button
                        className="icon ghost"
                        disabled={busy || i === pages.length - 1}
                        aria-label={`Move page ${i + 1} later`}
                        onClick={() => move(p.id, 1)}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <aside className="stack">
            <section className="panel">
              <div className="panel-title">
                <h2>The finishing touches</h2>
              </div>
              <div className="panel-body stack">
                <div className="stats">
                  <div className="stat">
                    <strong>{pages.length}</strong>
                    <span>Total pages</span>
                  </div>
                  <div className="stat">
                    <strong>{selected.length}</strong>
                    <span>Selected for export</span>
                  </div>
                </div>
                <div className="divider" />
                <label>
                  Document name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                  />
                </label>
                <div className="stack" style={{ gap: 8 }}>
                  <button
                    disabled={busy || !selected.length}
                    onClick={() => rotate()}
                  >
                    <RotateCw size={15} />
                    Rotate selected
                  </button>
                  <button
                    className="danger"
                    disabled={busy || !selected.length}
                    onClick={removeSelected}
                  >
                    <Trash2 size={15} />
                    Remove selected
                  </button>
                </div>
                <div className="divider" />
                <button
                  className="primary full"
                  disabled={busy || !selected.length}
                  onClick={() => save()}
                >
                  {busy ? (
                    <LoaderCircle className="spinner" size={16} />
                  ) : (
                    <ArrowDownToLine size={16} />
                  )}
                  Export selected as PDF
                </button>
                <button
                  className="full"
                  disabled={busy || !selected.length}
                  onClick={() => save(true)}
                >
                  Download separate pages
                </button>
                <p className="hint">
                  Only checked pages are exported, in the order shown. Separate
                  pages download together in a ZIP.
                </p>
              </div>
            </section>
            <div className="notice">
              <strong>Confidential stays confidential.</strong>
              <br />
              Your documents are processed on your device, never on a server.
              Password-protected PDFs aren't supported.
            </div>
          </aside>
        </div>
        <div
          className={'status ' + (error ? 'error' : '')}
          role={error ? 'alert' : 'status'}
        >
          {message}
        </div>
        <Footer />
      </main>
    </>
  );
}
