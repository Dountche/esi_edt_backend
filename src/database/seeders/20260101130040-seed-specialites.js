'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Récupérer les IDs des filières et cycles
    const [filieres] = await queryInterface.sequelize.query(
      `SELECT id, nom FROM filieres;`
    );
    const [cycles] = await queryInterface.sequelize.query(
      `SELECT id, nom FROM cycles;`
    );

    const sticId = filieres.find(f => f.nom === 'STIC').id;
    const stgiId = filieres.find(f => f.nom === 'STGI').id;
    const tsId = cycles.find(c => c.nom === 'TS').id;
    const ingId = cycles.find(c => c.nom === 'ING').id;

    await queryInterface.bulkInsert('specialites', [
      // STIC - TS
      {
        nom: 'Tronc commun STIC',
        filiere_id: sticId,
        cycle_id: tsId,
        annee: 1,
        description: 'Première année de tronc commun STIC pour le cycle Technicien Supérieur - Formation de base en informatique et télécommunications.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STIC Info',
        filiere_id: sticId,
        cycle_id: tsId,
        annee: 2,
        description: 'Spécialité Informatique pour les 2ème et 3ème années du cycle TS - Développement logiciel, bases de données, génie logiciel.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STIC EIT',
        filiere_id: sticId,
        cycle_id: tsId,
        annee: 2,
        description: 'Spécialité Électronique et Informatique des Télécommunications pour les 2ème et 3ème années du cycle TS - Systèmes embarqués, électronique numérique.',
        created_at: new Date(),
        updated_at: new Date()
      },

      // STIC - ING
      {
        nom: 'Tronc commun STIC',
        filiere_id: sticId,
        cycle_id: ingId,
        annee: 1,
        description: 'Première année de tronc commun STIC pour le cycle Ingénieur - Formation de base approfondie en informatique et télécommunications.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STIC Info',
        filiere_id: sticId,
        cycle_id: ingId,
        annee: 2,
        description: 'Spécialité Informatique pour les 2ème et 3ème années du cycle ING - Architecture logicielle, systèmes distribués, IA.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STIC EIT',
        filiere_id: sticId,
        cycle_id: ingId,
        annee: 2,
        description: 'Spécialité Électronique et Informatique des Télécommunications pour les 2ème et 3ème années du cycle ING - Réseaux avancés, IoT.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STIC TLR',
        filiere_id: sticId,
        cycle_id: ingId,
        annee: 2,
        description: 'Spécialité Télécommunications et Réseaux pour les 2ème et 3ème années du cycle ING uniquement - Réseaux, sécurité, cloud.',
        created_at: new Date(),
        updated_at: new Date()
      },

      // STGI - TS
      {
        nom: 'Tronc commun STGI',
        filiere_id: stgiId,
        cycle_id: tsId,
        annee: 1,
        description: 'Première année de tronc commun STGI pour le cycle Technicien Supérieur - Formation de base en génie industriel.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STGI PMSI',
        filiere_id: stgiId,
        cycle_id: tsId,
        annee: 2,
        description: 'Spécialité Production et Maintenance des Systèmes Industriels pour les 2ème et 3ème années du cycle TS.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STGI EAI',
        filiere_id: stgiId,
        cycle_id: tsId,
        annee: 2,
        description: 'Spécialité Électrotechnique et Automatismes Industriels pour les 2ème et 3ème années du cycle TS.',
        created_at: new Date(),
        updated_at: new Date()
      },

      // STGI - ING
      {
        nom: 'Tronc commun STGI',
        filiere_id: stgiId,
        cycle_id: ingId,
        annee: 1,
        description: 'Première année de tronc commun STGI pour le cycle Ingénieur - Formation de base approfondie en génie industriel.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STGI PMSI',
        filiere_id: stgiId,
        cycle_id: ingId,
        annee: 2,
        description: 'Spécialité Production et Maintenance des Systèmes Industriels pour les 2ème et 3ème années du cycle ING.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STGI EAI',
        filiere_id: stgiId,
        cycle_id: ingId,
        annee: 2,
        description: 'Spécialité Électrotechnique et Automatismes Industriels pour les 2ème et 3ème années du cycle ING.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'STGI MA',
        filiere_id: stgiId,
        cycle_id: ingId,
        annee: 2,
        description: 'Spécialité Mécatronique et Automatisation pour les 2ème et 3ème années du cycle ING.',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('specialites', null, {});
  }
};