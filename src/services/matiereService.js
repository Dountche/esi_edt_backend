const { UniteEnseignement, Matiere } = require('../models');
const { Op } = require('sequelize');

// Recalculer les totaux d'une UE (coefficients, crédits, volume horaire)
 
const recalculerTotauxUE = async (ue_id, transaction = null) => {
  try {
    const ue = await UniteEnseignement.findByPk(ue_id, { transaction });

    if (!ue) {
      throw new Error('UE introuvable');
    }

    // Récupérer toutes les matières de l'UE
    const matieres = await Matiere.findAll({
      where: { ue_id },
      transaction
    });

    // Calculer les totaux
    let coefficient_total = 0;
    let volume_horaire_total = 0;

    matieres.forEach(matiere => {
      coefficient_total += parseFloat(matiere.coefficient) || 0;
      volume_horaire_total += parseInt(matiere.volume_horaire) || 0;
    });

    // Mettre à jour l'UE
    await ue.update(
      {
        coefficient_total,
        volume_horaire_total
      },
      { transaction }
    );

    console.log(`[MatiereService] Totaux UE recalculés - UE ID: ${ue_id}, Coef: ${coefficient_total}, Vol: ${volume_horaire_total}`);

    return { coefficient_total, volume_horaire_total };

  } catch (error) {
    console.error('[MatiereService] Erreur recalculerTotauxUE:', error);
    throw error;
  }
};

module.exports = {
  recalculerTotauxUE
};