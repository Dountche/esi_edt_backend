'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UniteEnseignement extends Model {
    static associate(models) {
      // Une UE appartient à une classe
      UniteEnseignement.belongsTo(models.Classe, {
        foreignKey: 'classe_id',
        as: 'classe'
      });

      // Une UE peut avoir plusieurs matières
      UniteEnseignement.hasMany(models.Matiere, {
        foreignKey: 'ue_id',
        as: 'matieres'
      });
    }
  }

  UniteEnseignement.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    nom: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    classe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id'
      }
    },
    coefficient_total: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    volume_horaire_total: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'UniteEnseignement',
    tableName: 'unites_enseignement',
    underscored: true,
    timestamps: true
  });

  return UniteEnseignement;
};