'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Creneau extends Model {
    static associate(models) {
      // Un créneau appartient à un emploi du temps
      Creneau.belongsTo(models.EmploiTemps, {
        foreignKey: 'emploi_temps_id',
        as: 'emploi_temps'
      });

      // Un créneau appartient à une matière
      Creneau.belongsTo(models.Matiere, {
        foreignKey: 'matiere_id',
        as: 'matiere'
      });

      // Un créneau appartient à un professeur
      Creneau.belongsTo(models.Professeur, {
        foreignKey: 'professeur_id',
        as: 'professeur'
      });

      // Un créneau appartient à une salle
      Creneau.belongsTo(models.Salle, {
        foreignKey: 'salle_id',
        as: 'salle'
      });
    }
  }

  Creneau.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    emploi_temps_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'emplois_temps',
        key: 'id'
      }
    },
    jour_semaine: {
      type: DataTypes.ENUM('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'),
      allowNull: false
    },
    heure_debut: {
      type: DataTypes.TIME,
      allowNull: false
    },
    heure_fin: {
      type: DataTypes.TIME,
      allowNull: false
    },
    matiere_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'matieres',
        key: 'id'
      }
    },
    professeur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'professeurs',
        key: 'id'
      }
    },
    salle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'salles',
        key: 'id'
      }
    },
    semaine_numero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 16
      }
    },
    type_cours: {
      type: DataTypes.ENUM('CM', 'TD', 'TP'),
      allowNull: false
    },
    annule: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Creneau',
    tableName: 'creneaux',
    underscored: true,
    timestamps: true
  });

  return Creneau;
};