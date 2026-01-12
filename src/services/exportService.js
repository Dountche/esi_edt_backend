const ExcelJS = require('exceljs');
const { EmploiTemps, Creneau, Classe, Semestre, Matiere, Professeur, Salle, User, UniteEnseignement, Specialite, Filiere, Cycle } = require('../models');

/**
 * Couleurs pour les UE (palette harmonieuse)
 */
const COULEURS_UE = [
  'FFFF9999', // Rouge clair
  'FFFFCC99', // Orange clair
  'FFFFFF99', // Jaune clair
  'FFCCFF99', // Vert clair
  'FF99FFCC', // Turquoise clair
  'FF99CCFF', // Bleu clair
  'FFCC99FF', // Violet clair
  'FFFF99CC', // Rose clair
  'FFCCCCCC', // Gris clair
  'FFFFB366', // Orange
];

/**
 * Déterminer si un créneau est de 2h (matières collées)
 */
const estCreneau2h = (heureDebut, heureFin) => {
  const debut = parseInt(heureDebut.split(':')[0]);
  const fin = parseInt(heureFin.split(':')[0]);
  const duree = fin - debut;
  return duree <= 2;
};

/**
 * Générer un fichier Excel pour un emploi du temps (format grille optimisé)
 */
const genererExcelEmploiTemps = async (emploiTempsId) => {
  // Récupérer l'EDT avec tous ses créneaux
  const emploiTemps = await EmploiTemps.findByPk(emploiTempsId, {
    include: [
      {
        model: Classe,
        as: 'classe',
        attributes: ['id', 'nom', 'salle_principale_id'],
        include: [
          {
            model: Specialite,
            as: 'specialite',
            include: [
              { model: Filiere, as: 'filiere' },
              { model: Cycle, as: 'cycle' }
            ]
          }
        ]
      },
      {
        model: Semestre,
        as: 'semestre'
      },
      {
        model: Creneau,
        as: 'creneaux',
        include: [
          {
            model: Matiere,
            as: 'matiere',
            include: [
              {
                model: UniteEnseignement,
                as: 'unite_enseignement',
                attributes: ['id', 'code', 'nom']
              }
            ]
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
            model: Salle,
            as: 'salle'
          }
        ]
      }
    ]
  });

  if (!emploiTemps) {
    throw new Error('Emploi du temps introuvable');
  }

  // Récupérer la salle principale
  let sallePrincipale = 'Salle non définie';
  if (emploiTemps.classe.salle_principale_id) {
    const sallePrincipaleObj = await Salle.findByPk(emploiTemps.classe.salle_principale_id);
    if (sallePrincipaleObj) {
      sallePrincipale = sallePrincipaleObj.nom;
    }
  }

  // Créer un workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Emploi du Temps');

  // Configuration pour impression sur 1 page
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3
    }
  };

  // Définir les créneaux horaires (10 lignes : 2 créneaux/jour x 5 jours)
  const creneauxHoraires = [
    { jour: 'Lundi', creneau: 1, heures: '07:30-11:45' },
    { jour: 'Lundi', creneau: 2, heures: '14:00-18:15' },
    { jour: 'Mardi', creneau: 1, heures: '07:30-11:45' },
    { jour: 'Mardi', creneau: 2, heures: '14:00-18:15' },
    { jour: 'Mercredi', creneau: 1, heures: '07:30-11:45' },
    { jour: 'Mercredi', creneau: 2, heures: '14:00-18:15' },
    { jour: 'Jeudi', creneau: 1, heures: '07:30-11:45' },
    { jour: 'Jeudi', creneau: 2, heures: '14:00-18:15' },
    { jour: 'Vendredi', creneau: 1, heures: '07:30-11:45' },
    { jour: 'Vendredi', creneau: 2, heures: '14:00-18:15' }
  ];

  // En-tête principal avec salle principale
  worksheet.mergeCells('A1:R1');
  const titre = `EMPLOI DU TEMPS ${emploiTemps.semestre.nom.toUpperCase()} - ${emploiTemps.classe.nom} - ${sallePrincipale}`;
  worksheet.getCell('A1').value = titre;
  worksheet.getCell('A1').font = { bold: true, size: 12 };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
  worksheet.getRow(1).height = 25;

  // Sous-titre
  worksheet.mergeCells('A2:R2');
  worksheet.getCell('A2').value = `Semestre ${emploiTemps.semestre.nom}`;
  worksheet.getCell('A2').font = { bold: true, size: 10 };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
  worksheet.getRow(2).height = 18;

  // En-têtes des colonnes (Semaines S01 à S16 = 16 semaines)
  const headerRow = worksheet.getRow(3);
  headerRow.getCell(1).value = 'Créneaux';
  headerRow.getCell(2).value = 'Horaires';

  // 16 semaines
  for (let i = 1; i <= 16; i++) {
    headerRow.getCell(i + 2).value = `S${String(i).padStart(2, '0')}`;
  }

  // Style de l'en-tête
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5496' }
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Mapper les UE aux couleurs
  const uesUniques = [...new Set(emploiTemps.creneaux.map(c => c.matiere.unite_enseignement.id))];
  const couleurParUE = {};
  uesUniques.forEach((ueId, index) => {
    couleurParUE[ueId] = COULEURS_UE[index % COULEURS_UE.length];
  });

  // Organiser les créneaux par jour/créneau/semaine
  const creneauxParPosition = {};

  emploiTemps.creneaux.forEach(creneau => {
    const heureCreneau = parseInt(creneau.heure_debut.split(':')[0]);
    const creneauNum = heureCreneau < 12 ? 1 : 2;
    const key = `${creneau.jour_semaine}-${creneauNum}-${creneau.semaine_numero}`;
    
    if (!creneauxParPosition[key]) {
      creneauxParPosition[key] = [];
    }
    creneauxParPosition[key].push(creneau);
  });

  // Détecter les fusions de cellules (même matière sur semaines consécutives)
  const fusionsDetectees = {};

  creneauxHoraires.forEach((creneauHoraire, ligneIndex) => {
    const jourCreneau = `${creneauHoraire.jour}-${creneauHoraire.creneau}`;
    
    for (let semaine = 1; semaine <= 16; semaine++) {
      const key = `${creneauHoraire.jour}-${creneauHoraire.creneau}-${semaine}`;
      const creneauxTrouves = creneauxParPosition[key] || [];
      
      if (creneauxTrouves.length > 0) {
        const creneau = creneauxTrouves[0];
        const matiereId = creneau.matiere_id;
        const profId = creneau.professeur_id;
        const salleId = creneau.salle_id;
        
        // Vérifier si on peut fusionner avec la semaine suivante
        let semainesFusion = [semaine];
        let s = semaine + 1;
        
        while (s <= 16) {
          const keySuivante = `${creneauHoraire.jour}-${creneauHoraire.creneau}-${s}`;
          const creneauxSuivants = creneauxParPosition[keySuivante] || [];
          
          if (creneauxSuivants.length > 0 && 
              creneauxSuivants[0].matiere_id === matiereId &&
              creneauxSuivants[0].professeur_id === profId &&
              creneauxSuivants[0].salle_id === salleId) {
            semainesFusion.push(s);
            s++;
          } else {
            break;
          }
        }
        
        if (semainesFusion.length > 1) {
          const fusionKey = `${jourCreneau}-${semaine}`;
          fusionsDetectees[fusionKey] = {
            debut: semaine,
            fin: semainesFusion[semainesFusion.length - 1],
            creneau: creneau
          };
          
          // Passer les semaines déjà traitées
          semaine = semainesFusion[semainesFusion.length - 1];
        }
      }
    }
  });

  // Créer la grille
  creneauxHoraires.forEach((creneauHoraire, ligneIndex) => {
    const row = worksheet.getRow(ligneIndex + 4);
    row.height = 80;

    // Colonne Créneau
    row.getCell(1).value = creneauHoraire.jour;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { bold: true, size: 9 };
    row.getCell(1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Colonne Horaires
    row.getCell(2).value = creneauHoraire.heures;
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).font = { size: 8 };
    row.getCell(2).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Pour chaque semaine
    let semaineSkip = 0;
    
    for (let semaine = 1; semaine <= 16; semaine++) {
      if (semaineSkip > 0) {
        semaineSkip--;
        continue;
      }
      
      const cell = row.getCell(semaine + 2);
      const key = `${creneauHoraire.jour}-${creneauHoraire.creneau}-${semaine}`;
      const creneauxTrouves = creneauxParPosition[key] || [];

      // Vérifier si cette cellule fait partie d'une fusion
      const jourCreneau = `${creneauHoraire.jour}-${creneauHoraire.creneau}`;
      const fusionKey = `${jourCreneau}-${semaine}`;
      const fusion = fusionsDetectees[fusionKey];

      if (fusion) {
        // Fusionner les cellules
        const colDebut = semaine + 2;
        const colFin = fusion.fin + 2;
        worksheet.mergeCells(ligneIndex + 4, colDebut, ligneIndex + 4, colFin);
        
        const creneau = fusion.creneau;
        const matiere = creneau.matiere;
        const prof = creneau.professeur;
        const salle = creneau.salle;

        // Afficher la salle uniquement si différente de la salle principale
        let salleTxt = '';
        if (salle.id !== emploiTemps.classe.salle_principale_id) {
          salleTxt = `\n${salle.nom}`;
        }

        const contenu = `${matiere.nom}\n(${prof.user.nom} ${prof.user.prenom})${salleTxt}`;
        cell.value = contenu;

        // Couleur selon l'UE
        const couleur = couleurParUE[matiere.unite_enseignement.id];
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: couleur }
        };

        if (creneau.annule) {
          cell.font = { strikethrough: true, color: { argb: 'FF666666' }, size: 8 };
        } else {
          cell.font = { size: 8 };
        }

        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle', 
          wrapText: true 
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        semaineSkip = fusion.fin - semaine;
      } else if (creneauxTrouves.length > 0) {
        // Cas normal sans fusion
        const creneauxAfficher = creneauxTrouves.slice(0, 2); // Max 2 matières de 2h
        
        if (creneauxAfficher.length === 2) {
          // 2 matières de 2h
          const contenus = creneauxAfficher.map(creneau => {
            const matiere = creneau.matiere;
            const prof = creneau.professeur;
            const salle = creneau.salle;

            let salleTxt = '';
            if (salle.id !== emploiTemps.classe.salle_principale_id) {
              salleTxt = ` ${salle.nom}`;
            }

            return `2h - ${matiere.nom}\n(${prof.user.nom} ${prof.user.prenom})${salleTxt}`;
          });

          cell.value = contenus.join('\n---\n');

          // Couleur de la première UE
          const couleur = couleurParUE[creneauxAfficher[0].matiere.unite_enseignement.id];
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: couleur }
          };
        } else {
          // 1 seule matière
          const creneau = creneauxAfficher[0];
          const matiere = creneau.matiere;
          const prof = creneau.professeur;
          const salle = creneau.salle;

          let salleTxt = '';
          if (salle.id !== emploiTemps.classe.salle_principale_id) {
            salleTxt = `\n${salle.nom}`;
          }

          // Vérifier si c'est un créneau de 2h
          const est2h = estCreneau2h(creneau.heure_debut, creneau.heure_fin);
          const dureeLabel = est2h ? '2h - ' : '';

          const contenu = `${dureeLabel}${matiere.nom}\n(${prof.user.nom} ${prof.user.prenom})${salleTxt}`;
          cell.value = contenu;

          const couleur = couleurParUE[matiere.unite_enseignement.id];
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: couleur }
          };

          if (creneau.annule) {
            cell.font = { strikethrough: true, color: { argb: 'FF666666' }, size: 8 };
          } else {
            cell.font = { size: 8 };
          }
        }

        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle', 
          wrapText: true 
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      } else {
        // Cellule vide
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle' 
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
  });

  // Largeur des colonnes optimisée
  worksheet.getColumn(1).width = 10; // Créneau
  worksheet.getColumn(2).width = 12; // Horaires
  for (let i = 3; i <= 18; i++) {
    worksheet.getColumn(i).width = 14; // Semaines (réduit pour tenir en 1 page)
  }

  // Ajouter une légende des UE en bas
  const legendeRow = worksheet.getRow(16);
  legendeRow.height = 50;
  legendeRow.getCell(1).value = 'Légende :';
  legendeRow.getCell(1).font = { bold: true, size: 9 };

  let colLegend = 2;
  for (const ueId of uesUniques) {
    const ue = emploiTemps.creneaux.find(c => c.matiere.unite_enseignement.id === ueId).matiere.unite_enseignement;
    const cell = legendeRow.getCell(colLegend);
    cell.value = `${ue.code} - ${ue.nom}`;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: couleurParUE[ueId] }
    };
    cell.font = { size: 8 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    colLegend++;
  }

  return workbook;
};

