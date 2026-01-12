'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('emplois_temps', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      classe_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence à la classe'
      },
      semestre_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'semestres',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence au semestre'
      },
      statut: {
        type: Sequelize.ENUM('brouillon', 'publié'),
        allowNull: false,
        defaultValue: 'brouillon',
        comment: 'Statut de l\'emploi du temps'
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

    // Index sur classe_id
    await queryInterface.addIndex('emplois_temps', ['classe_id'], {
      name: 'idx_edt_classe_id'
    });

    // Index sur semestre_id
    await queryInterface.addIndex('emplois_temps', ['semestre_id'], {
      name: 'idx_edt_semestre_id'
    });

    // Index sur statut
    await queryInterface.addIndex('emplois_temps', ['statut'], {
      name: 'idx_edt_statut'
    });

    // Contrainte unique : un seul EDT par classe et par semestre
    await queryInterface.addConstraint('emplois_temps', {
      fields: ['classe_id', 'semestre_id'],
      type: 'unique',
      name: 'unique_edt_classe_semestre'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('emplois_temps');
  }
};