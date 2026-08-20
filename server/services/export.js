import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportsDir = path.join(__dirname, '..', 'uploads', 'reports');

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

export const exportToCSV = (rows, filename) => {
  if (!rows.length) return null;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const filePath = path.join(reportsDir, filename);
  fs.writeFileSync(filePath, csv);
  return `/uploads/reports/${filename}`;
};

export const exportToExcel = async (rows, filename, sheetName = 'Report') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (rows.length) {
    sheet.columns = Object.keys(rows[0]).map((key) => ({
      header: key,
      key,
      width: 20,
    }));
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true };
  }

  const filePath = path.join(reportsDir, filename);
  await workbook.xlsx.writeFile(filePath);
  return `/uploads/reports/${filename}`;
};

export const exportToPDF = (title, rows, filename) =>
  new Promise((resolve, reject) => {
    const filePath = path.join(reportsDir, filename);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    if (rows.length) {
      const headers = Object.keys(rows[0]);
      doc.fontSize(11).fillColor('#000').text(headers.join(' | '));
      doc.moveDown(0.5);
      rows.forEach((row) => {
        doc.fontSize(9).text(headers.map((h) => row[h] ?? '').join(' | '));
      });
    } else {
      doc.text('No data available.');
    }

    doc.end();
    stream.on('finish', () => resolve(`/uploads/reports/${filename}`));
    stream.on('error', reject);
  });

export default { exportToCSV, exportToExcel, exportToPDF };
