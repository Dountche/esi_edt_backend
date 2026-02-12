'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('creneaux', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      emploi_temps_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'emplois_temps',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Référence à l\'emploi du temps'
      },
      jour_semaine: {
        type: Sequelize.ENUM('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'),
        allowNull: false,
        comment: 'Jour de la semaine du créneau'
      },
      heure_debut: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Heure de début du créneau'
      },
      heure_fin: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Heure de fin du créneau'
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
      salle_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'salles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Référence à la salle'
      },
      semaine_numero: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Numéro de la semaine (1 à 16 pour un semestre)',
        validate: {
          min: 1,
          max: 16
        }
      },
      annule: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Cours annulé (indisponibilité professeur)'
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

    // Index sur emploi_temps_id
    await queryInterface.addIndex('creneaux', ['emploi_temps_id'], {
      name: 'idx_creneaux_edt_id'
    });

    // Index sur matiere_id
    await queryInterface.addIndex('creneaux', ['matiere_id'], {
      name: 'idx_creneaux_matiere_id'
    });

    // Index sur professeur_id
    await queryInterface.addIndex('creneaux', ['professeur_id'], {
      name: 'idx_creneaux_professeur_id'
    });

    // Index sur salle_id
    await queryInterface.addIndex('creneaux', ['salle_id'], {
      name: 'idx_creneaux_salle_id'
    });

    // Index composite pour vérifier les chevauchements
    await queryInterface.addIndex('creneaux', ['jour_semaine', 'heure_debut', 'heure_fin', 'semaine_numero'], {
      name: 'idx_creneaux_jour_heure_semaine'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('creneaux');
  }
};