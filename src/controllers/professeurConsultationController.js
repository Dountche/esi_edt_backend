const { Professeur, Attribution, Creneau, EmploiTemps, Matiere, Classe, Semestre, Salle, User, UniteEnseignement } = require('../models');


const getMonEmploiTemps = async (req, res) => {
  try {
    const { semestre_id } = req.query;

    // Récupérer le professeur connecté
    const professeur = await Professeur.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nom', 'prenom', 'email']
        }
      ]
    });

    if (!professeur) {
      return res.status(404).json({
        success: false,
        message: 'Profil professeur introuvable'
      });
    }

    // Déterminer le semestre
    let semestre;
    if (semestre_id) {
      semestre = await Semestre.findByPk(semestre_id);
    } else {
      semestre = await Semestre.findOne({ where: { actif: true } });
    }

    if (!semestre) {
      return res.status(404).json({
        success: false,
        message: 'Aucun semestre trouvé'
      });
    }

    // Récupérer toutes les attributions du professeur pour ce semestre
    const attributions = await Attribution.findAll({
      where: {
        professeur_id: professeur.id,
        semestre_id: semestre.id
      },
      include: [
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom', 'code', 'coefficient', 'volume_horaire'],
          include: [
            {
              model: UniteEnseignement,
              as: 'unite_enseignement',
              attributes: ['id', 'code', 'nom']
            }
          ]
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire']
        }
      ]
    });

    // Récupérer tous les créneaux du professeur pour ce semestre
    const creneaux = await Creneau.findAll({
      where: { professeur_id: professeur.id },
      include: [
        {
          model: EmploiTemps,
          as: 'emploi_temps',
          where: { semestre_id: semestre.id },
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'nom', 'annee_scolaire']
            }
          ]
        },
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom', 'code']
        },
        {
          model: Salle,
          as: 'salle',
          attributes: ['id', 'nom', 'type']
        }
      ],
      order: [
        ['semaine_numero', 'ASC'],
        ['jour_semaine', 'ASC'],
        ['heure_debut', 'ASC']
      ]
    });

    // Organiser les créneaux par jour
    const creneauxParJour = {};
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    
    jours.forEach(jour => {
      creneauxParJour[jour] = creneaux.filter(c => c.jour_semaine === jour);
    });

    // Calculer les statistiques
    const classes = [...new Set(creneaux.map(c => c.emploi_temps.classe_id))];
    const volumeHoraireTotal = attributions.reduce((total, attr) => 
      total + (parseInt(attr.matiere.volume_horaire) || 0), 0
    );

    return res.status(200).json({
      success: true,
      data: {
        professeur: {
          id: professeur.id,
          nom: professeur.user.nom,
          prenom: professeur.user.prenom,
          grade: professeur.grade,
          specialite: professeur.specialite
        },
        semestre: {
          id: semestre.id,
          nom: semestre.nom,
          date_debut: semestre.date_debut,
          date_fin: semestre.date_fin,
          actif: semestre.actif
        },
        attributions,
        creneaux_par_jour: creneauxParJour,
        statistiques: {
          nombre_classes: classes.length,
          nombre_matieres: attributions.length,
          volume_horaire_total: volumeHoraireTotal,
          nombre_creneaux: creneaux.length
        }
      }
    });

  } catch (error) {
    console.error('[ProfesseurConsultation] Erreur getMonEmploiTemps:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'emploi du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const getEmploiTempsProfesseur = async (req, res) => {
  try {
    const { id } = req.params;
    const { semestre_id } = req.query;

    // Récupérer le professeur
    const professeur = await Professeur.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nom', 'prenom', 'email']
        }
      ]
    });

    if (!professeur) {
      return res.status(404).json({
        success: false,
        message: 'Professeur introuvable'
      });
    }

    // Déterminer le semestre
    let semestre;
    if (semestre_id) {
      semestre = await Semestre.findByPk(semestre_id);
    } else {
      semestre = await Semestre.findOne({ where: { actif: true } });
    }

    if (!semestre) {
      return res.status(404).json({
        success: false,
        message: 'Aucun semestre trouvé'
      });
    }

    // Récupérer les créneaux
    const creneaux = await Creneau.findAll({
      where: { professeur_id: professeur.id },
      include: [
        {
          model: EmploiTemps,
          as: 'emploi_temps',
          where: { semestre_id: semestre.id },
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'nom', 'annee_scolaire']
            }
          ]
        },
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom', 'code']
        },
        {
          model: Salle,
          as: 'salle',
          attributes: ['id', 'nom', 'type']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      data: {
        professeur: {
          id: professeur.id,
          nom: professeur.user.nom,
          prenom: professeur.user.prenom,
          grade: professeur.grade
        },
        semestre,
        creneaux
      }
    });

  } catch (error) {
    console.error('[ProfesseurConsultation] Erreur getEmploiTempsProfesseur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'emploi du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getMonEmploiTemps,
  getEmploiTempsProfesseur
};