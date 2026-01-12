const Joi = require('joi');
const { Cycle, Specialite } = require('../models');

const createCycle = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(10).required(),
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

    // Vérifier si le cycle existe déjà
    const cycleExists = await Cycle.findOne({ where: { nom } });
    if (cycleExists) {
      return res.status(400).json({
        success: false,
        message: 'Ce cycle existe déjà'
      });
    }

    const cycle = await Cycle.create({ nom, description });

    console.log(`[Cycles] Cycle créé - ID: ${cycle.id}, Nom: ${nom}`);

    return res.status(201).json({
      success: true,
      message: 'Cycle créé avec succès',
      data: { cycle }
    });

  } catch (error) {
    console.error('[Cycles] Erreur createCycle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du cycle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllCycles = async (req, res) => {
  try {
    const cycles = await Cycle.findAll({
      include: [
        {
          model: Specialite,
          as: 'specialites',
          attributes: ['id', 'nom', 'annee']
        }
      ],
      order: [['nom', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        cycles,
        total: cycles.length
      }
    });

  } catch (error) {
    console.error('[Cycles] Erreur getAllCycles:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des cycles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getCycleById = async (req, res) => {
  try {
    const { id } = req.params;

    const cycle = await Cycle.findByPk(id, {
      include: [
        {
          model: Specialite,
          as: 'specialites',
          attributes: ['id', 'nom', 'annee', 'filiere_id']
        }
      ]
    });

    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Cycle introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      data: { cycle }
    });

  } catch (error) {
    console.error('[Cycles] Erreur getCycleById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du cycle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateCycle = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(10).optional(),
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

    const cycle = await Cycle.findByPk(id);
    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Cycle introuvable'
      });
    }

    // Vérifier si le nouveau nom existe déjà
    if (nom && nom !== cycle.nom) {
      const nomExists = await Cycle.findOne({ where: { nom } });
      if (nomExists) {
        return res.status(400).json({
          success: false,
          message: 'Ce nom de cycle existe déjà'
        });
      }
    }

    await cycle.update({ nom, description });

    console.log(`[Cycles] Cycle modifié - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Cycle modifié avec succès',
      data: { cycle }
    });

  } catch (error) {
    console.error('[Cycles] Erreur updateCycle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du cycle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteCycle = async (req, res) => {
  try {
    const { id } = req.params;

    const cycle = await Cycle.findByPk(id, {
      include: [
        {
          model: Specialite,
          as: 'specialites'
        }
      ]
    });

    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Cycle introuvable'
      });
    }

    // Vérifier s'il y a des spécialités liées
    if (cycle.specialites && cycle.specialites.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer ce cycle car des spécialités y sont liées',
        data: {
          nombre_specialites: cycle.specialites.length
        }
      });
    }

    await cycle.destroy();

    console.log(`[Cycles] Cycle supprimé - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Cycle supprimé avec succès'
    });

  } catch (error) {
    console.error('[Cycles] Erreur deleteCycle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du cycle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createCycle,
  getAllCycles,
  getCycleById,
  updateCycle,
  deleteCycle
};