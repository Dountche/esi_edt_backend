'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('semestres', [
      {
        nom: 'Semestre 1',
        date_debut: '2025-10-01',
        date_fin: '2026-02-15',
        annee_scolaire: '2025-2026',
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Semestre 2',
        date_debut: '2026-02-17',
        date_fin: '2026-07-15',
        annee_scolaire: '2025-2026',
        actif: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('semestres', null, {});
  }
};