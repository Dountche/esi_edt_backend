'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('domaines', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            nom: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                field: 'created_at'
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                field: 'updated_at'
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('domaines');
    }
};