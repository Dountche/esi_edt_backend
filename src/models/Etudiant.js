'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Etudiant extends Model {
    static associate(models) {
      // Un étudiant appartient à un utilisateur
      Etudiant.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Un étudiant appartient à une classe
      Etudiant.belongsTo(models.Classe, {
        foreignKey: 'classe_id',
        as: 'classe'
      });
    }
  }

  Etudiant.init({
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
    matricule: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
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
    }
  }, {
    sequelize,
    modelName: 'Etudiant',
    tableName: 'etudiants',
    underscored: true,
    timestamps: true
  });

  return Etudiant;
};