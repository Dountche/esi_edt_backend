'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Semestre extends Model {
    static associate(models) {
      // Un semestre peut avoir plusieurs attributions
      Semestre.hasMany(models.Attribution, {
        foreignKey: 'semestre_id',
        as: 'attributions'
      });

      // Un semestre peut avoir plusieurs emplois du temps
      Semestre.hasMany(models.EmploiTemps, {
        foreignKey: 'semestre_id',
        as: 'emplois_temps'
      });
    }
  }

  Semestre.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    date_debut: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    date_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    annee_scolaire: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Semestre',
    tableName: 'semestres',
    underscored: true,
    timestamps: true
  });

  return Semestre;
};