const Joi = require('joi');
const { EmploiTemps, Classe, Semestre, Creneau, Matiere, Professeur, Salle, User, Specialite, UniteEnseignement } = require('../models');
const { sequelize } = require('../models');

const createEmploiTemps = async (req, res) => {
  const schema = Joi.object({
    classe_id: Joi.number().integer().required(),
    semestre_id: Joi.number().integer().required(),
    statut: Joi.string().valid('brouillon', 'publié').optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { classe_id, semestre_id, statut } = value;

    // Vérifier que la classe existe
    const classe = await Classe.findByPk(classe_id);
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
        message: 'Accès refusé. Vous ne pouvez créer des emplois du temps que pour vos propres classes.'
      });
    }

    // Vérifier que le semestre existe
    const semestre = await Semestre.findByPk(semestre_id);
    if (!semestre) {
      return res.status(404).json({
        success: false,
        message: 'Semestre introuvable'
      });
    }

    // Vérifier si un EDT existe déjà pour cette classe et ce semestre
    const edtExiste = await EmploiTemps.findOne({
      where: { classe_id, semestre_id }
    });

    if (edtExiste) {
      return res.status(400).json({
        success: false,
        message: 'Un emploi du temps existe déjà pour cette classe et ce semestre',
        data: { emploi_temps_id: edtExiste.id }
      });
    }

    // Créer l'emploi du temps
    const emploiTemps = await EmploiTemps.create({
      classe_id,
      semestre_id,
      statut: statut || 'brouillon'
    });

    // Auto-remplissage des créneaux EPS si configurés
    const { syncEpsCreneaux } = require('../services/epsService');
    await syncEpsCreneaux(emploiTemps.id);

    // Récupérer avec les relations
    const emploiTempsComplet = await EmploiTemps.findByPk(emploiTemps.id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire'],
          include: [
            {
              model: Specialite,
              as: 'specialite',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nom', 'date_debut', 'date_fin', 'actif']
        }
      ]
    });

    console.log(`[EmploiTemps] EDT créé - ID: ${emploiTemps.id}, Classe: ${classe.nom}, Semestre: ${semestre.nom}`);

    return res.status(201).json({
      success: true,
      message: 'Emploi du temps créé avec succès',
      data: { emploi_temps: emploiTempsComplet }
    });

  } catch (error) {
    console.error('[EmploiTemps] Erreur createEmploiTemps:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'emploi du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllEmploisTemps = async (req, res) => {
  try {
    const { classe_id, semestre_id, statut } = req.query;

    // Construire les conditions de filtrage
    const where = {};
    if (classe_id) where.classe_id = classe_id;
    if (semestre_id) where.semestre_id = semestre_id;
    if (statut) where.statut = statut;

    // Si RUP, filtrer par ses classes
    if (req.user.role === 'RUP') {
      const classesRup = await Classe.findAll({
        where: { rup_id: req.user.id },
        attributes: ['id']
      });

      const classeIds = classesRup.map(c => c.id);

      if (classe_id) {
        // Vérifier que la classe appartient au RUP
        if (!classeIds.includes(parseInt(classe_id))) {
          return res.status(403).json({
            success: false,
            message: 'Accès refusé.'
          });
        }
      } else {
        where.classe_id = classeIds;
      }
    }

    const emploisTemps = await EmploiTemps.findAll({
      where,
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire'],
          include: [
            {
              model: Specialite,
              as: 'specialite',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nom', 'date_debut', 'date_fin', 'actif']
        },
        {
          model: Creneau,
          as: 'creneaux',
          attributes: ['id']
        }
      ],
      order: [
        [{ model: Semestre, as: 'semestre' }, 'date_debut', 'DESC'],
        [{ model: Classe, as: 'classe' }, 'nom', 'ASC']
      ]
    });

    // Ajouter le nombre de créneaux
    const emploisTempsWithCount = emploisTemps.map(edt => {
      const edtJSON = edt.toJSON();
      return {
        ...edtJSON,
        nombre_creneaux: edtJSON.creneaux ? edtJSON.creneaux.length : 0,
        creneaux: undefined // Retirer le détail des créneaux
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        emplois_temps: emploisTempsWithCount,
        total: emploisTemps.length
      }
    });

  } catch (error) {
    console.error('[EmploiTemps] Erreur getAllEmploisTemps:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des emplois du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getEmploiTempsById = async (req, res) => {
  try {
    const { id } = req.params;

    const emploiTemps = await EmploiTemps.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire', 'rup_id'],
          include: [
            {
              model: Specialite,
              as: 'specialite',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nom', 'date_debut', 'date_fin', 'actif']
        },
        {
          model: Creneau,
          as: 'creneaux',
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
          ],
          order: [
            ['semaine_numero', 'ASC'],
            [sequelize.literal(`CASE 
              WHEN jour_semaine = 'Lundi' THEN 1
              WHEN jour_semaine = 'Mardi' THEN 2
              WHEN jour_semaine = 'Mercredi' THEN 3
              WHEN jour_semaine = 'Jeudi' THEN 4
              WHEN jour_semaine = 'Vendredi' THEN 5
              WHEN jour_semaine = 'Samedi' THEN 6
              ELSE 7
            END`)],
            ['heure_debut', 'ASC']
          ]
        }
      ]
    });

    if (!emploiTemps) {
      return res.status(404).json({
        success: false,
        message: 'Emploi du temps introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && emploiTemps.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    // Si étudiant, vérifier qu'il appartient à la classe
    if (req.user.role === 'ETUDIANT') {
      const { Etudiant } = require('../models');
      const etudiant = await Etudiant.findOne({
        where: { user_id: req.user.id }
      });

      if (!etudiant || etudiant.classe_id !== emploiTemps.classe_id) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé.'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: { emploi_temps: emploiTemps }
    });

  } catch (error) {
    console.error('[EmploiTemps] Erreur getEmploiTempsById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'emploi du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getEmploiTempsByClasse = async (req, res) => {
  try {
    const { classe_id } = req.params;

    // Vérifier que la classe existe
    const classe = await Classe.findByPk(classe_id);
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
        message: 'Accès refusé.'
      });
    }

    if (req.user.role === 'ETUDIANT') {
      const { Etudiant } = require('../models');
      const etudiant = await Etudiant.findOne({
        where: { user_id: req.user.id }
      });

      if (!etudiant || etudiant.classe_id !== parseInt(classe_id)) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé.'
        });
      }
    }

    // Récupérer le semestre actif
    const semestreActif = await Semestre.findOne({
      where: { actif: true }
    });

    if (!semestreActif) {
      return res.status(404).json({
        success: false,
        message: 'Aucun semestre actif trouvé'
      });
    }

    // Récupérer l'EDT
    const emploiTemps = await EmploiTemps.findOne({
      where: {
        classe_id,
        semestre_id: semestreActif.id
      },
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire']
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nom', 'date_debut', 'date_fin']
        },
        {
          model: Creneau,
          as: 'creneaux',
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
        }
      ]
    });

    if (!emploiTemps) {
      return res.status(404).json({
        success: false,
        message: 'Aucun emploi du temps trouvé pour cette classe et le semestre actif'
      });
    }

    return res.status(200).json({
      success: true,
      data: { emploi_temps: emploiTemps }
    });

  } catch (error) {
    console.error('[EmploiTemps] Erreur getEmploiTempsByClasse:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'emploi du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateEmploiTemps = async (req, res) => {
  const schema = Joi.object({
    statut: Joi.string().valid('brouillon', 'publié').required()
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
    const { statut } = value;

    const emploiTemps = await EmploiTemps.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id']
        }
      ]
    });

    if (!emploiTemps) {
      return res.status(404).json({
        success: false,
        message: 'Emploi du temps introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && emploiTemps.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez modifier que les emplois du temps de vos propres classes.'
      });
    }

    await emploiTemps.update({ statut });

    console.log(`[EmploiTemps] EDT modifié - ID: ${id}, Nouveau statut: ${statut}`);

    return res.status(200).json({
      success: true,
      message: 'Emploi du temps modifié avec succès',
      data: { emploi_temps: emploiTemps }
    });

  } catch (error) {
    console.error('[EmploiTemps] Erreur updateEmploiTemps:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de l\'emploi du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteEmploiTemps = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const emploiTemps = await EmploiTemps.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id']
        },
        {
          model: Creneau,
          as: 'creneaux'
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
        message: 'Accès refusé. Vous ne pouvez supprimer que les emplois du temps de vos propres classes.'
      });
    }

    // Supprimer tous les créneaux associés (cascade)
    await emploiTemps.destroy({ transaction });

    await transaction.commit();

    console.log(`[EmploiTemps] EDT supprimé - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Emploi du temps supprimé avec succès'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[EmploiTemps] Erreur deleteEmploiTemps:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'emploi du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const dupliquerEmploiTemps = async (req, res) => {
  const schema = Joi.object({
    semestre_id: Joi.number().integer().required()
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
    const { semestre_id } = value;

    // Récupérer l'EDT source
    const edtSource = await EmploiTemps.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id']
        },
        {
          model: Creneau,
          as: 'creneaux'
        }
      ],
      transaction
    });

    if (!edtSource) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Emploi du temps source introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && edtSource.classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    // Vérifier que le semestre cible existe
    const semestreCible = await Semestre.findByPk(semestre_id, { transaction });
    if (!semestreCible) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Semestre cible introuvable'
      });
    }

    // Vérifier qu'un EDT n'existe pas déjà pour la classe et le semestre cible
    const edtExiste = await EmploiTemps.findOne({
      where: {
        classe_id: edtSource.classe_id,
        semestre_id
      },
      transaction
    });

    if (edtExiste) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Un emploi du temps existe déjà pour cette classe et ce semestre'
      });
    }

    // Créer le nouvel EDT
    const nouvelEdt = await EmploiTemps.create({
      classe_id: edtSource.classe_id,
      semestre_id,
      statut: 'brouillon' // Toujours en brouillon au départ
    }, { transaction });

    // Dupliquer les créneaux
    const creneauxACreer = edtSource.creneaux.map(creneau => ({
      emploi_temps_id: nouvelEdt.id,
      jour_semaine: creneau.jour_semaine,
      heure_debut: creneau.heure_debut,
      heure_fin: creneau.heure_fin,
      matiere_id: creneau.matiere_id,
      professeur_id: creneau.professeur_id,
      salle_id: creneau.salle_id,
      semaine_numero: creneau.semaine_numero,
      type_cours: creneau.type_cours,
      annule: false
    }));

    await Creneau.bulkCreate(creneauxACreer, { transaction });

    await transaction.commit();

    // Récupérer le nouvel EDT avec ses relations
    const edtComplet = await EmploiTemps.findByPk(nouvelEdt.id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom']
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nom']
        }
      ]
    });

    console.log(`[EmploiTemps] EDT dupliqué - Source: ${id}, Nouveau: ${nouvelEdt.id}`);

    return res.status(201).json({
      success: true,
      message: 'Emploi du temps dupliqué avec succès',
      data: {
        emploi_temps: edtComplet,
        nombre_creneaux_dupliques: creneauxACreer.length
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[EmploiTemps] Erreur dupliquerEmploiTemps:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la duplication de l\'emploi du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createEmploiTemps,
  getAllEmploisTemps,
  getEmploiTempsById,
  getEmploiTempsByClasse,
  updateEmploiTemps,
  deleteEmploiTemps,
  dupliquerEmploiTemps
};