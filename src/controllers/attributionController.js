const Joi = require('joi');
const { Attribution, Professeur, Matiere, Classe, Semestre, User, UniteEnseignement } = require('../models');
const { sequelize } = require('../models');
const { verifierAttributionExiste, verifierMatiereAppartientClasse } = require('../services/attributionService');

const createAttribution = async (req, res) => {
  const schema = Joi.object({
    professeur_id: Joi.number().integer().required(),
    matiere_id: Joi.number().integer().required(),
    classe_id: Joi.number().integer().required(),
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
    const { professeur_id, matiere_id, classe_id, semestre_id } = value;

    // Vérifier que le professeur existe
    const professeur = await Professeur.findByPk(professeur_id, { transaction });
    if (!professeur) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Professeur introuvable'
      });
    }

    // Vérifier que la matière existe
    const matiere = await Matiere.findByPk(matiere_id, {
      include: [
        {
          model: UniteEnseignement,
          as: 'unite_enseignement',
          attributes: ['id', 'classe_id', 'nom']
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

    // Vérifier que la classe existe
    const classe = await Classe.findByPk(classe_id, { transaction });
    if (!classe) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Classe introuvable'
      });
    }

    // Vérifier les permissions (RUP ne peut créer des attributions que pour ses classes)
    if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez créer des attributions que pour vos propres classes.'
      });
    }

    // Vérifier que le semestre existe
    const semestre = await Semestre.findByPk(semestre_id, { transaction });
    if (!semestre) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Semestre introuvable'
      });
    }

    // Vérifier que la matière appartient bien à la classe
    const verificationMatiere = await verifierMatiereAppartientClasse(matiere_id, classe_id, transaction);
    if (!verificationMatiere.valide) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: verificationMatiere.message
      });
    }

    // Vérifier si l'attribution existe déjà
    const attributionExiste = await verifierAttributionExiste(professeur_id, matiere_id, classe_id, semestre_id, transaction);
    if (attributionExiste) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cette attribution existe déjà'
      });
    }

    // Créer l'attribution
    const attribution = await Attribution.create({
      professeur_id,
      matiere_id,
      classe_id,
      semestre_id
    }, { transaction });

    await transaction.commit();

    // Récupérer avec les relations
    const attributionComplete = await Attribution.findByPk(attribution.id, {
      include: [
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
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom', 'code', 'coefficient', 'volume_horaire']
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom']
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nom', 'actif']
        }
      ]
    });

    console.log(`[Attributions] Attribution créée - ID: ${attribution.id}, Prof: ${professeur_id}, Matière: ${matiere_id}`);

    return res.status(201).json({
      success: true,
      message: 'Attribution créée avec succès',
      data: { attribution: attributionComplete }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Attributions] Erreur createAttribution:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'attribution',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllAttributions = async (req, res) => {
  try {
    const { professeur_id, classe_id, semestre_id, matiere_id } = req.query;

    // Construire les conditions de filtrage
    const where = {};
    if (professeur_id) where.professeur_id = professeur_id;
    if (matiere_id) where.matiere_id = matiere_id;
    if (classe_id) where.classe_id = classe_id;
    if (semestre_id) where.semestre_id = semestre_id;

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

    // Si Professeur, ne voir que ses attributions
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

    const attributions = await Attribution.findAll({
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
        },
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom', 'code', 'coefficient', 'volume_horaire'],
          include: [
            {
              model: UniteEnseignement,
              as: 'unite_enseignement',
              attributes: ['id', 'code', 'nom']
            }
          ]
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire']
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nom', 'date_debut', 'date_fin', 'actif']
        }
      ],
      order: [
        [{ model: Semestre, as: 'semestre' }, 'date_debut', 'DESC'],
        [{ model: Classe, as: 'classe' }, 'nom', 'ASC']
      ]
    });

    return res.status(200).json({
      success: true,
      data: {
        attributions,
        total: attributions.length
      }
    });

  } catch (error) {
    console.error('[Attributions] Erreur getAllAttributions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des attributions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAttributionById = async (req, res) => {
  try {
    const { id } = req.params;

    const attribution = await Attribution.findByPk(id, {
      include: [
        {
          model: Professeur,
          as: 'professeur',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'nom', 'prenom', 'email', 'telephone']
            }
          ]
        },
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom', 'code', 'coefficient', 'volume_horaire', 'periode'],
          include: [
            {
              model: UniteEnseignement,
              as: 'unite_enseignement',
              attributes: ['id', 'code', 'nom']
            }
          ]
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire', 'rup_id']
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nom', 'date_debut', 'date_fin', 'actif']
        }
      ]
    });

    if (!attribution) {
      return res.status(404).json({
        success: false,
        message: 'Attribution introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && attribution.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    if (req.user.role === 'PROFESSEUR') {
      const professeur = await Professeur.findOne({
        where: { user_id: req.user.id }
      });

      if (!professeur || attribution.professeur_id !== professeur.id) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé.'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: { attribution }
    });

  } catch (error) {
    console.error('[Attributions] Erreur getAttributionById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'attribution',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteAttribution = async (req, res) => {
  try {
    const { id } = req.params;

    const attribution = await Attribution.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id']
        }
      ]
    });

    if (!attribution) {
      return res.status(404).json({
        success: false,
        message: 'Attribution introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && attribution.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez supprimer que les attributions de vos propres classes.'
      });
    }

    await attribution.destroy();

    console.log(`[Attributions] Attribution supprimée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Attribution supprimée avec succès'
    });

  } catch (error) {
    console.error('[Attributions] Erreur deleteAttribution:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'attribution',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateAttribution = async (req, res) => {
  const schema = Joi.object({
    professeur_id: Joi.number().integer().optional(),
    matiere_id: Joi.number().integer().optional(),
    classe_id: Joi.number().integer().optional(),
    semestre_id: Joi.number().integer().optional()
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
    const { professeur_id, matiere_id, classe_id, semestre_id } = value;

    const attribution = await Attribution.findByPk(id, { transaction });

    if (!attribution) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Attribution introuvable'
      });
    }

    // Vérifier les permissions
    // On doit charger la classe pour vérifier le RUP
    const classeToCheck = await Classe.findByPk(attribution.classe_id, { transaction });
    if (req.user.role === 'RUP' && classeToCheck.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    // Si on change la classe, vérifier que le RUP a les droits sur la nouvelle classe aussi
    if (classe_id && classe_id !== attribution.classe_id) {
      const newClasse = await Classe.findByPk(classe_id, { transaction });
      if (!newClasse) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Nouvelle classe introuvable' });
      }
      if (req.user.role === 'RUP' && newClasse.rup_id !== req.user.id) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Accès refusé pour la nouvelle classe.' });
      }
    }

    // Préparer les nouvelles valeurs
    const newProfId = professeur_id || attribution.professeur_id;
    const newMatiereId = matiere_id || attribution.matiere_id;
    const newClasseId = classe_id || attribution.classe_id;
    const newSemestreId = semestre_id || attribution.semestre_id;

    // Si changement de matière/classe, vérifier l'appartenance
    if (matiere_id || classe_id) {
      const verificationMatiere = await verifierMatiereAppartientClasse(newMatiereId, newClasseId, transaction);
      if (!verificationMatiere.valide) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: verificationMatiere.message
        });
      }
    }

    // Vérifier unicité (si changement de clés)
    if (professeur_id || matiere_id || classe_id || semestre_id) {
      const exists = await Attribution.findOne({
        where: {
          professeur_id: newProfId,
          matiere_id: newMatiereId,
          classe_id: newClasseId,
          semestre_id: newSemestreId,
          id: { [require('sequelize').Op.ne]: id } // Exclure soi-même
        },
        transaction
      });

      if (exists) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Une attribution identique existe déjà'
        });
      }
    }

    await attribution.update(value, { transaction });
    await transaction.commit();

    // Recharger avec relations
    const updatedAttribution = await Attribution.findByPk(id, {
      include: [
        { model: Professeur, as: 'professeur', include: [{ model: User, as: 'user', attributes: ['id', 'nom', 'prenom'] }] },
        { model: Matiere, as: 'matiere', attributes: ['id', 'nom', 'code'] },
        { model: Classe, as: 'classe', attributes: ['id', 'nom'] },
        { model: Semestre, as: 'semestre', attributes: ['id', 'nom'] }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Attribution modifiée avec succès',
      data: { attribution: updatedAttribution }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Attributions] Erreur updateAttribution:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de l\'attribution',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createAttribution,
  getAllAttributions,
  getAttributionById,
  deleteAttribution,
  updateAttribution
};