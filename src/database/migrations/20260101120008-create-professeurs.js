'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('professeurs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence à l\'utilisateur'
      },
      grade: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Grade du professeur (Assistant, Maître Assistant, Maître de Conférences...)'
      },
      specialite: {
        type: Sequelize.STRING(150),
        allowNull: true,
        comment: 'Spécialité d\'enseignement du professeur'
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

    // Index sur user_id
    await queryInterface.addIndex('professeurs', ['user_id'], {
      name: 'idx_professeurs_user_id',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('professeurs');
  }
};