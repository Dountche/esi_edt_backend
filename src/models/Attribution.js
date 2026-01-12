'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Attribution extends Model {
    static associate(models) {
      // Une attribution appartient à un professeur
      Attribution.belongsTo(models.Professeur, {
        foreignKey: 'professeur_id',
        as: 'professeur'
      });

      // Une attribution appartient à une matière
      Attribution.belongsTo(models.Matiere, {
        foreignKey: 'matiere_id',
        as: 'matiere'
      });

      // Une attribution appartient à une classe
      Attribution.belongsTo(models.Classe, {
        foreignKey: 'classe_id',
        as: 'classe'
      });

      // Une attribution appartient à un semestre
      Attribution.belongsTo(models.Semestre, {
        foreignKey: 'semestre_id',
        as: 'semestre'
      });
    }
  }

  Attribution.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    professeur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'professeurs',
        key: 'id'
      }
    },
    matiere_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'matieres',
        key: 'id'
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
    semestre_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'semestres',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Attribution',
    tableName: 'attributions',
    underscored: true,
    timestamps: true
  });

  return Attribution;
};