const Joi = require('joi');
const { Domaine } = require('../models');

const getAllDomaines = async (req, res) => {
    try {
        const domaines = await Domaine.findAll({
            order: [['nom', 'ASC']]
        });
        return res.status(200).json({ success: true, data: domaines });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createDomaine = async (req, res) => {
    const schema = Joi.object({
        nom: Joi.string().required()
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    try {
        const domaine = await Domaine.create(value);
        return res.status(201).json({ success: true, data: domaine });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateDomaine = async (req, res) => {
    try {
        const domaine = await Domaine.findByPk(req.params.id);
        if (!domaine) return res.status(404).json({ success: false, message: 'Domaine introuvable' });
        await domaine.update(req.body);
        return res.status(200).json({ success: true, data: domaine });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteDomaine = async (req, res) => {
    try {
        const domaine = await Domaine.findByPk(req.params.id);
        if (!domaine) return res.status(404).json({ success: false, message: 'Domaine introuvable' });
        await domaine.destroy();
        return res.status(200).json({ success: true, message: 'Domaine supprimé' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getAllDomaines, createDomaine, updateDomaine, deleteDomaine };
