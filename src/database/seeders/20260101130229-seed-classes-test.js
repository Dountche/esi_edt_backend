'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Récupérer les IDs des spécialités
    const [specialites] = await queryInterface.sequelize.query(`
      SELECT s.id, s.nom, c.nom as cycle, f.nom as filiere
      FROM specialites s
      INNER JOIN cycles c ON s.cycle_id = c.id
      INNER JOIN filieres f ON s.filiere_id = f.id
      WHERE s.annee = 1;
    `);

    // Récupérer les IDs des RUP
    const [rups] = await queryInterface.sequelize.query(`
      SELECT u.id
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.nom = 'RUP';
    `);

    const classes = [];
    let rupIndex = 0;

    // Créer les classes pour les troncs communs (1ère année)
    specialites.forEach(spec => {
      // Classe A
      classes.push({
        nom: `${spec.cycle} ${spec.filiere} 1A`,
        specialite_id: spec.id,
        rup_id: rups[rupIndex % rups.length].id,
        annee_scolaire: '2024-2025',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Classe B
      classes.push({
        nom: `${spec.cycle} ${spec.filiere} 1B`,
        specialite_id: spec.id,
        rup_id: rups[rupIndex % rups.length].id,
        annee_scolaire: '2024-2025',
        created_at: new Date(),
        updated_at: new Date()
      });

      rupIndex++;
    });

    await queryInterface.bulkInsert('classes', classes, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('classes', null, {});
  }
};