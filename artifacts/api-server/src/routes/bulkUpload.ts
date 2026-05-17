import { Router } from "express";
import multer from "multer";

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedSubject {
  name: string;
  mid1?: number;
  mid2?: number;
  total?: number;
  grade?: string;
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

function parseCSV(text: string): { records: ParsedRecord[]; headers: string[] } {
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

  if (rollIdx === -1 && nameIdx === -1) {
    throw new Error("CSV must have 'Roll Number' and 'Name' columns.");
  }

  const effectiveRollIdx = rollIdx >= 0 ? rollIdx : 0;
  const effectiveNameIdx = nameIdx >= 0 ? nameIdx : 1;

  // Identify subject columns
  const skipIndices = new Set([effectiveRollIdx, effectiveNameIdx, gpaIdx, semIdx].filter((i) => i >= 0));
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

  return { records, headers };
}

// ─── PDF Text Parser ─────────────────────────────────────────────────────────

function parsePDFText(text: string): { records: ParsedRecord[]; headers: string[] } {
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

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^(page\s+\d+|total|average|class\s+avg|legend|—|result)/i.test(line)) continue;

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
      note:   subjects.length === 0 ? "Could not extract marks — check column alignment" : undefined,
    });
  }

  return { records, headers };
}

// ─── Route: POST /api/bulk-upload/parse ─────────────────────────────────────

router.post("/parse", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: "No file provided." });
      return;
    }

    const { year = "", branch = "", semester = "0", dataType = "midmarks" } = req.body as Record<string, string>;
    const filename = file.originalname ?? "upload";
    const ext      = filename.toLowerCase().split(".").pop();

    let records: ParsedRecord[] = [];
    let headers: string[] = [];
    let format: "pdf" | "csv";
    let rawSample = "";

    if (ext === "pdf" || file.mimetype === "application/pdf") {
      format = "pdf";
      const { PDFParse, VerbosityLevel } = await import("pdf-parse");
      const parser = new PDFParse({ data: file.buffer, verbosity: VerbosityLevel.ERRORS });
      const textResult = await parser.getText();
      await parser.destroy();
      const pdfText = textResult.text;
      rawSample = pdfText.slice(0, 800);
      const result = parsePDFText(pdfText);
      records = result.records;
      headers = result.headers;
    } else if (ext === "csv" || file.mimetype === "text/csv" || file.mimetype === "text/plain") {
      format = "csv";
      const text = file.buffer.toString("utf-8");
      rawSample = text.slice(0, 800);
      const result = parseCSV(text);
      records = result.records;
      headers = result.headers;
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
