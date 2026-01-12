'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('specialites', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nom de la spécialité (ex: Tronc commun STIC, STIC Info...)'
      },
      filiere_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'filieres',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Référence à la filière (STIC ou STGI)'
      },
      cycle_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cycles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Référence au cycle (TS ou ING)'
      },
      annee: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Année de la spécialité (1, 2, ou 3)',
        validate: {
          min: 1,
          max: 3
        }
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description de la spécialité'
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

    // Index sur les foreign keys
    await queryInterface.addIndex('specialites', ['filiere_id'], {
      name: 'idx_specialites_filiere_id'
    });
    
    await queryInterface.addIndex('specialites', ['cycle_id'], {
      name: 'idx_specialites_cycle_id'
    });

    // Index composite pour recherche rapide
    await queryInterface.addIndex('specialites', ['filiere_id', 'cycle_id', 'annee'], {
      name: 'idx_specialites_filiere_cycle_annee'
    });

    // Contrainte unique : pas deux spécialités identiques
    await queryInterface.addConstraint('specialites', {
      fields: ['nom', 'filiere_id', 'cycle_id'],
      type: 'unique',
      name: 'unique_specialite_filiere_cycle'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('specialites');
  }
};