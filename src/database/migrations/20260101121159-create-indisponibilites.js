'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('indisponibilites', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      professeur_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'professeurs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence au professeur'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date de l\'indisponibilité'
      },
      heure_debut: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Heure de début de l\'indisponibilité'
      },
      heure_fin: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Heure de fin de l\'indisponibilité'
      },
      motif: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Motif de l\'indisponibilité'
      },
      statut: {
        type: Sequelize.ENUM('en_attente', 'approuvé', 'rejeté'),
        allowNull: false,
        defaultValue: 'en_attente',
        comment: 'Statut de l\'indisponibilité'
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

    // Index sur professeur_id
    await queryInterface.addIndex('indisponibilites', ['professeur_id'], {
      name: 'idx_indisponibilites_professeur_id'
    });

    // Index sur date
    await queryInterface.addIndex('indisponibilites', ['date'], {
      name: 'idx_indisponibilites_date'
    });

    // Index sur statut
    await queryInterface.addIndex('indisponibilites', ['statut'], {
      name: 'idx_indisponibilites_statut'
    });

    // Index composite pour recherche rapide
    await queryInterface.addIndex('indisponibilites', ['professeur_id', 'date', 'statut'], {
      name: 'idx_indisponibilites_prof_date_statut'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('indisponibilites');
  }
};