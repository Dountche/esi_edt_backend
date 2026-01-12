'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('filieres', [
      {
        nom: 'STIC',
        description: 'Sciences et Technologies de l\'Information et de la Communication - Filière axée sur l\'informatique, les réseaux, les télécommunications et l\'électronique.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STGI',
        description: 'Sciences et Technologies du Génie Industriel - Filière axée sur le génie industriel, la production, la maintenance et l\'automatisation.',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('filieres', null, {});
  }
};