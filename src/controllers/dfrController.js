const Joi = require('joi');
const { DFR } = require('../models');

const getAllDFRs = async (req, res) => {
    try {
        const dfrs = await DFR.findAll({
            order: [['nom', 'ASC']]
        });
        return res.status(200).json({ success: true, data: dfrs });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createDFR = async (req, res) => {
    const schema = Joi.object({
        nom: Joi.string().required(),
        couleur: Joi.string().required(),
        description: Joi.string().optional().allow('', null)
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    try {
        const dfr = await DFR.create(value);
        return res.status(201).json({ success: true, data: dfr });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateDFR = async (req, res) => {
    try {
        const dfr = await DFR.findByPk(req.params.id);
        if (!dfr) return res.status(404).json({ success: false, message: 'DFR introuvable' });
        await dfr.update(req.body);
        return res.status(200).json({ success: true, data: dfr });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteDFR = async (req, res) => {
    try {
        const dfr = await DFR.findByPk(req.params.id);
        if (!dfr) return res.status(404).json({ success: false, message: 'DFR introuvable' });
        await dfr.destroy();
        return res.status(200).json({ success: true, message: 'DFR supprimé' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getAllDFRs, createDFR, updateDFR, deleteDFR };
