'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmploiTemps extends Model {
    static associate(models) {
      // Un emploi du temps appartient à une classe
      EmploiTemps.belongsTo(models.Classe, {
        foreignKey: 'classe_id',
        as: 'classe'
      });

      // Un emploi du temps appartient à un semestre
      EmploiTemps.belongsTo(models.Semestre, {
        foreignKey: 'semestre_id',
        as: 'semestre'
      });

      // Un emploi du temps peut avoir plusieurs créneaux
      EmploiTemps.hasMany(models.Creneau, {
        foreignKey: 'emploi_temps_id',
        as: 'creneaux'
      });
    }
  }

  EmploiTemps.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    classe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id'
      }
    },
    semestre_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'semestres',
        key: 'id'
      }
    },
    statut: {
      type: DataTypes.ENUM('brouillon', 'publié'),
      allowNull: false,
      defaultValue: 'brouillon'
    }
  }, {
    sequelize,
    modelName: 'EmploiTemps',
    tableName: 'emplois_temps',
    underscored: true,
    timestamps: true
  });

  return EmploiTemps;
};