const Joi = require('joi');
const { Classe, Specialite, Salle, Filiere, Cycle, User, Etudiant, UniteEnseignement } = require('../models');


const createClasse = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(100).required(),
    specialite_id: Joi.number().integer().required(),
    salle_principale_id: Joi.number().integer().required(),
    rup_id: Joi.number().integer().optional(), // Optionnel, par défaut l'utilisateur connecté
    annee_scolaire: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
      .messages({
        'string.pattern.base': 'L\'année scolaire doit être au format YYYY-YYYY (ex: 2024-2025)'
      }),
    jour_eps: Joi.string().valid('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi').optional().allow(null),
    heure_debut_eps: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:00)?$/).optional().allow(null),
    heure_fin_eps: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:00)?$/).optional().allow(null),
    matiere_eps_id: Joi.number().integer().optional().allow(null)
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const {
      nom, specialite_id, salle_principale_id, annee_scolaire,
      jour_eps, heure_debut_eps, heure_fin_eps, matiere_eps_id
    } = value;
    const rup_id = value.rup_id || req.user.id; // Par défaut, le RUP connecté

    // Vérifier que la spécialité existe
    const specialite = await Specialite.findByPk(specialite_id);
    if (!specialite) {
      return res.status(404).json({
        success: false,
        message: 'Spécialité introuvable'
      });
    }

    // Vérifier que la salle principale existe
    const salle = await Salle.findByPk(salle_principale_id);
    if (!salle) {
      return res.status(404).json({
        success: false,
        message: 'Salle principale introuvable'
      });
    }

    // Vérifier que le RUP existe et a bien le rôle RUP
    const rup = await User.findByPk(rup_id, {
      include: [{ model: require('../models').Role, as: 'role' }]
    });

    if (!rup) {
      return res.status(404).json({
        success: false,
        message: 'RUP introuvable'
      });
    }

    if (rup.role.nom !== 'RUP') {
      return res.status(400).json({
        success: false,
        message: 'L\'utilisateur spécifié n\'est pas un RUP'
      });
    }

    // Vérifier si la classe existe déjà
    const classeExists = await Classe.findOne({
      where: { nom, specialite_id, annee_scolaire }
    });

    if (classeExists) {
      return res.status(400).json({
        success: false,
        message: 'Cette classe existe déjà pour cette spécialité et cette année scolaire'
      });
    }

    const classe = await Classe.create({
      nom,
      specialite_id,
      salle_principale_id,
      rup_id,
      rup_id,
      annee_scolaire,
      jour_eps,
      heure_debut_eps,
      heure_fin_eps,
      matiere_eps_id
    });

    // Récupérer avec les relations
    const classeComplete = await Classe.findByPk(classe.id, {
      include: [
        {
          model: Specialite,
          as: 'specialite',
          include: [
            { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
            { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
          ]
        },
        {
          model: Salle,
          as: 'salle_principale',
          attributes: ['id', 'nom']
        },
        {
          model: User,
          as: 'rup',
          attributes: ['id', 'nom', 'prenom', 'email']
        }
      ]
    });

    console.log(`[Classes] Classe créée - ID: ${classe.id}, Nom: ${nom}, RUP: ${rup.nom} ${rup.prenom}`);

    return res.status(201).json({
      success: true,
      message: 'Classe créée avec succès',
      data: { classe: classeComplete }
    });

  } catch (error) {
    console.error('[Classes] Erreur createClasse:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la classe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const getAllClasses = async (req, res) => {
  try {
    const { specialite_id, annee_scolaire } = req.query;

    // Construire les conditions de filtrage
    const where = {};

    // Si l'utilisateur est un RUP, filtrer par ses classes uniquement
    if (req.user.role === 'RUP') {
      where.rup_id = req.user.id;
    }

    if (specialite_id) where.specialite_id = specialite_id;
    if (annee_scolaire) where.annee_scolaire = annee_scolaire;

    const classes = await Classe.findAll({
      where,
      include: [
        {
          model: Specialite,
          as: 'specialite',
          include: [
            { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
            { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
          ]
        },
        {
          model: Salle,
          as: 'salle_principale',
          attributes: ['id', 'nom']
        },
        {
          model: User,
          as: 'rup',
          attributes: ['id', 'nom', 'prenom', 'email']
        },
        {
          model: Etudiant,
          as: 'etudiants',
          attributes: ['id', 'matricule']
        }
      ],
      order: [['annee_scolaire', 'DESC'], ['nom', 'ASC']]
    });

    // Ajouter le nombre d'étudiants à chaque classe
    const classesWithCount = classes.map(classe => {
      const classeJSON = classe.toJSON();
      return {
        ...classeJSON,
        nombre_etudiants: classeJSON.etudiants ? classeJSON.etudiants.length : 0
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        classes: classesWithCount,
        total: classes.length
      }
    });

  } catch (error) {
    console.error('[Classes] Erreur getAllClasses:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des classes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const getClasseById = async (req, res) => {
  try {
    const { id } = req.params;

    const classe = await Classe.findByPk(id, {
      include: [
        {
          model: Specialite,
          as: 'specialite',
          include: [
            { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
            { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
          ]
        },
        {
          model: Salle,
          as: 'salle_principale',
          attributes: ['id', 'nom']
        },
        {
          model: User,
          as: 'rup',
          attributes: ['id', 'nom', 'prenom', 'email', 'telephone']
        },
        {
          model: Etudiant,
          as: 'etudiants',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'nom', 'prenom', 'email']
            }
          ]
        },
        {
          model: UniteEnseignement,
          as: 'unites_enseignement',
          attributes: ['id', 'code', 'nom', 'coefficient_total', 'volume_horaire_total']
        }
      ]
    });

    if (!classe) {
      return res.status(404).json({
        success: false,
        message: 'Classe introuvable'
      });
    }

    // Vérifier les permissions (RUP peut voir uniquement ses classes)
    if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez voir que vos propres classes.'
      });
    }

    const classeJSON = classe.toJSON();
    classeJSON.nombre_etudiants = classeJSON.etudiants ? classeJSON.etudiants.length : 0;

    return res.status(200).json({
      success: true,
      data: { classe: classeJSON }
    });

  } catch (error) {
    console.error('[Classes] Erreur getClasseById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la classe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const updateClasse = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).max(100).optional(),
    specialite_id: Joi.number().integer().optional(),
    salle_principale_id: Joi.number().integer().optional(),
    rup_id: Joi.number().integer().optional(),
    annee_scolaire: Joi.string().pattern(/^\d{4}-\d{4}$/).optional(),
    jour_eps: Joi.string().valid('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi').optional().allow(null),
    heure_debut_eps: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:00)?$/).optional().allow(null),
    heure_fin_eps: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:00)?$/).optional().allow(null),
    matiere_eps_id: Joi.number().integer().optional().allow(null)
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

    const classe = await Classe.findByPk(id);
    if (!classe) {
      return res.status(404).json({
        success: false,
        message: 'Classe introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez modifier que vos propres classes.'
      });
    }

    // Vérifier que la spécialité existe (si changée)
    if (specialite_id && specialite_id !== classe.specialite_id) {
      const specialite = await Specialite.findByPk(specialite_id);
      if (!specialite) {
        return res.status(404).json({
          success: false,
          message: 'Spécialité introuvable'
        });
      }
    }

    // Vérifier que la salle principale existe (si changée)
    if (salle_principale_id && salle_principale_id !== classe.salle_principale_id) {
      const salle = await Salle.findByPk(salle_principale_id);
      if (!salle) {
        return res.status(404).json({
          success: false,
          message: 'Salle principale introuvable'
        });
      }
    }

    // Vérifier que le nouveau RUP existe (si changé)
    if (rup_id && rup_id !== classe.rup_id) {
      const rup = await User.findByPk(rup_id, {
        include: [{ model: require('../models').Role, as: 'role' }]
      });

      if (!rup || rup.role.nom !== 'RUP') {
        return res.status(400).json({
          success: false,
          message: 'RUP invalide'
        });
      }
    }

    const {
      nom, specialite_id, salle_principale_id, rup_id, annee_scolaire,
      jour_eps, heure_debut_eps, heure_fin_eps, matiere_eps_id
    } = value;
    await classe.update({
      nom, specialite_id, salle_principale_id, rup_id, annee_scolaire,
      jour_eps, heure_debut_eps, heure_fin_eps, matiere_eps_id
    });

    // Si la config EPS a changé, synchroniser les emplois du temps existants
    if (jour_eps || heure_debut_eps || heure_fin_eps || matiere_eps_id) {
      const { syncEpsCreneaux } = require('../services/epsService');
      const { EmploiTemps } = require('../models');
      const edts = await EmploiTemps.findAll({ where: { classe_id: id, statut: 'brouillon' } });
      for (const edt of edts) {
        await syncEpsCreneaux(edt.id);
      }
    }

    // Récupérer avec les relations
    const classeComplete = await Classe.findByPk(id, {
      include: [
        {
          model: Specialite,
          as: 'specialite',
          include: [
            { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
            { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
          ]
        },
        {
          model: Salle,
          as: 'salle_principale',
          attributes: ['id', 'nom']
        },
        {
          model: User,
          as: 'rup',
          attributes: ['id', 'nom', 'prenom', 'email']
        }
      ]
    });

    console.log(`[Classes] Classe modifiée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Classe modifiée avec succès',
      data: { classe: classeComplete }
    });

  } catch (error) {
    console.error('[Classes] Erreur updateClasse:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la classe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteClasse = async (req, res) => {
  try {
    const { id } = req.params;

    const classe = await Classe.findByPk(id, {
      include: [
        { model: Etudiant, as: 'etudiants' },
        { model: UniteEnseignement, as: 'unites_enseignement' }
      ]
    });

    if (!classe) {
      return res.status(404).json({
        success: false,
        message: 'Classe introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez supprimer que vos propres classes.'
      });
    }

    // Vérifier s'il y a des étudiants
    if (classe.etudiants && classe.etudiants.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer cette classe car des étudiants y sont inscrits',
        data: {
          nombre_etudiants: classe.etudiants.length
        }
      });
    }

    // Vérifier s'il y a des UE
    if (classe.unites_enseignement && classe.unites_enseignement.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer cette classe car des unités d\'enseignement y sont liées',
        data: {
          nombre_ues: classe.unites_enseignement.length
        }
      });
    }

    await classe.destroy();

    console.log(`[Classes] Classe supprimée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Classe supprimée avec succès'
    });

  } catch (error) {
    console.error('[Classes] Erreur deleteClasse:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la classe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createClasse,
  getAllClasses,
  getClasseById,
  updateClasse,
  deleteClasse
};