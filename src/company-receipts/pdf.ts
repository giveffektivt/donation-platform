import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { ReceiptLayout } from "./render";

export async function renderReceiptPdf(receipt: ReceiptLayout, logo: Buffer) {
  const left = 60;
  const right = 535;
  const bottom = 792;
  const width = right - left;
  const bodyWidth = 435;
  const fontDir = path.join(process.cwd(), "node_modules/@fontsource/open-sans/files");
  const [regularFont, boldFont] = await Promise.all([
    readFile(path.join(fontDir, "open-sans-latin-400-normal.woff")),
    readFile(path.join(fontDir, "open-sans-latin-700-normal.woff")),
  ]);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 28, bottom: 50, left, right: 60 },
    info: { Title: receipt.title, Author: "Giv Effektivt" },
  });
  const firstPage = doc.page;
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont("Open Sans", regularFont);
  doc.registerFont("Open Sans Bold", boldFont);
  const regular = (size = 12.5) => doc.font("Open Sans").fontSize(size);
  const bold = (size = 12.5) => doc.font("Open Sans Bold").fontSize(size);
  const rule = (y: number) =>
    doc.lineWidth(1.4).moveTo(left, y).lineTo(right, y).stroke("#111111");
  const paragraph = { width: bodyWidth, lineGap: -1 };

  const headerOffset = 8;
  const metadataY = 89 + headerOffset;
  doc.fillColor("#111111").image(logo, left, 28, { width: 270 });
  bold().text("Dato: ", left, metadataY, { width: 145, continued: true });
  regular().text(receipt.date);
  const referenceLabel = "Reference: ";
  const referenceWidth =
    regular().widthOfString(receipt.reference) +
    bold().widthOfString(referenceLabel);
  doc.text(referenceLabel, right - referenceWidth, metadataY, {
    continued: true,
    lineBreak: false,
  });
  regular().text(receipt.reference, { lineBreak: false });
  rule(116 + headerOffset);

  const address = (
    heading: string,
    lines: string[],
    x: number,
    columnWidth: number,
  ) => {
    bold().text(heading, x, 140 + headerOffset, {
      width: columnWidth,
      characterSpacing: 1.2,
    });
    bold().text(lines[0], x, 172 + headerOffset, {
      width: columnWidth,
      lineGap: -1,
    });
    regular().text(lines.slice(1).join("\n"), x, doc.y, {
      width: columnWidth,
      lineGap: -1,
    });
    return doc.y;
  };
  const giverBottom = address("GIVER", receipt.giver, left, 264);
  const recipientBottom = address(
    "MODTAGER",
    receipt.recipient,
    352,
    right - 352,
  );
  bold().text(
    "Beskrivelse",
    left,
    Math.max(giverBottom, recipientBottom) + 18,
    paragraph,
  );
  regular().text(receipt.description[0], left, doc.y, paragraph);
  doc.text(receipt.description[1], left, doc.y + 15, {
    ...paragraph,
    width: 410,
  });

  const amountX = 424;
  const amountWidth = right - amountX - 18;
  const amountOptions = { width: amountWidth, align: "right" as const };
  const tableHeader = (y: number) => {
    rule(y);
    bold(16).text("Formål", left, y + 14, { width: 300 });
    doc.text("Beløb", amountX, y + 14, amountOptions);
    rule(y + 47);
    return y + 62;
  };

  let y = tableHeader(Math.max(412 + headerOffset, doc.y + 23));
  for (const [index, { label, amount, indented }] of receipt.rows.entries()) {
    const labelX = left + (indented ? 18 : 0);
    const labelOptions = { width: amountX - labelX - 12, lineGap: 2 };
    const rowHeight = Math.max(
      29,
      regular(13).heightOfString(label, labelOptions) + 7,
    );
    const nextRow = receipt.rows[index + 1];
    const nextRowHeight =
      !amount && nextRow?.indented
        ? Math.max(
            29,
            regular(13).heightOfString(nextRow.label, {
              ...labelOptions,
              width: labelOptions.width - 18,
            }) + 7,
          )
        : 0;
    if (y + rowHeight + nextRowHeight > bottom) {
      doc.addPage();
      y = tableHeader(60);
    }
    regular(13).text(label, labelX, y, labelOptions);
    if (amount) doc.text(amount, amountX, y, amountOptions);
    y += rowHeight;
  }

  if (doc.page === firstPage) y = Math.max(y, 590 + headerOffset);
  if (y + 44 > bottom) {
    doc.addPage();
    y = tableHeader(60);
  }
  rule(y + 2);
  bold(16).text("TOTAL", left, y + 17, { width: 300 });
  const totalBottom = doc.y;
  regular(13).text(receipt.total, amountX, y + 19, amountOptions);

  const footerGap = 31;
  const footerY = totalBottom + footerGap;
  const notesLayout = { ...paragraph, width: 455 };
  const notesHeight = regular().heightOfString(receipt.notes, notesLayout);
  const footerHeight =
    notesHeight + footerGap + bold(20).currentLineHeight(true);
  regular();
  const nextPage = footerY + footerHeight > bottom;
  if (nextPage) doc.addPage();
  doc.text(receipt.notes, left, nextPage ? 60 : footerY, notesLayout);
  bold(20);
  const thankYouY = doc.y + footerGap;
  const heartX = left + doc.widthOfString(receipt.thankYou) + 12;
  doc.text(receipt.thankYou, left, thankYouY, { width });
  doc
    .save()
    .translate(heartX, thankYouY)
    .path(
      "M 12 22 C 10 20 0 14 0 7 C 0 0 8 -2 12 4 C 16 -2 24 0 24 7 C 24 14 14 20 12 22 Z",
    )
    .fill("#009a70")
    .restore();
  doc.end();
  return result;
}
