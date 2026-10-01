import { useRef, useState, type ReactNode } from 'react';
import { ArrowUpFromLine, ShieldCheck, Sparkles } from 'lucide-react';
export function Header({
  name,
  icon,
  server = false,
}: {
  name: string;
  icon: ReactNode;
  server?: boolean;
}) {
  return (
    <header className="topbar">
      <a className="brand" href="./">
        <span className="brand-mark">{icon}</span>
        {name}
        <span style={{ color: 'var(--muted)', fontWeight: 400 }}>.</span>
      </a>
      <div className="topbar-right">
        <span className="privacy">
          <ShieldCheck size={15} />
          {server
            ? 'Temporary processing · automatic cleanup'
            : 'Your files stay on your device'}
        </span>
        <span className="badge">
          <span className="dot" />
          Free. Always ad-free.
        </span>
      </div>
    </header>
  );
}
export function Footer({ server = false }: { server?: boolean }) {
  return (
    <footer className="footer">
      <span>
        <Sparkles size={13} />
        <a
          href="https://github.com/RJAMartin/pdf-workbench"
          target="_blank"
          rel="noreferrer"
        >
          Built by Renaud Martin · View source
        </a>
      </span>
      <span>
        {server
          ? 'Files deleted after conversion. No accounts.'
          : '100% in your browser. No uploads. No accounts.'}
      </span>
    </footer>
  );
}
export function Dropzone({
  accept,
  multiple = true,
  onFiles,
  title,
  description,
  children,
  disabled = false,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title: string;
  description: string;
  children?: ReactNode;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={'dropzone ' + (drag ? 'dragging' : '')}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <span className="drop-icon">
        <ArrowUpFromLine size={25} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="row">
        <button
          className="primary"
          disabled={disabled}
          onClick={() => ref.current?.click()}
        >
          Choose {multiple ? 'files' : 'a file'}
        </button>
        {children}
      </div>
      <input
        className="sr-only"
        tabIndex={-1}
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </div>
  );
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function bytes(n: number) {
  return n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 / 1024).toFixed(1)} MB`;
}
