'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Professeur extends Model {
    static associate(models) {
      // Un professeur appartient à un utilisateur
      Professeur.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Un professeur peut avoir plusieurs attributions
      Professeur.hasMany(models.Attribution, {
        foreignKey: 'professeur_id',
        as: 'attributions'
      });

      // Un professeur peut avoir plusieurs créneaux
      Professeur.hasMany(models.Creneau, {
        foreignKey: 'professeur_id',
        as: 'creneaux'
      });

      // Un professeur peut avoir plusieurs indisponibilités
      Professeur.hasMany(models.Indisponibilite, {
        foreignKey: 'professeur_id',
        as: 'indisponibilites'
      });
    }
  }

  Professeur.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    grade: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    specialite: {
      type: DataTypes.STRING(150),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Professeur',
    tableName: 'professeurs',
    underscored: true,
    timestamps: true
  });

  return Professeur;
};