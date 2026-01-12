'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('salles', [
      // Amphithéâtres
      {
        nom: 'Amphi A',
        capacite: 200,
        type: 'Amphi',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Amphi B',
        capacite: 150,
        type: 'Amphi',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Amphi C',
        capacite: 180,
        type: 'Amphi',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Salles TD
      {
        nom: 'Salle TD1',
        capacite: 40,
        type: 'TD',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Salle TD2',
        capacite: 40,
        type: 'TD',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Salle TD3',
        capacite: 35,
        type: 'TD',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Salle TD4',
        capacite: 45,
        type: 'TD',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Salles TP
      {
        nom: 'Labo Info 1',
        capacite: 30,
        type: 'TP',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Labo Info 2',
        capacite: 30,
        type: 'TP',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Labo Réseaux',
        capacite: 25,
        type: 'TP',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Laboratoires
      {
        nom: 'Labo Électronique',
        capacite: 20,
        type: 'Labo',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Labo Automatique',
        capacite: 20,
        type: 'Labo',
        disponible: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('salles', null, {});
  }
};