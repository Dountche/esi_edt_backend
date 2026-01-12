'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [
      {
        nom: 'RUP',
        description: 'Responsable d\'Unité Pédagogique - Peut créer et gérer les emplois du temps de ses classes, attribuer les professeurs aux matières, gérer les étudiants de ses classes et exporter les documents.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'PROFESSEUR',
        description: 'Professeur - Peut consulter son emploi du temps personnel auto-généré, déclarer ses indisponibilités et exporter son emploi du temps.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'ETUDIANT',
        description: 'Étudiant - Peut consulter l\'emploi du temps de sa classe, voir les coefficients et volumes horaires des matières/UE, et exporter les documents.',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};