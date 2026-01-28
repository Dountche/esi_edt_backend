const ExcelJS = require('exceljs');
const {
    EmploiTemps, Creneau, Classe, Semestre, Matiere,
    Professeur, Salle, User, UniteEnseignement,
    Specialite, Filiere, Cycle, Domaine, DFR
} = require('../models');

/**
 * Convert hex color (#RRGGBB) to Excel ARGB (FFRRGGBB)
 */
const hexToArgb = (hex) => {
    if (!hex) return 'FFFFFFFF';
    const cleanHex = hex.replace('#', '');
    return 'FF' + cleanHex.toUpperCase();
};

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
    // Récupérer l'EDT avec tous ses créneaux et les DFR
    const emploiTemps = await EmploiTemps.findByPk(emploiTempsId, {
        include: [
            {
                model: Classe,
                as: 'classe',
                attributes: ['id', 'nom', 'salle_principale_id', 'jour_eps', 'heure_debut_eps', 'heure_fin_eps'],
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
                            },
                            {
                                model: DFR,
                                as: 'dfr',
                                attributes: ['id', 'nom', 'couleur']
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Emploi du Temps');

    worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    };

    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const creneauxHoraires = [];
    const jourEps = emploiTemps.classe.jour_eps;
    const hDebutEps = emploiTemps.classe.heure_debut_eps;
    const hFinEps = emploiTemps.classe.heure_fin_eps;

    jours.forEach(jour => {
        if (jour === jourEps && hDebutEps && hFinEps) {
            const startH = parseInt(hDebutEps.split(':')[0]);
            if (startH < 12) { // EPS le matin
                creneauxHoraires.push({ jour, creneau: 1, heures: hDebutEps.substring(0, 5) + '-' + hFinEps.substring(0, 5) });
                creneauxHoraires.push({ jour, creneau: 2, heures: '14:00-18:15' });
            } else { // EPS l'après-midi
                creneauxHoraires.push({ jour, creneau: 1, heures: '07:30-11:45' });
                creneauxHoraires.push({ jour, creneau: 2, heures: hDebutEps.substring(0, 5) + '-' + hFinEps.substring(0, 5) });
            }
        } else {
            creneauxHoraires.push({ jour, creneau: 1, heures: '07:30-11:45' });
            creneauxHoraires.push({ jour, creneau: 2, heures: '14:00-18:15' });
        }
    });

    // En-tête principal
    worksheet.mergeCells('A1:R1');
    const titre = `EMPLOI DU TEMPS ${emploiTemps.semestre.nom.toUpperCase()} - ${emploiTemps.classe.nom} - ${sallePrincipale}`;
    worksheet.getCell('A1').value = titre;
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    worksheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
    worksheet.getRow(1).height = 25;

    worksheet.mergeCells('A2:R2');
    worksheet.getCell('A2').value = `Semestre ${emploiTemps.semestre.nom}`;
    worksheet.getCell('A2').font = { bold: true, size: 10 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.getRow(2).height = 18;

    const headerRow = worksheet.getRow(3);
    headerRow.getCell(1).value = 'Créneaux';
    headerRow.getCell(2).value = 'Horaires';
    for (let i = 1; i <= 16; i++) {
        headerRow.getCell(i + 2).value = `S${String(i).padStart(2, '0')}`;
    }
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Ajuster largeurs de colonnes
    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 12;
    for (let c = 3; c <= 18; c++) {
        worksheet.getColumn(c).width = 13; // Plus large pour voir le contenu
    }

    // Organiser les créneaux
    const creneauxParPosition = {};
    emploiTemps.creneaux.forEach(creneau => {
        let creneauNum = 0;
        const heureStr = creneau.heure_debut;
        const heure = parseInt(heureStr.split(':')[0]);

        if (creneau.jour_semaine === jourEps && hDebutEps) {
            const hStartEps = parseInt(hDebutEps.split(':')[0]);
            if (heure === hStartEps) creneauNum = (hStartEps < 12) ? 1 : 2;
            else creneauNum = (heure < 12) ? 1 : 2;
        } else {
            creneauNum = heure < 12 ? 1 : 2;
        }

        const key = `${creneau.jour_semaine}-${creneauNum}-${creneau.semaine_numero}`;
        if (!creneauxParPosition[key]) creneauxParPosition[key] = [];
        creneauxParPosition[key].push(creneau);
    });

    // Détecter fusions
    const fusionsDetectees = {};
    creneauxHoraires.forEach(creneauHoraire => {
        const jourCreneau = `${creneauHoraire.jour}-${creneauHoraire.creneau}`;
        for (let semaine = 1; semaine <= 16; semaine++) {
            const key = `${creneauHoraire.jour}-${creneauHoraire.creneau}-${semaine}`;
            const creneauxTrouves = creneauxParPosition[key] || [];
            if (creneauxTrouves.length > 0) {
                const creneau = creneauxTrouves[0];
                let semainesFusion = [semaine];
                let s = semaine + 1;
                while (s <= 16) {
                    const keySuivante = `${creneauHoraire.jour}-${creneauHoraire.creneau}-${s}`;
                    const creneauxSuivants = creneauxParPosition[keySuivante] || [];
                    if (creneauxSuivants.length > 0 &&
                        creneauxSuivants[0].matiere_id === creneau.matiere_id &&
                        creneauxSuivants[0].professeur_id === creneau.professeur_id) {
                        semainesFusion.push(s);
                        s++;
                    } else break;
                }
                if (semainesFusion.length > 1) {
                    fusionsDetectees[`${jourCreneau}-${semaine}`] = { debut: semaine, fin: semainesFusion[semainesFusion.length - 1], creneau: creneau };
                    semaine = semainesFusion[semainesFusion.length - 1];
                }
            }
        }
    });

    // Créer grille
    creneauxHoraires.forEach((creneauHoraire, ligneIndex) => {
        const row = worksheet.getRow(ligneIndex + 4);
        row.height = 80;
        row.getCell(1).value = creneauHoraire.jour;
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).value = creneauHoraire.heures;
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

        let semaineSkip = 0;
        for (let semaine = 1; semaine <= 16; semaine++) {
            if (semaineSkip > 0) { semaineSkip--; continue; }
            const cell = row.getCell(semaine + 2);
            const key = `${creneauHoraire.jour}-${creneauHoraire.creneau}-${semaine}`;
            const creneauxTrouves = creneauxParPosition[key] || [];
            const fusion = fusionsDetectees[`${creneauHoraire.jour}-${creneauHoraire.creneau}-${semaine}`];

            let targetCreneau = null;
            let multi = false;

            if (fusion) {
                worksheet.mergeCells(ligneIndex + 4, semaine + 2, ligneIndex + 4, fusion.fin + 2);
                targetCreneau = fusion.creneau;
                semaineSkip = fusion.fin - semaine;
            } else if (creneauxTrouves.length > 0) {
                if (creneauxTrouves.length >= 2) multi = true;
                targetCreneau = creneauxTrouves[0];
            }

            if (targetCreneau) {
                const matiere = targetCreneau.matiere;
                const prof = targetCreneau.professeur;
                const salle = targetCreneau.salle;
                const dfr = matiere.dfr;

                let content = multi ? `2h - ${matiere.nom}\n...` : `${matiere.nom}\n(${prof.user.nom} ${prof.user.prenom})`;
                if (salle && salle.id !== emploiTemps.classe.salle_principale_id) content += `\n${salle.nom}`;
                cell.value = content;

                // Couleur DFR
                if (dfr && dfr.couleur) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(dfr.couleur) } };
                }
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.font = { size: 8, strikethrough: targetCreneau.annule };
            }
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }
    });

    // Légende DFR
    const dfrsExistants = [];
    const dfrIdsVus = new Set();
    emploiTemps.creneaux.forEach(c => {
        if (c.matiere.dfr && !dfrIdsVus.has(c.matiere.dfr.id)) {
            dfrsExistants.push(c.matiere.dfr);
            dfrIdsVus.add(c.matiere.dfr.id);
        }
    });

    const legendeRowIdx = creneauxHoraires.length + 6;
    const legendeRow = worksheet.getRow(legendeRowIdx);
    legendeRow.height = 30;
    legendeRow.getCell(1).value = 'DFR :';
    legendeRow.getCell(1).font = { bold: true };

    dfrsExistants.forEach((dfr, idx) => {
        const cell = legendeRow.getCell(idx + 2);
        cell.value = dfr.nom;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(dfr.couleur) } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { size: 8, bold: true };
    });

    return workbook;
};

