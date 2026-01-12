const Joi = require('joi');
const { Specialite, Filiere, Cycle, Classe } = require('../models');

const createSpecialite = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(100).required(),
    filiere_id: Joi.number().integer().required(),
    cycle_id: Joi.number().integer().required(),
    annee: Joi.number().integer().min(1).max(3).required(),
    description: Joi.string().optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { nom, filiere_id, cycle_id, annee, description } = value;

    // Vérifier que la filière existe
    const filiere = await Filiere.findByPk(filiere_id);
    if (!filiere) {
      return res.status(404).json({
        success: false,
        message: 'Filière introuvable'
      });
    }

    // Vérifier que le cycle existe
    const cycle = await Cycle.findByPk(cycle_id);
    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Cycle introuvable'
      });
    }

    // Vérifier si la spécialité existe déjà
    const specialiteExists = await Specialite.findOne({
      where: { nom, filiere_id, cycle_id }
    });
    if (specialiteExists) {
      return res.status(400).json({
        success: false,
        message: 'Cette spécialité existe déjà pour cette filière et ce cycle'
      });
    }

    const specialite = await Specialite.create({
      nom,
      filiere_id,
      cycle_id,
      annee,
      description
    });

    // Récupérer avec les relations
    const specialiteComplete = await Specialite.findByPk(specialite.id, {
      include: [
        { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
        { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
      ]
    });

    console.log(`[Specialites] Spécialité créée - ID: ${specialite.id}, Nom: ${nom}`);

    return res.status(201).json({
      success: true,
      message: 'Spécialité créée avec succès',
      data: { specialite: specialiteComplete }
    });

  } catch (error) {
    console.error('[Specialites] Erreur createSpecialite:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la spécialité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllSpecialites = async (req, res) => {
  try {
    const { filiere_id, cycle_id, annee } = req.query;

    // Construire les conditions de filtrage
    const where = {};
    if (filiere_id) where.filiere_id = filiere_id;
    if (cycle_id) where.cycle_id = cycle_id;
    if (annee) where.annee = annee;

    const specialites = await Specialite.findAll({
      where,
      include: [
        { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
        { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] },
        {
          model: Classe,
          as: 'classes',
          attributes: ['id', 'nom', 'annee_scolaire']
        }
      ],
      order: [
        ['filiere_id', 'ASC'],
        ['cycle_id', 'ASC'],
        ['annee', 'ASC'],
        ['nom', 'ASC']
      ]
    });

    return res.status(200).json({
      success: true,
      data: {
        specialites,
        total: specialites.length
      }
    });

  } catch (error) {
    console.error('[Specialites] Erreur getAllSpecialites:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des spécialités',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const getSpecialiteById = async (req, res) => {
  try {
    const { id } = req.params;

    const specialite = await Specialite.findByPk(id, {
      include: [
        { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
        { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] },
        {
          model: Classe,
          as: 'classes',
          attributes: ['id', 'nom', 'annee_scolaire']
        }
      ]
    });

    if (!specialite) {
      return res.status(404).json({
        success: false,
        message: 'Spécialité introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      data: { specialite }
    });

  } catch (error) {
    console.error('[Specialites] Erreur getSpecialiteById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la spécialité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateSpecialite = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(100).optional(),
    filiere_id: Joi.number().integer().optional(),
    cycle_id: Joi.number().integer().optional(),
    annee: Joi.number().integer().min(1).max(3).optional(),
    description: Joi.string().optional()
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
    const { nom, filiere_id, cycle_id, annee, description } = value;

    const specialite = await Specialite.findByPk(id);
    if (!specialite) {
      return res.status(404).json({
        success: false,
        message: 'Spécialité introuvable'
      });
    }

    // Vérifier que la filière existe (si changée)
    if (filiere_id && filiere_id !== specialite.filiere_id) {
      const filiere = await Filiere.findByPk(filiere_id);
      if (!filiere) {
        return res.status(404).json({
          success: false,
          message: 'Filière introuvable'
        });
      }
    }

    // Vérifier que le cycle existe (si changé)
    if (cycle_id && cycle_id !== specialite.cycle_id) {
      const cycle = await Cycle.findByPk(cycle_id);
      if (!cycle) {
        return res.status(404).json({
          success: false,
          message: 'Cycle introuvable'
        });
      }
    }

    await specialite.update({ nom, filiere_id, cycle_id, annee, description });

    // Récupérer avec les relations
    const specialiteComplete = await Specialite.findByPk(id, {
      include: [
        { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
        { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
      ]
    });

    console.log(`[Specialites] Spécialité modifiée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Spécialité modifiée avec succès',
      data: { specialite: specialiteComplete }
    });

  } catch (error) {
    console.error('[Specialites] Erreur updateSpecialite:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la spécialité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const deleteSpecialite = async (req, res) => {
  try {
    const { id } = req.params;

    const specialite = await Specialite.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classes'
        }
      ]
    });

    if (!specialite) {
      return res.status(404).json({
        success: false,
        message: 'Spécialité introuvable'
      });
    }

    // Vérifier s'il y a des classes liées
    if (specialite.classes && specialite.classes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer cette spécialité car des classes y sont liées',
        data: {
          nombre_classes: specialite.classes.length
        }
      });
    }

    await specialite.destroy();

    console.log(`[Specialites] Spécialité supprimée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Spécialité supprimée avec succès'
    });

  } catch (error) {
    console.error('[Specialites] Erreur deleteSpecialite:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la spécialité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createSpecialite,
  getAllSpecialites,
  getSpecialiteById,
  updateSpecialite,
  deleteSpecialite
};