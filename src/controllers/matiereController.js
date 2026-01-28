const Joi = require('joi');
const { Matiere, UniteEnseignement, Classe, Attribution } = require('../models');
const { recalculerTotauxUE } = require('../services/matiereService');
const { sequelize } = require('../models');

const createMatiere = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(200).required(),
    code: Joi.string().min(2).max(20).required(),
    ue_id: Joi.number().integer().required(),
    coefficient: Joi.number().min(0).required(),
    volume_horaire: Joi.number().integer().min(0).required(),
    periode: Joi.string().max(100).optional(),
    dfr_id: Joi.number().integer().optional().allow(null)
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  // Utiliser une transaction pour garantir la cohérence
  const transaction = await sequelize.transaction();

  try {
    const { nom, code, ue_id, coefficient, volume_horaire, periode, dfr_id } = value;

    // Vérifier que l'UE existe
    const ue = await UniteEnseignement.findByPk(ue_id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id', 'nom']
        }
      ],
      transaction
    });

    if (!ue) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'UE introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && ue.classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez créer des matières que pour les UE de vos propres classes.'
      });
    }

    // Vérifier si la matière existe déjà
    const matiereExists = await Matiere.findOne({
      where: { code, ue_id },
      transaction
    });

    if (matiereExists) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Une matière avec ce code existe déjà pour cette UE'
      });
    }

    // Créer la matière
    const matiere = await Matiere.create(
      {
        nom,
        code,
        ue_id,
        coefficient,
        volume_horaire,
        periode,
        dfr_id
      },
      { transaction }
    );

    // Recalculer les totaux de l'UE
    await recalculerTotauxUE(ue_id, transaction);

    // Commit de la transaction
    await transaction.commit();

    // Récupérer avec les relations
    const matiereComplete = await Matiere.findByPk(matiere.id, {
      include: [
        {
          model: UniteEnseignement,
          as: 'unite_enseignement',
          attributes: ['id', 'code', 'nom', 'coefficient_total', 'volume_horaire_total'],
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'nom']
            }
          ]
        }
      ]
    });

    console.log(`[Matieres] Matière créée - ID: ${matiere.id}, Code: ${code}, UE: ${ue.nom}`);

    return res.status(201).json({
      success: true,
      message: 'Matière créée avec succès',
      data: { matiere: matiereComplete }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Matieres] Erreur createMatiere:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la matière',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllMatieres = async (req, res) => {
  try {
    const { ue_id, classe_id } = req.query;

    if (!ue_id && !classe_id) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre ue_id ou classe_id est requis'
      });
    }

    let where = {};
    let includeClasse = [];

    if (ue_id) {
      where.ue_id = ue_id;

      // Vérifier que l'UE existe et les permissions
      const ue = await UniteEnseignement.findByPk(ue_id, {
        include: [
          {
            model: Classe,
            as: 'classe',
            attributes: ['id', 'rup_id']
          }
        ]
      });

      if (!ue) {
        return res.status(404).json({
          success: false,
          message: 'UE introuvable'
        });
      }

      if (req.user.role === 'RUP' && ue.classe.rup_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé.'
        });
      }
    } else if (classe_id) {
      // Récupérer toutes les UE de la classe
      const ues = await UniteEnseignement.findAll({
        where: { classe_id },
        attributes: ['id']
      });

      const ueIds = ues.map(ue => ue.id);
      where.ue_id = ueIds;

      // Vérifier les permissions
      const classe = await Classe.findByPk(classe_id);
      if (!classe) {
        return res.status(404).json({
          success: false,
          message: 'Classe introuvable'
        });
      }

      if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé.'
        });
      }
    }

    const matieres = await Matiere.findAll({
      where,
      include: [
        {
          model: UniteEnseignement,
          as: 'unite_enseignement',
          attributes: ['id', 'code', 'nom'],
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: require('../models').DFR,
          as: 'dfr',
          attributes: ['id', 'nom', 'couleur']
        }
      ],
      order: [['code', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        matieres,
        total: matieres.length
      }
    });

  } catch (error) {
    console.error('[Matieres] Erreur getAllMatieres:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des matières',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getMatiereById = async (req, res) => {
  try {
    const { id } = req.params;

    const matiere = await Matiere.findByPk(id, {
      include: [
        {
          model: UniteEnseignement,
          as: 'unite_enseignement',
          attributes: ['id', 'code', 'nom', 'coefficient_total', 'volume_horaire_total'],
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'nom', 'rup_id']
            }
          ]
        },
        {
          model: Attribution,
          as: 'attributions',
          attributes: ['id', 'professeur_id', 'classe_id', 'semestre_id']
        }
      ]
    });

    if (!matiere) {
      return res.status(404).json({
        success: false,
        message: 'Matière introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && matiere.unite_enseignement.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    return res.status(200).json({
      success: true,
      data: { matiere }
    });

  } catch (error) {
    console.error('[Matieres] Erreur getMatiereById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la matière',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateMatiere = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(200).optional(),
    code: Joi.string().min(2).max(20).optional(),
    coefficient: Joi.number().min(0).optional(),
    volume_horaire: Joi.number().integer().min(0).optional(),
    periode: Joi.string().max(100).optional(),
    dfr_id: Joi.number().integer().optional().allow(null)
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { nom, code, coefficient, volume_horaire, periode, dfr_id } = value;

    const matiere = await Matiere.findByPk(id, {
      include: [
        {
          model: UniteEnseignement,
          as: 'unite_enseignement',
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'rup_id']
            }
          ]
        }
      ],
      transaction
    });

    if (!matiere) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Matière introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && matiere.unite_enseignement.classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez modifier que les matières de vos propres classes.'
      });
    }

    // Vérifier si le nouveau code existe déjà
    if (code && code !== matiere.code) {
      const codeExists = await Matiere.findOne({
        where: { code, ue_id: matiere.ue_id },
        transaction
      });

      if (codeExists) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Une matière avec ce code existe déjà pour cette UE'
        });
      }
    }

    // Mettre à jour la matière
    await matiere.update(
      { nom, code, coefficient, volume_horaire, periode, dfr_id },
      { transaction }
    );

    // Recalculer les totaux de l'UE si coefficient ou volume_horaire ont changé
    if (coefficient !== undefined || volume_horaire !== undefined) {
      await recalculerTotauxUE(matiere.ue_id, transaction);
    }

    await transaction.commit();

    // Récupérer avec les relations
    const matiereComplete = await Matiere.findByPk(id, {
      include: [
        {
          model: UniteEnseignement,
          as: 'unite_enseignement',
          attributes: ['id', 'code', 'nom', 'coefficient_total', 'volume_horaire_total']
        }
      ]
    });

    console.log(`[Matieres] Matière modifiée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Matière modifiée avec succès',
      data: { matiere: matiereComplete }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Matieres] Erreur updateMatiere:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la matière',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteMatiere = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const matiere = await Matiere.findByPk(id, {
      include: [
        {
          model: UniteEnseignement,
          as: 'unite_enseignement',
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'rup_id']
            }
          ]
        },
        {
          model: Attribution,
          as: 'attributions'
        }
      ],
      transaction
    });

    if (!matiere) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Matière introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && matiere.unite_enseignement.classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez supprimer que les matières de vos propres classes.'
      });
    }

    // Vérifier s'il y a des attributions liées
    if (matiere.attributions && matiere.attributions.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer cette matière car des attributions y sont liées',
        data: {
          nombre_attributions: matiere.attributions.length
        }
      });
    }

    const ue_id = matiere.ue_id;

    // Supprimer la matière
    await matiere.destroy({ transaction });

    // Recalculer les totaux de l'UE
    await recalculerTotauxUE(ue_id, transaction);

    await transaction.commit();

    console.log(`[Matieres] Matière supprimée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Matière supprimée avec succès'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Matieres] Erreur deleteMatiere:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la matière',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createMatiere,
  getAllMatieres,
  getMatiereById,
  updateMatiere,
  deleteMatiere
};