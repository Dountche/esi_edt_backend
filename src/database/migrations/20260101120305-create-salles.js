'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('salles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Nom de la salle (ex: Amphi A, Salle TD1...)'
      },
      capacite: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Capacité d\'accueil de la salle',
        validate: {
          min: 1
        }
      },
      type: {
        type: Sequelize.ENUM('salle de cours', 'Amphi', 'TD', 'TP', 'Labo'),
        allowNull: false,
        comment: 'Type de salle (Amphi, TD, TP, Labo)'
      },
      disponible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Salle disponible ou hors service'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      }
    });

    // Index sur nom
    await queryInterface.addIndex('salles', ['nom'], {
      name: 'idx_salles_nom',
      unique: true
    });

    // Index sur type
    await queryInterface.addIndex('salles', ['type'], {
      name: 'idx_salles_type'
    });

    // Index sur disponible
    await queryInterface.addIndex('salles', ['disponible'], {
      name: 'idx_salles_disponible'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('salles');
  }
};