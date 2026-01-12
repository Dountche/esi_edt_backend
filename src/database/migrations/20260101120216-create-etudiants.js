'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('etudiants', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence à l\'utilisateur'
      },
      matricule: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Matricule unique de l\'étudiant'
      },
      classe_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Référence à la classe de l\'étudiant'
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
    await queryInterface.addIndex('etudiants', ['user_id'], {
      name: 'idx_etudiants_user_id',
      unique: true
    });

    // Index sur matricule
    await queryInterface.addIndex('etudiants', ['matricule'], {
      name: 'idx_etudiants_matricule',
      unique: true
    });

    // Index sur classe_id
    await queryInterface.addIndex('etudiants', ['classe_id'], {
      name: 'idx_etudiants_classe_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('etudiants');
  }
};