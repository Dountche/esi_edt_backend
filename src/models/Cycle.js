'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cycle extends Model {
    static associate(models) {
      // Un cycle peut avoir plusieurs spécialités
      Cycle.hasMany(models.Specialite, {
        foreignKey: 'cycle_id',
        as: 'specialites'
      });
    }
  }

  Cycle.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Cycle',
    tableName: 'cycles',
    underscored: true,
    timestamps: true
  });

  return Cycle;
};