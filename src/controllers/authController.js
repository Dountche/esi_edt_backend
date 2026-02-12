const bcrypt = require('bcrypt');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const { User, Role, Professeur, Etudiant } = require('../models');

const register = async (req, res) => {
  // Validation avec Joi
  const schema = Joi.object({
    nom: Joi.string().min(2).required(),
    prenom: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    mot_de_passe: Joi.string().min(8).required(),
    telephone: Joi.string().optional(),
    role: Joi.string().valid('RUP', 'PROFESSEUR', 'ETUDIANT').required(),

    // Champs spécifiques selon le rôle
    // Pour PROFESSEUR
    grade: Joi.string().when('role', {
      is: 'PROFESSEUR',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    }),
    specialite: Joi.string().when('role', {
      is: 'PROFESSEUR',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    }),

    // Pour ETUDIANT
    matricule: Joi.string().when('role', {
      is: 'ETUDIANT',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    classe_id: Joi.number().integer().when('role', {
      is: 'ETUDIANT',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { nom, prenom, email, mot_de_passe, telephone, role, grade, specialite, matricule, classe_id } = value;

    // Vérifier si l'email existe déjà
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Vérifier si le matricule existe déjà (pour étudiants)
    if (role === 'ETUDIANT') {
      const matriculeExists = await Etudiant.findOne({ where: { matricule } });
      if (matriculeExists) {
        return res.status(400).json({
          success: false,
          message: 'Ce matricule est déjà utilisé'
        });
      }
    }

    // Récupérer le rôle depuis la base
    const roleData = await Role.findOne({ where: { nom: role } });
    if (!roleData) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
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
      role_id: roleData.id,
      actif: true
    });

    // Créer l'extension selon le rôle
    // Un RUP est aussi un Professeur (pour pouvoir enseigner)
    if (role === 'PROFESSEUR' || role === 'RUP') {
      await Professeur.create({
        user_id: user.id,
        grade: grade || null,
        specialite: specialite || null
      });
    } else if (role === 'ETUDIANT') {
      await Etudiant.create({
        user_id: user.id,
        matricule,
        classe_id
      });
    }

    // Récupérer l'utilisateur complet avec son rôle
    const userWithRole = await User.findByPk(user.id, {
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'nom', 'description']
        }
      ],
      attributes: { exclude: ['mot_de_passe'] }
    });

    console.log(`[Auth] Utilisateur créé - ID: ${user.id}, Email: ${email}, Rôle: ${role}`);

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: userWithRole
      }
    });

  } catch (error) {
    console.error('[Auth] Erreur register:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const login = async (req, res) => {
  // Validation
  const schema = Joi.object({
    email: Joi.string().email().required(),
    mot_de_passe: Joi.string().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { email, mot_de_passe } = value;

    // Récupérer l'utilisateur avec son rôle (besoin du mot de passe)
    // Récupérer l'utilisateur avec son rôle et profils associés (besoin du mot de passe)
    const user = await User.scope('withPassword').findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'nom']
        },
        {
          model: Professeur,
          as: 'professeur',
          attributes: ['id', 'grade', 'specialite']
        },
        {
          model: Etudiant,
          as: 'etudiant',
          attributes: ['id', 'matricule', 'classe_id'],
          include: [
            {
              model: require('../models').Classe,
              as: 'classe',
              attributes: ['id', 'nom', 'annee_scolaire']
            }
          ]
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est actif
    if (!user.actif) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été désactivé. Contactez un administrateur.'
      });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Mettre à jour la dernière connexion
    await user.update({
      derniere_connexion: new Date()
    });

    // Générer le token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role?.nom || null
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Retourner l'utilisateur sans le mot de passe
    const { mot_de_passe: _, ...userData } = user.toJSON();

    console.log(`[Auth] Connexion réussie - ID: ${user.id}, Email: ${email}, Rôle: ${user.role?.nom}`);

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('[Auth] Erreur login:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer l'utilisateur avec ses relations
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'nom', 'description']
        },
        {
          model: Professeur,
          as: 'professeur',
          attributes: ['id', 'grade', 'specialite']
        },
        {
          model: Etudiant,
          as: 'etudiant',
          attributes: ['id', 'matricule', 'classe_id'],
          include: [
            {
              model: require('../models').Classe,
              as: 'classe',
              attributes: ['id', 'nom', 'annee_scolaire']
            }
          ]
        }
      ],
      attributes: { exclude: ['mot_de_passe'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('[Auth] Erreur getMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des informations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateProfile = async (req, res) => {
  // Validation
  const schema = Joi.object({
    telephone: Joi.string().optional(),
    mot_de_passe_actuel: Joi.string().optional(),
    nouveau_mot_de_passe: Joi.string().min(8).when('mot_de_passe_actuel', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const userId = req.user.id;
    const { telephone, mot_de_passe_actuel, nouveau_mot_de_passe } = value;

    // Récupérer l'utilisateur avec mot de passe
    const user = await User.scope('withPassword').findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable'
      });
    }

    // Préparer les données à mettre à jour
    const updateData = {};

    // Mise à jour du téléphone
    if (telephone) {
      updateData.telephone = telephone;
    }

    // Mise à jour du mot de passe
    if (mot_de_passe_actuel && nouveau_mot_de_passe) {
      // Vérifier l'ancien mot de passe
      const validPassword = await bcrypt.compare(mot_de_passe_actuel, user.mot_de_passe);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: 'Mot de passe actuel incorrect'
        });
      }

      // Hasher le nouveau mot de passe
      const salt = await bcrypt.genSalt(10);
      updateData.mot_de_passe = await bcrypt.hash(nouveau_mot_de_passe, salt);
    }

    // Mettre à jour l'utilisateur
    await user.update(updateData);

    // Récupérer l'utilisateur mis à jour sans le mot de passe
    const updatedUser = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'nom']
        }
      ],
      attributes: { exclude: ['mot_de_passe'] }
    });

    console.log(`[Auth] Profil mis à jour - ID: ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('[Auth] Erreur updateProfile:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const forgotPassword = async (req, res) => {
  // Validation
  const schema = Joi.object({
    email: Joi.string().email().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { email } = value;

    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ where: { email } });

    // Pour des raisons de sécurité, on ne révèle pas si l'email existe
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
      });
    }
    // Pour l'instant, on simule juste la réponse
    console.log(`[Auth] Demande de réinitialisation pour: ${email}`);

    return res.status(200).json({
      success: true,
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
    });

  } catch (error) {
    console.error('[Auth] Erreur forgotPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la demande de réinitialisation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const resetPassword = async (req, res) => {
  // Validation
  const schema = Joi.object({
    token: Joi.string().required(),
    nouveau_mot_de_passe: Joi.string().min(8).required(),
    confirmation_mot_de_passe: Joi.string().valid(Joi.ref('nouveau_mot_de_passe')).required()
      .messages({
        'any.only': 'Les mots de passe ne correspondent pas'
      })
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { token, nouveau_mot_de_passe } = value;

    // TODO: Vérifier le token et récupérer l'email associé
    // Pour l'instant, on simule une erreur de token invalide
    return res.status(400).json({
      success: false,
      message: 'Token invalide ou expiré'
    });

    // Code à implémenter plus tard avec le service email
    /*
    const user = await User.findOne({ 
      where: { 
        reset_password_token: token,
        reset_password_expires: { [Op.gt]: new Date() }
      } 
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, salt);

    // Mettre à jour le mot de passe et supprimer le token
    await user.update({
      mot_de_passe: hashedPassword,
      reset_password_token: null,
      reset_password_expires: null
    });

    console.log(`[Auth] Mot de passe réinitialisé pour: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
    */

  } catch (error) {
    console.error('[Auth] Erreur resetPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation du mot de passe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword
};