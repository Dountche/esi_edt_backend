'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Matiere extends Model {
    static associate(models) {
      // Une matière appartient à une UE
      Matiere.belongsTo(models.UniteEnseignement, {
        foreignKey: 'ue_id',
        as: 'unite_enseignement'
      });

      // Une matière peut avoir plusieurs attributions
      Matiere.hasMany(models.Attribution, {
        foreignKey: 'matiere_id',
        as: 'attributions'
      });

      // Une matière peut avoir plusieurs créneaux
      Matiere.hasMany(models.Creneau, {
        foreignKey: 'matiere_id',
        as: 'creneaux'
      });

      // Une matière appartient à un DFR
      Matiere.belongsTo(models.DFR, {
        foreignKey: 'dfr_id',
        as: 'dfr'
      });
    }
  }

  Matiere.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    ue_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'unites_enseignement',
        key: 'id'
      }
    },
    coefficient: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    volume_horaire: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    periode: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    dfr_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'dfrs',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Matiere',
    tableName: 'matieres',
    underscored: true,
    timestamps: true
  });

  return Matiere;
};