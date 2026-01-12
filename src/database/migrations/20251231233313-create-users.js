'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nom de famille de l\'utilisateur'
      },
      prenom: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Prénom de l\'utilisateur'
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Adresse email unique de l\'utilisateur',
        validate: {
          isEmail: true
        }
      },
      mot_de_passe: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Mot de passe hashé (bcrypt)'
      },
      telephone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Numéro de téléphone de l\'utilisateur'
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Référence au rôle (RUP, PROFESSEUR, ETUDIANT)'
      },
      actif: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Compte actif ou désactivé'
      },
      reset_password_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Token pour réinitialisation du mot de passe'
      },
      reset_password_expires: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date d\'expiration du token de réinitialisation'
      },
      derniere_connexion: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date de la dernière connexion'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      }
    });

    // Index sur l'email pour connexion rapide
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      unique: true
    });

    // Index sur le role_id
    await queryInterface.addIndex('users', ['role_id'], {
      name: 'idx_users_role_id'
    });

    // Index sur actif pour filtrer facilement
    await queryInterface.addIndex('users', ['actif'], {
      name: 'idx_users_actif'
    });

    // Index sur reset_password_token
    await queryInterface.addIndex('users', ['reset_password_token'], {
      name: 'idx_users_reset_token'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};