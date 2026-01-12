const Joi = require('joi');
const { Creneau, EmploiTemps, Matiere, Professeur, Salle, Classe, User } = require('../models');
const { sequelize } = require('../models');
const { verifierDisponibilite, verifierAttribution } = require('../services/creneauService');

const createCreneau = async (req, res) => {
  const schema = Joi.object({
    emploi_temps_id: Joi.number().integer().required(),
    jour_semaine: Joi.string().valid('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi').required(),
    heure_debut: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
      .messages({
        'string.pattern.base': 'L\'heure de début doit être au format HH:MM'
      }),
    heure_fin: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
      .messages({
        'string.pattern.base': 'L\'heure de fin doit être au format HH:MM'
      }),
    matiere_id: Joi.number().integer().required(),
    professeur_id: Joi.number().integer().required(),
    salle_id: Joi.number().integer().required(),
    semaine_numero: Joi.number().integer().min(1).max(16).required(),
    type_cours: Joi.string().valid('CM', 'TD', 'TP').required()
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
    const { emploi_temps_id, jour_semaine, heure_debut, heure_fin, matiere_id, professeur_id, salle_id, semaine_numero, type_cours } = value;

    // Vérifier que l'emploi du temps existe
    const emploiTemps = await EmploiTemps.findByPk(emploi_temps_id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id']
        },
        {
          model: require('../models').Semestre,
          as: 'semestre',
          attributes: ['id']
        }
      ],
      transaction
    });

    if (!emploiTemps) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Emploi du temps introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && emploiTemps.classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez ajouter des créneaux que pour les emplois du temps de vos propres classes.'
      });
    }

    // Vérifier que la matière existe
    const matiere = await Matiere.findByPk(matiere_id, { transaction });
    if (!matiere) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Matière introuvable'
      });
    }

    // Vérifier que le professeur existe
    const professeur = await Professeur.findByPk(professeur_id, { transaction });
    if (!professeur) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Professeur introuvable'
      });
    }

    // Vérifier que la salle existe
    const salle = await Salle.findByPk(salle_id, { transaction });
    if (!salle) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Salle introuvable'
      });
    }

    // Vérifier l'attribution (le prof enseigne bien cette matière à cette classe)
    const verificationAttribution = await verifierAttribution(
      matiere_id,
      professeur_id,
      emploiTemps.classe_id,
      emploiTemps.semestre.id,
      transaction
    );

    if (!verificationAttribution.valide) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: verificationAttribution.message
      });
    }

    // Vérifier les disponibilités (pas de conflits)
    const verification = await verifierDisponibilite({
      professeur_id,
      salle_id,
      jour_semaine,
      heure_debut,
      heure_fin,
      semaine_numero,
      emploi_temps_id
    }, null, transaction);

    if (!verification.disponible) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Conflit détecté : créneau non disponible',
        conflits: verification.conflits
      });
    }

    // Créer le créneau
    const creneau = await Creneau.create({
      emploi_temps_id,
      jour_semaine,
      heure_debut,
      heure_fin,
      matiere_id,
      professeur_id,
      salle_id,
      semaine_numero,
      type_cours,
      annule: false
    }, { transaction });

    await transaction.commit();

    // Récupérer avec les relations
    const creneauComplet = await Creneau.findByPk(creneau.id, {
      include: [
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom', 'code']
        },
        {
          model: Professeur,
          as: 'professeur',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'nom', 'prenom']
            }
          ]
        },
        {
          model: Salle,
          as: 'salle',
          attributes: ['id', 'nom', 'type', 'capacite']
        }
      ]
    });

    console.log(`[Creneaux] Créneau créé - ID: ${creneau.id}, ${jour_semaine} ${heure_debut}-${heure_fin}`);

    return res.status(201).json({
      success: true,
      message: 'Créneau créé avec succès',
      data: { creneau: creneauComplet }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Creneaux] Erreur createCreneau:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du créneau',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const verifierDisponibiliteCreneau = async (req, res) => {
  const schema = Joi.object({
    professeur_id: Joi.number().integer().required(),
    salle_id: Joi.number().integer().required(),
    jour_semaine: Joi.string().valid('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi').required(),
    heure_debut: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    heure_fin: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    semaine_numero: Joi.number().integer().min(1).max(16).required(),
    emploi_temps_id: Joi.number().integer().required()
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const verification = await verifierDisponibilite(value);

    return res.status(200).json({
      success: true,
      disponible: verification.disponible,
      conflits: verification.conflits
    });

  } catch (error) {
    console.error('[Creneaux] Erreur verifierDisponibiliteCreneau:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de disponibilité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateCreneau = async (req, res) => {
  const schema = Joi.object({
    jour_semaine: Joi.string().valid('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi').optional(),
    heure_debut: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    heure_fin: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    matiere_id: Joi.number().integer().optional(),
    professeur_id: Joi.number().integer().optional(),
    salle_id: Joi.number().integer().optional(),
    semaine_numero: Joi.number().integer().min(1).max(16).optional(),
    type_cours: Joi.string().valid('CM', 'TD', 'TP').optional(),
    annule: Joi.boolean().optional()
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

    const creneau = await Creneau.findByPk(id, {
      include: [
        {
          model: EmploiTemps,
          as: 'emploi_temps',
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'rup_id']
            },
            {
              model: require('../models').Semestre,
              as: 'semestre',
              attributes: ['id']
            }
          ]
        }
      ],
      transaction
    });

    if (!creneau) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Créneau introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && creneau.emploi_temps.classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    // Si modification des horaires, prof ou salle, vérifier les disponibilités
    if (value.jour_semaine || value.heure_debut || value.heure_fin || value.professeur_id || value.salle_id || value.semaine_numero) {
      const dataVerification = {
        professeur_id: value.professeur_id || creneau.professeur_id,
        salle_id: value.salle_id || creneau.salle_id,
        jour_semaine: value.jour_semaine || creneau.jour_semaine,
        heure_debut: value.heure_debut || creneau.heure_debut,
        heure_fin: value.heure_fin || creneau.heure_fin,
        semaine_numero: value.semaine_numero || creneau.semaine_numero,
        emploi_temps_id: creneau.emploi_temps_id
      };

      const verification = await verifierDisponibilite(dataVerification, id, transaction);

      if (!verification.disponible) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Conflit détecté',
          conflits: verification.conflits
        });
      }
    }

    // Si changement de matière ou professeur, vérifier l'attribution
    if (value.matiere_id || value.professeur_id) {
      const verificationAttribution = await verifierAttribution(
        value.matiere_id || creneau.matiere_id,
        value.professeur_id || creneau.professeur_id,
        creneau.emploi_temps.classe.id,
        creneau.emploi_temps.semestre.id,
        transaction
      );

      if (!verificationAttribution.valide) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: verificationAttribution.message
        });
      }
    }

    await creneau.update(value, { transaction });

    await transaction.commit();

    // Récupérer avec les relations
    const creneauComplet = await Creneau.findByPk(id, {
      include: [
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom', 'code']
        },
        {
          model: Professeur,
          as: 'professeur',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'nom', 'prenom']
            }
          ]
        },
        {
          model: Salle,
          as: 'salle',
          attributes: ['id', 'nom', 'type']
        }
      ]
    });

    console.log(`[Creneaux] Créneau modifié - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Créneau modifié avec succès',
      data: { creneau: creneauComplet }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Creneaux] Erreur updateCreneau:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du créneau',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteCreneau = async (req, res) => {
  try {
    const { id } = req.params;

    const creneau = await Creneau.findByPk(id, {
      include: [
        {
          model: EmploiTemps,
          as: 'emploi_temps',
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'rup_id']
            }
          ]
        }
      ]
    });

    if (!creneau) {
      return res.status(404).json({
        success: false,
        message: 'Créneau introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && creneau.emploi_temps.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    await creneau.destroy();

    console.log(`[Creneaux] Créneau supprimé - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Créneau supprimé avec succès'
    });

  } catch (error) {
    console.error('[Creneaux] Erreur deleteCreneau:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du créneau',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createCreneau,
  verifierDisponibiliteCreneau,
  updateCreneau,
  deleteCreneau
};