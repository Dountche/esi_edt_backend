'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('unites_enseignement', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Code de l\'UE (ex: UE1, UE2...)'
      },
      nom: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nom de l\'unité d\'enseignement'
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
      coefficient_total: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Coefficient total de l\'UE (somme des coefficients des matières)'
      },
      volume_horaire_total: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Volume horaire total de l\'UE (somme des volumes horaires des matières)'
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
    await queryInterface.addIndex('unites_enseignement', ['classe_id'], {
      name: 'idx_ues_classe_id'
    });

    // Index sur code
    await queryInterface.addIndex('unites_enseignement', ['code'], {
      name: 'idx_ues_code'
    });

    // Contrainte unique : pas deux UE avec le même code dans la même classe
    await queryInterface.addConstraint('unites_enseignement', {
      fields: ['code', 'classe_id'],
      type: 'unique',
      name: 'unique_ue_code_classe'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('unites_enseignement');
  }
};