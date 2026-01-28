const { User, Classe, Etudiant, UniteEnseignement, Matiere, EmploiTemps, Indisponibilite, Professeur, Attribution, Creneau, Semestre } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc Dashboard pour RUP
 * @route GET /api/dashboard/rup
 * @access Private (RUP uniquement)
 */
const getDashboardRUP = async (req, res) => {
  try {
    // Récupérer les classes du RUP
    const classes = await Classe.findAll({
      where: { rup_id: req.user.id },
      attributes: ['id']
    });

    const classeIds = classes.map(c => c.id);

    // Nombre de classes
    const nombreClasses = classeIds.length;

    // Nombre d'étudiants
    const nombreEtudiants = await Etudiant.count({
      where: { classe_id: classeIds }
    });

    // Nombre d'UE
    const nombreUes = await UniteEnseignement.count({
      where: { classe_id: classeIds }
    });

    // Nombre de matières
    const nombreMatieres = await Matiere.count({
      include: [
        {
          model: UniteEnseignement,
          as: 'unite_enseignement',
          where: { classe_id: classeIds },
          attributes: []
        }
      ]
    });

    // Emplois du temps par statut
    const emploisTemps = await EmploiTemps.findAll({
      where: { classe_id: classeIds },
      attributes: ['statut']
    });

    const emploisTempsStats = {
      brouillon: emploisTemps.filter(e => e.statut === 'brouillon').length,
      publié: emploisTemps.filter(e => e.statut === 'publié').length
    };

    // Indisponibilités en attente
    const indisponibilitesEnAttente = await Indisponibilite.count({
      where: { statut: 'en_attente' },
      include: [
        {
          model: Professeur,
          as: 'professeur',
          required: true
        }
      ]
    });

    // Semestre actif
    const semestreActif = await Semestre.findOne({
      where: { actif: true },
      attributes: ['id', 'nom', 'date_debut', 'date_fin']
    });

    return res.status(200).json({
      success: true,
      data: {
        nombre_classes: nombreClasses,
        nombre_etudiants: nombreEtudiants,
        nombre_ues: nombreUes,
        nombre_matieres: nombreMatieres,
        emplois_temps: emploisTempsStats,
        indisponibilites_en_attente: indisponibilitesEnAttente,
        semestre_actif: semestreActif
      }
    });

  } catch (error) {
    console.error('[Dashboard] Erreur getDashboardRUP:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Dashboard pour Professeur
 * @route GET /api/dashboard/professeur
 * @access Private (Professeur uniquement)
 */
const getDashboardProfesseur = async (req, res) => {
  try {
    // Récupérer le professeur connecté
    const professeur = await Professeur.findOne({
      where: { user_id: req.user.id }
    });

    if (!professeur) {
      return res.status(404).json({
        success: false,
        message: 'Profil professeur introuvable'
      });
    }

    // Semestre actif
    const semestreActif = await Semestre.findOne({
      where: { actif: true }
    });

    if (!semestreActif) {
      return res.status(200).json({
        success: true,
        data: {
          nombre_classes: 0,
          nombre_matieres: 0,
          volume_horaire_total: 0,
          prochains_cours: [],
          semestre_actif: null
        }
      });
    }

    // Attributions du professeur pour le semestre actif
    const attributions = await Attribution.findAll({
      where: {
        professeur_id: professeur.id,
        semestre_id: semestreActif.id
      },
      include: [
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom', 'volume_horaire']
        },
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom']
        }
      ]
    });

    // Nombre de classes uniques
    const classesUniques = [...new Set(attributions.map(a => a.classe_id))];
    const nombreClasses = classesUniques.length;

    // Nombre de matières
    const nombreMatieres = attributions.length;

    // Volume horaire total
    const volumeHoraireTotal = attributions.reduce((total, attr) => 
      total + (parseInt(attr.matiere.volume_horaire) || 0), 0
    );

    // Prochains cours (créneaux à venir)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const joursMap = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const jourActuel = joursMap[dayOfWeek];
    const heureActuelle = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    // Trouver les prochains cours d'aujourd'hui
    const prochainsCoursAujourdhui = await Creneau.findAll({
      where: {
        professeur_id: professeur.id,
        jour_semaine: jourActuel,
        heure_debut: { [Op.gt]: heureActuelle },
        annule: false
      },
      include: [
        {
          model: Matiere,
          as: 'matiere',
          attributes: ['id', 'nom']
        },
        {
          model: EmploiTemps,
          as: 'emploi_temps',
          where: { semestre_id: semestreActif.id },
          include: [
            {
              model: Classe,
              as: 'classe',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: require('../models').Salle,
          as: 'salle',
          attributes: ['id', 'nom']
        }
      ],
      order: [['heure_debut', 'ASC']],
      limit: 3
    });

    // Si pas de cours aujourd'hui, chercher le prochain jour
    let prochainsCours = prochainsCoursAujourdhui;
    
    if (prochainsCours.length === 0) {
      const joursOrdonnes = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const indexJourActuel = joursOrdonnes.indexOf(jourActuel);
      const prochainsJours = [...joursOrdonnes.slice(indexJourActuel + 1), ...joursOrdonnes.slice(0, indexJourActuel + 1)];

      for (const jour of prochainsJours) {
        const cours = await Creneau.findAll({
          where: {
            professeur_id: professeur.id,
            jour_semaine: jour,
            annule: false
          },
          include: [
            {
              model: Matiere,
              as: 'matiere',
              attributes: ['id', 'nom']
            },
            {
              model: EmploiTemps,
              as: 'emploi_temps',
              where: { semestre_id: semestreActif.id },
              include: [
                {
                  model: Classe,
                  as: 'classe',
                  attributes: ['id', 'nom']
                }
              ]
            },
            {
              model: require('../models').Salle,
              as: 'salle',
              attributes: ['id', 'nom']
            }
          ],
          order: [['heure_debut', 'ASC']],
          limit: 3
        });

        if (cours.length > 0) {
          prochainsCours = cours;
          break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        nombre_classes: nombreClasses,
        nombre_matieres: nombreMatieres,
        volume_horaire_total: volumeHoraireTotal,
        prochains_cours: prochainsCours.map(c => ({
          jour: c.jour_semaine,
          heure_debut: c.heure_debut,
          heure_fin: c.heure_fin,
          matiere: c.matiere.nom,
          classe: c.emploi_temps.classe.nom,
          salle: c.salle.nom,
          type_cours: c.type_cours
        })),
        semestre_actif: {
          id: semestreActif.id,
          nom: semestreActif.nom
        }
      }
    });

  } catch (error) {
    console.error('[Dashboard] Erreur getDashboardProfesseur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Dashboard pour Étudiant
 * @route GET /api/dashboard/etudiant
 * @access Private (Étudiant uniquement)
 */
const getDashboardEtudiant = async (req, res) => {
  try {
    // Récupérer l'étudiant connecté
    const etudiant = await Etudiant.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire']
        }
      ]
    });

    if (!etudiant) {
      return res.status(404).json({
        success: false,
        message: 'Profil étudiant introuvable'
      });
    }

    // Nombre d'UE
    const nombreUes = await UniteEnseignement.count({
      where: { classe_id: etudiant.classe_id }
    });

    // Nombre de matières
    const nombreMatieres = await Matiere.count({
      include: [
        {
          model: UniteEnseignement,
          as: 'unite_enseignement',
          where: { classe_id: etudiant.classe_id },
          attributes: []
        }
      ]
    });

    // Volume horaire total
    const ues = await UniteEnseignement.findAll({
      where: { classe_id: etudiant.classe_id },
      attributes: ['volume_horaire_total']
    });

    const volumeHoraireTotal = ues.reduce((total, ue) => 
      total + (parseInt(ue.volume_horaire_total) || 0), 0
    );

    // Semestre actif
    const semestreActif = await Semestre.findOne({
      where: { actif: true }
    });

    // Prochain cours
    let prochainCours = null;

    if (semestreActif) {
      const emploiTemps = await EmploiTemps.findOne({
        where: {
          classe_id: etudiant.classe_id,
          semestre_id: semestreActif.id
        }
      });

      if (emploiTemps) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const joursMap = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const jourActuel = joursMap[dayOfWeek];
        const heureActuelle = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

        // Chercher le prochain cours aujourd'hui
        let prochainCreneauAujourdhui = await Creneau.findOne({
          where: {
            emploi_temps_id: emploiTemps.id,
            jour_semaine: jourActuel,
            heure_debut: { [Op.gt]: heureActuelle },
            annule: false
          },
          include: [
            {
              model: Matiere,
              as: 'matiere',
              attributes: ['id', 'nom']
            },
            {
              model: Professeur,
              as: 'professeur',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['nom', 'prenom']
                }
              ]
            },
            {
              model: require('../models').Salle,
              as: 'salle',
              attributes: ['id', 'nom']
            }
          ],
          order: [['heure_debut', 'ASC']]
        });

        // Si pas de cours aujourd'hui, chercher le prochain jour
        if (!prochainCreneauAujourdhui) {
          const joursOrdonnes = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
          const indexJourActuel = joursOrdonnes.indexOf(jourActuel);
          const prochainsJours = [...joursOrdonnes.slice(indexJourActuel + 1), ...joursOrdonnes.slice(0, indexJourActuel + 1)];

          for (const jour of prochainsJours) {
            const creneau = await Creneau.findOne({
              where: {
                emploi_temps_id: emploiTemps.id,
                jour_semaine: jour,
                annule: false
              },
              include: [
                {
                  model: Matiere,
                  as: 'matiere',
                  attributes: ['id', 'nom']
                },
                {
                  model: Professeur,
                  as: 'professeur',
                  include: [
                    {
                      model: User,
                      as: 'user',
                      attributes: ['nom', 'prenom']
                    }
                  ]
                },
                {
                  model: require('../models').Salle,
                  as: 'salle',
                  attributes: ['id', 'nom']
                }
              ],
              order: [['heure_debut', 'ASC']]
            });

            if (creneau) {
              prochainCreneauAujourdhui = creneau;
              break;
            }
          }
        }

        if (prochainCreneauAujourdhui) {
          prochainCours = {
            jour: prochainCreneauAujourdhui.jour_semaine,
            heure_debut: prochainCreneauAujourdhui.heure_debut,
            heure_fin: prochainCreneauAujourdhui.heure_fin,
            matiere: prochainCreneauAujourdhui.matiere.nom,
            professeur: `${prochainCreneauAujourdhui.professeur.user.nom} ${prochainCreneauAujourdhui.professeur.user.prenom}`,
            salle: prochainCreneauAujourdhui.salle.nom
          };
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        classe: etudiant.classe.nom,
        annee_scolaire: etudiant.classe.annee_scolaire,
        nombre_ues: nombreUes,
        nombre_matieres: nombreMatieres,
        volume_horaire_total: volumeHoraireTotal,
        prochain_cours: prochainCours,
        semestre_actif: semestreActif ? {
          id: semestreActif.id,
          nom: semestreActif.nom
        } : null
      }
    });

  } catch (error) {
    console.error('[Dashboard] Erreur getDashboardEtudiant:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getDashboardRUP,
  getDashboardProfesseur,
  getDashboardEtudiant
};