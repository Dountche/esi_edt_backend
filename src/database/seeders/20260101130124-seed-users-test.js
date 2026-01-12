'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Récupérer les IDs des rôles
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, nom FROM roles;`
    );

    const rupRoleId = roles.find(r => r.nom === 'RUP').id;
    const profRoleId = roles.find(r => r.nom === 'PROFESSEUR').id;
    const etudiantRoleId = roles.find(r => r.nom === 'ETUDIANT').id;

    // Hash du mot de passe par défaut : "Password123!"
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    await queryInterface.bulkInsert('users', [
      // RUP - 2 utilisateurs
      {
        nom: 'Koné',
        prenom: 'Jean',
        email: 'jean.kone@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 01 02 03 04',
        role_id: rupRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Diabaté',
        prenom: 'Aminata',
        email: 'aminata.diabate@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 11 12 13 14',
        role_id: rupRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },

      // PROFESSEURS - 3 utilisateurs
      {
        nom: 'Yao',
        prenom: 'Kouadio',
        email: 'kouadio.yao@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 21 22 23 24',
        role_id: profRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Kouassi',
        prenom: 'Marie',
        email: 'marie.kouassi@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 31 32 33 34',
        role_id: profRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Bamba',
        prenom: 'Seydou',
        email: 'seydou.bamba@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 41 42 43 44',
        role_id: profRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },

      // ÉTUDIANTS - 5 utilisateurs
      {
        nom: 'Traoré',
        prenom: 'Fatou',
        email: 'fatou.traore@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 51 52 53 54',
        role_id: etudiantRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Ouattara',
        prenom: 'Ibrahim',
        email: 'ibrahim.ouattara@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 61 62 63 64',
        role_id: etudiantRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'N\'Guessan',
        prenom: 'Aïcha',
        email: 'aicha.nguessan@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 71 72 73 74',
        role_id: etudiantRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Coulibaly',
        prenom: 'Mamadou',
        email: 'mamadou.coulibaly@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 81 82 83 84',
        role_id: etudiantRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Soro',
        prenom: 'Awa',
        email: 'awa.soro@esi.ci',
        mot_de_passe: hashedPassword,
        telephone: '+225 07 91 92 93 94',
        role_id: etudiantRoleId,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};