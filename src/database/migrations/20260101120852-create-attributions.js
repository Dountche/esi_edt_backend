'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attributions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      professeur_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'professeurs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence au professeur'
      },
      matiere_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'matieres',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence à la matière'
      },
      classe_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence à la classe'
      },
      semestre_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'semestres',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence au semestre'
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

    // Index sur professeur_id
    await queryInterface.addIndex('attributions', ['professeur_id'], {
      name: 'idx_attributions_professeur_id'
    });

    // Index sur matiere_id
    await queryInterface.addIndex('attributions', ['matiere_id'], {
      name: 'idx_attributions_matiere_id'
    });

    // Index sur classe_id
    await queryInterface.addIndex('attributions', ['classe_id'], {
      name: 'idx_attributions_classe_id'
    });

    // Index sur semestre_id
    await queryInterface.addIndex('attributions', ['semestre_id'], {
      name: 'idx_attributions_semestre_id'
    });

    // Contrainte unique : un prof ne peut avoir qu'une seule attribution par matière/classe/semestre
    await queryInterface.addConstraint('attributions', {
      fields: ['professeur_id', 'matiere_id', 'classe_id', 'semestre_id'],
      type: 'unique',
      name: 'unique_attribution_prof_matiere_classe_semestre'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('attributions');
  }
};