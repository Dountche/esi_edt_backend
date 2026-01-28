'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('matieres', 'dfr_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'dfrs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('matieres', 'dfr_id');
  }
};
