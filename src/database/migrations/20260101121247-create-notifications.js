'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence à l\'utilisateur destinataire'
      },
      titre: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Titre de la notification'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Contenu de la notification'
      },
      type: {
        type: Sequelize.ENUM('emploi_temps', 'indisponibilite', 'attribution', 'systeme'),
        allowNull: false,
        comment: 'Type de notification'
      },
      lu: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Notification lue ou non'
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

    // Index sur user_id
    await queryInterface.addIndex('notifications', ['user_id'], {
      name: 'idx_notifications_user_id'
    });

    // Index sur lu
    await queryInterface.addIndex('notifications', ['lu'], {
      name: 'idx_notifications_lu'
    });

    // Index sur type
    await queryInterface.addIndex('notifications', ['type'], {
      name: 'idx_notifications_type'
    });

    // Index composite pour recherche rapide
    await queryInterface.addIndex('notifications', ['user_id', 'lu'], {
      name: 'idx_notifications_user_lu'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
  }
};