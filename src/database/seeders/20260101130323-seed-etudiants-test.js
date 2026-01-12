'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Récupérer les IDs des étudiants
    const [etudiants] = await queryInterface.sequelize.query(`
      SELECT u.id, u.nom, u.prenom
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.nom = 'ETUDIANT';
    `);

    // Récupérer les IDs des classes
    const [classes] = await queryInterface.sequelize.query(`
      SELECT id FROM classes LIMIT 2;
    `);

    const etudiantsData = etudiants.map((etud, index) => {
      const annee = new Date().getFullYear();
      const matricule = `TS${annee}${String(index + 1).padStart(3, '0')}`;

      return {
        user_id: etud.id,
        matricule: matricule,
        classe_id: classes[index % classes.length].id,
        created_at: new Date(),
        updated_at: new Date()
      };
    });

    await queryInterface.bulkInsert('etudiants', etudiantsData, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('etudiants', null, {});
  }
};