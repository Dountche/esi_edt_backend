'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Indisponibilite extends Model {
    static associate(models) {
      // Une indisponibilité appartient à un professeur
      Indisponibilite.belongsTo(models.Professeur, {
        foreignKey: 'professeur_id',
        as: 'professeur'
      });
    }
  }

  Indisponibilite.init({
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
    date: {
      type: DataTypes.DATEONLY,
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
      motif: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      statut: {
        type: DataTypes.ENUM('en_attente', 'approuvé', 'rejeté'),
        allowNull: false,
        defaultValue: 'en_attente'
      }
    },
    {
      sequelize,
      modelName: 'Indisponibilite',
      tableName: 'indisponibilites',
      underscored: true,
      timestamps: true
    }
  );

  return Indisponibilite;
};
