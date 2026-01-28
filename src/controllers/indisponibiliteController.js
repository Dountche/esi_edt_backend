const Joi = require('joi');
const { Indisponibilite, Professeur, User, Creneau, EmploiTemps, Classe, Matiere, Salle } = require('../models');
const { sequelize } = require('../models');

/**
 * @desc Déclarer une indisponibilité (Professeur)
 * @route POST /api/indisponibilites
 * @access Private (Professeur uniquement)
 */
const createIndisponibilite = async (req, res) => {
  const schema = Joi.object({
    date: Joi.date().required(),
    heure_debut: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
      .messages({
        'string.pattern.base': 'L\'heure de début doit être au format HH:MM'
      }),
    heure_fin: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
      .messages({
        'string.pattern.base': 'L\'heure de fin doit être au format HH:MM'
      }),
    motif: Joi.string().required()
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { date, heure_debut, heure_fin, motif } = value;

    // Récupérer le professeur connecté
    const professeur = await Professeur.findOne({
      where: { user_id: req.user.id }
    });

    if (!professeur) {
      return res.status(404).json({
        success: false,
        message: 'Profil professeur introuvable'
      });
    }

    // Vérifier que heure_fin > heure_debut
    if (heure_fin <= heure_debut) {
      return res.status(400).json({
        success: false,
        message: 'L\'heure de fin doit être postérieure à l\'heure de début'
      });
    }

    // Créer l'indisponibilité
    const indisponibilite = await Indisponibilite.create({
      professeur_id: professeur.id,
      date,
      heure_debut,
      heure_fin,
      motif,
      statut: 'en_attente'
    });

    // Récupérer les créneaux impactés
    const dateObj = new Date(date);
    const joursMap = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const jourSemaine = joursMap[dateObj.getDay()];

    const creneauxImpactes = await Creneau.findAll({
      where: {
        professeur_id: professeur.id,
        jour_semaine: jourSemaine,
        [sequelize.Op.or]: [
          {
            heure_debut: { [sequelize.Op.lte]: heure_debut },
            heure_fin: { [sequelize.Op.gt]: heure_debut }
          },
          {
            heure_debut: { [sequelize.Op.lt]: heure_fin },
            heure_fin: { [sequelize.Op.gte]: heure_fin }
          },
          {
            heure_debut: { [sequelize.Op.gte]: heure_debut },
            heure_fin: { [sequelize.Op.lte]: heure_fin }
          }
        ]
      },
      include: [
        {
          model: EmploiTemps,
          as: 'emploi_temps',
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom']
        }
      ]
    });

    console.log(`[Indisponibilites] Indisponibilité créée - ID: ${indisponibilite.id}, Prof: ${professeur.id}, Créneaux impactés: ${creneauxImpactes.length}`);

    return res.status(201).json({
      success: true,
      message: 'Indisponibilité déclarée avec succès',
      data: {
        indisponibilite,
        creneaux_impactes: creneauxImpactes.map(c => ({
          id: c.id,
          jour: c.jour_semaine,
          heure_debut: c.heure_debut,
          heure_fin: c.heure_fin,
          classe: c.emploi_temps.classe.nom,
          matiere: c.matiere.nom
        }))
      }
    });

  } catch (error) {
    console.error('[Indisponibilites] Erreur createIndisponibilite:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'indisponibilité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Récupérer toutes les indisponibilités
 * @route GET /api/indisponibilites?statut=en_attente&date=2024-12-15
 * @access Private (Professeur - les siennes, RUP - toutes)
 */
const getAllIndisponibilites = async (req, res) => {
  try {
    const { statut, date, professeur_id } = req.query;

    // Construire les conditions de filtrage
    const where = {};

    if (statut) where.statut = statut;
    if (date) where.date = date;
    if (professeur_id) where.professeur_id = professeur_id;

    // Si Professeur, ne voir que les siennes
    if (req.user.role === 'PROFESSEUR') {
      const professeur = await Professeur.findOne({
        where: { user_id: req.user.id }
      });

      if (!professeur) {
        return res.status(404).json({
          success: false,
          message: 'Profil professeur introuvable'
        });
      }

      where.professeur_id = professeur.id;
    }

    const indisponibilites = await Indisponibilite.findAll({
      where,
      include: [
        {
          model: Professeur,
          as: 'professeur',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'nom', 'prenom', 'email']
            }
          ]
        }
      ],
      order: [['date', 'DESC'], ['heure_debut', 'ASC']]
    });

    // Pour chaque indisponibilité, récupérer les créneaux impactés
    const indisponibilitesWithCreneaux = await Promise.all(
      indisponibilites.map(async (indispo) => {
        const dateObj = new Date(indispo.date);
        const joursMap = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const jourSemaine = joursMap[dateObj.getDay()];

        const creneauxImpactes = await Creneau.findAll({
          where: {
            professeur_id: indispo.professeur_id,
            jour_semaine: jourSemaine,
            [sequelize.Op.or]: [
              {
                heure_debut: { [sequelize.Op.lte]: indispo.heure_debut },
                heure_fin: { [sequelize.Op.gt]: indispo.heure_debut }
              },
              {
                heure_debut: { [sequelize.Op.lt]: indispo.heure_fin },
                heure_fin: { [sequelize.Op.gte]: indispo.heure_fin }
              },
              {
                heure_debut: { [sequelize.Op.gte]: indispo.heure_debut },
                heure_fin: { [sequelize.Op.lte]: indispo.heure_fin }
              }
            ]
          },
          include: [
            {
              model: EmploiTemps,
              as: 'emploi_temps',
              include: [
                {
                  model: Classe,
                  as: 'classe',
                  attributes: ['id', 'nom']
                }
              ]
            },
            {
              model: Matiere,
              as: 'matiere',
              attributes: ['id', 'nom']
            }
          ]
        });

        const indispoJSON = indispo.toJSON();
        return {
          ...indispoJSON,
          creneaux_impactes: creneauxImpactes.map(c => ({
            id: c.id,
            classe: c.emploi_temps.classe.nom,
            matiere: c.matiere.nom
          }))
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        indisponibilites: indisponibilitesWithCreneaux,
        total: indisponibilites.length
      }
    });

  } catch (error) {
    console.error('[Indisponibilites] Erreur getAllIndisponibilites:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des indisponibilités',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Récupérer une indisponibilité par ID
 * @route GET /api/indisponibilites/:id
 * @access Private (Professeur - les siennes, RUP - toutes)
 */
const getIndisponibiliteById = async (req, res) => {
  try {
    const { id } = req.params;

    const indisponibilite = await Indisponibilite.findByPk(id, {
      include: [
        {
          model: Professeur,
          as: 'professeur',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'nom', 'prenom', 'email']
            }
          ]
        }
      ]
    });

    if (!indisponibilite) {
      return res.status(404).json({
        success: false,
        message: 'Indisponibilité introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'PROFESSEUR') {
      const professeur = await Professeur.findOne({
        where: { user_id: req.user.id }
      });

      if (!professeur || indisponibilite.professeur_id !== professeur.id) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé.'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: { indisponibilite }
    });

  } catch (error) {
    console.error('[Indisponibilites] Erreur getIndisponibiliteById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'indisponibilité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Approuver/Rejeter une indisponibilité (RUP)
 * @route PUT /api/indisponibilites/:id
 * @access Private (RUP uniquement)
 */
const updateIndisponibilite = async (req, res) => {
  const schema = Joi.object({
    statut: Joi.string().valid('approuvé', 'rejeté').required()
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
    const { statut } = value;

    const indisponibilite = await Indisponibilite.findByPk(id, {
      include: [
        {
          model: Professeur,
          as: 'professeur',
          include: [
            {
              model: User,
              as: 'user'
            }
          ]
        }
      ],
      transaction
    });

    if (!indisponibilite) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Indisponibilité introuvable'
      });
    }

    // Mettre à jour le statut
    await indisponibilite.update({ statut }, { transaction });

    // Si approuvé, marquer les créneaux impactés comme annulés
    if (statut === 'approuvé') {
      const dateObj = new Date(indisponibilite.date);
      const joursMap = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const jourSemaine = joursMap[dateObj.getDay()];

      // Récupérer les créneaux impactés pour identifier les classes à notifier
      const creneauxImpactes = await Creneau.findAll({
        where: {
          professeur_id: indisponibilite.professeur_id,
          jour_semaine: jourSemaine,
          [sequelize.Op.or]: [
            {
              heure_debut: { [sequelize.Op.lte]: indisponibilite.heure_debut },
              heure_fin: { [sequelize.Op.gt]: indisponibilite.heure_debut }
            },
            {
              heure_debut: { [sequelize.Op.lt]: indisponibilite.heure_fin },
              heure_fin: { [sequelize.Op.gte]: indisponibilite.heure_fin }
            },
            {
              heure_debut: { [sequelize.Op.gte]: indisponibilite.heure_debut },
              heure_fin: { [sequelize.Op.lte]: indisponibilite.heure_fin }
            }
          ]
        },
        include: [
          {
            model: EmploiTemps,
            as: 'emploi_temps',
            attributes: ['classe_id']
          },
          {
            model: Matiere,
            as: 'matiere',
            attributes: ['nom']
          }
        ],
        transaction
      });

      await Creneau.update(
        { annule: true },
        {
          where: {
            id: creneauxImpactes.map(c => c.id)
          },
          transaction
        }
      );

      // Notifier les étudiants des classes impactées
      const { notifierEtudiantsClasse } = require('../services/notificationService');
      const classesImpactees = [...new Set(creneauxImpactes.map(c => c.emploi_temps.classe_id))];

      for (const classeId of classesImpactees) {
        // Pour chaque classe, on peut personnaliser le message
        // On prend la première matière trouvée pour cette classe dans les créneaux impactés (simplification)
        const creneauClasse = creneauxImpactes.find(c => c.emploi_temps.classe_id === classeId);
        const nomMatiere = creneauClasse ? creneauClasse.matiere.nom : 'un cours';

        await notifierEtudiantsClasse(
          classeId,
          "Cours annulé",
          `Le cours de ${nomMatiere} prévu le ${indisponibilite.date} est annulé en raison d'une indisponibilité du professeur.`,
          "indisponibilite",
          transaction
        );
      }
    }

    await transaction.commit();

    console.log(`[Indisponibilites] Indisponibilité ${statut} - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: `Indisponibilité ${statut === 'approuvé' ? 'approuvée' : 'rejetée'} avec succès`,
      data: { indisponibilite }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Indisponibilites] Erreur updateIndisponibilite:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'indisponibilité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Supprimer une indisponibilité
 * @route DELETE /api/indisponibilites/:id
 * @access Private (Professeur - les siennes, RUP - toutes)
 */
const deleteIndisponibilite = async (req, res) => {
  try {
    const { id } = req.params;

    const indisponibilite = await Indisponibilite.findByPk(id);

    if (!indisponibilite) {
      return res.status(404).json({
        success: false,
        message: 'Indisponibilité introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'PROFESSEUR') {
      const professeur = await Professeur.findOne({
        where: { user_id: req.user.id }
      });

      if (!professeur || indisponibilite.professeur_id !== professeur.id) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé. Vous ne pouvez supprimer que vos propres indisponibilités.'
        });
      }
    }

    await indisponibilite.destroy();

    console.log(`[Indisponibilites] Indisponibilité supprimée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Indisponibilité supprimée avec succès'
    });

  } catch (error) {
    console.error('[Indisponibilites] Erreur deleteIndisponibilite:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'indisponibilité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createIndisponibilite,
  getAllIndisponibilites,
  getIndisponibiliteById,
  updateIndisponibilite,
  deleteIndisponibilite
};