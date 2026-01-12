'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Récupérer les IDs des professeurs (users avec role PROFESSEUR)
    const [professeurs] = await queryInterface.sequelize.query(`
      SELECT u.id, u.nom, u.prenom 
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.nom = 'PROFESSEUR';
    `);

    const professeursData = professeurs.map((prof, index) => {
      const grades = ['Assistant', 'Maître Assistant', 'Maître de Conférences'];
      const specialites = ['Informatique', 'Réseaux et Télécommunications', 'Mathématiques Appliquées'];

      return {
        user_id: prof.id,
        grade: grades[index % grades.length],
        specialite: specialites[index % specialites.length],
        created_at: new Date(),
        updated_at: new Date()
      };
    });

    await queryInterface.bulkInsert('professeurs', professeursData, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('professeurs', null, {});
  }
};