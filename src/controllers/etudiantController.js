const Joi = require('joi');
const bcrypt = require('bcrypt');
const { Etudiant, User, Role, Classe, Specialite, Filiere, Cycle } = require('../models');
const { sequelize } = require('../models');

const createEtudiant = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).required(),
    prenom: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    mot_de_passe: Joi.string().min(8).required(),
    telephone: Joi.string().optional(),
    matricule: Joi.string().required(),
    classe_id: Joi.number().integer().required()
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
    const { nom, prenom, email, mot_de_passe, telephone, matricule, classe_id } = value;

    // Vérifier que la classe existe
    const classe = await Classe.findByPk(classe_id, { transaction });
    if (!classe) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Classe introuvable'
      });
    }

    // Vérifier les permissions (RUP ne peut créer des étudiants que dans ses classes)
    if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez créer des étudiants que dans vos propres classes.'
      });
    }

    // Vérifier si l'email existe déjà
    const emailExists = await User.findOne({ where: { email }, transaction });
    if (emailExists) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Vérifier si le matricule existe déjà
    const matriculeExists = await Etudiant.findOne({ where: { matricule }, transaction });
    if (matriculeExists) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Ce matricule est déjà utilisé'
      });
    }

    // Récupérer le rôle ETUDIANT
    const roleEtudiant = await Role.findOne({ where: { nom: 'ETUDIANT' }, transaction });
    if (!roleEtudiant) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Rôle ETUDIANT introuvable dans la base de données'
      });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(mot_de_passe, salt);

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      prenom,
      email,
      mot_de_passe: hashedPassword,
      telephone,
      role_id: roleEtudiant.id,
      actif: true
    }, { transaction });

    // Créer l'étudiant
    const etudiant = await Etudiant.create({
      user_id: user.id,
      matricule,
      classe_id
    }, { transaction });

    await transaction.commit();

    // Récupérer avec les relations
    const etudiantComplet = await Etudiant.findByPk(etudiant.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nom', 'prenom', 'email', 'telephone'],
          include: [
            {
              model: Role,
              as: 'role',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire']
        }
      ]
    });

    console.log(`[Etudiants] Étudiant créé - ID: ${etudiant.id}, Matricule: ${matricule}`);

    return res.status(201).json({
      success: true,
      message: 'Étudiant créé avec succès',
      data: { etudiant: etudiantComplet }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Etudiants] Erreur createEtudiant:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'étudiant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllEtudiants = async (req, res) => {
  try {
    const { classe_id, matricule, nom } = req.query;

    // Construire les conditions de filtrage
    let where = {};
    let userWhere = {};

    if (classe_id) {
      where.classe_id = classe_id;

      // Vérifier que la classe appartient au RUP
      if (req.user.role === 'RUP') {
        const classe = await Classe.findByPk(classe_id);
        if (!classe || classe.rup_id !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Accès refusé. Vous ne pouvez voir que les étudiants de vos propres classes.'
          });
        }
      }
    } else {
      // Si pas de classe_id, filtrer par les classes du RUP
      if (req.user.role === 'RUP') {
        const classesRup = await Classe.findAll({
          where: { rup_id: req.user.id },
          attributes: ['id']
        });

        const classeIds = classesRup.map(c => c.id);
        where.classe_id = classeIds;
      }
    }

    if (matricule) where.matricule = { [require('sequelize').Op.iLike]: `%${matricule}%` };
    if (nom) userWhere.nom = { [require('sequelize').Op.iLike]: `%${nom}%` };

    const etudiants = await Etudiant.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nom', 'prenom', 'email', 'telephone', 'actif'],
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          include: [
            {
              model: Role,
              as: 'role',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire'],
          include: [
            {
              model: Specialite,
              as: 'specialite',
              attributes: ['id', 'nom'],
              include: [
                { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
                { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
              ]
            }
          ]
        }
      ],
      order: [[{ model: User, as: 'user' }, 'nom', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        etudiants,
        total: etudiants.length
      }
    });

  } catch (error) {
    console.error('[Etudiants] Erreur getAllEtudiants:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des étudiants',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getEtudiantById = async (req, res) => {
  try {
    const { id } = req.params;

    const etudiant = await Etudiant.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nom', 'prenom', 'email', 'telephone', 'actif'],
          include: [
            {
              model: Role,
              as: 'role',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire', 'rup_id'],
          include: [
            {
              model: Specialite,
              as: 'specialite',
              attributes: ['id', 'nom', 'annee'],
              include: [
                { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
                { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
              ]
            },
            {
              model: User,
              as: 'rup',
              attributes: ['id', 'nom', 'prenom', 'email']
            }
          ]
        }
      ]
    });

    if (!etudiant) {
      return res.status(404).json({
        success: false,
        message: 'Étudiant introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && etudiant.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    if (req.user.role === 'ETUDIANT' && etudiant.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    return res.status(200).json({
      success: true,
      data: { etudiant }
    });

  } catch (error) {
    console.error('[Etudiants] Erreur getEtudiantById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'étudiant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateEtudiant = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).optional(),
    prenom: Joi.string().min(2).optional(),
    email: Joi.string().email().optional(),
    telephone: Joi.string().optional(),
    matricule: Joi.string().optional(),
    classe_id: Joi.number().integer().optional(),
    actif: Joi.boolean().optional()
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
    const { nom, prenom, email, telephone, matricule, classe_id, actif } = value;

    const etudiant = await Etudiant.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user'
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id']
        }
      ],
      transaction
    });

    if (!etudiant) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Étudiant introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && etudiant.classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez modifier que les étudiants de vos propres classes.'
      });
    }

    // Vérifier si le nouvel email existe déjà
    if (email && email !== etudiant.user.email) {
      const emailExists = await User.findOne({ where: { email }, transaction });
      if (emailExists) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    // Vérifier si le nouveau matricule existe déjà
    if (matricule && matricule !== etudiant.matricule) {
      const matriculeExists = await Etudiant.findOne({ where: { matricule }, transaction });
      if (matriculeExists) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Ce matricule est déjà utilisé'
        });
      }
    }

    // Vérifier que la nouvelle classe appartient au RUP
    if (classe_id && classe_id !== etudiant.classe_id) {
      const nouvelleClasse = await Classe.findByPk(classe_id, { transaction });
      if (!nouvelleClasse) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Classe introuvable'
        });
      }

      if (req.user.role === 'RUP' && nouvelleClasse.rup_id !== req.user.id) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez transférer un étudiant que vers vos propres classes.'
        });
      }
    }

    // Mettre à jour l'utilisateur
    await etudiant.user.update(
      { nom, prenom, email, telephone, actif },
      { transaction }
    );

    // Mettre à jour l'étudiant
    await etudiant.update(
      { matricule, classe_id },
      { transaction }
    );

    await transaction.commit();

    // Récupérer avec les relations
    const etudiantComplet = await Etudiant.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nom', 'prenom', 'email', 'telephone', 'actif']
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire']
        }
      ]
    });

    console.log(`[Etudiants] Étudiant modifié - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Étudiant modifié avec succès',
      data: { etudiant: etudiantComplet }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Etudiants] Erreur updateEtudiant:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de l\'étudiant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteEtudiant = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const etudiant = await Etudiant.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user'
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id']
        }
      ],
      transaction
    });

    if (!etudiant) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Étudiant introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && etudiant.classe.rup_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez supprimer que les étudiants de vos propres classes.'
      });
    }

    // Supprimer l'étudiant et l'utilisateur
    await etudiant.destroy({ transaction });
    await etudiant.user.destroy({ transaction });

    await transaction.commit();

    console.log(`[Etudiants] Étudiant supprimé - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Étudiant supprimé avec succès'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Etudiants] Erreur deleteEtudiant:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'étudiant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createEtudiant,
  getAllEtudiants,
  getEtudiantById,
  updateEtudiant,
  deleteEtudiant
};