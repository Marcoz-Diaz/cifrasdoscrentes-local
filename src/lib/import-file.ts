// Browser-only: extract plain text (keeping chord alignment where possible) from TXT, PDF and DOCX files.
import { detectKey } from "./chords";

export const IMPORT_ACCEPT = ".txt,.text,.md,.chopro,.cho,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function parseImportedFile(file: File): Promise<{ content: string; title?: string; artist?: string; key: string }> {
  const content = await extractTextFromFile(file);
  const parts = file.name.replace(/\.[^.]+$/, "").split(" - ");
  const title = parts[0]?.trim();
  const artist = parts.slice(1).join(" - ").trim();
  return {
    content,
    ...(title ? { title } : {}),
    ...(artist ? { artist } : {}),
    key: detectKey(content),
  };
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return pdfToText(file);
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return clean(value);
  }
  if (name.endsWith(".doc")) throw new Error("Arquivos .doc antigos não são suportados. Salve como .docx ou PDF.");
  return clean(await file.text());
}

function clean(t: string) {
  return t.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    type It = { str: string; x: number; y: number; w: number };
    const items: It[] = [];
    for (const raw of content.items) {
      if (!("str" in raw) || !raw.str) continue;
      items.push({ str: raw.str, x: raw.transform[4] as number, y: raw.transform[5] as number, w: raw.width });
    }
    // Estimate character width from text items
    const totalW = items.reduce((a, i) => a + i.w, 0);
    const totalC = items.reduce((a, i) => a + i.str.length, 0);
    const cw = totalC ? Math.max(2, totalW / totalC) : 6;
    const minX = items.length ? Math.min(...items.map((i) => i.x)) : 0;
    // Group into lines by y
    const lines: { y: number; items: It[] }[] = [];
    for (const it of items.sort((a, b) => b.y - a.y || a.x - b.x)) {
      const line = lines.find((l) => Math.abs(l.y - it.y) < 3);
      line ? line.items.push(it) : lines.push({ y: it.y, items: [it] });
    }
    let lastY: number | null = null;
    for (const l of lines) {
      if (lastY !== null && lastY - l.y > 28) out.push("");
      lastY = l.y;
      let s = "";
      for (const it of l.items.sort((a, b) => a.x - b.x)) {
        const col = Math.round((it.x - minX) / cw);
        if (col > s.length) s += " ".repeat(col - s.length);
        else if (s && !s.endsWith(" ") && !it.str.startsWith(" ")) s += " ";
        s += it.str;
      }
      out.push(s.trimEnd());
    }
    out.push("");
  }
  return clean(out.join("\n"));
}
