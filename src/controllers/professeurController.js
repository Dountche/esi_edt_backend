const Joi = require('joi');
const bcrypt = require('bcrypt');
const { Professeur, User, Role, Attribution, Matiere, Classe } = require('../models');
const { sequelize } = require('../models');

const createProfesseur = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).required(),
    prenom: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    mot_de_passe: Joi.string().min(8).required(),
    telephone: Joi.string().optional(),
    grade: Joi.string().optional(),
    specialite: Joi.string().optional()
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
    const { nom, prenom, email, mot_de_passe, telephone, grade, specialite } = value;

    // Vérifier si l'email existe déjà
    const emailExists = await User.findOne({ where: { email }, transaction });
    if (emailExists) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Récupérer le rôle PROFESSEUR
    const roleProf = await Role.findOne({ where: { nom: 'PROFESSEUR' }, transaction });
    if (!roleProf) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Rôle PROFESSEUR introuvable dans la base de données'
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
      role_id: roleProf.id,
      actif: true
    }, { transaction });

    // Créer le professeur
    const professeur = await Professeur.create({
      user_id: user.id,
      grade: grade || null,
      specialite: specialite || null
    }, { transaction });

    await transaction.commit();

    // Récupérer avec les relations
    const professeurComplet = await Professeur.findByPk(professeur.id, {
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
        }
      ]
    });

    console.log(`[Professeurs] Professeur créé - ID: ${professeur.id}, Email: ${email}`);

    return res.status(201).json({
      success: true,
      message: 'Professeur créé avec succès',
      data: { professeur: professeurComplet }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Professeurs] Erreur createProfesseur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du professeur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllProfesseurs = async (req, res) => {
  try {
    const { grade, specialite } = req.query;

    // Construire les conditions de filtrage
    const where = {};
    if (grade) where.grade = grade;
    if (specialite) where.specialite = { [require('sequelize').Op.iLike]: `%${specialite}%` };

    const professeurs = await Professeur.findAll({
      where,
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
          model: Attribution,
          as: 'attributions',
          attributes: ['id', 'matiere_id', 'classe_id', 'semestre_id']
        }
      ],
      order: [[{ model: User, as: 'user' }, 'nom', 'ASC']]
    });

    // Ajouter le nombre d'attributions
    const professeursWithCount = professeurs.map(prof => {
      const profJSON = prof.toJSON();
      return {
        ...profJSON,
        nombre_attributions: profJSON.attributions ? profJSON.attributions.length : 0
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        professeurs: professeursWithCount,
        total: professeurs.length
      }
    });

  } catch (error) {
    console.error('[Professeurs] Erreur getAllProfesseurs:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des professeurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getProfesseurById = async (req, res) => {
  try {
    const { id } = req.params;

    const professeur = await Professeur.findByPk(id, {
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
          model: Attribution,
          as: 'attributions',
          include: [
            {
              model: Matiere,
              as: 'matiere',
              attributes: ['id', 'nom', 'code']
            },
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'nom']
            },
            {
              model: require('../models').Semestre,
              as: 'semestre',
              attributes: ['id', 'nom', 'actif']
            }
          ]
        }
      ]
    });

    if (!professeur) {
      return res.status(404).json({
        success: false,
        message: 'Professeur introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      data: { professeur }
    });

  } catch (error) {
    console.error('[Professeurs] Erreur getProfesseurById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du professeur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateProfesseur = async (req, res) => {
  const schema = Joi.object({
    nom: Joi.string().min(2).optional(),
    prenom: Joi.string().min(2).optional(),
    email: Joi.string().email().optional(),
    telephone: Joi.string().optional(),
    grade: Joi.string().optional(),
    specialite: Joi.string().optional(),
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
    const { nom, prenom, email, telephone, grade, specialite, actif } = value;

    const professeur = await Professeur.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user'
        }
      ],
      transaction
    });

    if (!professeur) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Professeur introuvable'
      });
    }

    // Vérifier si le nouvel email existe déjà
    if (email && email !== professeur.user.email) {
      const emailExists = await User.findOne({ where: { email }, transaction });
      if (emailExists) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    // Mettre à jour l'utilisateur
    await professeur.user.update(
      { nom, prenom, email, telephone, actif },
      { transaction }
    );

    // Mettre à jour le professeur
    await professeur.update(
      { grade, specialite },
      { transaction }
    );

    await transaction.commit();

    // Récupérer avec les relations
    const professeurComplet = await Professeur.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nom', 'prenom', 'email', 'telephone', 'actif']
        }
      ]
    });

    console.log(`[Professeurs] Professeur modifié - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Professeur modifié avec succès',
      data: { professeur: professeurComplet }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Professeurs] Erreur updateProfesseur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du professeur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteProfesseur = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const professeur = await Professeur.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user'
        },
        {
          model: Attribution,
          as: 'attributions'
        }
      ],
      transaction
    });

    if (!professeur) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Professeur introuvable'
      });
    }

    // Vérifier s'il y a des attributions
    if (professeur.attributions && professeur.attributions.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer ce professeur car des attributions y sont liées',
        data: {
          nombre_attributions: professeur.attributions.length
        }
      });
    }

    // Supprimer le professeur (cascade vers user grâce à onDelete: CASCADE)
    await professeur.destroy({ transaction });
    await professeur.user.destroy({ transaction });

    await transaction.commit();

    console.log(`[Professeurs] Professeur supprimé - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Professeur supprimé avec succès'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Professeurs] Erreur deleteProfesseur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du professeur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createProfesseur,
  getAllProfesseurs,
  getProfesseurById,
  updateProfesseur,
  deleteProfesseur
};