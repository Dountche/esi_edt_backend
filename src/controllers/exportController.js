const { genererExcelEmploiTemps, genererExcelMaquette } = require('../services/exportService');
const { EmploiTemps, Classe } = require('../models');

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
    // if (req.user.role === 'RUP' && emploiTemps.classe.rup_id !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Accès refusé.'
    //   });
    // }

    // if (req.user.role === 'ETUDIANT') {
    //   const { Etudiant } = require('../models');
    //   const etudiant = await Etudiant.findOne({
    //     where: { user_id: req.user.id }
    //   });

    //   if (!etudiant || etudiant.classe_id !== emploiTemps.classe_id) {
    //     return res.status(403).json({
    //       success: false,
    //       message: 'Accès refusé.'
    //     });
    //   }
    // }

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
    // if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Accès refusé.'
    //   });
    // }

    // if (req.user.role === 'ETUDIANT') {
    //   const { Etudiant } = require('../models');
    //   const etudiant = await Etudiant.findOne({
    //     where: { user_id: req.user.id }
    //   });

    //   if (!etudiant || etudiant.classe_id !== parseInt(classe_id)) {
    //     return res.status(403).json({
    //       success: false,
    //       message: 'Accès refusé.'
    //     });
    //   }
    // }

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

    // Pour l'instant, retourner un message d'information
    // L'implémentation complète du PDF nécessite une bibliothèque comme PDFKit ou Puppeteer
    return res.status(501).json({
      success: false,
      message: 'Export PDF en cours de développement. Utilisez l\'export Excel pour le moment.'
    });

    // Implémenter l'export PDF avec PDFKit ou Puppeteer

  } catch (error) {
    console.error('[Exports] Erreur exporterEmploiTempsPDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const exporterMaquettePDF = async (req, res) => {
  try {
    const { classe_id } = req.params;

    // Pour l'instant, retourner un message d'information
    return res.status(501).json({
      success: false,
      message: 'Export PDF en cours de développement. Utilisez l\'export Excel pour le moment.'
    });

    // ici Implémenter l'export PDF

  } catch (error) {
    console.error('[Exports] Erreur exporterMaquettePDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  exporterEmploiTempsExcel,
  exporterMaquetteExcel,
  exporterEmploiTempsPDF,
  exporterMaquettePDF
};