/**
 * Générer un fichier Excel pour une maquette pédagogique (optimisé)
 */
const genererExcelMaquette = async (classeId) => {
  // Récupérer la classe avec ses UE et matières
  const classe = await Classe.findByPk(classeId, {
    include: [
      {
        model: Specialite,
        as: 'specialite',
        include: [
          { model: Filiere, as: 'filiere' },
          { model: Cycle, as: 'cycle' }
        ]
      }
    ]
  });

  if (!classe) {
    throw new Error('Classe introuvable');
  }

  const ues = await UniteEnseignement.findAll({
    where: { classe_id: classeId },
    include: [
      {
        model: Matiere,
        as: 'matieres',
        include: [
          {
            model: require('../models').Attribution,
            as: 'attributions',
            include: [
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
              }
            ]
          }
        ]
      }
    ],
    order: [['code', 'ASC']]
  });

  // Créer le workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Maquette Pédagogique');

  // Configuration pour impression sur 1 page
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3
    }
  };

  // En-tête
  worksheet.mergeCells('A1:I1');
  worksheet.getCell('A1').value = `MAQUETTE PÉDAGOGIQUE ${classe.specialite.cycle.nom} ${classe.specialite.filiere.nom} - ${classe.nom}`;
  worksheet.getCell('A1').font = { bold: true, size: 12 };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
  worksheet.getRow(1).height = 25;

  worksheet.mergeCells('A2:I2');
  worksheet.getCell('A2').value = `Année scolaire ${classe.annee_scolaire}`;
  worksheet.getCell('A2').font = { bold: true, size: 10 };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
  worksheet.getRow(2).height = 18;

  worksheet.addRow([]);

  // En-têtes avec la nouvelle colonne VH
  const headerRow = worksheet.addRow([
    'Domaine',
    'Unité d\'Enseignement',
    'Éléments Constitutifs (EC)',
    'Code',
    'Crédits',
    'VH',
    'Coef UE',
    'Vol Hrs',
    'Enseignant'
  ]);

  headerRow.height = 20;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F5496' }
  };
  headerRow.eachCell(cell => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Données
  let coefficientTotal = 0;
  let volumeHoraireTotal = 0;
  let rowIndex = 5;

  ues.forEach((ue, ueIndex) => {
    const couleurUE = COULEURS_UE[ueIndex % COULEURS_UE.length];
    const nombreMatieres = ue.matieres.length;

    // Ligne UE (fusionnée)
    ue.matieres.forEach((matiere, matiereIndex) => {
      const row = worksheet.getRow(rowIndex);
      row.height = 35;

      const professeur = matiere.attributions[0]?.professeur 
        ? `${matiere.attributions[0].professeur.user.nom} ${matiere.attributions[0].professeur.user.prenom}`
        : 'Non attribué';

      // Si c'est la première matière, afficher l'UE
      if (matiereIndex === 0) {
        row.getCell(1).value = ue.code; // Domaine
        row.getCell(2).value = ue.nom;   // UE       // Crédits (vide)
        row.getCell(7).value = ue.coefficient_total;  // Coef UE
        row.getCell(8).value = ue.volume_horaire_total; // Vol Hrs

        // Fusionner les cellules UE sur toutes les lignes de matières
        if (nombreMatieres > 1) {
          worksheet.mergeCells(rowIndex, 1, rowIndex + nombreMatieres - 1, 1); // Domaine
          worksheet.mergeCells(rowIndex, 2, rowIndex + nombreMatieres - 1, 2); // UE
          worksheet.mergeCells(rowIndex, 7, rowIndex + nombreMatieres - 1, 7); // Coef UE
          worksheet.mergeCells(rowIndex, 8, rowIndex + nombreMatieres - 1, 8); // Vol Hrs
        }

        // Style pour les cellules UE
        [1, 2, 7, 8].forEach(col => {
          const cell = row.getCell(col);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: couleurUE }
          };
          cell.font = { bold: true, size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }

      // Matière
      row.getCell(3).value = matiere.nom;
      row.getCell(4).value = matiere.code;
      row.getCell(5).value = matiere.coefficient; // Crédits
      row.getCell(6).value = matiere.volume_horaire; // NOUVELLE COLONNE VH
      row.getCell(9).value = professeur;

      // Style matière
      [3, 4, 5, 6, 9].forEach(col => {
        const cell = row.getCell(col);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { size: 9 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      rowIndex++;
    });

    coefficientTotal += parseFloat(ue.coefficient_total) || 0;
    volumeHoraireTotal += parseInt(ue.volume_horaire_total) || 0;
  });

  // Ligne de totaux
  worksheet.addRow([]);
  const totalRow = worksheet.addRow([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    coefficientTotal,
    volumeHoraireTotal,
    ''
  ]);
  totalRow.font = { bold: true, size: 10 };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' }
  };
  totalRow.alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.eachCell(cell => {
    cell.border = {
      top: { style: 'thick' },
      left: { style: 'thin' },
      bottom: { style: 'thick' },
      right: { style: 'thin' }
    };
  });

  // Largeurs optimisées pour tenir en 1 page
  worksheet.columns = [
    { width: 12 }, // Domaine
    { width: 28 }, // UE
    { width: 28 }, // EC
    { width: 10 }, // Code
    { width: 8 },  // Crédits
    { width: 8 },  // VH (NOUVELLE)
    { width: 9 },  // Coef
    { width: 9 },  // Vol Hrs
    { width: 20 }  // Enseignant
  ];

  return workbook;
};

module.exports = {
  genererExcelEmploiTemps,
  genererExcelMaquette
};