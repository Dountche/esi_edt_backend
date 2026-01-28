const { genererExcelEmploiTemps, genererExcelMaquette, genererExcelProfesseur, genererExcelProfesseursBatch } = require('../services/exportService');
const { genererPDFTable, genererPDFTableBatch } = require('../services/pdfService');
const { EmploiTemps, Classe, Professeur, Attribution, User } = require('../models');

const exporterEmploiTempsExcel = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'EDT existe
    const emploiTemps = await EmploiTemps.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'rup_id']
        }
      ]
    });

    if (!emploiTemps) {
      return res.status(404).json({
        success: false,
        message: 'Emploi du temps introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && emploiTemps.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    if (req.user.role === 'ETUDIANT') {
      const { Etudiant } = require('../models');
      const etudiant = await Etudiant.findOne({
        where: { user_id: req.user.id }
      });

      if (!etudiant || etudiant.classe_id !== emploiTemps.classe_id) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé.'
        });
      }
    }

    // Générer le fichier Excel
    const workbook = await genererExcelEmploiTemps(id);

    // Configurer les headers pour le téléchargement
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="EDT_${emploiTemps.classe.nom.replace(/\s/g, '_')}.xlsx"`
    );

    // Envoyer le fichier
    await workbook.xlsx.write(res);
    res.end();

    console.log(`[Exports] EDT Excel exporté - ID: ${id}`);

  } catch (error) {
    console.error('[Exports] Erreur exporterEmploiTempsExcel:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const exporterMaquetteExcel = async (req, res) => {
  try {
    const { classe_id } = req.params;

    // Vérifier que la classe existe
    const classe = await Classe.findByPk(classe_id);
    if (!classe) {
      return res.status(404).json({
        success: false,
        message: 'Classe introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    if (req.user.role === 'ETUDIANT') {
      const { Etudiant } = require('../models');
      const etudiant = await Etudiant.findOne({
        where: { user_id: req.user.id }
      });

      if (!etudiant || etudiant.classe_id !== parseInt(classe_id)) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé.'
        });
      }
    }

    // Générer le fichier Excel
    const workbook = await genererExcelMaquette(classe_id);

    // Configurer les headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Maquette_${classe.nom.replace(/\s/g, '_')}.xlsx"`
    );

    // Envoyer le fichier
    await workbook.xlsx.write(res);
    res.end();

    console.log(`[Exports] Maquette Excel exportée - Classe: ${classe_id}`);

  } catch (error) {
    console.error('[Exports] Erreur exporterMaquetteExcel:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const exporterEmploiTempsPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const emploiTemps = await EmploiTemps.findByPk(id, { include: [{ model: Classe, as: 'classe' }] });
    if (!emploiTemps) return res.status(404).json({ success: false, message: 'Introuvable' });

    if (req.user.role === 'RUP' && emploiTemps.classe.rup_id !== req.user.id) return res.status(403).json({ success: false, message: 'Refusé' });

    const workbook = await genererExcelEmploiTemps(id);
    const worksheet = workbook.getWorksheet(1);

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 3) {
        const rowData = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          const color = cell.fill?.fgColor?.argb;
          const text = cell.value?.toString() || "";
          rowData.push(color ? { text, color } : text);
        });
        rows.push(rowData);
      }
    });

    const pdfBuffer = await genererPDFTable({
      title: `Emploi du Temps - ${emploiTemps.classe.nom}`,
      headers: rows[0].map(h => typeof h === 'object' ? h.text : h),
      rows: rows.slice(1)
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="EDT_${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const exporterMaquettePDF = async (req, res) => {
  try {
    const { classe_id } = req.params;
    const workbook = await genererExcelMaquette(classe_id);
    const worksheet = workbook.getWorksheet(1);

    const rows = [];
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber >= 2) { // Maquette headers at row 2
        const rowData = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          const color = cell.fill?.fgColor?.argb;
          const text = cell.value?.toString() || "";
          rowData.push(color ? { text, color } : text);
        });
        rows.push(rowData);
      }
    });

    const pdfBuffer = await genererPDFTable({
      title: `Maquette Pedagogique - ${classe_id}`,
      headers: rows[0].map(h => typeof h === 'object' ? h.text : h),
      rows: rows.slice(1)
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Maquette_${classe_id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const exporterProfesseurExcel = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'RUP') {
      const teachesInRupClass = await Attribution.findOne({
        where: { professeur_id: id },
        include: [{ model: Classe, as: 'classe', where: { rup_id: req.user.id } }]
      });
      if (!teachesInRupClass) return res.status(403).json({ success: false, message: "Ce professeur n'intervient pas dans vos classes." });
    } else if (req.user.role === 'PROFESSEUR') {
      const prof = await Professeur.findOne({ where: { user_id: req.user.id } });
      if (!prof || prof.id !== parseInt(id)) return res.status(403).json({ success: false, message: "Accès refusé." });
    }

    const workbook = await genererExcelProfesseur(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="EDT_Prof_${id}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const exporterProfesseurPDF = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'RUP') {
      const teachesInRupClass = await Attribution.findOne({
        where: { professeur_id: id },
        include: [{ model: Classe, as: 'classe', where: { rup_id: req.user.id } }]
      });
      if (!teachesInRupClass) return res.status(403).json({ success: false, message: "Ce professeur n'intervient pas dans vos classes." });
    } else if (req.user.role === 'PROFESSEUR') {
      const prof = await Professeur.findOne({ where: { user_id: req.user.id } });
      if (!prof || prof.id !== parseInt(id)) return res.status(403).json({ success: false, message: "Accès refusé. Vous ne pouvez exporter que votre propre emploi du temps." });
    }
    const workbook = await genererExcelProfesseur(id);
    const worksheet = workbook.getWorksheet(1);
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 3) {
        const rowData = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          const color = cell.fill?.fgColor?.argb;
          const text = cell.value?.toString() || "";
          rowData.push(color ? { text, color } : text);
        });
        rows.push(rowData);
      }
    });

    const pdfBuffer = await genererPDFTable({
      title: `Emploi du Temps Professeur`,
      headers: rows[0].map(h => typeof h === 'object' ? h.text : h),
      rows: rows.slice(1)
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="EDT_Prof_${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const exporterProfesseursBatchExcel = async (req, res) => {
  try {
    const classes = await Classe.findAll({ where: { rup_id: req.user.id } });
    const classIds = classes.map(c => c.id);
    const attributions = await Attribution.findAll({
      where: { classe_id: classIds },
      attributes: ['professeur_id']
    });
    const profIds = [...new Set(attributions.map(a => a.professeur_id))];

    // On passe les IDs à genererExcelProfesseursBatch, qui doit gérer des objets {id} ou juste des IDs
    // Modifions genererExcelProfesseursBatch pour accepter une liste d'IDs
    const workbook = await genererExcelProfesseursBatch(profIds.map(id => ({ id })));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="EDT_Profs_Global.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const exporterProfesseursBatchPDF = async (req, res) => {
  try {
    const classes = await Classe.findAll({ where: { rup_id: req.user.id } });
    const classIds = classes.map(c => c.id);
    const attributions = await Attribution.findAll({
      where: { classe_id: classIds },
      attributes: ['professeur_id']
    });
    const profIds = [...new Set(attributions.map(a => a.professeur_id))];

    const pdfItems = [];
    for (const profId of profIds) {
      const workbook = await genererExcelProfesseur(profId);
      const worksheet = workbook.getWorksheet(1);
      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 3) {
          const rowData = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            const color = cell.fill?.fgColor?.argb;
            const text = cell.value?.toString() || "";
            rowData.push(color ? { text, color } : text);
          });
          rows.push(rowData);
        }
      });
      if (rows.length > 1) {
        pdfItems.push({
          title: `Emploi du Temps Professeur - ID: ${profId}`,
          headers: rows[0].map(h => typeof h === 'object' ? h.text : h),
          rows: rows.slice(1)
        });
      }
    }

    if (pdfItems.length === 0) {
      return res.status(404).json({ success: false, message: "Aucun emploi du temps trouvé pour vos professeurs." });
    }

    const pdfBuffer = await genererPDFTableBatch(pdfItems);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="EDT_Profs_Global.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  exporterEmploiTempsExcel,
  exporterMaquetteExcel,
  exporterEmploiTempsPDF,
  exporterMaquettePDF,
  exporterProfesseurExcel,
  exporterProfesseurPDF,
  exporterProfesseursBatchExcel,
  exporterProfesseursBatchPDF
};