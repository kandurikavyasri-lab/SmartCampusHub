import { Router } from "express";
import multer from "multer";

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function ensurePdfNodeGlobals() {
  const globalScope = globalThis as typeof globalThis & {
    DOMMatrix?: new () => unknown;
    ImageData?: new () => unknown;
    Path2D?: new () => unknown;
  };
  globalScope.DOMMatrix ??= class DOMMatrix {};
  globalScope.ImageData ??= class ImageData {};
  globalScope.Path2D ??= class Path2D {};
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedSubject {
  name: string;
  mid1?: number;
  mid2?: number;
  total?: number;
  grade?: string;
  absent?: boolean;
}

export interface ParsedRecord {
  rollNumber: string;
  name: string;
  subjects: ParsedSubject[];
  gpa?: number;
  semester?: number;
  status: "ok" | "warning" | "error";
  note?: string;
}

export interface ParseResult {
  success: true;
  format: "pdf" | "csv";
  dataType: string;
  year: string;
  branch: string;
  semester: number;
  midTerm?: "mid1" | "mid2";
  subjectName?: string;
  maxMarks?: number;
  filename: string;
  records: ParsedRecord[];
  headers: string[];
  rawSample: string;
  stats: {
    total: number;
    parsed: number;
    warnings: number;
    failed: number;
  };
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function subjectFromFilename(filename: string) {
  const clean = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\b(mid|marks|midterm|mid term)\b/gi, " ").replace(/\s+/g, " ").trim();
  return clean ? titleCase(clean) : "Uploaded Subject";
}

function parseCSV(text: string, filename = ""): { records: ParsedRecord[]; headers: string[]; subjectName?: string; maxMarks?: number } {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV must have at least a header row and one data row.");

  // Parse header
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^["']|["']$/g, ""));

  // Find key columns
  const rollIdx = headers.findIndex((h) => /roll\s*(no|num|number)?/i.test(h));
  const nameIdx = headers.findIndex((h) => /^name$/i.test(h) || /student\s*name/i.test(h));
  const gpaIdx  = headers.findIndex((h) => /^(c?gpa|grade\s*point)$/i.test(h));
  const semIdx  = headers.findIndex((h) => /semester|sem/i.test(h));
  const marksIdx = headers.findIndex((h) => /^marks/i.test(h));
  const singleSubjectName = marksIdx >= 0 ? subjectFromFilename(filename) : "";
  const maxMarks = marksIdx >= 0 ? Number(headers[marksIdx]?.match(/\[\s*(\d+)/)?.[1] ?? 0) || undefined : undefined;

  if (rollIdx === -1 && nameIdx === -1) {
    throw new Error("CSV must have 'Roll Number' and 'Name' columns.");
  }

  const effectiveRollIdx = rollIdx >= 0 ? rollIdx : 0;
  const effectiveNameIdx = nameIdx >= 0 ? nameIdx : 1;

  // Identify subject columns
  const skipIndices = new Set([effectiveRollIdx, effectiveNameIdx, gpaIdx, semIdx, marksIdx].filter((i) => i >= 0));
  const subjectHeaders = headers
    .map((h, i) => ({ h, i }))
    .filter(({ i }) => !skipIndices.has(i));

  const records: ParsedRecord[] = [];

  for (let row = 1; row < lines.length; row++) {
    const cells = lines[row]
      .split(",")
      .map((c) => c.trim().replace(/^["']|["']$/g, ""));

    if (cells.every((c) => c === "")) continue;

    const rollNumber = (cells[effectiveRollIdx] ?? "").trim();
    const name       = (cells[effectiveNameIdx] ?? "").trim();

    if (!rollNumber || !name) continue;

    const subjects: ParsedSubject[] = [];
    if (marksIdx >= 0) {
      const raw = (cells[marksIdx] ?? "").trim();
      const absent = /^AB$/i.test(raw);
      const val = Number(raw);
      if (absent || Number.isFinite(val)) {
        subjects.push({ name: singleSubjectName, total: absent ? 0 : val, absent });
      }
    }
    for (const { h, i } of subjectHeaders) {
      const raw = cells[i];
      if (!raw) continue;
      const val = parseFloat(raw);
      if (isNaN(val)) continue;

      // Detect Mid 1/Mid 2 pattern
      const m1 = h.match(/^(.+?)\s+mid[\s-]?1$/i);
      const m2 = h.match(/^(.+?)\s+mid[\s-]?2$/i);

      if (m1) {
        const sn = m1[1].trim();
        let existing = subjects.find((s) => s.name === sn);
        if (!existing) { existing = { name: sn }; subjects.push(existing); }
        existing.mid1 = val;
      } else if (m2) {
        const sn = m2[1].trim();
        let existing = subjects.find((s) => s.name === sn);
        if (!existing) { existing = { name: sn }; subjects.push(existing); }
        existing.mid2 = val;
      } else {
        subjects.push({ name: h, total: val });
      }
    }

    const gpaRaw = gpaIdx >= 0 ? parseFloat(cells[gpaIdx] ?? "") : NaN;
    const semRaw = semIdx >= 0 ? parseInt(cells[semIdx] ?? "") : NaN;

    records.push({
      rollNumber,
      name,
      subjects,
      gpa:      isNaN(gpaRaw) ? undefined : gpaRaw,
      semester: isNaN(semRaw) ? undefined : semRaw,
      status:   subjects.length > 0 ? "ok" : "warning",
      note:     subjects.length === 0 ? "No marks detected for this row" : undefined,
    });
  }

  return { records, headers, subjectName: singleSubjectName || undefined, maxMarks };
}

// ─── PDF Text Parser ─────────────────────────────────────────────────────────

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function parsePDFText(text: string): { records: ParsedRecord[]; headers: string[]; subjectName?: string; maxMarks?: number } {
  // Normalize whitespace
  const lines = text
    .split(/\n/)
    .map((l) => l.replace(/\t/g, "  ").trimEnd())
    .filter((l) => l.trim().length > 0);

  // Detect header line: must contain "Roll" or "Reg" AND "Name"
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lo = lines[i].toLowerCase();
    if ((lo.includes("roll") || lo.includes("reg")) && lo.includes("name")) {
      headerIdx = i;
      break;
    }
  }

  // Fallback: find first line that looks like a table row with a serial number
  if (headerIdx === -1) {
    for (let i = 0; i < lines.length - 1; i++) {
      const next = lines[i + 1];
      const parts = next.trim().split(/\s{2,}/);
      if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      "Could not find a table header in this PDF. " +
      "Please ensure the PDF has a header row containing 'Roll No' and 'Name', " +
      "or upload a CSV file instead."
    );
  }

  // Split header into columns using 2+ spaces as delimiter
  const rawHeader = lines[headerIdx];
  const headers = rawHeader.trim().split(/\s{2,}/).map((h) => h.trim()).filter(Boolean);

  const rollHIdx = headers.findIndex((h) => /roll|reg\s*no/i.test(h));
  const nameHIdx = headers.findIndex((h) => /^name$/i.test(h) || /student/i.test(h));
  const snoHIdx  = headers.findIndex((h) => /^(s\.?no\.?|sl\.?|sr\.?|\d)$/i.test(h));

  // Subject headers are everything else
  const skip = new Set([rollHIdx, nameHIdx, snoHIdx, headers.findIndex((h) => /gpa|cgpa/i.test(h))].filter((i) => i >= 0));
  const subjectHeaders = headers.filter((_, i) => !skip.has(i));
  const gpaHIdx = headers.findIndex((h) => /gpa|cgpa/i.test(h));

  const records: ParsedRecord[] = [];
  const subjectLine = lines.find((line) => /mid\s*marks/i.test(line) && !/roll|student|marks\s*\[/i.test(line));
  const subjectName = subjectLine ? titleCase(subjectLine.replace(/\s*-\s*mid\s*marks.*$/i, "").trim()) : undefined;
  const marksHeader = lines.find((line) => /marks\s*\[\s*\d+\s*m?\s*\]/i.test(line));
  const maxMarks = Number(marksHeader?.match(/marks\s*\[\s*(\d+)/i)?.[1] ?? 0) || undefined;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^(page\s+\d+|total|average|class\s+avg|legend|faculty|hod|result)/i.test(line)) continue;

    const simpleRow = line.match(/^(\d+)\s+([A-Z0-9]+L?)\s+(.+?)\s+(\d+(?:\.\d+)?|AB)$/i);
    if (simpleRow && subjectName) {
      const markRaw = simpleRow[4].toUpperCase();
      const absent = markRaw === "AB";
      records.push({
        rollNumber: simpleRow[2].trim(),
        name: simpleRow[3].trim(),
        subjects: [{ name: subjectName, total: absent ? 0 : Number(markRaw), absent }],
        status: absent ? "warning" : "ok",
        note: absent ? "Absent in uploaded PDF" : undefined,
      });
      continue;
    }

    const parts = line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    // Skip S.No if present
    let offset = 0;
    if (snoHIdx === 0 || (parts.length > 2 && /^\d+$/.test(parts[0]))) {
      offset = 1;
    }

    const rollNumber = parts[rollHIdx > 0 ? rollHIdx : offset]      ?? "";
    const name       = parts[nameHIdx > 0 ? nameHIdx : offset + 1]  ?? "";

    if (!rollNumber.trim() || !name.trim()) continue;

    // Collect subject marks from remaining columns
    const markStart = Math.max(rollHIdx, nameHIdx) + 1;
    const subjects: ParsedSubject[] = [];

    for (let j = 0; j < subjectHeaders.length; j++) {
      const val = parseFloat(parts[markStart + j] ?? "");
      if (!isNaN(val)) {
        subjects.push({ name: subjectHeaders[j], total: val });
      }
    }

    const gpaRaw = gpaHIdx >= 0 ? parseFloat(parts[gpaHIdx] ?? "") : NaN;

    records.push({
      rollNumber: rollNumber.trim(),
      name:       name.trim(),
      subjects,
      gpa:    isNaN(gpaRaw) ? undefined : gpaRaw,
      status: subjects.length > 0 ? "ok" : "warning",
      note:   subjects.length === 0 ? "Could not extract marks - check column alignment" : undefined,
    });
  }

  return { records, headers, subjectName, maxMarks };
}

// ─── Route: POST /api/bulk-upload/parse ─────────────────────────────────────

router.post("/parse", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: "No file provided." });
      return;
    }

    const { year = "", branch = "", semester = "0", dataType = "midmarks", midTerm = "mid1" } = req.body as Record<string, string>;
    const filename = file.originalname ?? "upload";
    const ext      = filename.toLowerCase().split(".").pop();

    let records: ParsedRecord[] = [];
    let headers: string[] = [];
    let format: "pdf" | "csv";
    let rawSample = "";
    let detectedSubjectName = "";
    let detectedMaxMarks = 0;

    if (ext === "pdf" || file.mimetype === "application/pdf") {
      format = "pdf";
      ensurePdfNodeGlobals();
      const { PDFParse, VerbosityLevel } = await import("pdf-parse");
      const parser = new PDFParse({ data: file.buffer, verbosity: VerbosityLevel.ERRORS });
      const textResult = await parser.getText();
      await parser.destroy();
      const pdfText = textResult.text;
      rawSample = pdfText.slice(0, 800);
      const result = parsePDFText(pdfText);
      records = result.records;
      headers = result.headers;
      detectedSubjectName = result.subjectName ?? "";
      detectedMaxMarks = result.maxMarks ?? 0;
    } else if (ext === "csv" || file.mimetype === "text/csv" || file.mimetype === "text/plain") {
      format = "csv";
      const text = file.buffer.toString("utf-8");
      rawSample = text.slice(0, 800);
      const result = parseCSV(text, filename);
      records = result.records;
      headers = result.headers;
      detectedSubjectName = result.subjectName ?? "";
      detectedMaxMarks = result.maxMarks ?? 0;
    } else {
      res.status(400).json({
        success: false,
        error: `Unsupported file type ".${ext}". Please upload a PDF or CSV file.`,
      });
      return;
    }

    if (records.length === 0) {
      res.status(422).json({
        success: false,
        error: "No student records could be extracted. Ensure the file has Roll Number and Name columns.",
      });
      return;
    }

    const result: ParseResult = {
      success: true,
      format,
      dataType,
      year,
      branch,
      semester: parseInt(semester) || 0,
      midTerm: midTerm === "mid2" ? "mid2" : "mid1",
      subjectName: detectedSubjectName,
      maxMarks: detectedMaxMarks || undefined,
      filename,
      records,
      headers,
      rawSample,
      stats: {
        total:    records.length,
        parsed:   records.filter((r) => r.status === "ok").length,
        warnings: records.filter((r) => r.status === "warning").length,
        failed:   records.filter((r) => r.status === "error").length,
      },
    };

    req.log.info({ total: result.stats.total, format }, "Bulk upload parsed");
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Bulk upload parse error");
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred during parsing.",
    });
  }
});

export default router;

