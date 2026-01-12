'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('cycles', [
      {
        nom: 'TS',
        description: 'Technicien Supérieur - Cycle de formation professionnelle de 3 ans délivrant un diplôme de Technicien Supérieur.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'ING',
        description: 'Ingénieur - Cycle de formation d\'ingénieur de 3 ans délivrant un diplôme d\'Ingénieur.',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('cycles', null, {});
  }
};