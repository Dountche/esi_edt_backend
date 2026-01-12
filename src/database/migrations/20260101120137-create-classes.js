'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('classes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nom de la classe (ex: STIC 1A, STGI 2 PMSI...)'
      },
      specialite_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'specialites',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Référence à la spécialité'
      },
      rup_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Référence au Responsable d\'Unité Pédagogique (RUP)'
      },
      annee_scolaire: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Année scolaire (ex: 2024-2025)'
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

    // Index sur specialite_id
    await queryInterface.addIndex('classes', ['specialite_id'], {
      name: 'idx_classes_specialite_id'
    });

    // Index sur rup_id
    await queryInterface.addIndex('classes', ['rup_id'], {
      name: 'idx_classes_rup_id'
    });

    // Index sur annee_scolaire
    await queryInterface.addIndex('classes', ['annee_scolaire'], {
      name: 'idx_classes_annee_scolaire'
    });

    // Contrainte unique : pas deux classes identiques pour une année donnée
    await queryInterface.addConstraint('classes', {
      fields: ['nom', 'specialite_id', 'annee_scolaire'],
      type: 'unique',
      name: 'unique_classe_specialite_annee'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('classes');
  }
};