'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Domaine extends Model {
        static associate(models) {
            // Un domaine peut avoir plusieurs UEs
            Domaine.hasMany(models.UniteEnseignement, {
                foreignKey: 'domaine_id',
                as: 'unites_enseignement'
            });
        }
    }
    Domaine.init({
        nom: {
            type: DataTypes.STRING(100),
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Domaine',
        tableName: 'domaines',
        underscored: true,
        timestamps: true
    });
    return Domaine;
};