/**
 * Générer un fichier Excel pour une maquette pédagogique
 */
const genererExcelMaquette = async (classeId) => {
    const classe = await Classe.findByPk(classeId, {
        include: [{ model: Specialite, as: 'specialite', include: [{ model: Filiere, as: 'filiere' }, { model: Cycle, as: 'cycle' }] }]
    });

    const ues = await UniteEnseignement.findAll({
        where: { classe_id: classeId },
        include: [
            { model: Domaine, as: 'domaine' },
            {
                model: Matiere,
                as: 'matieres',
                include: [
                    { model: DFR, as: 'dfr' },
                    { model: require('../models').Attribution, as: 'attributions', include: [{ model: Professeur, as: 'professeur', include: [{ model: User, as: 'user' }] }] }
                ]
            }
        ],
        order: [
            [{ model: Domaine, as: 'domaine' }, 'nom', 'ASC'],
            ['code', 'ASC']
        ]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Maquette');

    // En-tête
    worksheet.mergeCells('A1:I1');
    worksheet.getCell('A1').value = `MAQUETTE PÉDAGOGIQUE - ${classe.nom}`;
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    worksheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    const headers = ['Domaine', 'UE', 'EC (Matière)', 'Code', 'Crédits', 'VH', 'Coef UE', 'Vol Hrs', 'Enseignant'];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
        c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    let currentRow = 3;

    // Regrouper par domaine
    const uesParDomaine = {};
    ues.forEach(ue => {
        const domaineName = ue.domaine ? ue.domaine.nom : 'Sans Domaine';
        if (!uesParDomaine[domaineName]) uesParDomaine[domaineName] = [];
        uesParDomaine[domaineName].push(ue);
    });

    for (const [domaineName, listUes] of Object.entries(uesParDomaine)) {
        let totalDomaineRows = listUes.reduce((acc, ue) => acc + Math.max(1, ue.matieres.length), 0);
        let domaineStartRow = currentRow;

        listUes.forEach(ue => {
            let ueStartRow = currentRow;
            let nbMatiere = Math.max(1, ue.matieres.length);

            ue.matieres.forEach((matiere, mIdx) => {
                const row = worksheet.getRow(currentRow);
                row.getCell(3).value = matiere.nom;
                row.getCell(4).value = matiere.code;
                row.getCell(5).value = matiere.coefficient;
                row.getCell(6).value = matiere.volume_horaire;

                const prof = matiere.attributions[0]?.professeur;
                row.getCell(9).value = prof ? `${prof.user.nom} ${prof.user.prenom}` : '-';
                row.height = 35; // Aeration des lignes

                if (matiere.dfr && matiere.dfr.couleur) {
                    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(matiere.dfr.couleur) } };
                }

                if (mIdx === 0) {
                    row.getCell(1).value = domaineName;
                    row.getCell(2).value = ue.nom;
                    row.getCell(7).value = ue.coefficient_total;
                    row.getCell(8).value = ue.volume_horaire_total;
                }
                currentRow++;
            });

            if (nbMatiere > 1) {
                worksheet.mergeCells(ueStartRow, 2, ueStartRow + nbMatiere - 1, 2);
                worksheet.mergeCells(ueStartRow, 7, ueStartRow + nbMatiere - 1, 7);
                worksheet.mergeCells(ueStartRow, 8, ueStartRow + nbMatiere - 1, 8);
            }
        });

        if (totalDomaineRows > 1) {
            worksheet.mergeCells(domaineStartRow, 1, domaineStartRow + totalDomaineRows - 1, 1);
        }
    }

    // Styles
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 3) {
            row.eachCell(cell => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            });
        }
    });

    worksheet.columns = [
        { width: 15 }, { width: 30 }, { width: 35 }, { width: 12 }, { width: 10 },
        { width: 10 }, { width: 10 }, { width: 10 }, { width: 25 }
    ];

    // Légende DFR
    const dfrsExistants = [];
    const dfrIdsVus = new Set();
    ues.forEach(ue => {
        ue.matieres.forEach(m => {
            if (m.dfr && !dfrIdsVus.has(m.dfr.id)) {
                dfrsExistants.push(m.dfr);
                dfrIdsVus.add(m.dfr.id);
            }
        });
    });

    const legendeRowIdx = currentRow + 2;
    const legendeRow = worksheet.getRow(legendeRowIdx);
    legendeRow.height = 30;
    legendeRow.getCell(1).value = 'Légende DFR :';
    legendeRow.getCell(1).font = { bold: true };

    dfrsExistants.forEach((dfr, idx) => {
        const cell = legendeRow.getCell(idx + 2);
        cell.value = dfr.nom;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(dfr.couleur) } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { size: 9, bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    return workbook;
};

/**
 * Générer un fichier Excel pour l'emploi du temps d'un professeur (composite)
 * Peut prendre un workbook existant pour le mode batch (multi-onglets)
 */
const genererExcelProfesseur = async (professeurId, existingWorkbook = null) => {
    const professeur = await Professeur.findByPk(professeurId, {
        include: [{ model: User, as: 'user' }]
    });

    if (!professeur) throw new Error('Professeur introuvable');

    const creneaux = await Creneau.findAll({
        where: { professeur_id: professeurId },
        include: [
            { model: Matiere, as: 'matiere', include: [{ model: DFR, as: 'dfr' }] },
            { model: Salle, as: 'salle' },
            { model: EmploiTemps, as: 'emploi_temps', include: [{ model: Classe, as: 'classe' }] }
        ]
    });

    const workbook = existingWorkbook || new ExcelJS.Workbook();
    const sheetName = existingWorkbook ? `${professeur.user.nom} ${professeur.user.prenom}`.substring(0, 31) : 'Emploi du Temps';
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.pageSetup = {
        paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    };

    // Pour un prof, on utilise une grille fixe de créneaux de 2h pour couvrir toutes les possibilités EPS
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const creneauxHoraires = [];
    jours.forEach(jour => {
        creneauxHoraires.push({ jour, creneau: 1, heures: '07:30-09:30' });
        creneauxHoraires.push({ jour, creneau: 2, heures: '09:45-11:45' });
        creneauxHoraires.push({ jour, creneau: 3, heures: '14:00-16:00' });
        creneauxHoraires.push({ jour, creneau: 4, heures: '16:15-18:15' });
    });

    // En-tête
    worksheet.mergeCells('A1:R1');
    worksheet.getCell('A1').value = `EMPLOI DU TEMPS PERSONNEL - PR. ${professeur.user.nom} ${professeur.user.prenom}`;
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    worksheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 25;

    const headerRow = worksheet.getRow(3);
    headerRow.getCell(1).value = 'Jour';
    headerRow.getCell(2).value = 'Horaire';
    for (let i = 1; i <= 16; i++) headerRow.getCell(i + 2).value = `S${String(i).padStart(2, '0')}`;
    headerRow.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
        c.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Organisation
    const grid = {};
    const dfrsExistants = [];
    const dfrIdsVus = new Set();

    creneaux.forEach(c => {
        const h = parseInt(c.heure_debut.split(':')[0]);
        let slot = 0;
        if (h === 7) slot = 1;
        else if (h === 9) slot = 2;
        else if (h === 14) slot = 3;
        else if (h === 16) slot = 4;
        else return;

        const estLong = !estCreneau2h(c.heure_debut, c.heure_fin);
        const slotsOccupied = estLong ? [slot, slot + 1] : [slot];

        slotsOccupied.forEach(s => {
            const key = `${c.jour_semaine}-${s}-${c.semaine_numero}`;
            grid[key] = c;
        });

        if (c.matiere.dfr && !dfrIdsVus.has(c.matiere.dfr.id)) {
            dfrsExistants.push(c.matiere.dfr);
            dfrIdsVus.add(c.matiere.dfr.id);
        }
    });

    // Remplissage initial et styles
    creneauxHoraires.forEach((ch, idx) => {
        const rowNum = idx + 4;
        const row = worksheet.getRow(rowNum);
        row.height = 40;
        row.getCell(1).value = ch.jour;
        row.getCell(2).value = ch.heures;

        // Déterminer si c'est la fin d'une journée pour le trait de séparation
        const estFinJour = (idx + 1) % 4 === 0;
        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: estFinJour ? 'medium' : 'thin' },
            right: { style: 'thin' }
        };

        // Appliquer style aux colonnes Jour et Horaire
        row.getCell(1).border = borderStyle;
        row.getCell(2).border = borderStyle;

        for (let s = 1; s <= 16; s++) {
            const cell = row.getCell(s + 2);
            const key = `${ch.jour}-${ch.creneau}-${s}`;
            const c = grid[key];

            if (c) {
                cell.value = `${c.matiere.nom}\n${c.emploi_temps.classe.nom}\n${c.salle.nom}`;
                if (c.matiere.dfr && c.matiere.dfr.couleur) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(c.matiere.dfr.couleur) } };
                }
                cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
                cell.font = { size: 7 };
            }
            cell.border = borderStyle;
        }
    });

    // 1. Fusion Verticale Jours (Col A)
    for (let i = 0; i < 5; i++) {
        const startRow = 4 + (i * 4);
        worksheet.mergeCells(startRow, 1, startRow + 3, 1);
        worksheet.getCell(startRow, 1).alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 };
        worksheet.getCell(startRow, 1).font = { bold: true };
    }

    // 2. Fusion Rectangulaire des Cours (Même cours semaines consécutives et blocs d'heures)
    const processed = new Set();
    const rowsCount = creneauxHoraires.length;
    const colsCount = 16;

    for (let r = 0; r < rowsCount; r++) {
        for (let c = 1; c <= colsCount; c++) {
            const cellKey = `${r}-${c}`;
            if (processed.has(cellKey)) continue;

            const ch = creneauxHoraires[r];
            const currentC = grid[`${ch.jour}-${ch.creneau}-${c}`];

            if (!currentC) {
                processed.add(cellKey);
                continue;
            }

            // Trouver la largeur maximale (semaines consécutives)
            let w = 1;
            while (c + w <= colsCount) {
                const nextC = grid[`${ch.jour}-${ch.creneau}-${c + w}`];
                if (nextC && nextC.matiere_id === currentC.matiere_id &&
                    nextC.emploi_temps.classe_id === currentC.emploi_temps.classe_id) {
                    w++;
                } else break;
            }

            // Trouver la hauteur maximale (blocs horaires dans la même journée)
            let h = 1;
            const dayBaseRow = Math.floor(r / 4) * 4;
            const dayEndRow = dayBaseRow + 3;

            while (r + h <= dayEndRow) {
                let rowPerfectMatch = true;
                for (let sw = 0; sw < w; sw++) {
                    const belowC = grid[`${creneauxHoraires[r + h].jour}-${creneauxHoraires[r + h].creneau}-${c + sw}`];
                    if (!belowC || belowC.matiere_id !== currentC.matiere_id ||
                        belowC.emploi_temps.classe_id !== currentC.emploi_temps.classe_id) {
                        rowPerfectMatch = false;
                        break;
                    }
                }
                if (rowPerfectMatch) h++;
                else break;
            }

            // Fusionner si rectangle > 1x1
            if (w > 1 || h > 1) {
                worksheet.mergeCells(r + 4, c + 2, r + 4 + h - 1, c + 2 + w - 1);
            }

            // Marquer comme traité
            for (let ir = 0; ir < h; ir++) {
                for (let ic = 0; ic < w; ic++) {
                    processed.add(`${r + ir}-${c + ic}`);
                }
            }
        }
    }

    // Légende DFR
    const legendeRowIdx = (creneauxHoraires.length + 6);
    const legendeRow = worksheet.getRow(legendeRowIdx);
    legendeRow.height = 25;
    legendeRow.getCell(1).value = 'Légende DFR :';
    legendeRow.getCell(1).font = { bold: true, size: 9 };

    dfrsExistants.forEach((dfr, idx) => {
        const cell = legendeRow.getCell(idx + 2);
        cell.value = dfr.nom;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(dfr.couleur) } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { size: 8, bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 12;
    for (let c = 3; c <= 18; c++) worksheet.getColumn(c).width = 15;

    return workbook;
};

/**
 * Générer un fichier Excel contenant tous les professeurs spécifiés (un par onglet)
 */
const genererExcelProfesseursBatch = async (professeurs) => {
    const workbook = new ExcelJS.Workbook();
    for (const prof of professeurs) {
        await genererExcelProfesseur(prof.id, workbook);
    }
    return workbook;
};

module.exports = {
    genererExcelEmploiTemps,
    genererExcelMaquette,
    genererExcelProfesseur,
    genererExcelProfesseursBatch
};