'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class DFR extends Model {
        static associate(models) {
            // Un DFR peut avoir plusieurs matières
            DFR.hasMany(models.Matiere, {
                foreignKey: 'dfr_id',
                as: 'matieres'
            });
        }
    }

    DFR.init({
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
        couleur: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: '#FFFFFF'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'DFR',
        tableName: 'dfrs',
        underscored: true,
        timestamps: true
    });

    return DFR;
};
