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

            // Préparer les données et les styles
            const cleanRows = [];
            const rowStyles = [];

            data.rows.forEach(row => {
                const cleanRow = [];
                const rowStyle = [];
                row.forEach(cell => {
                    if (typeof cell === 'object' && cell !== null) {
                        cleanRow.push(cell.text);
                        rowStyle.push(cell.color ? '#' + cell.color.substring(2) : null);
                    } else {
                        cleanRow.push(cell);
                        rowStyle.push(null);
                    }
                });
                cleanRows.push(cleanRow);
                rowStyles.push(rowStyle);
            });

            const table = {
                headers: data.headers,
                rows: cleanRows
            };

            doc.table(table, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(7);

                    // Appliquer la couleur de fond si elle existe
                    // Note: indexRow est l'index dans la page courante, il faut faire attention si pagination
                    // Cependant, pdfkit-table ne passe pas l'index global facilement. 
                    // On essaie d'utiliser le fait que l'ordre d'appel correspond aux lignes.
                    // Une approche plus robuste serait de tracker l'index global si nécessaire.
                    // Pour l'instant, supposons que indexRow correspond à l'index dans cleanRows pour une table simple.

                    // Avec pdfkit-table, indexRow est relatif au body.
                    if (indexColumn !== undefined && indexRow !== undefined && rowStyles[indexRow] && rowStyles[indexRow][indexColumn]) {
                        const color = rowStyles[indexRow][indexColumn];
                        // Dessiner le fond (avant le texte)
                        doc.save()
                            .fillColor(color)
                            .rect(rectCell.x, rectCell.y, rectCell.width, rectCell.height)
                            .fill()
                            .restore();

                        // Réinitialiser la couleur du texte à noir/blanc selon le fond (optionnel, pour l'instant noir par défaut via restore)
                        // Pour le texte blanc sur fond foncé, il faudrait le définir après.
                        // doc.fillColor('black');
                    }
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

                // Préparer les données et les styles
                const cleanRows = [];
                const rowStyles = [];

                item.rows.forEach(row => {
                    const cleanRow = [];
                    const rowStyle = [];
                    row.forEach(cell => {
                        if (typeof cell === 'object' && cell !== null) {
                            cleanRow.push(cell.text);
                            rowStyle.push(cell.color ? '#' + cell.color.substring(2) : null);
                        } else {
                            cleanRow.push(cell);
                            rowStyle.push(null);
                        }
                    });
                    cleanRows.push(cleanRow);
                    rowStyles.push(rowStyle);
                });

                const table = {
                    headers: item.headers,
                    rows: cleanRows
                };

                doc.table(table, {
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.font("Helvetica").fontSize(7);

                        if (indexColumn !== undefined && indexRow !== undefined && rowStyles[indexRow] && rowStyles[indexRow][indexColumn]) {
                            const color = rowStyles[indexRow][indexColumn];
                            doc.save()
                                .fillColor(color)
                                .rect(rectCell.x, rectCell.y, rectCell.width, rectCell.height)
                                .fill()
                                .restore();
                        }
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
