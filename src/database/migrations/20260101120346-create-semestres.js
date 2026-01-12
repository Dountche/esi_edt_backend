'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('semestres', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Nom du semestre (ex: Semestre 1, Semestre 2)'
      },
      date_debut: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date de début du semestre'
      },
      date_fin: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date de fin du semestre'
      },
      annee_scolaire: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Année scolaire (ex: 2024-2025)'
      },
      actif: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Semestre actuellement actif'
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

    // Index sur annee_scolaire
    await queryInterface.addIndex('semestres', ['annee_scolaire'], {
      name: 'idx_semestres_annee_scolaire'
    });

    // Index sur actif
    await queryInterface.addIndex('semestres', ['actif'], {
      name: 'idx_semestres_actif'
    });

    // Contrainte unique : pas deux semestres identiques pour une année
    await queryInterface.addConstraint('semestres', {
      fields: ['nom', 'annee_scolaire'],
      type: 'unique',
      name: 'unique_semestre_annee'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('semestres');
  }
};