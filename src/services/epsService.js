const { Creneau, EmploiTemps, Classe, Matiere, Professeur, Salle } = require('../models');
const { Op } = require('sequelize');

/**
 * Synchronize EPS slots for a specific timetable based on class configuration
 */
const syncEpsCreneaux = async (emploiTempsId, transaction = null) => {
    try {
        const emploiTemps = await EmploiTemps.findByPk(emploiTempsId, {
            include: [{ model: Classe, as: 'classe' }],
            transaction
        });

        if (!emploiTemps || !emploiTemps.classe.jour_eps || !emploiTemps.classe.heure_debut_eps || !emploiTemps.classe.heure_fin_eps) {
            return;
        }

        const { jour_eps, heure_debut_eps, heure_fin_eps, matiere_eps_id } = emploiTemps.classe;

        let targetMatiereId = matiere_eps_id;

        if (!targetMatiereId) {
            const matiereEps = await Matiere.findOne({
                where: { nom: { [Op.iLike]: '%EPS%' } },
                transaction
            });
            if (matiereEps) targetMatiereId = matiereEps.id;
        }

        if (!targetMatiereId) {
            console.warn(`[EPS Service] No EPS Matiere specified or found for class ${emploiTemps.classe.id}.`);
            return;
        }

        // 2. Remove existing EPS creneaux for this timetable to avoid duplicates
        await Creneau.destroy({
            where: {
                emploi_temps_id: emploiTempsId,
                matiere_id: targetMatiereId
            },
            transaction
        });

        // 4. Create 16 creneaux
        const newCreneaux = [];
        for (let semaine = 1; semaine <= 16; semaine++) {
            newCreneaux.push({
                emploi_temps_id: emploiTempsId,
                jour_semaine: jour_eps,
                heure_debut: heure_debut_eps,
                heure_fin: heure_fin_eps,
                matiere_id: targetMatiereId,
                professeur_id: null,
                salle_id: null,
                semaine_numero: semaine,
                type_cours: 'TP',
                annule: false
            });
        }

        await Creneau.bulkCreate(newCreneaux, { transaction });
        console.log(`[EPS Service] Created 16 EPS slots for EDT ${emploiTempsId}`);

    } catch (error) {
        console.error('[EPS Service] Error in syncEpsCreneaux:', error);
        throw error;
    }
};

module.exports = {
    syncEpsCreneaux
};
