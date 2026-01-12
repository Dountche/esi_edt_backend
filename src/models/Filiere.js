'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Filiere extends Model {
    static associate(models) {
      // Une filière peut avoir plusieurs spécialités
      Filiere.hasMany(models.Specialite, {
        foreignKey: 'filiere_id',
        as: 'specialites'
      });
    }
  }

  Filiere.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(50),
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
    modelName: 'Filiere',
    tableName: 'filieres',
    underscored: true,
    timestamps: true
  });

  return Filiere;
};