'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('filieres', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Nom de la filière : STIC ou STGI'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description de la filière'
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

    // Index sur le nom
    await queryInterface.addIndex('filieres', ['nom'], {
      name: 'idx_filieres_nom'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('filieres');
  }
};