'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Specialite extends Model {
    static associate(models) {
      // Une spécialité appartient à une filière
      Specialite.belongsTo(models.Filiere, {
        foreignKey: 'filiere_id',
        as: 'filiere'
      });

      // Une spécialité appartient à un cycle
      Specialite.belongsTo(models.Cycle, {
        foreignKey: 'cycle_id',
        as: 'cycle'
      });

      // Une spécialité peut avoir plusieurs classes
      Specialite.hasMany(models.Classe, {
        foreignKey: 'specialite_id',
        as: 'classes'
      });
    }
  }

  Specialite.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    filiere_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'filieres',
        key: 'id'
      }
    },
    cycle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cycles',
        key: 'id'
      }
    },
    annee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 3
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Specialite',
    tableName: 'specialites',
    underscored: true,
    timestamps: true
  });

  return Specialite;
};