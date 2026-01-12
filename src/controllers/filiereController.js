const Joi = require('joi');
const { Filiere, Specialite } = require('../models');

const createFiliere = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(50).required(),
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
    const { nom, description } = value;

    // Vérifier si la filière existe déjà
    const filiereExists = await Filiere.findOne({ where: { nom } });
    if (filiereExists) {
      return res.status(400).json({
        success: false,
        message: 'Cette filière existe déjà'
      });
    }

    const filiere = await Filiere.create({ nom, description });

    console.log(`[Filieres] Filière créée - ID: ${filiere.id}, Nom: ${nom}`);

    return res.status(201).json({
      success: true,
      message: 'Filière créée avec succès',
      data: { filiere }
    });

  } catch (error) {
    console.error('[Filieres] Erreur createFiliere:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la filière',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllFilieres = async (req, res) => {
  try {
    const filieres = await Filiere.findAll({
      include: [
        {
          model: Specialite,
          as: 'specialites',
          attributes: ['id', 'nom', 'annee', 'cycle_id']
        }
      ],
      order: [['nom', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        filieres,
        total: filieres.length
      }
    });

  } catch (error) {
    console.error('[Filieres] Erreur getAllFilieres:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des filières',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getFiliereById = async (req, res) => {
  try {
    const { id } = req.params;

    const filiere = await Filiere.findByPk(id, {
      include: [
        {
          model: Specialite,
          as: 'specialites',
          attributes: ['id', 'nom', 'annee', 'cycle_id']
        }
      ]
    });

    if (!filiere) {
      return res.status(404).json({
        success: false,
        message: 'Filière introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      data: { filiere }
    });

  } catch (error) {
    console.error('[Filieres] Erreur getFiliereById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la filière',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateFiliere = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(50).optional(),
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
    const { nom, description } = value;

    const filiere = await Filiere.findByPk(id);
    if (!filiere) {
      return res.status(404).json({
        success: false,
        message: 'Filière introuvable'
      });
    }

    // Vérifier si le nouveau nom existe déjà
    if (nom && nom !== filiere.nom) {
      const nomExists = await Filiere.findOne({ where: { nom } });
      if (nomExists) {
        return res.status(400).json({
          success: false,
          message: 'Ce nom de filière existe déjà'
        });
      }
    }

    await filiere.update({ nom, description });

    console.log(`[Filieres] Filière modifiée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Filière modifiée avec succès',
      data: { filiere }
    });

  } catch (error) {
    console.error('[Filieres] Erreur updateFiliere:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la filière',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteFiliere = async (req, res) => {
  try {
    const { id } = req.params;

    const filiere = await Filiere.findByPk(id, {
      include: [
        {
          model: Specialite,
          as: 'specialites'
        }
      ]
    });

    if (!filiere) {
      return res.status(404).json({
        success: false,
        message: 'Filière introuvable'
      });
    }

    // Vérifier s'il y a des spécialités liées
    if (filiere.specialites && filiere.specialites.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer cette filière car des spécialités y sont liées',
        data: {
          nombre_specialites: filiere.specialites.length
        }
      });
    }

    await filiere.destroy();

    console.log(`[Filieres] Filière supprimée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Filière supprimée avec succès'
    });

  } catch (error) {
    console.error('[Filieres] Erreur deleteFiliere:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la filière',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createFiliere,
  getAllFilieres,
  getFiliereById,
  updateFiliere,
  deleteFiliere
};