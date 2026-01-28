'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Supprimer l'ancienne colonne creneau_eps
        await queryInterface.removeColumn('classes', 'creneau_eps');

        // 2. Ajouter les nouvelles colonnes pour la précision horaire et la matière
        await queryInterface.addColumn('classes', 'heure_debut_eps', {
            type: Sequelize.TIME,
            allowNull: true
        });

        await queryInterface.addColumn('classes', 'heure_fin_eps', {
            type: Sequelize.TIME,
            allowNull: true
        });

        await queryInterface.addColumn('classes', 'matiere_eps_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'matieres',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('classes', 'matiere_eps_id');
        await queryInterface.removeColumn('classes', 'heure_fin_eps');
        await queryInterface.removeColumn('classes', 'heure_debut_eps');

        await queryInterface.addColumn('classes', 'creneau_eps', {
            type: Sequelize.ENUM('Matin', 'ApresMidi'),
            allowNull: true
        });
    }
};
