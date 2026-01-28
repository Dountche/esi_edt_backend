'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('classes', 'salle_principale_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'salles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Salle principale dédiée à la classe'
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('classes', 'salle_principale_id');
  }
};