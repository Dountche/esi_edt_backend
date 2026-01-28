const PDFDocument = require("pdfkit-table");

/**
 * Générer un PDF à partir d'une grille de données
 * Structure de data: { title: string, headers: string[], rows: string[][], colors?: string[][] }
 */
const genererPDFTable = async (data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', err => reject(err));

            // Titre Premium
            doc.font("Helvetica-Bold").fontSize(14).text(data.title.toUpperCase(), { align: 'center' });
            doc.moveDown();

            const table = {
                headers: data.headers.map(h => ({ label: h, property: h, width: 45, renderer: null })),
                rows: data.rows.map(row => {
                    return row.map(cell => {
                        if (typeof cell === 'object' && cell !== null) {
                            return { label: cell.text, options: { columnColor: cell.color ? '#' + cell.color.substring(2) : null } };
                        }
                        return cell;
                    });
                })
            };

            doc.table(table, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(7);
                },
            });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

const genererPDFTableBatch = async (items) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', err => reject(err));

            items.forEach((item, index) => {
                if (index > 0) doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });

                doc.font("Helvetica-Bold").fontSize(14).text(item.title.toUpperCase(), { align: 'center' });
                doc.moveDown();

                const table = {
                    headers: item.headers,
                    rows: item.rows.map(row => {
                        return row.map(cell => {
                            if (typeof cell === 'object' && cell !== null) {
                                return { label: cell.text, options: { columnColor: cell.color ? '#' + cell.color.substring(2) : null } };
                            }
                            return cell;
                        });
                    })
                };

                doc.table(table, {
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.font("Helvetica").fontSize(7);
                    },
                });
            });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { genererPDFTable, genererPDFTableBatch };
