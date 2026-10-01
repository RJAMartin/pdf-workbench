# Folio — portfolio case study

## Problem

Simple PDF tasks are often hidden behind uploads and subscription prompts. Folio makes the document itself the interface: see the pages, arrange them, and export only what is selected.

## Delivered workflow

- Import multiple PDFs, JPEGs and PNGs
- Real page thumbnails
- Drag to reorder, with keyboard-accessible arrow buttons
- Select, rotate and remove pages
- Export a merged PDF or one PDF per page in a ZIP
- Sample document and descriptive import/export errors

## Engineering decisions

- PDF.js renders real thumbnails; pdf-lib copies original PDF pages instead of rasterizing them.
- The document engines are loaded on demand to keep the initial application lightweight. The PDF.js worker is bundled locally.
- Page selections and ordering form an explicit export model, separate from immutable source bytes.
- Drag operations have button alternatives for keyboard and touch users.

## Validation

Tests verify page order, merge dimensions, inherited plus user rotation, and empty-export rejection. Browser verification checks thumbnails, reorder, rotate and downloadable PDFs.

The application was checked in Chromium at desktop and 390 px mobile widths. Screenshots document the implemented product, not a mockup. Real exported files were inspected during development.

## Tradeoffs

- Up to 100 pages per workspace and 30 MB per file.
- Encrypted/password-protected PDFs are rejected.
- This is a page organizer, not a PDF text editor. Digital signatures, interactive forms, bookmarks and document-level metadata are not guaranteed to survive page assembly.
- Large or complex documents can use substantial device memory. Files are not persisted after closing the tab.

## What this demonstrates

A complete product flow from input through validation to a useful output; responsive UI; clear failure states; local processing; reproducible builds; and independently deployable source. This is a portfolio project, not a commissioned client project. No adoption or business-impact metrics are claimed.
