const Joi = require('joi');
const { Salle, Creneau } = require('../models');

const createSalle = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(100).required(),
    capacite: Joi.number().integer().min(1).required(),
    type: Joi.string().valid('Amphi', 'TD', 'TP', 'Labo').required(),
    disponible: Joi.boolean().optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { nom, capacite, type, disponible } = value;

    // Vérifier si la salle existe déjà
    const salleExists = await Salle.findOne({ where: { nom } });
    if (salleExists) {
      return res.status(400).json({
        success: false,
        message: 'Une salle avec ce nom existe déjà'
      });
    }

    const salle = await Salle.create({
      nom,
      capacite,
      type,
      disponible: disponible !== undefined ? disponible : true
    });

    console.log(`[Salles] Salle créée - ID: ${salle.id}, Nom: ${nom}`);

    return res.status(201).json({
      success: true,
      message: 'Salle créée avec succès',
      data: { salle }
    });

  } catch (error) {
    console.error('[Salles] Erreur createSalle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la salle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllSalles = async (req, res) => {
  try {
    const { type, disponible } = req.query;

    // Construire les conditions de filtrage
    const where = {};
    if (type) where.type = type;
    if (disponible !== undefined) where.disponible = disponible === 'true';

    const salles = await Salle.findAll({
      where,
      order: [
        ['type', 'ASC'],
        ['nom', 'ASC']
      ]
    });

    return res.status(200).json({
      success: true,
      data: {
        salles,
        total: salles.length
      }
    });

  } catch (error) {
    console.error('[Salles] Erreur getAllSalles:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des salles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getSalleById = async (req, res) => {
  try {
    const { id } = req.params;

    const salle = await Salle.findByPk(id);

    if (!salle) {
      return res.status(404).json({
        success: false,
        message: 'Salle introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      data: { salle }
    });

  } catch (error) {
    console.error('[Salles] Erreur getSalleById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la salle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateSalle = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(100).optional(),
    capacite: Joi.number().integer().min(1).optional(),
    type: Joi.string().valid('Amphi', 'TD', 'TP', 'Labo').optional(),
    disponible: Joi.boolean().optional()
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
    const { nom, capacite, type, disponible } = value;

    const salle = await Salle.findByPk(id);
    if (!salle) {
      return res.status(404).json({
        success: false,
        message: 'Salle introuvable'
      });
    }

    // Vérifier si le nouveau nom existe déjà
    if (nom && nom !== salle.nom) {
      const nomExists = await Salle.findOne({ where: { nom } });
      if (nomExists) {
        return res.status(400).json({
          success: false,
          message: 'Une salle avec ce nom existe déjà'
        });
      }
    }

    await salle.update({ nom, capacite, type, disponible });

    console.log(`[Salles] Salle modifiée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Salle modifiée avec succès',
      data: { salle }
    });

  } catch (error) {
    console.error('[Salles] Erreur updateSalle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la salle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteSalle = async (req, res) => {
  try {
    const { id } = req.params;

    const salle = await Salle.findByPk(id, {
      include: [
        {
          model: Creneau,
          as: 'creneaux'
        }
      ]
    });

    if (!salle) {
      return res.status(404).json({
        success: false,
        message: 'Salle introuvable'
      });
    }

    // Vérifier s'il y a des créneaux liés
    if (salle.creneaux && salle.creneaux.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer cette salle car des créneaux y sont liés',
        data: {
          nombre_creneaux: salle.creneaux.length
        }
      });
    }

    await salle.destroy();

    console.log(`[Salles] Salle supprimée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Salle supprimée avec succès'
    });

  } catch (error) {
    console.error('[Salles] Erreur deleteSalle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la salle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createSalle,
  getAllSalles,
  getSalleById,
  updateSalle,
  deleteSalle
};