'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('classes', 'jour_eps', {
      type: Sequelize.ENUM('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'),
      allowNull: true
    });

    await queryInterface.addColumn('classes', 'creneau_eps', {
      type: Sequelize.ENUM('Matin', 'ApresMidi'),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('classes', 'jour_eps');
    await queryInterface.removeColumn('classes', 'creneau_eps');
    // Note: removing ENUM types in postgres is tricky, commonly left or handled with raw SQL if strictly needed
  }
};
