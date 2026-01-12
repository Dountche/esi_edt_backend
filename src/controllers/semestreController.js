const Joi = require('joi');
const { Semestre, EmploiTemps, Attribution } = require('../models');

const createSemestre = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(50).required(),
    date_debut: Joi.date().required(),
    date_fin: Joi.date().greater(Joi.ref('date_debut')).required()
      .messages({
        'date.greater': 'La date de fin doit être postérieure à la date de début'
      }),
    annee_scolaire: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
      .messages({
        'string.pattern.base': 'L\'année scolaire doit être au format YYYY-YYYY (ex: 2024-2025)'
      }),
    actif: Joi.boolean().optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { nom, date_debut, date_fin, annee_scolaire, actif } = value;

    // Vérifier si le semestre existe déjà
    const semestreExists = await Semestre.findOne({
      where: { nom, annee_scolaire }
    });

    if (semestreExists) {
      return res.status(400).json({
        success: false,
        message: 'Ce semestre existe déjà pour cette année scolaire'
      });
    }

    // Si actif = true, désactiver tous les autres semestres
    if (actif) {
      await Semestre.update(
        { actif: false },
        { where: { actif: true } }
      );
    }

    const semestre = await Semestre.create({
      nom,
      date_debut,
      date_fin,
      annee_scolaire,
      actif: actif !== undefined ? actif : false
    });

    console.log(`[Semestres] Semestre créé - ID: ${semestre.id}, Nom: ${nom}, Actif: ${semestre.actif}`);

    return res.status(201).json({
      success: true,
      message: 'Semestre créé avec succès',
      data: { semestre }
    });

  } catch (error) {
    console.error('[Semestres] Erreur createSemestre:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du semestre',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllSemestres = async (req, res) => {
  try {
    const { actif, annee_scolaire } = req.query;

    // Construire les conditions de filtrage
    const where = {};
    if (actif !== undefined) where.actif = actif === 'true';
    if (annee_scolaire) where.annee_scolaire = annee_scolaire;

    const semestres = await Semestre.findAll({
      where,
      order: [
        ['annee_scolaire', 'DESC'],
        ['date_debut', 'DESC']
      ]
    });

    return res.status(200).json({
      success: true,
      data: {
        semestres,
        total: semestres.length
      }
    });

  } catch (error) {
    console.error('[Semestres] Erreur getAllSemestres:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des semestres',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getSemestreActif = async (req, res) => {
  try {
    const semestre = await Semestre.findOne({
      where: { actif: true }
    });

    if (!semestre) {
      return res.status(404).json({
        success: false,
        message: 'Aucun semestre actif trouvé'
      });
    }

    return res.status(200).json({
      success: true,
      data: { semestre }
    });

  } catch (error) {
    console.error('[Semestres] Erreur getSemestreActif:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du semestre actif',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getSemestreById = async (req, res) => {
  try {
    const { id } = req.params;

    const semestre = await Semestre.findByPk(id);

    if (!semestre) {
      return res.status(404).json({
        success: false,
        message: 'Semestre introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      data: { semestre }
    });

  } catch (error) {
    console.error('[Semestres] Erreur getSemestreById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du semestre',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateSemestre = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(50).optional(),
    date_debut: Joi.date().optional(),
    date_fin: Joi.date().optional(),
    annee_scolaire: Joi.string().pattern(/^\d{4}-\d{4}$/).optional(),
    actif: Joi.boolean().optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { id } = req.params;
    const { nom, date_debut, date_fin, annee_scolaire, actif } = value;

    const semestre = await Semestre.findByPk(id);
    if (!semestre) {
      return res.status(404).json({
        success: false,
        message: 'Semestre introuvable'
      });
    }

    // Vérifier que date_fin > date_debut si les deux sont fournies
    const newDateDebut = date_debut || semestre.date_debut;
    const newDateFin = date_fin || semestre.date_fin;

    if (new Date(newDateFin) <= new Date(newDateDebut)) {
      return res.status(400).json({
        success: false,
        message: 'La date de fin doit être postérieure à la date de début'
      });
    }

    // Si on active ce semestre, désactiver tous les autres
    if (actif === true && !semestre.actif) {
      await Semestre.update(
        { actif: false },
        { where: { actif: true } }
      );
    }

    await semestre.update({ nom, date_debut, date_fin, annee_scolaire, actif });

    console.log(`[Semestres] Semestre modifié - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Semestre modifié avec succès',
      data: { semestre }
    });

  } catch (error) {
    console.error('[Semestres] Erreur updateSemestre:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du semestre',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const activerSemestre = async (req, res) => {
  try {
    const { id } = req.params;

    const semestre = await Semestre.findByPk(id);
    if (!semestre) {
      return res.status(404).json({
        success: false,
        message: 'Semestre introuvable'
      });
    }

    // Désactiver tous les semestres
    await Semestre.update(
      { actif: false },
      { where: { actif: true } }
    );

    // Activer le semestre demandé
    await semestre.update({ actif: true });

    console.log(`[Semestres] Semestre activé - ID: ${id}, Nom: ${semestre.nom}`);

    return res.status(200).json({
      success: true,
      message: 'Semestre activé avec succès',
      data: { semestre }
    });

  } catch (error) {
    console.error('[Semestres] Erreur activerSemestre:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'activation du semestre',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteSemestre = async (req, res) => {
  try {
    const { id } = req.params;

    const semestre = await Semestre.findByPk(id, {
      include: [
        { model: EmploiTemps, as: 'emplois_temps' },
        { model: Attribution, as: 'attributions' }
      ]
    });

    if (!semestre) {
      return res.status(404).json({
        success: false,
        message: 'Semestre introuvable'
      });
    }

    // Vérifier s'il y a des emplois du temps liés
    if (semestre.emplois_temps && semestre.emplois_temps.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer ce semestre car des emplois du temps y sont liés',
        data: {
          nombre_emplois_temps: semestre.emplois_temps.length
        }
      });
    }

    // Vérifier s'il y a des attributions liées
    if (semestre.attributions && semestre.attributions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer ce semestre car des attributions y sont liées',
        data: {
          nombre_attributions: semestre.attributions.length
        }
      });
    }

    await semestre.destroy();

    console.log(`[Semestres] Semestre supprimé - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Semestre supprimé avec succès'
    });

  } catch (error) {
    console.error('[Semestres] Erreur deleteSemestre:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du semestre',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createSemestre,
  getAllSemestres,
  getSemestreActif,
  getSemestreById,
  updateSemestre,
  activerSemestre,
  deleteSemestre
};