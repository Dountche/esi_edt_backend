'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('matieres', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nom de la matière'
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Code de la matière (ex: MATH101, INFO201...)'
      },
      ue_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'unites_enseignement',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence à l\'unité d\'enseignement'
      },
      coefficient: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Coefficient de la matière',
        validate: {
          min: 0
        }
      },
      volume_horaire: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Volume horaire total de la matière',
        validate: {
          min: 0
        }
      },
      periode: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Période de la matière (ex: 2 fois par semaine, 4 fois par mois...)'
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

    // Index sur ue_id
    await queryInterface.addIndex('matieres', ['ue_id'], {
      name: 'idx_matieres_ue_id'
    });

    // Index sur code
    await queryInterface.addIndex('matieres', ['code'], {
      name: 'idx_matieres_code'
    });

    // Contrainte unique : pas deux matières avec le même code dans la même UE
    await queryInterface.addConstraint('matieres', {
      fields: ['code', 'ue_id'],
      type: 'unique',
      name: 'unique_matiere_code_ue'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('matieres');
  }
};