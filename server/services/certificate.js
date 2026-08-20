import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.join(__dirname, '..', 'uploads', 'certificates');

if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

/**
 * Generate a printable PDF certificate for a passed exam result.
 * Returns a public URL path under /uploads/certificates/
 */
export const generateCertificate = ({
  studentName,
  examTitle,
  percentage,
  grade,
  date,
  institution = 'ExamAI Academy',
}) =>
  new Promise((resolve, reject) => {
    const filename = `cert-${Date.now()}-${Math.round(Math.random() * 1e6)}.pdf`;
    const filePath = path.join(certDir, filename);
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(3).stroke('#0f766e');
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(1).stroke('#14b8a6');

    doc
      .fillColor('#0f766e')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('ExamAI', 0, 70, { align: 'center' });

    doc
      .fillColor('#64748b')
      .fontSize(12)
      .font('Helvetica')
      .text('CERTIFICATE OF ACHIEVEMENT', 0, 110, { align: 'center' });

    doc
      .fillColor('#0c1a17')
      .fontSize(14)
      .text('This certifies that', 0, 160, { align: 'center' });

    doc
      .fillColor('#0f766e')
      .fontSize(32)
      .font('Helvetica-Bold')
      .text(studentName, 0, 190, { align: 'center' });

    doc
      .fillColor('#334155')
      .fontSize(14)
      .font('Helvetica')
      .text(`has successfully passed`, 0, 240, { align: 'center' });

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#0c1a17')
      .text(examTitle, 0, 270, { align: 'center' });

    doc
      .fontSize(13)
      .font('Helvetica')
      .fillColor('#475569')
      .text(`Score: ${percentage}%  ·  Grade: ${grade}`, 0, 310, { align: 'center' });

    doc
      .fontSize(11)
      .fillColor('#94a3b8')
      .text(`${institution}  ·  ${date}`, 0, 360, { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(`/uploads/certificates/${filename}`));
    stream.on('error', reject);
  });

export default { generateCertificate };
