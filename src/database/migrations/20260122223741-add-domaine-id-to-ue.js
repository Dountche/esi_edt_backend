'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('unites_enseignement', 'domaine_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'domaines',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('unites_enseignement', 'domaine_id');
    }
};
