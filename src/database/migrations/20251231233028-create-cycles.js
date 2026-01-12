'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cycles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
        comment: 'Nom du cycle : TS ou ING'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description du cycle (Technicien Supérieur ou Ingénieur)'
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
    await queryInterface.addIndex('cycles', ['nom'], {
      name: 'idx_cycles_nom'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cycles');
  }
};