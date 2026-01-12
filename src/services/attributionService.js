const { Attribution, Professeur, Matiere, Classe, Semestre, UniteEnseignement } = require('../models');

/**
 * Vérifier si une attribution existe déjà
 */
const verifierAttributionExiste = async (professeur_id, matiere_id, classe_id, semestre_id, transaction = null) => {
  const attributionExiste = await Attribution.findOne({
    where: {
      professeur_id,
      matiere_id,
      classe_id,
      semestre_id
    },
    transaction
  });

  return attributionExiste !== null;
};

/**
 * Vérifier que la matière appartient bien à la classe
 */
const verifierMatiereAppartientClasse = async (matiere_id, classe_id, transaction = null) => {
  const matiere = await Matiere.findByPk(matiere_id, {
    include: [
      {
        model: UniteEnseignement,
        as: 'unite_enseignement',
        attributes: ['classe_id']
      }
    ],
    transaction
  });

  if (!matiere) {
    return { valide: false, message: 'Matière introuvable' };
  }

  if (matiere.unite_enseignement.classe_id !== classe_id) {
    return { valide: false, message: 'Cette matière n\'appartient pas à la classe spécifiée' };
  }

  return { valide: true };
};

/**
 * Récupérer toutes les attributions d'un professeur pour un semestre
 */
const getAttributionsProfesseur = async (professeur_id, semestre_id = null) => {
  const where = { professeur_id };
  if (semestre_id) where.semestre_id = semestre_id;

  const attributions = await Attribution.findAll({
    where,
    include: [
      {
        model: Matiere,
        as: 'matiere',
        attributes: ['id', 'nom', 'code', 'volume_horaire']
      },
      {
        model: Classe,
        as: 'classe',
        attributes: ['id', 'nom']
      },
      {
        model: Semestre,
        as: 'semestre',
        attributes: ['id', 'nom', 'actif']
      }
    ]
  });

  return attributions;
};

module.exports = {
  verifierAttributionExiste,
  verifierMatiereAppartientClasse,
  getAttributionsProfesseur
};