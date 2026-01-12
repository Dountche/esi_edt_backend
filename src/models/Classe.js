'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Classe extends Model {
    static associate(models) {
      // Une classe appartient à une spécialité
      Classe.belongsTo(models.Specialite, {
        foreignKey: 'specialite_id',
        as: 'specialite'
      });

      // Une classe appartient à un RUP (User)
      Classe.belongsTo(models.User, {
        foreignKey: 'rup_id',
        as: 'rup'
      });

      // Une classe peut avoir plusieurs étudiants
      Classe.hasMany(models.Etudiant, {
        foreignKey: 'classe_id',
        as: 'etudiants'
      });

      // Une classe peut avoir plusieurs UE
      Classe.hasMany(models.UniteEnseignement, {
        foreignKey: 'classe_id',
        as: 'unites_enseignement'
      });

      // Une classe peut avoir plusieurs attributions
      Classe.hasMany(models.Attribution, {
        foreignKey: 'classe_id',
        as: 'attributions'
      });

      // Une classe peut avoir une seule salle principale
      Classe.belongsTo(models.Salle, {
        foreignKey: 'salle_principale_id',
        as: 'salle_principale'
      });

      // Une classe peut avoir plusieurs emplois du temps
      Classe.hasMany(models.EmploiTemps, {
        foreignKey: 'classe_id',
        as: 'emplois_temps'
      });
    }
  }

  Classe.init({
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
    specialite_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'specialites',
        key: 'id'
      }
    },
    rup_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    salle_principale_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'salles',
        key: 'id'
      }
    },
    annee_scolaire: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    }
  }, {
    sequelize,
    modelName: 'Classe',
    tableName: 'classes',
    underscored: true,
    timestamps: true
  });

  return Classe;
};