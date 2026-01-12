'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Salle extends Model {
    static associate(models) {
      // Une salle peut avoir plusieurs créneaux
      Salle.hasMany(models.Creneau, {
        foreignKey: 'salle_id',
        as: 'creneaux'
      });
    }
  }

  Salle.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    capacite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    type: {
      type: DataTypes.ENUM('Amphi', 'TD', 'TP', 'Labo'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    disponible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Salle',
    tableName: 'salles',
    underscored: true,
    timestamps: true
  });

  return Salle;
};