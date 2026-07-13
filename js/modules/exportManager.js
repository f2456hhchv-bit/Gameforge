// Export utilities: Markdown, JSON, CSV and HTML are native. PDF uses the
// browser's print pipeline (zero dependencies, universally reliable).
// DOCX and XLSX are hand-built OOXML packages using the vendored JSZip
// (vendor/jszip.min.js, loaded as a classic <script> so it's window.JSZip) —
// no server, no CDN dependency once the app is loaded.
import { download, escapeHtml, toCSV } from '../util.js';

export function exportMarkdown(filename, content) {
  download(filename.endsWith('.md') ? filename : `${filename}.md`, content, 'text/markdown');
}

export function exportJSON(filename, obj) {
  download(filename.endsWith('.json') ? filename : `${filename}.json`, JSON.stringify(obj, null, 2), 'application/json');
}

export function exportCSVRows(filename, rows) {
  download(filename.endsWith('.csv') ? filename : `${filename}.csv`, toCSV(rows), 'text/csv');
}

const HTML_SHELL = (title, body) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:860px;margin:2rem auto;padding:0 1.5rem;line-height:1.6;color:#1a1d23;}
  h1{border-bottom:3px solid #4f46e5;padding-bottom:.5rem;}
  h2{border-bottom:1px solid #ddd;padding-bottom:.3rem;margin-top:2.2rem;}
  code,pre{background:#f3f4f6;border-radius:6px;}
  pre{padding:1rem;overflow-x:auto;}
  table{border-collapse:collapse;width:100%;margin:1rem 0;}
  th,td{border:1px solid #ddd;padding:.5rem;text-align:left;}
  th{background:#f3f4f6;}
  blockquote{border-left:4px solid #4f46e5;margin:0;padding-left:1rem;color:#555;}
  @media print { body{margin:0;padding:1rem;} }
</style></head><body>${body}</body></html>`;

// Minimal, dependency-free markdown -> HTML (headings, lists, bold/italic, code, paragraphs).
export function markdownToHTML(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let inCode = false;
  for (let raw of lines) {
    if (raw.startsWith('```')) { inCode = !inCode; html += inCode ? '<pre><code>' : '</code></pre>'; continue; }
    if (inCode) { html += escapeHtml(raw) + '\n'; continue; }
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,4})\s+(.*)/);
    const bullet = line.match(/^[-*]\s+(.*)/);
    const inline = s => escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
    if (heading) {
      if (inList) { html += '</ul>'; inList = false; }
      const level = heading[1].length;
      html += `<h${level}>${inline(heading[2])}</h${level}>`;
    } else if (bullet) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(bullet[1])}</li>`;
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${inline(line)}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

export function exportHTML(filename, title, markdownOrHtml, { isMarkdown = true } = {}) {
  const body = isMarkdown ? markdownToHTML(markdownOrHtml) : markdownOrHtml;
  download(filename.endsWith('.html') ? filename : `${filename}.html`, HTML_SHELL(title, `<h1>${escapeHtml(title)}</h1>${body}`), 'text/html');
}

export function printToPDF(title, markdown) {
  const body = markdownToHTML(markdown);
  const win = window.open('', '_blank');
  win.document.write(HTML_SHELL(title, `<h1>${escapeHtml(title)}</h1>${body}`));
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 300);
}

// --- Minimal OOXML DOCX writer (headings + paragraphs + bullet lines) ---
function docxParagraphXML(line) {
  const heading = line.match(/^(#{1,4})\s+(.*)/);
  const bullet = line.match(/^[-*]\s+(.*)/);
  const esc = s => escapeHtml(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  if (heading) {
    const styleMap = { 1: 'Heading1', 2: 'Heading2', 3: 'Heading3', 4: 'Heading4' };
    return `<w:p><w:pPr><w:pStyle w:val="${styleMap[heading[1].length]}"/></w:pPr><w:r><w:t xml:space="preserve">${esc(heading[2])}</w:t></w:r></w:p>`;
  }
  if (bullet) {
    return `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">${esc(bullet[1])}</w:t></w:r></w:p>`;
  }
  if (!line.trim()) return '<w:p/>';
  return `<w:p><w:r><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`;
}

export async function exportDOCX(filename, title, markdown) {
  const JSZip = window.JSZip;
  if (!JSZip) { alert('DOCX export library failed to load.'); return; }
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`);
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`);
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>${escapeHtml(title)}</dc:title><dc:creator>GameForge Studio</dc:creator>
</cp:coreProperties>`);
  const word = zip.folder('word');
  word.folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`);
  word.file('numbering.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`);
  word.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="280" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="220" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
</w:styles>`);

  const bodyParas = markdown.split('\n').map(docxParagraphXML).join('');
  word.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${bodyParas}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  download(filename.endsWith('.docx') ? filename : `${filename}.docx`, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}

// --- Minimal OOXML XLSX writer (single sheet, inline strings — no sharedStrings needed) ---
function colLetter(n) {
  let s = '';
  n += 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

export async function exportXLSX(filename, sheetName, rows) {
  const JSZip = window.JSZip;
  if (!JSZip) { alert('Excel export library failed to load.'); return; }
  if (!rows.length) { alert('Nothing to export.'); return; }
  const cols = Object.keys(rows[0]);
  const esc = s => escapeHtml(String(s ?? '')).replace(/&quot;/g, '&#34;').replace(/&#39;/g, '&#39;');

  const isNumeric = v => v !== '' && v != null && Number.isFinite(Number(v)) && !/^0\d/.test(String(v).trim());
  const cellXML = (v, ref) => isNumeric(v)
    ? `<c r="${ref}"><v>${Number(v)}</v></c>`
    : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  const rowXML = (values, rowIndex) => `<row r="${rowIndex}">${values.map((v, i) => cellXML(v, `${colLetter(i)}${rowIndex}`)).join('')}</row>`;

  const sheetRows = [rowXML(cols, 1), ...rows.map((r, i) => rowXML(cols.map(c => r[c]), i + 2))].join('');

  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`);
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  const xl = zip.folder('xl');
  xl.folder('_rels').file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  xl.file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeHtml(sheetName).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`);
  xl.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`);
  xl.folder('worksheets').file('sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  download(filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`, blob, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
