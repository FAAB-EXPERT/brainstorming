import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  FolderOpen, Target, Settings, Menu, 
  Plus, Briefcase, X, Home, Trash2, Network, Lightbulb, BookOpen,
  Mail, Phone, AlertCircle, Download, Upload, Printer, RotateCcw,
  CheckCircle2, Filter, ZoomIn, ZoomOut, LayoutList, GitFork, FileText,
  CheckSquare, Square, Sun, Moon, Globe,
  ArrowDown, ArrowUpRight, Layers, ShieldCheck, Sparkles, ChevronUp, Database, Workflow, User, Save, Coins
} from 'lucide-react';

// --- TYPESCRIPT INTERFACES ---
export type Lang = 'fr' | 'en';
export type ThemeMode = 'light' | 'dark';
export type CurrencyCode = 'FCFA' | 'EUR' | 'USD';

export interface UserProfile {
  nom: string;
  prenom: string;
  email: string;
  contact: string;
  fonction: string;
  institution: string;
}

export interface ResourceItem {
  label: string;
  amount: string;
}

export interface ProblemDetail {
  contrainte: string;
  cause: string[];
  besoin: string[];
}

export interface ProblemBranch {
  axeName: string;
  central: string;
  details: ProblemDetail[];
}

export interface ProjectSolution {
  extrant: string;
  extrantCmr?: string;
  activites: string[];
  intrants_rh: ResourceItem[][];
  intrants_mat: ResourceItem[][];
  couts: string[];
  cout?: string;
  responsable?: string;
  periode?: string;
}

export interface AxeSolution {
  nom: string;
  effet: string;
  budget: string;
  projets: ProjectSolution[];
}

export interface BrainstormIdea {
  id: string;
  textNegative: string;
  textPositive: string;
  color: string;
  text?: string;
}

export interface Stakeholder {
  nom: string;
  intervention?: string;
  competence?: string;
  attentes?: string;
  contraintes?: string;
  pointFort?: string;
  pointFaible?: string;
  problemes?: string;
  axe: number;
  projetIndex: number;
}

export interface RiskItem {
  id: string;
  niveau: string;
  logique?: string;
  hypothese?: string;
  contrainte?: string;
  cause?: string;
  level?: string;
  responsable?: string;
  mitigation?: string;
  axe: number;
  linkedAxeIndex?: number | null;
  linkedBranchIndex?: number | null;
}

export interface GARData {
  brainstorming: BrainstormIdea[];
  stakeholders: {
    beneficiaires: Stakeholder[];
    instCentralises: Stakeholder[];
    instDecentralises: Stakeholder[];
    operateursTechniques: Stakeholder[];
    ptf: Stakeholder[];
    [key: string]: Stakeholder[];
  };
  problems: {
    consequenceGlobale: string;
    branches: ProblemBranch[];
  };
  rendement: {
    impact: string;
    axes: AxeSolution[];
  };
  risks: RiskItem[];
  fiche?: {
    lieu?: string;
    duree?: string;
    moa?: string;
    moe?: string;
    partenaires?: string;
    strategie?: string;
  };
  cadrageStrategique?: {
    vision?: string;
    mission?: string;
    objectifGeneral?: string;
  };
}

export interface Portfolio {
  id: string;
  name: string;
  institution: string;
  description: string;
  concepteurNomPrenoms?: string;
  concepteurFonction?: string;
  concepteurEmail?: string;
  serviceName?: string;
  budget?: string;
  status: string;
  isEditable: boolean;
  isTrashed: boolean;
  entityLevel?: string;
  displayName?: string;
  garData: GARData;
}

export interface FilterContext {
  type: 'all' | 'custom';
  focusedBranches: { axeIndex: number; projetIndex: number }[];
  focusedAxes: number[];
}

// --- DICTIONNAIRE BILINGUE (FRANÇAIS / ANGLAIS) ---
const I18N = {
  fr: {
    subtitle: 'Ingénierie GAR',
    importJson: 'Importer JSON',
    saveJson: 'Enregistrer JSON (Écraser & Mettre à jour)',
    exportJson: 'Exporter JSON',
    printPdf: 'Télécharger TDR (PDF)',
    lightMode: 'Mode Clair',
    darkMode: 'Mode Sombre',
    currencyTitle: 'Changer de devise (Franc CFA / Euro / Dollar)',
    switchLangTitle: 'Passer en Anglais (EN)',
    closeMenu: 'Fermer le menu',
    openMenu: 'Ouvrir le menu déroulant',
    collapseMenu: 'Réduire le menu',
    expandMenu: 'Agrandir le menu',
    garApproach: 'Démarche GAR',
    activePortfolioLabel: 'Portefeuille Actif :',
    selectProjectLabel: 'Sélecteur de Projet',
    selectProjectPlaceholder: 'Choisir un projet...',
    budgetLabel: 'Budget :',
    showAll: 'Voir tout',
    tabs: {
      accueil: { label: 'Accueil', short: 'Accueil' },
      profil: { label: 'Profil Utilisateur', short: 'Profil' },
      dossier: { label: 'Dossiers & Projets', short: 'Dossiers' },
      brainstorming: { label: 'Brainstorming', short: 'Idées' },
      arbre: { label: 'Arbre à problèmes', short: 'Problèmes' },
      solutions: { label: 'Arbre à solutions', short: 'Solutions' },
      registre_parties: { label: 'Registre Parties Prenantes', short: 'Acteurs' },
      tdr: { label: 'TDR', short: 'TDR' }
    },
    profil: {
      title: 'Profil Utilisateur',
      subtitle: 'Vos informations personnelles et professionnelles sont enregistrées automatiquement dans la base locale (IndexedDB) et reprises directement dans vos Termes de Référence (TDR).',
      badge: 'Synchronisé avec les TDR & IndexedDB',
      nomLabel: 'Nom',
      nomPlaceholder: 'Ex: KOFFIÉ',
      prenomLabel: 'Prénom(s)',
      prenomPlaceholder: 'Ex: Fabien Michael',
      emailLabel: 'Email',
      emailPlaceholder: 'Ex: utilisateur@institution.org',
      contactLabel: 'Contact (Téléphone)',
      contactPlaceholder: 'Ex: +225 07 00 00 00 00',
      fonctionLabel: 'Fonction',
      fonctionPlaceholder: 'Ex: Expert Planification & Suivi-Évaluation GAR',
      institutionLabel: 'Institution / Organisation',
      institutionPlaceholder: 'Ex: Ministère de la Santé / Direction Générale',
      previewTitle: 'Aperçu de la signature dans les TDR (Écran & PDF)',
      emptyPreview: 'Renseignez vos informations ci-dessus pour les faire apparaître automatiquement dans l’entête de vos TDR.',
      resetBtn: 'Effacer le profil'
    },
    noProject: {
      title: 'Aucun Portefeuille Actif',
      desc: "Pour accéder aux outils de FAAB BRAINSTORMING, ouvrez le menu déroulant via l'icône Burger en haut à gauche pour sélectionner un projet ou importer un fichier JSON.",
      browseBtn: 'Ouvrir le Menu Burger',
      importBtn: 'Importer JSON'
    },
    home: {
      badge: 'Solution Institutionnelle GAR',
      welcomePrefix: 'Bienvenue sur',
      intro:
        "FAAB BRAINSTORMING structure votre démarche de Gestion Axée sur les Résultats (GAR) : de la collecte des idées au Brainstorming, à l'Arbre à problèmes, l'Arbre à solutions, le chiffrage des intrants, le Registre des parties prenantes et la génération automatique des TDR.",
      openPortfolios: 'Ouvrir les Portefeuilles',
      restoreDemo: 'Restaurer Exemple Démo Santé',
      designLabel: 'Conception et Ingénierie',
      expertBio: 'Expert en ingénierie de planification stratégique et systèmes de gestion axée sur les résultats.',
      frameworkLabel: 'Cadre Méthodologique',
      frameworkTitle: 'Cycle Logique GAR & TDR',
      frameworkDesc:
        "Chaque problème identifié engendre son miroir en solution : la Conséquence Globale devient l'Impact, les Problèmes Centraux se traduisent en Effets, les Contraintes en Extrants, et les Causes en Activités consolidées dans les TDR.",
      compliance: 'Conformité aux normes internationales de développement',
      ndaTitle: 'Accord de Confidentialité & Propriété Intellectuelle',
      ndaText:
        'La présente plateforme, incluant sa structure logique, ses algorithmes de dépendance inter-services et son interface fonctionnelle, constitue une œuvre protégée appartenant à son concepteur. Toute reproduction, copie ou diffusion non autorisée est rigoureusement interdite.',
      rights: 'Tous droits réservés.'
    },
    dossier: {
      title: 'Portefeuilles & Projets',
      subtitle: (used: number) =>
        `Création illimitée de portefeuilles et d'idées (${used} portefeuille${used > 1 ? 's' : ''} actif${used > 1 ? 's' : ''}).`,
      newProjectBtn: 'Nouveau Projet',
      activeBadge: 'Actif',
      trashTitle: 'Mettre à la corbeille',
      instPlaceholder: "Nom de l'Institution...",
      namePlaceholder: 'Nom du Portefeuille / Projet...',
      descPlaceholder: 'Description stratégique...',
      designerSectionTitle: 'Informations sur le Concepteur',
      designerNamePlaceholder: 'Nom & Prénoms du concepteur...',
      designerRolePlaceholder: 'Fonction / Titre...',
      designerEmailPlaceholder: 'Email professionnel...',
      axesCount: 'Axes :',
      ideasCount: 'Idées :',
      openGarBtn: 'Ouvrir GAR',
      newFolderCard: 'Nouveau Dossier',
      newFolderSub: "Création illimitée d'espaces GAR"
    },
    brainstorming: {
      title: 'Tableau de Brainstorming',
      subtitle: 'Formulez un nombre illimité d’idées par paire : Problème (Négatif) vers Solution (Positif).',
      newIdeaBtn: 'Nouvelle Idée',
      deleteIdeaTitle: 'Supprimer cette idée',
      negLabel: 'Problème (Négatif)',
      negPlaceholder: 'Situation négative...',
      posLabel: 'Solution (Positif)',
      posPlaceholder: 'État positif...',
      colorTitle: 'Couleur',
      emptyTitle: 'Aucune idée enregistrée',
      emptyDesc: 'Cliquez sur « Nouvelle Idée » pour créer vos étiquettes Problème / Solution sans aucune limite.',
      addIdeaBtn: 'Ajouter une idée'
    },
    common: {
      treeView: 'Arbre',
      listView: 'Liste',
      zoomOut: 'Zoom arrière',
      zoomReset: 'Réinitialiser le zoom',
      zoomIn: 'Zoom avant',
      undefinedText: 'Non défini',
      notSpecified: 'Non renseigné',
      add: 'Ajouter',
      delete: 'Supprimer',
      costPlaceholder: 'Coût...',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      chooseIdea: 'Choisir une idée...',
      autoCalc: 'Calcul auto',
      service: 'Service',
      branch: 'Branche',
      project: 'Projet',
      subProblem: 'Sous-Problème'
    },
    arbre: {
      title: 'Arbre à Problèmes',
      subtitle: 'Conséquence Globale, Problèmes Centraux, Contraintes, Causes profondes et Besoins.',
      consequenceGlobale: 'Conséquence Globale (Impact Négatif)',
      selectNegativeImpact: "Sélectionner l'impact négatif...",
      chooseImpact: "Choisir l'impact...",
      problemeCentral: 'PROBLÈME CENTRAL',
      chooseCentralProblem: 'Choisir le problème central...',
      centralProblemShort: 'Problème central...',
      contrainte: 'Contrainte',
      chooseConstraint: 'Choisir la contrainte...',
      causeProfonde: 'Cause Profonde',
      besoin: 'Besoin',
      addCauseNeed: 'Ajouter Cause & Besoin',
      causeNeedShort: 'Cause & Besoin',
      addBranch: 'Ajouter une Branche',
      addServiceTooltip: 'Ajouter un service / axe',
      addSubProblemTooltip: 'Ajouter un sous-problème (projet)',
      deleteAxisTooltip: 'Supprimer cet axe',
      deleteBranchTooltip: 'Supprimer cette branche',
      deleteCauseTooltip: 'Supprimer cette cause'
    },
    solutions: {
      title: 'Arbre à Solutions & Intrants',
      subtitle:
        'Vous pouvez mettre en traitement un Effet et une ou plusieurs Branches de la même lignée simultanément.',
      impactGlobal: 'Impact Global (Objectif Général)',
      selectConsequenceHint: "Sélectionnez une conséquence globale dans l'arbre à problèmes.",
      expectedEffect: 'EFFET ATTENDU',
      effetShort: 'EFFET',
      effectFocusedBadge: '✓ Effet en traitement',
      focusEffectBtn: 'Traiter cet Effet',
      unfocusEffectTooltip: 'Retirer le focus de cet effet',
      linkCentralHint: "Associez un problème central dans l'arbre à problèmes.",
      derivedFromCentral: 'Dérivé du problème central.',
      effectActionsPlaceholder: 'Actions sur cet Effet...',
      studyFocusGroup: "1. FOCUS SUR L'ÉTUDE",
      unfocusEffectOption: 'Retirer le traitement de cet Effet',
      focusEffectOption: 'Traiter cet Effet (Focus)',
      hypothesisGroup: '2. DÉFINIR COMME HYPOTHÈSE POUR :',
      conditionLabel: 'Condition :',
      conditionBranchLabel: 'Condition Branche',
      branchFocusedBadge: '✓ Branche en traitement',
      focusBranchBtn: 'Traiter cette Branche',
      unfocusBranchOption: 'Retirer le traitement de la branche',
      focusBranchOption: 'Traiter cette branche',
      branchActionsPlaceholder: 'Actions Branche',
      extrantDeliverable: 'Extrant (Livrable)',
      extrantIndexed: (idx: number) => `Extrant ${idx} (Livrable)`,
      derivedFromConstraint: 'Dérivé de la contrainte',
      activite: 'Activité',
      derivedFromCause: 'Dérivée de la cause',
      intrants: 'Intrants',
      rh: 'Ressources Humaines',
      rhFull: 'Ressources Humaines (RH)',
      mat: 'Ressources Matérielles',
      activityBudget: 'Budget Activité',
      rolePlaceholder: 'Poste...',
      equipPlaceholder: 'Matériel...'
    },
    stakeholders: {
      title: 'Registre des Parties Prenantes',
      subtitle: 'Cartographie des acteurs clés par axe et par projet.',
      filteredByFocus: 'Filtré par focus actif',
      placeholder: 'Partie prenante...',
      beneficiaires: 'Bénéficiaires',
      instCentralises: "Interne à l'Institution",
      instDecentralises: "Externe à l'Institution",
      operateursTechniques: 'Partenaires Techniques',
      ptf: 'Partenaires Financiers'
    },
    tdr: {
      title: 'Générateur Logique des Termes de Référence (TDR)',
      subtitle:
        'Extraction structurée par lignée logique : Diagnostic (Problèmes) → Résultats (Solutions) → Intrants & Budget → Parties Prenantes.',
      hideFieldsBtn: 'Masquer les rubriques',
      showFieldsBtn: 'Rubriques TDR',
      printTdrBtn: 'Imprimer / Télécharger TDR (PDF)',
      step1Label: '1. Choix du Service (Problème Central / EFFET)',
      byActiveFocus: "Selon le Focus actif de l'étude",
      allServices: 'Tous les Services / Effets',
      allServicesUnfiltered: 'Tous les Services / Effets (Sans filtre)',
      step2Label: '2. Choix de la Branche (Contrainte / Extrant)',
      allBranches: 'Toutes les Branches retenues',
      step3Label: "3. Choix de l'Activité (Cause Profonde / Activité)",
      allActivities: 'Toutes les Activités de la lignée',
      docTitlePrefix: 'TERMES DE RÉFÉRENCE (TDR) —',
      consolidatedBudget: 'Budget Consolidé TDR',
      serviceLineage: 'Lignée de Service',
      branchSubtotal: 'Sous-total Branche :',
      activityInputsTitle: "Intrants de l'Activité",
      noRh: 'Aucune ressource humaine',
      noMat: 'Aucune ressource matérielle',
      associatedStakeholders: 'Parties Prenantes associées',
      groups: {
        diag: 'Diagnostic (Arbre à Problèmes)',
        results: 'Résultats (Arbre à Solutions)',
        inputs: 'Intrants & Budget',
        actors: 'Parties Prenantes'
      },
      fields: {
        consequenceGlobale: 'Conséquence Globale (Impact Négatif)',
        problemeCentral: 'PROBLÈME CENTRAL',
        contrainte: 'Contrainte',
        causeProfonde: 'Cause Profonde',
        besoin: 'Besoin',
        impactGlobal: 'Impact Global (Objectif Général)',
        effet: 'EFFET',
        extrant: 'Extrant (Livrable)',
        activite: 'Activité',
        intrants: 'Intrants',
        ressourcesHumaines: 'Ressources Humaines',
        ressourcesMaterielles: 'Ressources Matérielles',
        budgetActivite: 'Budget Activité',
        beneficiaires: 'Bénéficiaires',
        instCentralises: "Interne à l'Institution",
        instDecentralises: "Externe à l'Institution",
        operateursTechniques: 'Partenaires Techniques',
        ptf: 'Partenaires Financiers'
      }
    }
  },
  en: {
    subtitle: 'RBM Engineering',
    importJson: 'Import JSON',
    saveJson: 'Save JSON (Overwrite & Update)',
    exportJson: 'Export JSON',
    printPdf: 'Download TOR (PDF)',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    currencyTitle: 'Switch currency (CFA Franc / Euro / Dollar)',
    switchLangTitle: 'Switch to French (FR)',
    closeMenu: 'Close menu',
    openMenu: 'Open dropdown menu',
    collapseMenu: 'Collapse sidebar',
    expandMenu: 'Expand sidebar',
    garApproach: 'RBM Workflow',
    activePortfolioLabel: 'Active Portfolio:',
    selectProjectLabel: 'Project Selector',
    selectProjectPlaceholder: 'Select a project...',
    budgetLabel: 'Budget:',
    showAll: 'Show all',
    tabs: {
      accueil: { label: 'Home', short: 'Home' },
      profil: { label: 'User Profile', short: 'Profile' },
      dossier: { label: 'Portfolios & Projects', short: 'Projects' },
      brainstorming: { label: 'Brainstorming', short: 'Ideas' },
      arbre: { label: 'Problem Tree', short: 'Problems' },
      solutions: { label: 'Solution Tree', short: 'Solutions' },
      registre_parties: { label: 'Stakeholder Register', short: 'Actors' },
      tdr: { label: 'TOR (TDR)', short: 'TOR' }
    },
    profil: {
      title: 'User Profile',
      subtitle: 'Your personal and professional details are automatically saved in the device local database (IndexedDB) and directly included in your Terms of Reference (TOR).',
      badge: 'Synced with TOR & IndexedDB',
      nomLabel: 'Last Name',
      nomPlaceholder: 'e.g. KOFFIÉ',
      prenomLabel: 'First Name(s)',
      prenomPlaceholder: 'e.g. Fabien Michael',
      emailLabel: 'Email',
      emailPlaceholder: 'e.g. user@institution.org',
      contactLabel: 'Contact (Phone)',
      contactPlaceholder: 'e.g. +225 07 00 00 00 00',
      fonctionLabel: 'Role / Title',
      fonctionPlaceholder: 'e.g. RBM Planning & M&E Specialist',
      institutionLabel: 'Institution / Organization',
      institutionPlaceholder: 'e.g. Ministry of Health / General Directorate',
      previewTitle: 'Signature preview in TOR (Screen & PDF)',
      emptyPreview: 'Fill in your profile details above to automatically display them in the header of your TOR documents.',
      resetBtn: 'Clear profile'
    },
    noProject: {
      title: 'No Active Portfolio',
      desc: 'To access FAAB BRAINSTORMING tools, open the dropdown menu via the top-left Burger icon to select a project or import a JSON file.',
      browseBtn: 'Open Burger Menu',
      importBtn: 'Import JSON'
    },
    home: {
      badge: 'Institutional RBM Solution',
      welcomePrefix: 'Welcome to',
      intro:
        'FAAB BRAINSTORMING structures your Results-Based Management (RBM) workflow: from Brainstorming ideas to the Problem Tree, Solution Tree, input costing, Stakeholder Register, and automated Terms of Reference (TOR / TDR) generation.',
      openPortfolios: 'Open Portfolios',
      restoreDemo: 'Restore Health Demo Sample',
      designLabel: 'Design & Engineering',
      expertBio: 'Expert in strategic planning engineering and Results-Based Management systems.',
      frameworkLabel: 'Methodological Framework',
      frameworkTitle: 'RBM Logical Cycle & TOR',
      frameworkDesc:
        'Every identified problem mirrors into a solution: the Global Consequence becomes the Impact, Core Problems translate into Outcomes (Effects), Constraints into Outputs, and Root Causes into Activities consolidated in the TOR.',
      compliance: 'Compliant with international development standards',
      ndaTitle: 'Non-Disclosure Agreement & Intellectual Property',
      ndaText:
        'This platform, including its logical structure, inter-service dependency algorithms, and functional interface, is a protected work belonging to its creator. Any unauthorized reproduction, copying, or distribution is strictly prohibited.',
      rights: 'All rights reserved.'
    },
    dossier: {
      title: 'Portfolios & Projects',
      subtitle: (used: number) =>
        `Unlimited portfolios and ideas creation (${used} active portfolio${used !== 1 ? 's' : ''}).`,
      newProjectBtn: 'New Project',
      activeBadge: 'Active',
      trashTitle: 'Move to trash',
      instPlaceholder: 'Institution Name...',
      namePlaceholder: 'Portfolio / Project Name...',
      descPlaceholder: 'Strategic description...',
      designerSectionTitle: 'Project Designer Information',
      designerNamePlaceholder: 'Designer Full Name...',
      designerRolePlaceholder: 'Role / Title...',
      designerEmailPlaceholder: 'Professional Email...',
      axesCount: 'Axes:',
      ideasCount: 'Ideas:',
      openGarBtn: 'Open RBM',
      newFolderCard: 'New Portfolio',
      newFolderSub: 'Unlimited RBM workspaces'
    },
    brainstorming: {
      title: 'Brainstorming Board',
      subtitle: 'Formulate an unlimited number of ideas in pairs: Problem (Negative) to Solution (Positive).',
      newIdeaBtn: 'New Idea',
      deleteIdeaTitle: 'Delete this idea',
      negLabel: 'Problem (Negative)',
      negPlaceholder: 'Negative state...',
      posLabel: 'Solution (Positive)',
      posPlaceholder: 'Positive state...',
      colorTitle: 'Color',
      emptyTitle: 'No ideas recorded yet',
      emptyDesc: 'Click "New Idea" to create your Problem / Solution cards with no limit.',
      addIdeaBtn: 'Add an idea'
    },
    common: {
      treeView: 'Tree',
      listView: 'List',
      zoomOut: 'Zoom out',
      zoomReset: 'Reset zoom',
      zoomIn: 'Zoom in',
      undefinedText: 'Not defined',
      notSpecified: 'Not specified',
      add: 'Add',
      delete: 'Delete',
      costPlaceholder: 'Cost...',
      cancel: 'Cancel',
      confirm: 'Confirm',
      chooseIdea: 'Choose an idea...',
      autoCalc: 'Auto calc',
      service: 'Service',
      branch: 'Branch',
      project: 'Project',
      subProblem: 'Sub-Problem'
    },
    arbre: {
      title: 'Problem Tree',
      subtitle: 'Global Consequence, Core Problems, Constraints, Root Causes, and Needs.',
      consequenceGlobale: 'Global Consequence (Negative Impact)',
      selectNegativeImpact: 'Select negative impact...',
      chooseImpact: 'Choose impact...',
      problemeCentral: 'CORE PROBLEM',
      chooseCentralProblem: 'Choose core problem...',
      centralProblemShort: 'Core problem...',
      contrainte: 'Constraint',
      chooseConstraint: 'Choose constraint...',
      causeProfonde: 'Root Cause',
      besoin: 'Need',
      addCauseNeed: 'Add Cause & Need',
      causeNeedShort: 'Cause & Need',
      addBranch: 'Add a Branch',
      addServiceTooltip: 'Add a service / axis',
      addSubProblemTooltip: 'Add a sub-problem (project)',
      deleteAxisTooltip: 'Delete this axis',
      deleteBranchTooltip: 'Delete this branch',
      deleteCauseTooltip: 'Delete this cause'
    },
    solutions: {
      title: 'Solution Tree & Inputs',
      subtitle:
        'You can focus an Outcome (Effect) and one or more Branches from the same lineage simultaneously.',
      impactGlobal: 'Global Impact (General Objective)',
      selectConsequenceHint: 'Select a global consequence in the problem tree.',
      expectedEffect: 'EXPECTED OUTCOME (EFFECT)',
      effetShort: 'OUTCOME (EFFECT)',
      effectFocusedBadge: '✓ Outcome in focus',
      focusEffectBtn: 'Focus this Outcome',
      unfocusEffectTooltip: 'Remove focus from this outcome',
      linkCentralHint: 'Link a core problem in the problem tree.',
      derivedFromCentral: 'Derived from core problem.',
      effectActionsPlaceholder: 'Actions on this Outcome...',
      studyFocusGroup: '1. STUDY FOCUS',
      unfocusEffectOption: 'Remove focus from this Outcome',
      focusEffectOption: 'Focus this Outcome',
      hypothesisGroup: '2. SET AS ASSUMPTION FOR:',
      conditionLabel: 'Condition:',
      conditionBranchLabel: 'Condition Branch',
      branchFocusedBadge: '✓ Branch in focus',
      focusBranchBtn: 'Focus this Branch',
      unfocusBranchOption: 'Remove focus from branch',
      focusBranchOption: 'Focus this branch',
      branchActionsPlaceholder: 'Actions Branch',
      extrantDeliverable: 'Output (Deliverable)',
      extrantIndexed: (idx: number) => `Output ${idx} (Deliverable)`,
      derivedFromConstraint: 'Derived from constraint',
      activite: 'Activity',
      derivedFromCause: 'Derived from root cause',
      intrants: 'Inputs',
      rh: 'Human Resources',
      rhFull: 'Human Resources (HR)',
      mat: 'Material Resources',
      activityBudget: 'Activity Budget',
      rolePlaceholder: 'Role...',
      equipPlaceholder: 'Equipment...'
    },
    stakeholders: {
      title: 'Stakeholder Register',
      subtitle: 'Mapping of key actors by service axis and project.',
      filteredByFocus: 'Filtered by active focus',
      placeholder: 'Stakeholder...',
      beneficiaires: 'Beneficiaries',
      instCentralises: 'Internal to Institution',
      instDecentralises: 'External to Institution',
      operateursTechniques: 'Technical Partners',
      ptf: 'Financial Partners'
    },
    tdr: {
      title: 'Logical Terms of Reference (TOR / TDR) Generator',
      subtitle:
        'Structured extraction by logical lineage: Diagnosis (Problems) → Results (Solutions) → Inputs & Budget → Stakeholders.',
      hideFieldsBtn: 'Hide sections',
      showFieldsBtn: 'TOR Sections',
      printTdrBtn: 'Print / Download TOR (PDF)',
      step1Label: '1. Select Service (Core Problem / OUTCOME)',
      byActiveFocus: 'According to active study Focus',
      allServices: 'All Services / Outcomes',
      allServicesUnfiltered: 'All Services / Outcomes (Unfiltered)',
      step2Label: '2. Select Branch (Constraint / Output)',
      allBranches: 'All selected Branches',
      step3Label: '3. Select Activity (Root Cause / Activity)',
      allActivities: 'All Activities in lineage',
      docTitlePrefix: 'TERMS OF REFERENCE (TOR) —',
      consolidatedBudget: 'Consolidated TOR Budget',
      serviceLineage: 'Service Lineage',
      branchSubtotal: 'Branch Subtotal:',
      activityInputsTitle: 'Activity Inputs',
      noRh: 'No human resources',
      noMat: 'No material resources',
      associatedStakeholders: 'Associated Stakeholders',
      groups: {
        diag: 'Diagnosis (Problem Tree)',
        results: 'Results (Solution Tree)',
        inputs: 'Inputs & Budget',
        actors: 'Stakeholders'
      },
      fields: {
        consequenceGlobale: 'Global Consequence (Negative Impact)',
        problemeCentral: 'CORE PROBLEM',
        contrainte: 'Constraint',
        causeProfonde: 'Root Cause',
        besoin: 'Need',
        impactGlobal: 'Global Impact (General Objective)',
        effet: 'OUTCOME (EFFECT)',
        extrant: 'Output (Deliverable)',
        activite: 'Activity',
        intrants: 'Inputs',
        ressourcesHumaines: 'Human Resources',
        ressourcesMaterielles: 'Material Resources',
        budgetActivite: 'Activity Budget',
        beneficiaires: 'Beneficiaries',
        instCentralises: 'Internal to Institution',
        instDecentralises: 'External to Institution',
        operateursTechniques: 'Technical Partners',
        ptf: 'Financial Partners'
      }
    }
  }
};

// HELPER: Garantit que les données sont toujours un tableau
const ensureArray = <T,>(val: T | T[] | undefined | null): T[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return (val.split('\n').map(s => s.trim()).filter(Boolean) as unknown) as T[];
  }
  return [val];
};

// HELPERS DE DONNÉES 2D (Pour gérer multiples intrants par activité)
const getSafe2D = (arr: ResourceItem[][] | undefined | null, k: number): ResourceItem[] => {
  if (!Array.isArray(arr)) return [];
  if (arr.length > 0 && !Array.isArray(arr[0])) {
    return k === 0 ? ((arr as unknown) as ResourceItem[]) : [];
  }
  return arr[k] || [];
};

// HELPER: Formatage et calculs financiers multi-devises (FCFA, EUR, USD)
const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; pdfLabel: string; shortLabel: string }> = {
  FCFA: { symbol: 'FCFA', pdfLabel: 'FCFA', shortLabel: 'FCFA' },
  EUR: { symbol: '€', pdfLabel: 'EUR (€)', shortLabel: '€ (EUR)' },
  USD: { symbol: '$', pdfLabel: 'USD ($)', shortLabel: '$ (USD)' }
};

const parseAmount = (val: string | number | undefined | null): number => {
  if (!val) return 0;
  const strVal = val.toString();
  const cleaned = strVal
    .replace(/[\s\u00A0\u202F]+/g, '')
    .replace(/FCFA|CFA|EUR|USD|€|\$|F/gi, '')
    .replace(',', '.');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const num = parseFloat(match[0]);
  return isNaN(num) ? 0 : num;
};

const formatAmount = (num: number, currency: CurrencyCode = 'FCFA'): string => {
  const formattedNumber = new Intl.NumberFormat('fr-FR').format(num).replace(/[\u00A0\u202F]/g, ' ');
  const symbol = CURRENCY_CONFIG[currency]?.symbol || 'FCFA';
  return `${formattedNumber} ${symbol}`;
};

const formatResourceAmount = (rawAmount: string | undefined, currency: CurrencyCode = 'FCFA'): string => {
  if (!rawAmount || !rawAmount.trim()) return '';
  const num = parseAmount(rawAmount);
  if (num > 0) {
    return formatAmount(num, currency);
  }
  return rawAmount;
};

const calculateActivityTotal = (proj: ProjectSolution | undefined, k: number): { sum: number; hasAmounts: boolean } => {
  let sum = 0;
  let hasAmounts = false;
  const process = (items: ResourceItem[]) => {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      if (typeof item === 'object' && item?.amount) {
        const val = parseAmount(item.amount);
        if (val > 0) {
          sum += val;
          hasAmounts = true;
        }
      }
    });
  };
  if (proj) {
    process(getSafe2D(proj.intrants_rh, k));
    process(getSafe2D(proj.intrants_mat, k));
  }
  return { sum, hasAmounts };
};

const getProjectEffectiveCost = (proj: ProjectSolution | undefined): number => {
  if (!proj) return 0;
  const actCount = Math.max(ensureArray(proj.activites).length, 1);
  let total = 0;
  for (let k = 0; k < actCount; k++) {
    const { sum } = calculateActivityTotal(proj, k);
    total += sum;
  }
  return total;
};

// COMPOSANT: Cellule Editable générique avec support de Préfixe Fixe
interface EditableCellProps {
  isEditable: boolean;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
  type?: 'text' | 'textarea' | 'list' | 'numberList';
  placeholder?: string;
  fixedPrefix?: string;
}

const EditableCell: React.FC<EditableCellProps> = ({
  isEditable,
  value,
  onChange,
  type = 'text',
  placeholder = '...',
  fixedPrefix = ''
}) => {
  let displayValue: string | string[] = value ?? '';
  if (fixedPrefix && typeof displayValue === 'string' && !displayValue.startsWith(fixedPrefix)) {
    displayValue = fixedPrefix;
  }

  if (!isEditable) {
    if (type === 'list') {
      const arr = ensureArray(displayValue);
      if (arr.length === 0) return <span className="text-slate-400 italic text-[10px]">-</span>;
      return <ul className="list-disc pl-3.5 space-y-0.5 text-[10px]">{arr.map((v, i) => <li key={i}>{v}</li>)}</ul>;
    }
    if (type === 'numberList') {
      const arr = ensureArray(displayValue);
      if (arr.length === 0) return <span className="text-slate-400 italic text-[10px]">-</span>;
      return <ul className="list-decimal pl-3.5 space-y-0.5 text-[10px]">{arr.map((v, i) => <li key={i}>{v}</li>)}</ul>;
    }
    return <span className="whitespace-pre-line text-[10px] sm:text-[11px] font-medium text-slate-800">{(displayValue as string) || '-'}</span>;
  }

  if (type === 'textarea' || type === 'list' || type === 'numberList') {
    const textVal = Array.isArray(displayValue) ? displayValue.join('\n') : displayValue;
    return (
      <textarea
        className="w-full bg-orange-50/70 border border-orange-300 rounded p-1.5 text-slate-800 text-[10px] sm:text-[11px] font-medium focus:ring-1 focus:ring-orange-500 min-h-[42px] shadow-inner transition-all leading-snug custom-scrollbar outline-none"
        value={textVal || ''}
        onChange={(e) => {
          let val = e.target.value;
          if (fixedPrefix && !val.startsWith(fixedPrefix)) val = fixedPrefix;
          onChange(type === 'list' || type === 'numberList' ? val.split('\n') : val);
        }}
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      type="text"
      className="w-full bg-orange-50/70 border border-orange-300 rounded p-1.5 text-slate-800 text-[10px] sm:text-[11px] font-medium focus:ring-1 focus:ring-orange-500 shadow-inner transition-all outline-none"
      value={(displayValue as string) || ''}
      onChange={(e) => {
        let val = e.target.value;
        if (fixedPrefix && !val.startsWith(fixedPrefix)) val = fixedPrefix;
        onChange(val);
      }}
      placeholder={placeholder}
    />
  );
};

// COMPOSANT: Liste de Ressources Éditable Compacte (RH & Matériel)
interface EditableResourceListProps {
  isEditable: boolean;
  items: ResourceItem[] | undefined;
  onChange: (items: ResourceItem[]) => void;
  placeholderLabel?: string;
  lang?: Lang;
  currency?: CurrencyCode;
}

const EditableResourceList: React.FC<EditableResourceListProps> = ({
  isEditable,
  items,
  onChange,
  placeholderLabel = 'Désignation...',
  lang = 'fr',
  currency = 'FCFA'
}) => {
  const t = I18N[lang];
  const normalizedArr = useMemo(() => {
    if (!items) return [];
    if (!Array.isArray(items)) {
      if (typeof items === 'string') {
        return (items as string).split('\n').filter(s => s.trim()).map(s => ({ label: s.trim(), amount: '' }));
      }
      return [];
    }
    return items.map(item => (typeof item === 'string' ? { label: item, amount: '' } : item));
  }, [items]);

  if (!isEditable) {
    if (normalizedArr.length === 0) return <p className="text-[9px] italic text-slate-400">{t.common.undefinedText}</p>;
    return (
      <ul className="text-[9px] leading-tight font-medium text-slate-800 list-disc pl-3 space-y-0.5">
        {normalizedArr.map((item, idx) => (
          <li key={idx} className="break-words">
            {item.label}{' '}
            {item.amount && (
              <span className="font-bold text-emerald-700 ml-1">
                ({formatResourceAmount(item.amount, currency)})
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  const updateItem = (idx: number, field: keyof ResourceItem, val: string) => {
    const newArr = [...normalizedArr];
    newArr[idx] = { ...newArr[idx], [field]: val };
    onChange(newArr);
  };

  const addItem = () => onChange([...normalizedArr, { label: '', amount: '' }]);
  const removeItem = (idx: number) => onChange(normalizedArr.filter((_, i) => i !== idx));

  return (
    <div className="space-y-1 w-full">
      {normalizedArr.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1 bg-white/95 p-1 rounded border border-slate-200 shadow-2xs">
          <input
            type="text"
            className="flex-1 min-w-0 bg-transparent text-[9px] font-bold text-slate-800 focus:outline-none placeholder:text-slate-400"
            value={item.label || ''}
            onChange={e => updateItem(idx, 'label', e.target.value)}
            placeholder={placeholderLabel}
          />
          <input
            type="text"
            className="w-16 min-w-0 bg-emerald-50 text-[9px] font-bold text-emerald-800 border-l border-slate-200 pl-1 py-0.5 rounded-r focus:outline-none placeholder:text-emerald-400"
            value={item.amount ? String(parseAmount(item.amount) || item.amount) : ''}
            onChange={e => updateItem(idx, 'amount', e.target.value)}
            placeholder={`${CURRENCY_CONFIG[currency].symbol}...`}
          />
          <button
            onClick={() => removeItem(idx)}
            className="text-red-400 hover:text-red-600 p-0.5 cursor-pointer shrink-0"
            title={t.common.delete}
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center justify-center w-full gap-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-dashed border-slate-300 transition-colors text-[8px] font-bold uppercase tracking-wider cursor-pointer"
      >
        <Plus size={10} /> {t.common.add}
      </button>
    </div>
  );
};

// HELPER UI: Rendu du budget par activité (Compact)
const renderActivityCost = (
  proj: ProjectSolution | undefined,
  k: number,
  lang: Lang = 'fr',
  currency: CurrencyCode = 'FCFA'
) => {
  const { sum } = calculateActivityTotal(proj, k);
  return (
    <div className="text-center p-1 bg-emerald-50 rounded border border-emerald-300 shadow-inner w-full">
      <span className="text-[10px] font-black text-emerald-900 block tabular-nums">{formatAmount(sum, currency)}</span>
      <span className="text-[7px] uppercase font-bold text-emerald-700 block opacity-90 tracking-widest">
        {I18N[lang].common.autoCalc}
      </span>
    </div>
  );
};

// LIGNES RÉUTILISABLES POUR LES TABLEAUX
const AxeRow: React.FC<{ axe: AxeSolution; colSpan: number }> = ({ axe, colSpan }) => (
  <tr className="bg-slate-200 border-y-2 border-slate-300">
    <td colSpan={colSpan} className="sticky left-0 z-10 px-3 py-1.5 font-black text-slate-900 bg-slate-200 uppercase tracking-widest text-[10px] sm:text-xs">
      {axe?.nom || 'Service'}
    </td>
  </tr>
);

const ProjRow: React.FC<{ proj: ProjectSolution; pIdx: number; colSpan: number; lang?: Lang }> = ({
  proj,
  pIdx,
  colSpan,
  lang = 'fr'
}) => (
  <tr className="bg-slate-100 border-y border-slate-200">
    <td colSpan={colSpan} className="sticky left-0 z-10 px-3 py-1 font-bold text-slate-700 bg-slate-100 uppercase text-[9px] sm:text-[10px] tracking-wider">
      {I18N[lang].common.subProblem} {pIdx + 1} ({I18N[lang].common.project} {pIdx + 1}) : {proj?.extrant || '-'}
    </td>
  </tr>
);

// COMPOSANT: Sélecteur d'idées depuis le Brainstorming (Compact)
interface BrainstormingSelectProps {
  value: string | undefined;
  onChange: (negativeText: string, positiveText: string) => void;
  className?: string;
  placeholder?: string;
  ideas: BrainstormIdea[] | undefined;
}

const BrainstormingSelect: React.FC<BrainstormingSelectProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Choisir une idée...',
  ideas = []
}) => {
  const options = (ideas || []).filter(
    i => (i.textNegative && i.textNegative.trim() !== '') || (i.text && i.text.trim() !== '')
  );

  const selectedIdea = options.find(o => (o.textNegative || o.text) === value);
  const selectValue = selectedIdea ? selectedIdea.id : value ? 'custom_value' : '';

  return (
    <select
      className={`w-full p-1 sm:p-1.5 min-h-[28px] outline-none cursor-pointer text-center font-bold text-[10px] sm:text-[11px] rounded transition-all shadow-2xs ${className}`}
      value={selectValue}
      onChange={(e) => {
        const selectedId = e.target.value;
        const idea = options.find(i => i.id === selectedId);
        if (idea) {
          onChange(idea.textNegative || idea.text || '', idea.textPositive || '');
        }
      }}
      title={value || placeholder}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map(idea => {
        const negText = idea.textNegative || idea.text || '';
        return (
          <option key={idea.id} value={idea.id}>
            {negText.length > 65 ? negText.substring(0, 65) + '...' : negText}
          </option>
        );
      })}
      {value && !selectedIdea && (
        <option value="custom_value" disabled>
          {value.length > 65 ? value.substring(0, 65) + '...' : value}
        </option>
      )}
    </select>
  );
};

// --- BASE DE DONNÉES INITIALE ---
const initialData: Portfolio[] = [
  {
    id: 'port-demo',
    name: 'Programme National Santé Maternelle & Néonatale',
    institution: 'Ministère de la Santé Publique',
    description: 'Modèle GAR complet démontrant le passage des idées de brainstorming à l\'arbre à problèmes, solutions, intrants chiffrés, parties prenantes et TDR.',
    concepteurNomPrenoms: 'KOFFIE FABIEN MICHAEL',
    concepteurFonction: 'Expert Ingénierie GAR & Planification Stratégique',
    concepteurEmail: 'fabien.frikupgeneration@gmail.com',
    serviceName: 'Direction Santé Familiale',
    budget: '14 500 000 FCFA',
    status: 'Validé',
    isEditable: true,
    isTrashed: false,
    garData: {
      brainstorming: [
        {
          id: 'idea-1',
          textNegative: 'Taux de mortalité maternelle élevé lors des accouchements dans les centres ruraux.',
          textPositive: 'Baisse significative du taux de mortalité maternelle en zones rurales.',
          color: 'bg-rose-100'
        },
        {
          id: 'idea-2',
          textNegative: 'Insuffisance de sages-femmes formées aux urgences obstétricales néonatales.',
          textPositive: 'Personnel obstétrical qualifié et certifié aux gestes d\'urgence.',
          color: 'bg-amber-100'
        },
        {
          id: 'idea-3',
          textNegative: 'Pénurie récurrente de kits d\'accouchement stérile et sang pour transfusion.',
          textPositive: 'Approvisionnement continu et traçabilité des kits d\'urgence et poches de sang.',
          color: 'bg-emerald-100'
        },
        {
          id: 'idea-4',
          textNegative: 'Rupture de la chaîne du froid pour les vaccins néonatals.',
          textPositive: 'Chaîne de conservation solaire opérationnelle 24/7 dans tous les dispensaires.',
          color: 'bg-sky-100'
        }
      ],
      stakeholders: {
        beneficiaires: [
          { nom: 'Femmes enceintes et nouveau-nés des districts cibles', axe: 1, projetIndex: 0 },
          { nom: 'Communautés villageoises et comités de santé (COGES)', axe: 1, projetIndex: 0 }
        ],
        instCentralises: [
          { nom: 'Direction de la Santé Maternelle et Infantile (DSMI)', axe: 1, projetIndex: 0 }
        ],
        instDecentralises: [
          { nom: 'Directions Régionales de la Santé et Chefs de Districts', axe: 1, projetIndex: 0 }
        ],
        operateursTechniques: [
          { nom: 'Ordre National des Sages-Femmes & Société de Gynécologie', axe: 1, projetIndex: 0 }
        ],
        ptf: [
          { nom: 'OMS, UNICEF, Fonds Mondial', axe: 1, projetIndex: 0 }
        ]
      },
      problems: {
        consequenceGlobale: 'Taux de mortalité maternelle élevé lors des accouchements dans les centres ruraux.',
        branches: [
          {
            axeName: 'Service 1 : Prise en charge obstétricale',
            central: 'Insuffisance de sages-femmes formées aux urgences obstétricales néonatales.',
            details: [
              {
                contrainte: 'Pénurie récurrente de kits d\'accouchement stérile et sang pour transfusion.',
                cause: ['Rupture d\'approvisionnement au niveau du dépôt central pharmaceutique regional'],
                besoin: ['Mise en place d\'une réserve tampon sécurisée et protocole de réapprovisionnement sous 48h']
              }
            ]
          }
        ]
      },
      rendement: {
        impact: 'Baisse significative du taux de mortalité maternelle en zones rurales.',
        axes: [
          {
            nom: 'Service 1 : Prise en charge obstétricale',
            effet: 'Personnel obstétrical qualifié et certifié aux gestes d\'urgence.',
            budget: '14 500 000 FCFA',
            projets: [
              {
                extrant: 'Approvisionnement continu et traçabilité des kits d\'urgence et poches de sang.',
                activites: [
                  'Organisation de sessions de formation pratique et dotation en kits stériles d\'intervention'
                ],
                intrants_rh: [
                  [
                    { label: 'Médecin formateur obstétricien (3 jrs)', amount: '600000 FCFA' },
                    { label: 'Superviseur de district (5 jrs)', amount: '350000 FCFA' }
                  ]
                ],
                intrants_mat: [
                  [
                    { label: 'Kits d\'urgence obstétricale complète (50 unités)', amount: '3500000 FCFA' },
                    { label: 'Mannequins de simulation clinique', amount: '1200000 FCFA' }
                  ]
                ],
                couts: ['5650000 FCFA'],
                responsable: 'Dr. Kouadio - Coordinateur Santé Rurale',
                periode: 'T1 - T3 2026'
              }
            ]
          }
        ]
      },
      risks: [
        {
          id: 'risk-1',
          niveau: 'EFFET',
          logique: 'Formation continue',
          hypothese: 'Stabilité des affectations du personnel de santé en zone rurale',
          level: 'MOYEN',
          axe: 1
        }
      ],
      fiche: {
        lieu: 'Districts Sanitaires Région Ouest',
        duree: '12 Mois (2026)',
        moa: 'Ministère de la Santé',
        moe: 'Direction Régionale de la Santé',
        partenaires: 'UNICEF / OMS',
        strategie: 'Décentralisation des capacités obstétricales d\'urgence'
      }
    }
  },
  {
    id: 'port-1',
    name: 'Nouveau Portefeuille (À nommer)',
    institution: 'Institution par défaut',
    description: 'Espace d\'expérimentation libre pour simuler et concevoir un portefeuille selon la méthodologie GAR.',
    concepteurNomPrenoms: '',
    concepteurFonction: '',
    concepteurEmail: '',
    serviceName: 'Service 1',
    budget: '0 FCFA',
    status: 'Brouillon',
    isEditable: true,
    isTrashed: false,
    garData: {
      brainstorming: [],
      stakeholders: { beneficiaires: [], instCentralises: [], instDecentralises: [], operateursTechniques: [], ptf: [] },
      problems: {
        consequenceGlobale: '',
        branches: [{ axeName: 'Service 1', central: '', details: [{ contrainte: '', cause: [''], besoin: [''] }] }]
      },
      rendement: {
        impact: '',
        axes: [
          {
            nom: 'Service 1',
            effet: '',
            budget: '0 FCFA',
            projets: [{ extrant: '', extrantCmr: '', activites: [''], intrants_rh: [[]], intrants_mat: [[]], couts: [''], responsable: '', periode: '' }]
          }
        ]
      },
      risks: [],
      fiche: { lieu: '', duree: '', moa: '', moe: '', partenaires: '', strategie: '' }
    }
  }
];

const STORAGE_KEY = 'faab_gar_portfolios_v1';
const THEME_STORAGE_KEY = 'faab_gar_theme_v1';
const LANG_STORAGE_KEY = 'faab_gar_lang_v1';
const CURRENCY_STORAGE_KEY = 'faab_gar_currency_v1';
const USER_PROFILE_STORAGE_KEY = 'faab_gar_user_profile_v1';
const ACTIVE_PROJECT_KEY = 'faab_gar_active_project_id_v1';
const BRAIN_LOGO_URL = `${import.meta.env.BASE_URL}assets/aistudio/logo_FAAB_BRAINSTORMING_4a6b8c00.png`;

const defaultUserProfile: UserProfile = {
  nom: '',
  prenom: '',
  email: '',
  contact: '',
  fonction: '',
  institution: ''
};

// --- MOTEUR DE PERSISTANCE INDEXEDDB DE L'APPAREIL ---
const IDB_NAME = 'faab_brainstorming_db';
const IDB_VERSION = 1;
const IDB_STORE_SETTINGS = 'app_state';
const IDB_STORE_PORTFOLIOS = 'portfolios';

const openFaabIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non supporté'));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_SETTINGS)) {
        db.createObjectStore(IDB_STORE_SETTINGS);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_PORTFOLIOS)) {
        db.createObjectStore(IDB_STORE_PORTFOLIOS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const idbGetSetting = async <T,>(key: string): Promise<T | undefined> => {
  try {
    const db = await openFaabIndexedDB();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(IDB_STORE_SETTINGS);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
};

const idbSetSetting = async <T,>(key: string, value: T): Promise<void> => {
  try {
    const db = await openFaabIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(IDB_STORE_SETTINGS);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore fallback errors
  }
};

const idbSavePortfolios = async (list: Portfolio[]): Promise<void> => {
  try {
    const db = await openFaabIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([IDB_STORE_SETTINGS, IDB_STORE_PORTFOLIOS], 'readwrite');
      const settingsStore = tx.objectStore(IDB_STORE_SETTINGS);
      const portfoliosStore = tx.objectStore(IDB_STORE_PORTFOLIOS);

      settingsStore.put(list, STORAGE_KEY);
      portfoliosStore.clear();
      list.forEach(item => {
        if (item && item.id) {
          portfoliosStore.put(item);
        }
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore fallback errors
  }
};

// BOUTONS ET COMPOSANTS GÉNÉRIQUES
interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ElementType;
  className?: string;
  disabled?: boolean;
  title?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  icon: Icon,
  className = '',
  disabled = false,
  title = ''
}) => {
  const baseStyle =
    'flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-lg font-medium text-[11px] sm:text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs border border-emerald-700/20 active:translate-y-px',
    secondary: 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 shadow-2xs active:translate-y-px',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 active:translate-y-px',
    ghost: 'text-slate-600 hover:bg-slate-100'
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled} title={title}>
      {Icon && <Icon size={14} className="shrink-0" />}
      <span>{children}</span>
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = '',
  onClick
}) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-4 ${className}`}>
    {children}
  </div>
);

const NoProjectScreen: React.FC<{
  setActiveTab: (tab: string) => void;
  onImportClick: () => void;
  lang: Lang;
  onOpenMenu?: () => void;
}> = ({ onImportClick, lang, onOpenMenu }) => {
  const t = I18N[lang];
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10 px-4 relative z-10">
      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
        <FolderOpen size={24} />
      </div>
      <h2 className="text-base sm:text-lg font-black text-slate-800 text-center">{t.noProject.title}</h2>
      <p className="mt-1.5 text-center max-w-md text-xs text-slate-500">{t.noProject.desc}</p>
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
        {onOpenMenu && (
          <Button onClick={onOpenMenu} icon={Menu}>
            {t.noProject.browseBtn}
          </Button>
        )}
        <Button variant="secondary" onClick={onImportClick} icon={Download}>
          {t.noProject.importBtn}
        </Button>
      </div>
    </div>
  );
};

// --- APPLICATION PRINCIPALE ---
export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('accueil');
  const [treeZoom, setTreeZoom] = useState(100);
  const [mobileTreeLayout, setMobileTreeLayout] = useState<'tree' | 'list'>('tree');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [isDbHydrated, setIsDbHydrated] = useState(false);
  const [landingScrollProgress, setLandingScrollProgress] = useState(0);
  const [activeMirrorStage, setActiveMirrorStage] = useState(0);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  // Références des fichiers JSON locaux (File System Access API) pour écraser l'ancien fichier portant le même nom
  const fileHandlesRef = useRef<Record<string, any>>({});

  // Thème (Mode Clair / Mode Sombre)
  const [theme, setTheme] = useState<ThemeMode>('light');

  // Langue (Français / Anglais)
  const [lang, setLang] = useState<Lang>('fr');

  // Devise (FCFA / EUR / USD)
  const [currency, setCurrency] = useState<CurrencyCode>('FCFA');

  // Profil Utilisateur (Nom, Prénom, Email, Contact, Fonction, Institution)
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile);

  const t = I18N[lang];

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const maxScroll = target.scrollHeight - target.clientHeight;
    if (maxScroll <= 0) {
      setLandingScrollProgress(0);
      return;
    }
    const ratio = Math.min(100, Math.max(0, (target.scrollTop / maxScroll) * 100));
    setLandingScrollProgress(ratio);
  };

  const scrollToLandingSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Configuration dynamique des groupes de champs TDR selon la langue active
  const tdrFieldGroups = useMemo(
    () => [
      {
        group: t.tdr.groups.diag,
        items: [
          { key: 'consequenceGlobale', label: t.tdr.fields.consequenceGlobale },
          { key: 'problemeCentral', label: t.tdr.fields.problemeCentral },
          { key: 'contrainte', label: t.tdr.fields.contrainte },
          { key: 'causeProfonde', label: t.tdr.fields.causeProfonde },
          { key: 'besoin', label: t.tdr.fields.besoin }
        ]
      },
      {
        group: t.tdr.groups.results,
        items: [
          { key: 'impactGlobal', label: t.tdr.fields.impactGlobal },
          { key: 'effet', label: t.tdr.fields.effet },
          { key: 'extrant', label: t.tdr.fields.extrant },
          { key: 'activite', label: t.tdr.fields.activite }
        ]
      },
      {
        group: t.tdr.groups.inputs,
        items: [
          { key: 'intrants', label: t.tdr.fields.intrants },
          { key: 'ressourcesHumaines', label: t.tdr.fields.ressourcesHumaines },
          { key: 'ressourcesMaterielles', label: t.tdr.fields.ressourcesMaterielles },
          { key: 'budgetActivite', label: t.tdr.fields.budgetActivite }
        ]
      },
      {
        group: t.tdr.groups.actors,
        items: [
          { key: 'beneficiaires', label: t.tdr.fields.beneficiaires },
          { key: 'instCentralises', label: t.tdr.fields.instCentralises },
          { key: 'instDecentralises', label: t.tdr.fields.instDecentralises },
          { key: 'operateursTechniques', label: t.tdr.fields.operateursTechniques },
          { key: 'ptf', label: t.tdr.fields.ptf }
        ]
      }
    ],
    [t]
  );

  // États spécifiques à l'onglet TDR
  const [tdrSelectedAxe, setTdrSelectedAxe] = useState<string>('focus');
  const [tdrSelectedBranch, setTdrSelectedBranch] = useState<string>('all');
  const [tdrSelectedActivity, setTdrSelectedActivity] = useState<string>('all');
  const [tdrShowConfig, setTdrShowConfig] = useState<boolean>(false);
  const [tdrFields, setTdrFields] = useState<Record<string, boolean>>({
    consequenceGlobale: true,
    problemeCentral: true,
    contrainte: true,
    causeProfonde: true,
    besoin: true,
    impactGlobal: true,
    effet: true,
    extrant: true,
    activite: true,
    intrants: true,
    ressourcesHumaines: true,
    ressourcesMaterielles: true,
    budgetActivite: true,
    beneficiaires: true,
    instCentralises: true,
    instDecentralises: true,
    operateursTechniques: true,
    ptf: true
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // États des portefeuilles (Hydratés et sauvegardés dans IndexedDB de l'appareil)
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialData);
  const [activeProject, setActiveProject] = useState<Portfolio | null>(() => {
    return initialData.find(p => !p.isTrashed) || null;
  });

  // Hydratation initiale depuis l'IndexedDB de l'appareil (avec migration éventuelle de localStorage)
  useEffect(() => {
    let isMounted = true;
    const hydrateFromDeviceDB = async () => {
      const [savedPortfolios, savedActiveId, savedTheme, savedLang, savedCurrency, savedUserProfile] = await Promise.all([
        idbGetSetting<Portfolio[]>(STORAGE_KEY),
        idbGetSetting<string>(ACTIVE_PROJECT_KEY),
        idbGetSetting<ThemeMode>(THEME_STORAGE_KEY),
        idbGetSetting<Lang>(LANG_STORAGE_KEY),
        idbGetSetting<CurrencyCode>(CURRENCY_STORAGE_KEY),
        idbGetSetting<UserProfile>(USER_PROFILE_STORAGE_KEY)
      ]);

      if (!isMounted) return;

      // 1. Thème
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      } else {
        try {
          const legacyTheme = localStorage.getItem(THEME_STORAGE_KEY);
          if (legacyTheme === 'dark' || legacyTheme === 'light') {
            setTheme(legacyTheme);
            await idbSetSetting(THEME_STORAGE_KEY, legacyTheme);
          }
        } catch {
          // ignore
        }
      }

      // 2. Langue
      if (savedLang === 'fr' || savedLang === 'en') {
        setLang(savedLang);
      } else {
        try {
          const legacyLang = localStorage.getItem(LANG_STORAGE_KEY);
          if (legacyLang === 'fr' || legacyLang === 'en') {
            setLang(legacyLang);
            await idbSetSetting(LANG_STORAGE_KEY, legacyLang);
          }
        } catch {
          // ignore
        }
      }

      // 2b. Devise
      if (savedCurrency === 'FCFA' || savedCurrency === 'EUR' || savedCurrency === 'USD') {
        setCurrency(savedCurrency);
      }

      // 2c. Profil Utilisateur
      if (savedUserProfile && typeof savedUserProfile === 'object') {
        setUserProfile({
          nom: savedUserProfile.nom || '',
          prenom: savedUserProfile.prenom || '',
          email: savedUserProfile.email || '',
          contact: savedUserProfile.contact || '',
          fonction: savedUserProfile.fonction || '',
          institution: savedUserProfile.institution || ''
        });
      }

      // 3. Portefeuilles
      let resolvedPortfolios: Portfolio[] = initialData;
      if (Array.isArray(savedPortfolios) && savedPortfolios.length > 0) {
        resolvedPortfolios = savedPortfolios;
      } else {
        try {
          const legacyData = localStorage.getItem(STORAGE_KEY);
          if (legacyData) {
            const parsed = JSON.parse(legacyData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              resolvedPortfolios = parsed;
            }
          }
        } catch {
          // ignore
        }
        await idbSavePortfolios(resolvedPortfolios);
      }

      setPortfolios(resolvedPortfolios);
      const matchingActive =
        (savedActiveId && resolvedPortfolios.find(p => p.id === savedActiveId && !p.isTrashed)) ||
        resolvedPortfolios.find(p => !p.isTrashed) ||
        null;
      setActiveProject(matchingActive);
      setIsDbHydrated(true);
    };

    hydrateFromDeviceDB();
    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronisation automatique du thème dans IndexedDB
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (isDbHydrated) {
      idbSetSetting(THEME_STORAGE_KEY, theme);
    }
  }, [theme, isDbHydrated]);

  // Synchronisation automatique de la langue dans IndexedDB
  useEffect(() => {
    document.documentElement.lang = lang;
    if (isDbHydrated) {
      idbSetSetting(LANG_STORAGE_KEY, lang);
    }
  }, [lang, isDbHydrated]);

  // Synchronisation automatique de la devise dans IndexedDB
  useEffect(() => {
    if (isDbHydrated) {
      idbSetSetting(CURRENCY_STORAGE_KEY, currency);
    }
  }, [currency, isDbHydrated]);

  // Synchronisation automatique du profil utilisateur dans IndexedDB
  useEffect(() => {
    if (isDbHydrated) {
      idbSetSetting(USER_PROFILE_STORAGE_KEY, userProfile);
    }
  }, [userProfile, isDbHydrated]);

  // Sauvegarde automatique fluide (debounced) des portefeuilles dans IndexedDB de l'appareil
  useEffect(() => {
    if (!isDbHydrated) return;
    const timer = window.setTimeout(() => {
      idbSavePortfolios(portfolios);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [portfolios, isDbHydrated]);

  // Sauvegarde automatique du projet actif dans IndexedDB de l'appareil
  useEffect(() => {
    if (isDbHydrated) {
      idbSetSetting(ACTIVE_PROJECT_KEY, activeProject?.id || '');
    }
  }, [activeProject?.id, isDbHydrated]);

  // SYSTÈME DE FILTRE COMBINÉ (EFFETS + BRANCHES SIMULTANÉS SANS CONFLIT)
  const [filterContext, setFilterContext] = useState<FilterContext>({
    type: 'all',
    focusedBranches: [],
    focusedAxes: []
  });

  const hasAnyFocus =
    (filterContext.focusedAxes?.length || 0) > 0 ||
    (filterContext.focusedBranches?.length || 0) > 0;

  const applyCombinedFocus = (newAxes: number[], newBranches: { axeIndex: number; projetIndex: number }[]) => {
    const isAll = newAxes.length === 0 && newBranches.length === 0;
    setFilterContext({
      type: isAll ? 'all' : 'custom',
      focusedAxes: newAxes,
      focusedBranches: newBranches
    });
    if (activeProject) {
      if (isAll) {
        setActiveProject({
          ...activeProject,
          entityLevel: 'Portefeuille',
          displayName: activeProject.name
        });
      } else {
        const parts: string[] = [];
        if (newAxes.length > 0) parts.push(`${newAxes.length} ${lang === 'fr' ? 'Effet(s)' : 'Outcome(s)'}`);
        if (newBranches.length > 0) parts.push(`${newBranches.length} ${lang === 'fr' ? 'Branche(s)' : 'Branch(es)'}`);
        setActiveProject({
          ...activeProject,
          entityLevel: 'Focus Actif',
          displayName: `Focus : ${parts.join(' + ')}`
        });
      }
    }
  };

  const isAxeFocused = (axeIdx: number) => {
    if (!hasAnyFocus) return true;
    return (
      (filterContext.focusedAxes || []).includes(axeIdx) ||
      (filterContext.focusedBranches || []).some(f => f.axeIndex === axeIdx)
    );
  };

  const isProjFocused = (axeIdx: number, projIdx: number) => {
    if (!hasAnyFocus) return true;
    const branchesForThisAxe = (filterContext.focusedBranches || []).filter(f => f.axeIndex === axeIdx);
    if (branchesForThisAxe.length > 0) {
      return branchesForThisAxe.some(f => f.projetIndex === projIdx);
    }
    return (filterContext.focusedAxes || []).includes(axeIdx);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({ isOpen: false, title: '', message: '', onConfirm: null });

  const openConfirmModal = (title: string, message: string, onConfirm: () => void) =>
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  const closeConfirmModal = () =>
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });

  const menuItems = useMemo(
    () => [
      { id: 'accueil', label: t.tabs.accueil.label, shortLabel: t.tabs.accueil.short, icon: Home },
      { id: 'profil', label: t.tabs.profil.label, shortLabel: t.tabs.profil.short, icon: User },
      { id: 'dossier', label: t.tabs.dossier.label, shortLabel: t.tabs.dossier.short, icon: FolderOpen },
      { id: 'brainstorming', label: t.tabs.brainstorming.label, shortLabel: t.tabs.brainstorming.short, icon: Lightbulb },
      { id: 'arbre', label: t.tabs.arbre.label, shortLabel: t.tabs.arbre.short, icon: Network },
      { id: 'solutions', label: t.tabs.solutions.label, shortLabel: t.tabs.solutions.short, icon: Target },
      { id: 'registre_parties', label: t.tabs.registre_parties.label, shortLabel: t.tabs.registre_parties.short, icon: BookOpen },
      { id: 'tdr', label: t.tabs.tdr.label, shortLabel: t.tabs.tdr.short, icon: FileText }
    ],
    [t]
  );

  const handleTabClick = (item: (typeof menuItems)[0]) => {
    setActiveTab(item.id);
    setIsMobileMenuOpen(false);
  };

  const handleEnterGAR = (entity: Portfolio) => {
    setActiveProject({ ...entity });
    setFilterContext({ type: 'all', focusedBranches: [], focusedAxes: [] });
    setActiveTab('brainstorming');
    setIsMobileMenuOpen(false);
  };

  const updateProject = (updaterFn: (clone: Portfolio) => void) => {
    if (!activeProject?.isEditable) return;
    const clone = JSON.parse(JSON.stringify(activeProject)) as Portfolio;
    updaterFn(clone);
    setActiveProject(clone);
    setPortfolios(prev => prev.map(p => (p.id === clone.id ? clone : p)));
  };

  const updatePortfolioMeta = (
    portId: string,
    field: 'institution' | 'name' | 'description' | 'concepteurNomPrenoms' | 'concepteurFonction' | 'concepteurEmail',
    value: string
  ) => {
    setPortfolios(prev => prev.map(p => (p.id === portId ? { ...p, [field]: value } : p)));
    setActiveProject(prev => (prev && prev.id === portId ? { ...prev, [field]: value } : prev));
  };

  const activePortfoliosList = useMemo(() => portfolios.filter(p => !p.isTrashed), [portfolios]);
  const currentSandboxesCount = activePortfoliosList.length;

  const createNewSandbox = () => {
    const newSandbox: Portfolio = JSON.parse(JSON.stringify(initialData[1]));
    newSandbox.id = `port-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    newSandbox.name =
      lang === 'fr'
        ? `Projet GAR #${activePortfoliosList.length + 1}`
        : `RBM Project #${activePortfoliosList.length + 1}`;
    newSandbox.concepteurNomPrenoms = '';
    newSandbox.concepteurFonction = '';
    newSandbox.concepteurEmail = '';
    setPortfolios(prev => [...prev, newSandbox]);
    setActiveProject(newSandbox);
    setFilterContext({ type: 'all', focusedBranches: [], focusedAxes: [] });
    showToast(
      lang === 'fr' ? `Nouveau projet "${newSandbox.name}" créé.` : `New project "${newSandbox.name}" created.`
    );
  };

  const handleSelectProjectFromDropdown = (selectedId: string) => {
    if (selectedId === '__NEW_PROJECT__') {
      createNewSandbox();
      if (activeTab === 'accueil') {
        setActiveTab('dossier');
      }
      return;
    }
    const found = portfolios.find(p => p.id === selectedId && !p.isTrashed);
    if (found) {
      setActiveProject({ ...found });
      setFilterContext({ type: 'all', focusedBranches: [], focusedAxes: [] });
      showToast(
        lang === 'fr' ? `Projet actif : "${found.name}"` : `Active project: "${found.name}"`
      );
    }
  };

  const handleTrashPortfolio = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    openConfirmModal(
      lang === 'fr' ? 'Mettre à la corbeille' : 'Move to Trash',
      lang === 'fr'
        ? 'Voulez-vous placer ce portefeuille dans la corbeille ?'
        : 'Do you want to move this portfolio to the trash?',
      () => {
        setPortfolios(prev => prev.map(p => (p.id === id ? { ...p, isTrashed: true } : p)));
        if (activeProject?.id === id) {
          const remaining = portfolios.find(p => p.id !== id && !p.isTrashed);
          setActiveProject(remaining || null);
        }
        showToast(lang === 'fr' ? 'Portefeuille déplacé dans la corbeille.' : 'Portfolio moved to trash.');
      }
    );
  };

  const handleResetDemoData = () => {
    openConfirmModal(
      lang === 'fr' ? 'Réinitialiser les données' : 'Reset Demo Data',
      lang === 'fr'
        ? 'Voulez-vous restaurer les modèles officiels de démonstration ? Toutes les modifications non sauvegardées seront réinitialisées.'
        : 'Do you want to restore the official demo templates? Any unsaved changes will be reset.',
      () => {
        setPortfolios(initialData);
        setActiveProject(initialData[0]);
        showToast(lang === 'fr' ? 'Modèles de démonstration restaurés.' : 'Demo templates restored.');
      }
    );
  };

  // ENREGISTRER / ÉCRASER LE FICHIER JSON PORTANT LE MÊME NOM
  const handleSaveOverwriteJSON = async () => {
    const targetToSave = activeProject || portfolios.find(p => !p.isTrashed) || portfolios[0];
    if (!targetToSave) {
      showToast(lang === 'fr' ? 'Aucun portefeuille à enregistrer.' : 'No portfolio to save.', 'error');
      return;
    }

    const safeName = (targetToSave.name || 'Portefeuille_FAAB').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeName}.json`;
    const jsonString = JSON.stringify(targetToSave, null, 2);

    // 1. Synchronisation immédiate dans IndexedDB de l'appareil
    await idbSavePortfolios(portfolios);

    // 2. Si File System Access API est disponible, écrase directement le fichier JSON portant le même nom
    const win = window as unknown as {
      showSaveFilePicker?: (opts?: unknown) => Promise<any>;
    };

    if (typeof win.showSaveFilePicker === 'function') {
      try {
        let handle = fileHandlesRef.current[targetToSave.id];
        if (!handle) {
          handle = await win.showSaveFilePicker({
            id: 'faab_brainstorming_json',
            suggestedName: fileName,
            types: [
              {
                description: 'Fichier JSON FAAB BRAINSTORMING',
                accept: { 'application/json': ['.json'] }
              }
            ]
          });
          fileHandlesRef.current[targetToSave.id] = handle;
        }
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        setIsMobileMenuOpen(false);
        showToast(
          lang === 'fr'
            ? `Fichier "${handle.name || fileName}" enregistré et écrasé avec la nouvelle mise à jour !`
            : `File "${handle.name || fileName}" saved and overwritten with the latest update!`
        );
        return;
      } catch (err: any) {
        // Si l'utilisateur annule explicitement la boîte de dialogue d'enregistrement
        if (err && err.name === 'AbortError') {
          return;
        }
        // En cas de restriction d'iframe (SecurityError), on poursuit avec l'enregistrement standard du même nom
      }
    }

    // 3. Repli automatique avec le nom exact constant `${safeName}.json` pour remplacer l'ancien fichier
    try {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = fileName;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
      setIsMobileMenuOpen(false);
      showToast(
        lang === 'fr'
          ? `Sauvegarde "${fileName}" effectuée (remplace l'ancienne version).`
          : `Saved "${fileName}" (replaces previous version).`
      );
    } catch {
      showToast(lang === 'fr' ? "Erreur lors de l'enregistrement JSON." : 'Error saving JSON.', 'error');
    }
  };

  const handleExportJSON = () => {
    const targetToExport = activeProject || portfolios.find(p => !p.isTrashed) || portfolios[0];
    if (!targetToExport) {
      showToast(lang === 'fr' ? 'Aucun portefeuille à exporter.' : 'No portfolio to export.', 'error');
      return;
    }
    try {
      const jsonString = JSON.stringify(targetToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      const safeName = (targetToExport.name || 'Portefeuille_FAAB').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadAnchor.download = `${safeName}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
      setIsMobileMenuOpen(false);
      showToast(
        lang === 'fr'
          ? `Export JSON de "${targetToExport.name}" réussi.`
          : `JSON export of "${targetToExport.name}" succeeded.`
      );
    } catch {
      showToast(lang === 'fr' ? "Erreur lors de l'exportation JSON." : 'Error exporting JSON.', 'error');
    }
  };

  const triggerImportJSON = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // GÉNÉRATION ET TÉLÉCHARGEMENT DIRECT DU DOCUMENT TDR EN PDF (FOND BLANC PUR EN MODE CLAIR COMME EN MODE SOMBRE, SANS CERVEAU EN ARRIÈRE-PLAN)
  const handlePrint = () => {
    setIsMobileMenuOpen(false);
    const targetProject = activeProject || portfolios.find(p => !p.isTrashed) || portfolios[0];
    if (!targetProject) {
      showToast(
        lang === 'fr' ? 'Aucun projet actif pour générer le TDR en PDF.' : 'No active project to generate TOR PDF.',
        'error'
      );
      return;
    }

    const cleanPdfText = (val: string | undefined | null): string => {
      if (!val) return '-';
      return String(val)
        .replace(/[\u00A0\u202F]/g, ' ')
        .replace(/[—–]/g, '-')
        .replace(/[’‘]/g, "'")
        .replace(/[“”«»]/g, '"')
        .replace(/⇄/g, '<->')
        .replace(/✓/g, '')
        .trim();
    };

    const formatPdfCurrency = (num: number): string => {
      const formatted = new Intl.NumberFormat('fr-FR').format(num).replace(/[\u00A0\u202F]/g, ' ');
      return `${formatted} ${CURRENCY_CONFIG[currency].pdfLabel}`;
    };

    const formatPdfItemCost = (rawAmount: string | undefined): string => {
      if (!rawAmount || !rawAmount.trim()) return '';
      const num = parseAmount(rawAmount);
      if (num > 0) return formatPdfCurrency(num);
      return cleanPdfText(rawAmount);
    };

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentW = pageW - margin * 2;
      let y = margin;

      const paintWhitePageBackground = () => {
        // Garantit un fond 100% blanc pur (#FFFFFF) en mode sombre comme en mode clair, sans aucun filigrane cerveau
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageW, pageH, 'F');
      };

      const ensureSpace = (neededHeight: number) => {
        if (y + neededHeight > pageH - 16) {
          doc.addPage();
          paintWhitePageBackground();
          y = margin;
        }
      };

      paintWhitePageBackground();

      // Calcul du budget consolidé du TDR selon les filtres actifs
      let consolidatedBudgetSum = 0;
      (targetProject.garData.rendement?.axes || []).forEach((axe, i) => {
        const axeMatch =
          tdrSelectedAxe === 'all'
            ? true
            : tdrSelectedAxe === 'focus'
            ? isAxeFocused(i)
            : Number(tdrSelectedAxe) === i;
        if (!axeMatch) return;
        (axe.projets || []).forEach((proj, j) => {
          const projMatch =
            tdrSelectedBranch !== 'all'
              ? Number(tdrSelectedBranch) === j
              : tdrSelectedAxe === 'focus'
              ? isProjFocused(i, j)
              : true;
          if (!projMatch) return;
          const actCount = Math.max(
            ensureArray(targetProject.garData.problems?.branches?.[i]?.details?.[j]?.cause).length,
            ensureArray(proj.activites).length,
            1
          );
          for (let k = 0; k < actCount; k++) {
            if (tdrSelectedActivity !== 'all' && Number(tdrSelectedActivity) !== k) continue;
            consolidatedBudgetSum += calculateActivityTotal(proj, k).sum;
          }
        });
      });

      // 1. ENTÊTE OFFICIEL DU DOCUMENT TDR (Fond blanc, bordure institutionnelle + Informations du Profil Utilisateur)
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(4, 120, 87);
      const headerInstitution = userProfile.institution?.trim() || targetProject.institution || 'INSTITUTION';
      doc.text(cleanPdfText(headerInstitution.toUpperCase()), margin, y + 4);

      // Badge Budget Consolidé à droite
      const budgetTitle = cleanPdfText(t.tdr.consolidatedBudget.toUpperCase());
      const budgetVal = formatPdfCurrency(consolidatedBudgetSum);
      const badgeW = 62;
      const badgeX = pageW - margin - badgeW;
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(badgeX, y, badgeW, 14, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87);
      doc.text(budgetTitle, badgeX + badgeW - 3, y + 5, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(6, 78, 59);
      doc.text(budgetVal, badgeX + badgeW - 3, y + 11, { align: 'right' });

      // Titre du TDR à gauche
      const leftHeaderW = contentW - badgeW - 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      const docMainTitle = cleanPdfText(`${t.tdr.docTitlePrefix} ${targetProject.name}`);
      const titleLines = doc.splitTextToSize(docMainTitle, leftHeaderW);
      doc.text(titleLines, margin, y + 10);
      let leftY = y + 10 + titleLines.length * 5;

      if (targetProject.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const descLines = doc.splitTextToSize(cleanPdfText(targetProject.description), leftHeaderW);
        doc.text(descLines, margin, leftY);
        leftY += descLines.length * 4 + 1;
      }

      const fullUserName = [userProfile.nom?.trim(), userProfile.prenom?.trim()].filter(Boolean).join(' ');
      const hasUserProfileInfo = Boolean(
        fullUserName ||
          userProfile.fonction?.trim() ||
          userProfile.institution?.trim() ||
          userProfile.email?.trim() ||
          userProfile.contact?.trim()
      );

      if (hasUserProfileInfo) {
        const profileParts = [
          fullUserName,
          userProfile.fonction?.trim(),
          userProfile.institution?.trim(),
          userProfile.email?.trim() ? `Email: ${userProfile.email.trim()}` : '',
          userProfile.contact?.trim() ? `Tel: ${userProfile.contact.trim()}` : ''
        ]
          .filter(Boolean)
          .join(' | ');
        const profileLine = cleanPdfText(`${t.tabs.profil.label} : ${profileParts}`);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const dLines = doc.splitTextToSize(profileLine, contentW);
        doc.text(dLines, margin, Math.max(leftY + 1, y + 18));
        leftY = Math.max(leftY + 1, y + 18) + dLines.length * 4;
      }

      y = Math.max(leftY + 2, y + 18);
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageW - margin, y);
      y += 5;

      // 2. NIVEAU MACRO : CONSÉQUENCE GLOBALE & IMPACT GLOBAL
      if (tdrFields.consequenceGlobale || tdrFields.impactGlobal) {
        const consText = cleanPdfText(targetProject.garData.problems?.consequenceGlobale || t.common.notSpecified);
        const impText = cleanPdfText(targetProject.garData.rendement?.impact || t.common.notSpecified);
        const colW = tdrFields.consequenceGlobale && tdrFields.impactGlobal ? (contentW - 4) / 2 : contentW;

        const consLines = tdrFields.consequenceGlobale ? doc.splitTextToSize(consText, colW - 6) : [];
        const impLines = tdrFields.impactGlobal ? doc.splitTextToSize(impText, colW - 6) : [];
        const maxMacroLines = Math.max(consLines.length, impLines.length, 1);
        const boxH = 9 + maxMacroLines * 4.2;

        ensureSpace(boxH + 4);

        if (tdrFields.consequenceGlobale) {
          doc.setFillColor(255, 241, 242);
          doc.setDrawColor(253, 164, 175);
          doc.roundedRect(margin, y, colW, boxH, 1.5, 1.5, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(159, 18, 57);
          doc.text(cleanPdfText(t.tdr.fields.consequenceGlobale.toUpperCase()), margin + 3, y + 4.5);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(consLines, margin + 3, y + 9.5);
        }

        if (tdrFields.impactGlobal) {
          const xPos = tdrFields.consequenceGlobale ? margin + colW + 4 : margin;
          doc.setFillColor(236, 253, 245);
          doc.setDrawColor(110, 231, 183);
          doc.roundedRect(xPos, y, colW, boxH, 1.5, 1.5, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(6, 95, 70);
          doc.text(cleanPdfText(t.tdr.fields.impactGlobal.toUpperCase()), xPos + 3, y + 4.5);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(impLines, xPos + 3, y + 9.5);
        }

        y += boxH + 5;
      }

      // 3. PARCOURS DES AXES / SERVICES -> BRANCHES -> ACTIVITÉS -> INTRANTS -> PARTIES PRENANTES
      (targetProject.garData.rendement?.axes || []).forEach((axe, i) => {
        const axeMatch =
          tdrSelectedAxe === 'all'
            ? true
            : tdrSelectedAxe === 'focus'
            ? isAxeFocused(i)
            : Number(tdrSelectedAxe) === i;
        if (!axeMatch) return;

        const probBranch = targetProject.garData.problems?.branches?.[i];
        ensureSpace(18);

        // Bandeau Titre du Service
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        const serviceTitle = cleanPdfText(
          (axe.nom || probBranch?.axeName || `${t.common.service} ${i + 1}`).toUpperCase()
        );
        doc.text(serviceTitle, margin + 3, y + 5.3);
        doc.setFontSize(7.5);
        doc.setTextColor(110, 231, 183);
        doc.text(cleanPdfText(`${t.tdr.serviceLineage} #${i + 1}`), pageW - margin - 3, y + 5.3, {
          align: 'right'
        });
        y += 10;

        // Problème Central <-> Effet
        if (tdrFields.problemeCentral || tdrFields.effet) {
          const centralText = cleanPdfText(probBranch?.central || t.common.notSpecified);
          const effetText = cleanPdfText(axe.effet || t.common.notSpecified);
          const colW = tdrFields.problemeCentral && tdrFields.effet ? (contentW - 4) / 2 : contentW;

          const cLines = tdrFields.problemeCentral ? doc.splitTextToSize(centralText, colW - 6) : [];
          const eLines = tdrFields.effet ? doc.splitTextToSize(effetText, colW - 6) : [];
          const maxLines = Math.max(cLines.length, eLines.length, 1);
          const boxH = 9 + maxLines * 4.2;

          ensureSpace(boxH + 4);

          if (tdrFields.problemeCentral) {
            doc.setFillColor(255, 241, 242);
            doc.setDrawColor(254, 205, 211);
            doc.roundedRect(margin, y, colW, boxH, 1.5, 1.5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(190, 18, 60);
            doc.text(cleanPdfText(t.tdr.fields.problemeCentral.toUpperCase()), margin + 3, y + 4.5);
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(cLines, margin + 3, y + 9.5);
          }

          if (tdrFields.effet) {
            const xPos = tdrFields.problemeCentral ? margin + colW + 4 : margin;
            doc.setFillColor(236, 253, 245);
            doc.setDrawColor(167, 243, 208);
            doc.roundedRect(xPos, y, colW, boxH, 1.5, 1.5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(4, 120, 87);
            doc.text(cleanPdfText(t.tdr.fields.effet.toUpperCase()), xPos + 3, y + 4.5);
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(eLines, xPos + 3, y + 9.5);
          }

          y += boxH + 4;
        }

        // Branches / Projets
        (axe.projets || []).forEach((proj, j) => {
          const projMatch =
            tdrSelectedBranch !== 'all'
              ? Number(tdrSelectedBranch) === j
              : tdrSelectedAxe === 'focus'
              ? isProjFocused(i, j)
              : true;
          if (!projMatch) return;

          const probDetail = probBranch?.details?.[j];
          const causesArr = ensureArray(probDetail?.cause);
          const besoinsArr = ensureArray(probDetail?.besoin);
          const actsArr = ensureArray(proj.activites);
          const maxActLen = Math.max(causesArr.length, besoinsArr.length, actsArr.length, 1);

          ensureSpace(14);
          // Sous-bandeau Branche
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(margin, y, contentW, 7, 1, 1, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(
            cleanPdfText(`${t.common.branch} ${j + 1} (${t.common.project} ${j + 1})`.toUpperCase()),
            margin + 3,
            y + 4.8
          );
          doc.setTextColor(4, 120, 87);
          doc.text(
            cleanPdfText(`${t.tdr.branchSubtotal} ${formatPdfCurrency(getProjectEffectiveCost(proj))}`),
            pageW - margin - 3,
            y + 4.8,
            { align: 'right' }
          );
          y += 9;

          // Contrainte <-> Extrant
          if (tdrFields.contrainte || tdrFields.extrant) {
            const contrText = cleanPdfText(probDetail?.contrainte || t.common.notSpecified);
            const extrText = cleanPdfText(proj.extrant || t.common.notSpecified);
            const colW = tdrFields.contrainte && tdrFields.extrant ? (contentW - 4) / 2 : contentW;

            const ctLines = tdrFields.contrainte ? doc.splitTextToSize(contrText, colW - 6) : [];
            const exLines = tdrFields.extrant ? doc.splitTextToSize(extrText, colW - 6) : [];
            const maxLines = Math.max(ctLines.length, exLines.length, 1);
            const boxH = 9 + maxLines * 4.2;

            ensureSpace(boxH + 3);

            if (tdrFields.contrainte) {
              doc.setFillColor(255, 247, 237);
              doc.setDrawColor(254, 215, 170);
              doc.roundedRect(margin, y, colW, boxH, 1.5, 1.5, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(7.5);
              doc.setTextColor(154, 52, 18);
              doc.text(cleanPdfText(t.tdr.fields.contrainte.toUpperCase()), margin + 3, y + 4.5);
              doc.setFontSize(8.5);
              doc.setTextColor(15, 23, 42);
              doc.text(ctLines, margin + 3, y + 9.5);
            }

            if (tdrFields.extrant) {
              const xPos = tdrFields.contrainte ? margin + colW + 4 : margin;
              doc.setFillColor(240, 253, 250);
              doc.setDrawColor(153, 246, 228);
              doc.roundedRect(xPos, y, colW, boxH, 1.5, 1.5, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(7.5);
              doc.setTextColor(17, 94, 89);
              doc.text(cleanPdfText(t.tdr.fields.extrant.toUpperCase()), xPos + 3, y + 4.5);
              doc.setFontSize(8.5);
              doc.setTextColor(15, 23, 42);
              doc.text(exLines, xPos + 3, y + 9.5);
            }

            y += boxH + 3.5;
          }

          // Activités & Intrants
          for (let k = 0; k < maxActLen; k++) {
            if (tdrSelectedActivity !== 'all' && Number(tdrSelectedActivity) !== k) continue;

            const causeText = cleanPdfText(causesArr[k] || '-');
            const besoinText = cleanPdfText(besoinsArr[k] || '-');
            const actText = cleanPdfText(actsArr[k] || '-');
            const rhList = getSafe2D(proj.intrants_rh, k);
            const matList = getSafe2D(proj.intrants_mat, k);
            const { sum: activityBudget } = calculateActivityTotal(proj, k);

            const activeDiagCols = [
              tdrFields.causeProfonde ? { label: `${t.tdr.fields.causeProfonde} #${k + 1}`, val: causeText } : null,
              tdrFields.besoin ? { label: `${t.tdr.fields.besoin} #${k + 1}`, val: besoinText } : null,
              tdrFields.activite ? { label: `${t.tdr.fields.activite} #${k + 1}`, val: actText } : null
            ].filter(Boolean) as { label: string; val: string }[];

            if (activeDiagCols.length > 0) {
              const colW = (contentW - (activeDiagCols.length - 1) * 3) / activeDiagCols.length;
              const splitCols = activeDiagCols.map(c => doc.splitTextToSize(c.val, colW - 5));
              const maxL = Math.max(...splitCols.map(s => s.length), 1);
              const rowH = 8.5 + maxL * 4;

              ensureSpace(rowH + 3);
              activeDiagCols.forEach((col, cIdx) => {
                const xPos = margin + cIdx * (colW + 3);
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(203, 213, 225);
                doc.roundedRect(xPos, y, colW, rowH, 1, 1, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(71, 85, 105);
                doc.text(cleanPdfText(col.label.toUpperCase()), xPos + 2.5, y + 4.2);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(15, 23, 42);
                doc.text(splitCols[cIdx], xPos + 2.5, y + 8.8);
              });
              y += rowH + 2.5;
            }

            if (
              tdrFields.intrants &&
              (tdrFields.ressourcesHumaines || tdrFields.ressourcesMaterielles || tdrFields.budgetActivite)
            ) {
              const rhText =
                rhList.length === 0
                  ? t.tdr.noRh
                  : rhList
                      .map(it => {
                        const costStr = formatPdfItemCost(it.amount);
                        return `• ${cleanPdfText(it.label || '-')}${costStr ? ` (${costStr})` : ''}`;
                      })
                      .join('\n');

              const matText =
                matList.length === 0
                  ? t.tdr.noMat
                  : matList
                      .map(it => {
                        const costStr = formatPdfItemCost(it.amount);
                        return `• ${cleanPdfText(it.label || '-')}${costStr ? ` (${costStr})` : ''}`;
                      })
                      .join('\n');

              const inputCols = [
                tdrFields.ressourcesHumaines ? { label: t.tdr.fields.ressourcesHumaines, val: rhText } : null,
                tdrFields.ressourcesMaterielles ? { label: t.tdr.fields.ressourcesMaterielles, val: matText } : null,
                tdrFields.budgetActivite
                  ? { label: `${t.tdr.fields.budgetActivite} #${k + 1}`, val: formatPdfCurrency(activityBudget) }
                  : null
              ].filter(Boolean) as { label: string; val: string }[];

              if (inputCols.length > 0) {
                const colW = (contentW - (inputCols.length - 1) * 3) / inputCols.length;
                const splitCols = inputCols.map(c => doc.splitTextToSize(c.val, colW - 5));
                const maxL = Math.max(...splitCols.map(s => s.length), 1);
                const rowH = 8.5 + maxL * 4;

                ensureSpace(rowH + 3);
                inputCols.forEach((col, cIdx) => {
                  const xPos = margin + cIdx * (colW + 3);
                  doc.setFillColor(248, 250, 252);
                  doc.setDrawColor(203, 213, 225);
                  doc.roundedRect(xPos, y, colW, rowH, 1, 1, 'FD');
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(7);
                  doc.setTextColor(4, 120, 87);
                  doc.text(cleanPdfText(col.label.toUpperCase()), xPos + 2.5, y + 4.2);
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(8);
                  doc.setTextColor(15, 23, 42);
                  doc.text(splitCols[cIdx], xPos + 2.5, y + 8.8);
                });
                y += rowH + 3.5;
              }
            }
          }

          // Parties Prenantes associées à la Branche
          const stakeholderCategories = [
            { key: 'beneficiaires', label: t.tdr.fields.beneficiaires, enabled: tdrFields.beneficiaires },
            { key: 'instCentralises', label: t.tdr.fields.instCentralises, enabled: tdrFields.instCentralises },
            { key: 'instDecentralises', label: t.tdr.fields.instDecentralises, enabled: tdrFields.instDecentralises },
            {
              key: 'operateursTechniques',
              label: t.tdr.fields.operateursTechniques,
              enabled: tdrFields.operateursTechniques
            },
            { key: 'ptf', label: t.tdr.fields.ptf, enabled: tdrFields.ptf }
          ].filter(c => c.enabled);

          if (stakeholderCategories.length > 0) {
            ensureSpace(16);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85);
            doc.text(
              cleanPdfText(`${t.tdr.associatedStakeholders} (${t.common.branch} ${j + 1})`.toUpperCase()),
              margin,
              y + 3.5
            );
            y += 5;

            stakeholderCategories.forEach(cat => {
              const actors = (targetProject.garData.stakeholders?.[cat.key] || []).filter(
                a => a.axe === i + 1 && a.projetIndex === j
              );
              const actorNames =
                actors.length === 0
                  ? t.common.notSpecified
                  : actors.map(a => cleanPdfText(a.nom || '-')).join(' ; ');
              const lineText = `${cleanPdfText(cat.label)} : ${actorNames}`;
              const lines = doc.splitTextToSize(lineText, contentW - 4);
              const h = lines.length * 4 + 2;
              ensureSpace(h + 1);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              doc.setTextColor(15, 23, 42);
              doc.text(lines, margin + 2, y + 3.2);
              y += h;
            });
            y += 3;
          }
        });

        y += 3;
      });

      // Numérotation des pages en pied de page sur fond blanc
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          cleanPdfText(`FAAB BRAINSTORMING - TDR (${CURRENCY_CONFIG[currency].pdfLabel})`),
          margin,
          pageH - 6
        );
        doc.text(`Page ${p} / ${totalPages}`, pageW - margin, pageH - 6, { align: 'right' });
      }

      const safeName = (targetProject.name || 'TDR_FAAB').replace(/[^a-zA-Z0-9_-]/g, '_');
      const pdfFileName = `TDR_${safeName}.pdf`;
      doc.save(pdfFileName);

      showToast(
        lang === 'fr'
          ? `TDR téléchargé en PDF (${pdfFileName}) avec succès !`
          : `TOR downloaded as PDF (${pdfFileName}) successfully!`
      );
    } catch {
      showToast(
        lang === 'fr'
          ? 'Erreur lors de la génération du PDF des TDR.'
          : 'Error generating TOR PDF.',
        'error'
      );
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        if (Array.isArray(parsed)) {
          const validPortfolios = parsed
            .filter(item => item && item.garData)
            .map((item, idx) => ({
              ...item,
              id: `port-${Date.now()}-${idx}`,
              isEditable: true,
              isTrashed: false
            }));

          if (validPortfolios.length > 0) {
            setPortfolios(prev => [...prev, ...validPortfolios]);
            setActiveProject(validPortfolios[0]);
            setIsMobileMenuOpen(false);
            showToast(
              lang === 'fr'
                ? `${validPortfolios.length} portefeuille(s) importé(s) avec succès !`
                : `${validPortfolios.length} portfolio(s) imported successfully!`
            );
            if (activeTab === 'accueil') setActiveTab('brainstorming');
          } else {
            showToast(
              lang === 'fr'
                ? 'Format JSON non reconnu : aucun portefeuille valide trouvé.'
                : 'Unrecognized JSON format: no valid portfolio found.',
              'error'
            );
          }
        } else if (parsed && parsed.garData) {
          const imported: Portfolio = {
            ...parsed,
            id: `port-${Date.now()}`,
            name: parsed.name || file.name.replace(/\.json$/i, ''),
            institution: parsed.institution || (lang === 'fr' ? 'Institution importée' : 'Imported Institution'),
            description:
              parsed.description ||
              (lang === 'fr' ? 'Portefeuille importé depuis un fichier JSON.' : 'Portfolio imported from JSON file.'),
            status: parsed.status || (lang === 'fr' ? 'Importé' : 'Imported'),
            isEditable: true,
            isTrashed: false
          };
          setPortfolios(prev => [...prev, imported]);
          setActiveProject(imported);
          setIsMobileMenuOpen(false);
          showToast(
            lang === 'fr'
              ? `Portefeuille "${imported.name}" importé et activé !`
              : `Portfolio "${imported.name}" imported and activated!`
          );
          if (activeTab === 'accueil' || activeTab === 'dossier') setActiveTab('brainstorming');
        } else if (parsed && (parsed.brainstorming || parsed.problems || parsed.rendement)) {
          const imported: Portfolio = {
            id: `port-${Date.now()}`,
            name: file.name.replace(/\.json$/i, ''),
            institution: lang === 'fr' ? 'Institution importée' : 'Imported Institution',
            description: lang === 'fr' ? 'Données importées depuis un fichier JSON.' : 'Data imported from JSON file.',
            status: lang === 'fr' ? 'Importé' : 'Imported',
            isEditable: true,
            isTrashed: false,
            garData: {
              brainstorming: parsed.brainstorming || [],
              stakeholders: parsed.stakeholders || {
                beneficiaires: [],
                instCentralises: [],
                instDecentralises: [],
                operateursTechniques: [],
                ptf: []
              },
              problems: parsed.problems || {
                consequenceGlobale: '',
                branches: [{ axeName: 'Service 1', central: '', details: [{ contrainte: '', cause: [''], besoin: [''] }] }]
              },
              rendement: parsed.rendement || {
                impact: '',
                axes: [
                  {
                    nom: 'Service 1',
                    effet: '',
                    budget: '0 FCFA',
                    projets: [{ extrant: '', activites: [''], intrants_rh: [[]], intrants_mat: [[]], couts: [''] }]
                  }
                ]
              },
              risks: parsed.risks || []
            }
          };
          setPortfolios(prev => [...prev, imported]);
          setActiveProject(imported);
          setIsMobileMenuOpen(false);
          showToast(
            lang === 'fr'
              ? `Données "${imported.name}" importées avec succès !`
              : `Data "${imported.name}" imported successfully!`
          );
          if (activeTab === 'accueil' || activeTab === 'dossier') setActiveTab('brainstorming');
        } else {
          showToast(
            lang === 'fr'
              ? 'Le fichier JSON sélectionné ne contient pas de structure valide.'
              : 'The selected JSON file does not contain a valid structure.',
            'error'
          );
        }
      } catch {
        showToast(
          lang === 'fr'
            ? 'Erreur lors de la lecture du fichier JSON. Vérifiez la syntaxe du fichier.'
            : 'Error reading JSON file. Please check the file syntax.',
          'error'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- ACTIONS BRAINSTORMING ---
  const handleAddIdea = () => {
    updateProject(p => {
      if (!p.garData.brainstorming) p.garData.brainstorming = [];
      p.garData.brainstorming.push({
        id: Date.now().toString(),
        textNegative: '',
        textPositive: '',
        color: 'bg-amber-100'
      });
    });
  };

  const handleDeleteIdea = (id: string) => {
    updateProject(p => {
      p.garData.brainstorming = (p.garData.brainstorming || []).filter(idea => idea.id !== id);
    });
  };

  const updateIdeaText = (id: string, field: 'textNegative' | 'textPositive', text: string) => {
    updateProject(p => {
      const idea = (p.garData.brainstorming || []).find(i => i.id === id);
      if (idea) idea[field] = text;
    });
  };

  const updateIdeaColor = (id: string, color: string) => {
    updateProject(p => {
      const idea = (p.garData.brainstorming || []).find(i => i.id === id);
      if (idea) idea.color = color;
    });
  };

  // --- ACTIONS GAR ---
  const handleAddAxe = () => {
    updateProject(p => {
      const idx = (p.garData.rendement.axes || []).length + 1;
      if (!p.garData.rendement.axes) p.garData.rendement.axes = [];
      if (!p.garData.problems.branches) p.garData.problems.branches = [];
      p.garData.rendement.axes.push({ nom: `${t.common.service} ${idx}`, effet: '', budget: '0 FCFA', projets: [] });
      p.garData.problems.branches.push({ axeName: `${t.common.service} ${idx}`, central: '', details: [] });
    });
  };

  const handleAddProject = (axeIndex: number) => {
    updateProject(p => {
      const pIdx = (p.garData.rendement.axes[axeIndex].projets || []).length + 1;
      p.garData.rendement.axes[axeIndex].projets.push({
        extrant: lang === 'fr' ? `Nouveau Projet ${pIdx}` : `New Project ${pIdx}`,
        activites: [''],
        intrants_rh: [[]],
        intrants_mat: [[]],
        couts: [''],
        cout: '',
        responsable: '',
        periode: ''
      });
      p.garData.problems.branches[axeIndex].details.push({ contrainte: '', cause: [''], besoin: [''] });
    });
  };

  const handleDeleteAxe = (axeIndex: number, axeName: string) => {
    openConfirmModal(
      lang === 'fr' ? "Supprimer l'Axe" : 'Delete Axis',
      lang === 'fr'
        ? `Supprimer l'axe "${axeName}" et tous ses projets ?`
        : `Delete axis "${axeName}" and all its projects?`,
      () => {
        updateProject(p => {
          p.garData.rendement.axes.splice(axeIndex, 1);
          p.garData.problems.branches.splice(axeIndex, 1);
        });
      }
    );
  };

  const handleDeleteProject = (axeIndex: number, projetIndex: number, projetName: string) => {
    openConfirmModal(
      lang === 'fr' ? 'Supprimer le Projet' : 'Delete Project',
      lang === 'fr'
        ? `Supprimer le projet "${projetName || `Branche ${projetIndex + 1}`}" ?`
        : `Delete project "${projetName || `Branch ${projetIndex + 1}`}"?`,
      () => {
        updateProject(p => {
          p.garData.rendement.axes[axeIndex].projets.splice(projetIndex, 1);
          p.garData.problems.branches[axeIndex].details.splice(projetIndex, 1);
        });
      }
    );
  };

  const handleAddCauseActivity = (axeIdx: number, projIdx: number) => {
    updateProject(p => {
      const detail = p.garData.problems.branches[axeIdx].details[projIdx];
      const proj = p.garData.rendement.axes[axeIdx].projets[projIdx];

      detail.cause = ensureArray(detail.cause);
      detail.cause.push('');
      detail.besoin = ensureArray(detail.besoin);
      detail.besoin.push('');

      proj.activites = ensureArray(proj.activites);
      proj.activites.push('');

      if (!Array.isArray(proj.intrants_rh)) {
        proj.intrants_rh = [];
      }
      proj.intrants_rh.push([]);

      if (!Array.isArray(proj.intrants_mat)) {
        proj.intrants_mat = [];
      }
      proj.intrants_mat.push([]);

      if (!Array.isArray(proj.couts)) proj.couts = [proj.cout || ''];
      proj.couts.push('');
    });
  };

  const handleRemoveCauseActivity = (axeIdx: number, projIdx: number, itemIdx: number) => {
    updateProject(p => {
      const detail = p.garData.problems.branches[axeIdx].details[projIdx];
      const proj = p.garData.rendement.axes[axeIdx].projets[projIdx];

      const causes = ensureArray(detail.cause);
      const besoins = ensureArray(detail.besoin);
      const acts = ensureArray(proj.activites);
      const rh: ResourceItem[][] = Array.isArray(proj.intrants_rh) ? [...proj.intrants_rh] : [];
      const mat: ResourceItem[][] = Array.isArray(proj.intrants_mat) ? [...proj.intrants_mat] : [];
      const couts = Array.isArray(proj.couts) ? [...proj.couts] : [proj.cout || ''];

      const removeAt = <T,>(arr: T[], fallback: T) => {
        if (arr.length > 1) arr.splice(itemIdx, 1);
        else arr[0] = fallback;
      };

      removeAt(causes, '');
      removeAt(besoins, '');
      removeAt(acts, '');
      removeAt(rh, []);
      removeAt(mat, []);
      removeAt(couts, '');

      detail.cause = causes;
      detail.besoin = besoins;
      proj.activites = acts;
      proj.intrants_rh = rh;
      proj.intrants_mat = mat;
      proj.couts = couts;
    });
  };

  const updateIntrants = (
    axeIdx: number,
    projIdx: number,
    actIdx: number,
    field: 'intrants_rh' | 'intrants_mat',
    val: ResourceItem[]
  ) => {
    updateProject(p => {
      const proj = p.garData.rendement.axes[axeIdx].projets[projIdx];
      let arr = proj[field];
      if (!Array.isArray(arr)) arr = [];
      while (arr.length <= actIdx) arr.push([]);
      arr[actIdx] = val;
      proj[field] = arr;
    });
  };

  const updateRisk = (axeIdx: number, niveau: string, field: string, value: unknown) => {
    updateProject(p => {
      let row = (p.garData.risks || []).find(c => c.axe === axeIdx && c.niveau === niveau);
      if (!row) {
        row = {
          id: Date.now().toString(),
          niveau,
          logique: '',
          hypothese: '',
          contrainte: '',
          cause: '',
          level: 'MOYEN',
          responsable: '',
          mitigation: '',
          axe: axeIdx
        };
        if (!p.garData.risks) p.garData.risks = [];
        p.garData.risks.push(row);
      }
      (row as unknown as Record<string, unknown>)[field] = value;
    });
  };

  const addStakeholder = (key: string, axeIdx: number, pIdx: number) => {
    updateProject(p => {
      if (!p.garData.stakeholders[key]) p.garData.stakeholders[key] = [];
      p.garData.stakeholders[key].push({
        nom: '',
        intervention: '',
        competence: '',
        attentes: '',
        contraintes: '',
        pointFort: '',
        pointFaible: '',
        problemes: '',
        axe: axeIdx,
        projetIndex: pIdx
      });
    });
  };

  const updateStakeholder = (key: string, _axeIdx: number, _pIdx: number, absIdx: number, field: keyof Stakeholder, value: unknown) => {
    updateProject(p => {
      if (p.garData.stakeholders[key]?.[absIdx]) {
        (p.garData.stakeholders[key][absIdx] as unknown as Record<string, unknown>)[field] = value;
      }
    });
  };

  const deleteStakeholder = (key: string, absIdx: number) => {
    updateProject(p => {
      if (p.garData.stakeholders[key]) p.garData.stakeholders[key].splice(absIdx, 1);
    });
  };

  const totalActiveBudget = useMemo(() => {
    if (!activeProject?.garData?.rendement?.axes) return 0;
    let sum = 0;
    activeProject.garData.rendement.axes.forEach(axe => {
      (axe.projets || []).forEach(proj => {
        sum += getProjectEffectiveCost(proj);
      });
    });
    return sum;
  }, [activeProject]);

  const toggleTdrField = (key: string) => {
    setTdrFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      className={`${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      } flex h-screen font-sans overflow-hidden relative selection:bg-emerald-200 transition-colors duration-200`}
    >
      {/* INPUT FILE GLOBAL CACHÉ POUR IMPORT JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportJSON}
        className="hidden"
      />

      {/* NOTIFICATION TOAST D'IMPORT / EXPORT */}
      {toastMessage && (
        <div
          className={`fixed top-3 right-3 z-[60] max-w-xs sm:max-w-sm px-3.5 py-2.5 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-bold transition-all no-print ${
            toastMessage.type === 'error'
              ? 'bg-red-950 text-red-100 border-red-700'
              : 'bg-slate-900 text-emerald-300 border-emerald-600/50'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle size={16} className="text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* OVERLAY GLOBAL POUR LE MENU DÉROULANT (OUVERT UNIQUEMENT PAR L'ICÔNE BURGER) */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 no-print"
        />
      )}

      {/* MENU DÉROULANT LATÉRAL (Accessible exclusivement via l'icône du Menu Burger) */}
      <aside
        className={`${
          theme === 'dark'
            ? 'bg-slate-900 text-slate-200 border-slate-800'
            : 'bg-white text-slate-800 border-slate-200'
        } flex flex-col transition-transform duration-300 z-50 shadow-2xl shrink-0 border-r fixed inset-y-0 left-0 w-72 no-print ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div
          className={`h-14 flex items-center justify-between px-3.5 border-b ${
            theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={BRAIN_LOGO_URL}
              alt="Logo FAAB BRAINSTORMING"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-contain border border-emerald-500/40 bg-white p-0.5 shadow-xs shrink-0"
            />
            <div className="flex flex-col overflow-hidden">
              <span
                className={`font-black text-xs leading-tight truncate tracking-wide ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                FAAB BRAINSTORMING
              </span>
              <span
                className={`text-[9px] font-bold tracking-wider uppercase truncate ${
                  theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                }`}
              >
                {t.subtitle}
              </span>
            </div>
          </div>

          {/* Bouton fermeture du menu déroulant */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title={t.closeMenu}
          >
            <X size={18} />
          </button>
        </div>

        {/* BARRE D'ICÔNES D'ACTIONS AU-DESSUS DE L'ONGLET ACCUEIL :
            1. Importer JSON (icône Download inversée avec Export)
            2. Enregistrer / Écraser JSON (icône Save)
            3. Exporter JSON (icône Upload inversée avec Import)
            4. Imprimer / PDF (icône Printer) */}
        <div
          className={`px-3 py-2.5 border-b flex flex-row items-center justify-around gap-1.5 ${
            theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Importer JSON -> Icône Download (inversée selon la demande) */}
          <button
            onClick={triggerImportJSON}
            className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-2xs border ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:bg-emerald-600 text-emerald-400 hover:text-white'
                : 'bg-slate-100 border-slate-200 hover:bg-emerald-600 text-emerald-700 hover:text-white'
            }`}
            title={t.importJson}
            aria-label={t.importJson}
          >
            <Download size={16} />
          </button>

          {/* Enregistrer / Écraser JSON -> Icône Save */}
          <button
            onClick={handleSaveOverwriteJSON}
            className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-2xs border ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:bg-emerald-600 text-teal-400 hover:text-white'
                : 'bg-slate-100 border-slate-200 hover:bg-emerald-600 text-teal-700 hover:text-white'
            }`}
            title={t.saveJson}
            aria-label={t.saveJson}
          >
            <Save size={16} />
          </button>

          {/* Exporter JSON -> Icône Upload (inversée selon la demande) */}
          <button
            onClick={handleExportJSON}
            className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-2xs border ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:bg-emerald-600 text-sky-400 hover:text-white'
                : 'bg-slate-100 border-slate-200 hover:bg-emerald-600 text-sky-700 hover:text-white'
            }`}
            title={t.exportJson}
            aria-label={t.exportJson}
          >
            <Upload size={16} />
          </button>

          {/* Imprimer / PDF */}
          <button
            onClick={handlePrint}
            className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-2xs border ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:bg-emerald-600 text-amber-400 hover:text-white'
                : 'bg-slate-100 border-slate-200 hover:bg-emerald-600 text-amber-700 hover:text-white'
            }`}
            title={t.printPdf}
            aria-label={t.printPdf}
          >
            <Printer size={16} />
          </button>
        </div>

        {/* SÉLECTEUR DE PROJET + DEVISE, LANGUE ET THÈME DANS LE MENU DÉROULANT */}
        <div
          className={`px-3.5 py-2.5 border-b space-y-2.5 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}
        >
          <div>
            <label
              className={`block text-[9px] font-black uppercase tracking-wider mb-1 ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
              }`}
            >
              {t.selectProjectLabel}
            </label>
            <select
              value={activeProject?.id || ''}
              onChange={e => handleSelectProjectFromDropdown(e.target.value)}
              className={`w-full rounded-lg px-2 py-1.5 text-[11px] font-bold border outline-none cursor-pointer transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
              }`}
            >
              <option value="" disabled>
                {t.selectProjectPlaceholder}
              </option>
              {activePortfoliosList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.institution || 'GAR'})
                </option>
              ))}
              <option value="__NEW_PROJECT__">
                + {t.dossier.newProjectBtn}
              </option>
            </select>
          </div>

          {/* Sélecteur de Devise (FCFA / € EUR / $ USD) dans le menu déroulant */}
          <div>
            <span
              className={`block text-[9px] font-black uppercase tracking-wider mb-1 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {lang === 'fr' ? 'Devise Monétaire' : 'Currency'}
            </span>
            <div
              className={`grid grid-cols-3 gap-1 rounded-lg p-1 border ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
              }`}
              title={t.currencyTitle}
            >
              {(['FCFA', 'EUR', 'USD'] as CurrencyCode[]).map(cur => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className={`py-1 rounded-md text-[10px] font-black transition-all cursor-pointer text-center ${
                    currency === cur
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : theme === 'dark'
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  {cur === 'FCFA' ? 'FCFA' : cur === 'EUR' ? '€ EUR' : '$ USD'}
                </button>
              ))}
            </div>
          </div>

          {/* Sélecteurs de Langue (FR / EN) et de Thème (Mode Clair / Mode Sombre) dans le menu déroulant */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <div
              className={`flex items-center justify-between rounded-lg p-1 border ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
              }`}
              title={t.switchLangTitle}
            >
              <Globe size={13} className="text-emerald-600 ml-1.5 mr-1 shrink-0" />
              <div className="flex flex-1 gap-0.5">
                <button
                  onClick={() => setLang('fr')}
                  className={`flex-1 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                    lang === 'fr'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : theme === 'dark'
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  FR
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`flex-1 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                    lang === 'en'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : theme === 'dark'
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
              }`}
              title={theme === 'dark' ? t.lightMode : t.darkMode}
              aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={13} className="text-amber-400 shrink-0" />
                  <span className="truncate">{t.lightMode}</span>
                </>
              ) : (
                <>
                  <Moon size={13} className="text-slate-700 shrink-0" />
                  <span className="truncate">{t.darkMode}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar space-y-0.5">
          {/* Navigation principale */}
          <button
            onClick={() => handleTabClick(menuItems[0])}
            className={`w-full flex items-center px-3.5 py-2.5 min-h-[40px] transition-colors cursor-pointer text-left ${
              activeTab === 'accueil'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium'
            }`}
          >
            <Home
              size={16}
              className={`mr-2.5 shrink-0 ${
                activeTab === 'accueil' ? 'text-white' : theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            />
            <span className="text-xs whitespace-nowrap">{menuItems[0].label}</span>
          </button>

          {/* Onglet Profil Utilisateur (juste en dessous de l'onglet Accueil) */}
          <button
            onClick={() => handleTabClick(menuItems[1])}
            className={`w-full flex items-center px-3.5 py-2.5 min-h-[40px] transition-colors cursor-pointer text-left ${
              activeTab === 'profil'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium'
            }`}
          >
            <User
              size={16}
              className={`mr-2.5 shrink-0 ${
                activeTab === 'profil' ? 'text-white' : theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            />
            <span className="text-xs whitespace-nowrap">{menuItems[1].label}</span>
          </button>

          <button
            onClick={() => handleTabClick(menuItems[2])}
            className={`w-full flex items-center px-3.5 py-2.5 min-h-[40px] transition-colors cursor-pointer text-left ${
              activeTab === 'dossier'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium'
            }`}
          >
            <FolderOpen
              size={16}
              className={`mr-2.5 shrink-0 ${
                activeTab === 'dossier' ? 'text-white' : theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            />
            <div className="flex items-center justify-between flex-1">
              <span className="text-xs whitespace-nowrap">{menuItems[2].label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  activeTab === 'dossier'
                    ? 'bg-emerald-800 text-white'
                    : theme === 'dark'
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {activePortfoliosList.length}
              </span>
            </div>
          </button>

          {/* PHASE MÉTHODOLOGIQUE GAR */}
          <div
            className={`px-3.5 text-[9px] font-black uppercase tracking-wider mb-1.5 mt-4 pt-3 border-t ${
              theme === 'dark' ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
            }`}
          >
            {t.garApproach}
          </div>

          {menuItems.slice(3).map(item => {
            const isItemActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item)}
                className={`w-full flex items-center px-3.5 py-2.5 min-h-[40px] transition-colors cursor-pointer text-left ${
                  isItemActive
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : theme === 'dark'
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium'
                }`}
              >
                <item.icon
                  size={16}
                  className={`mr-2.5 shrink-0 ${
                    isItemActive ? 'text-white' : theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                />
                <span className="text-xs whitespace-nowrap flex-1">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Pied du menu déroulant */}
        {activeProject && (
          <div
            className={`p-3.5 border-t text-[10px] space-y-0.5 ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-800 text-slate-400'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <div className={`text-[9px] uppercase font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {t.activePortfolioLabel}
            </div>
            <div className={`font-black truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>
              {activeProject.name}
            </div>
            {(userProfile.nom || userProfile.prenom) && (
              <div className={`text-[9px] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {[userProfile.nom, userProfile.prenom].filter(Boolean).join(' ')}
              </div>
            )}
            <div className={`text-[10px] font-mono font-bold tabular-nums ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {t.budgetLabel} {formatAmount(totalActiveBudget, currency)}
            </div>
          </div>
        )}
      </aside>

      {/* ZONE CENTRALE */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        {/* HEADER TOP-BAR POUR LES ONGLETS INTERNES (HORS PAGE D'ACCUEIL) */}
        {activeTab !== 'accueil' && (
          <header className="h-12 sm:h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 shadow-2xs z-20 shrink-0 no-print">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              {/* Bouton Menu Burger (Unique accès au menu déroulant) */}
              <button
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                className="p-2 -ml-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer shrink-0 flex items-center justify-center transition-colors"
                title={t.openMenu}
                aria-label={t.openMenu}
              >
                <Menu size={18} />
              </button>

              {/* Logo FAAB BRAINSTORMING + Titre de l'onglet */}
              <img
                src={BRAIN_LOGO_URL}
                alt="Logo FAAB BRAINSTORMING"
                referrerPolicy="no-referrer"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain border border-emerald-500/40 bg-white p-0.5 shadow-2xs shrink-0"
              />

              <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate shrink-0 uppercase tracking-wide">
                {menuItems.find(m => m.id === activeTab)?.label}
              </h1>

              {activeProject && activeTab !== 'dossier' && (
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 shadow-2xs min-w-0">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-800 truncate max-w-[130px] sm:max-w-[200px] md:max-w-xs">
                    {activeProject.displayName || activeProject.name}
                  </span>

                  {hasAnyFocus && (
                    <button
                      onClick={() => applyCombinedFocus([], [])}
                      className="text-[9px] font-bold bg-white border border-slate-300 px-1.5 py-0.5 rounded text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer shrink-0"
                    >
                      {t.showAll}
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>
        )}

        {/* CONTENU PRINCIPAL AVEC CERVEAU EN ARRIÈRE-PLAN (SOMBRE ET CLAIR) QUI N'EMPÊCHE PAS LA LECTURE DES IDÉES */}
        <main
          ref={mainScrollRef}
          onScroll={handleMainScroll}
          className={`flex-1 flex flex-col overflow-y-auto px-2.5 sm:px-5 md:px-6 pb-8 pt-3 sm:pt-4 relative custom-scrollbar transition-colors duration-200 ${
            activeTab === 'accueil'
              ? theme === 'light'
                ? 'bg-white text-slate-900'
                : 'bg-slate-950 text-slate-100'
              : 'bg-slate-50'
          }`}
        >
          {/* FILIGRANE CERVEAU NUMÉRIQUE EN ARRIÈRE-PLAN (FIXE, SUBTIL, NE GÊNE JAMAIS LA LECTURE DES IDÉES) */}
          <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden no-print">
            <img
              src={
                theme === 'dark'
                  ? `${import.meta.env.BASE_URL}assets/aistudio/image_5beb17c3.png`
                  : `${import.meta.env.BASE_URL}assets/aistudio/brain_circuit_light.png`
              }
              alt=""
              referrerPolicy="no-referrer"
              style={{
                transform: `translateY(${Math.round(landingScrollProgress * -0.25)}px) scale(${
                  1 + landingScrollProgress * 0.0008
                })`
              }}
              className={`w-[88vw] max-w-[760px] h-auto object-contain select-none transition-opacity duration-300 ${
                theme === 'dark' ? 'opacity-20 mix-blend-screen' : 'opacity-15 mix-blend-multiply'
              }`}
            />
          </div>

          {/* ONGLET : ACCUEIL — PAGE DE GARDE SKROLL (ANIMATIONS GAUCHE / DROITE, SANS LIENS VERS D'AUTRES ONGLETS, AVEC GUIDE JSON) */}
          {activeTab === 'accueil' && (
            <div className="relative z-10 max-w-6xl mx-auto w-full pb-8 select-none sm:select-auto flex flex-col min-h-full justify-between overflow-x-hidden">
              {/* HEADER OFFICIEL DE LA PAGE DE GARDE (AVEC BARRE DE PROGRESSION SKROLL) */}
              <header className="sticky top-0 z-30 -mx-2.5 sm:-mx-5 md:-mx-6 mb-5">
                <div
                  className={`h-1 w-full overflow-hidden ${
                    theme === 'dark' ? 'bg-slate-900/90' : 'bg-slate-100'
                  }`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 transition-all duration-150"
                    style={{ width: `${landingScrollProgress}%` }}
                  />
                </div>

                <div
                  className={`px-3 sm:px-6 py-2.5 backdrop-blur-md border-b flex flex-wrap items-center justify-between gap-3 transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-950/90 border-slate-800 text-slate-200'
                      : 'bg-white/90 border-slate-200 text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Icône du menu déroulant positionnée tout juste à gauche de Logo FAAB BRAINSTORMING */}
                    <button
                      onClick={() => setIsMobileMenuOpen(prev => !prev)}
                      className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer shrink-0 flex items-center justify-center transition-colors"
                      title={t.openMenu}
                      aria-label={t.openMenu}
                    >
                      <Menu size={18} />
                    </button>

                    <img
                      src={BRAIN_LOGO_URL}
                      alt="Logo FAAB BRAINSTORMING"
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-lg object-contain border border-emerald-500/40 bg-white p-0.5 shadow-2xs shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm font-black tracking-tight ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          FAAB BRAINSTORMING
                        </span>
                        <span
                          className={`hidden md:inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            theme === 'dark'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          GAR & TDR
                        </span>
                      </div>
                      <p
                        className={`text-[9px] sm:text-[10px] font-medium ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        {lang === 'fr'
                          ? 'Page de Garde Institutionnelle · Défilement Interactif'
                          : 'Institutional Cover Page · Interactive Scroll'}
                      </p>
                    </div>
                  </div>

                  {/* Sommaire d'ancrage interne à la page de garde uniquement */}
                  <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px] sm:text-[11px] font-bold">
                    <button
                      onClick={() => scrollToLandingSection('skroll-hero')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        landingScrollProgress < 22
                          ? theme === 'dark'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : theme === 'dark'
                            ? 'hover:bg-slate-800 text-slate-400'
                            : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      01 · {lang === 'fr' ? 'Vision' : 'Vision'}
                    </button>
                    <button
                      onClick={() => scrollToLandingSection('skroll-cycle')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        landingScrollProgress >= 22 && landingScrollProgress < 48
                          ? theme === 'dark'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : theme === 'dark'
                            ? 'hover:bg-slate-800 text-slate-400'
                            : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      02 · {t.home.frameworkTitle}
                    </button>
                    <button
                      onClick={() => scrollToLandingSection('skroll-json-guide')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        landingScrollProgress >= 48 && landingScrollProgress < 72
                          ? theme === 'dark'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : theme === 'dark'
                            ? 'hover:bg-slate-800 text-slate-400'
                            : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      03 · {lang === 'fr' ? 'Sauvegarde JSON' : 'JSON Saving'}
                    </button>
                    <button
                      onClick={() => scrollToLandingSection('skroll-ingenierie')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        landingScrollProgress >= 72 && landingScrollProgress < 88
                          ? theme === 'dark'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : theme === 'dark'
                            ? 'hover:bg-slate-800 text-slate-400'
                            : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      04 · {t.home.designLabel}
                    </button>
                    <button
                      onClick={() => scrollToLandingSection('skroll-nda')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        landingScrollProgress >= 88
                          ? theme === 'dark'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : theme === 'dark'
                            ? 'hover:bg-slate-800 text-slate-400'
                            : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      05 · {lang === 'fr' ? 'Confidentialité' : 'Confidentiality'}
                    </button>
                  </nav>

                  <div className="hidden xl:flex items-center gap-2 font-mono text-[10px] shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded border font-bold ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-800 text-emerald-400'
                          : 'bg-slate-50 border-slate-200 text-emerald-700'
                      }`}
                    >
                      SKROLL {Math.round(landingScrollProgress)}%
                    </span>
                  </div>
                </div>
              </header>

              {/* CORPS DE LA PAGE DE GARDE AVEC APPARITION DE GAUCHE ET DE DROITE AU DÉFILEMENT */}
              <div className="space-y-6">
                {/* SECTION 01 : HERO ARCHITECTURAL (GAUCHE -> DROITE & DROITE -> GAUCHE) */}
                <section id="skroll-hero" className="pt-1 sm:pt-3 pb-6 sm:pb-10 scroll-mt-20">
                  <div
                    className={`rounded-3xl p-5 sm:p-8 md:p-11 border relative overflow-hidden transition-colors backdrop-blur-[2px] ${
                      theme === 'dark'
                        ? 'bg-slate-900/85 border-slate-800 text-white shadow-xl'
                        : 'bg-white/85 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                      {/* Colonne Gauche venant de la GAUCHE */}
                      <motion.div
                        initial={{ opacity: 0, x: -80 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="lg:col-span-7 space-y-5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-black text-[10px] uppercase tracking-widest border ${
                              theme === 'dark'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <Target size={12} /> {t.home.badge}
                          </div>
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[10px] border ${
                              theme === 'dark'
                                ? 'bg-slate-800 text-slate-300 border-slate-700'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            <Database size={11} className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'} />
                            {lang === 'fr' ? 'IndexedDB & Sauvegarde JSON' : 'IndexedDB & JSON Persistence'}
                          </div>
                        </div>

                        <h1
                          className={`text-2xl sm:text-4xl md:text-5xl font-black leading-[1.08] tracking-tight ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {t.home.welcomePrefix}{' '}
                          <span
                            className={`block sm:inline underline decoration-2 underline-offset-8 ${
                              theme === 'dark'
                                ? 'text-emerald-400 decoration-emerald-500/50'
                                : 'text-emerald-700 decoration-emerald-600/40'
                            }`}
                          >
                            FAAB BRAINSTORMING
                          </span>
                        </h1>

                        <p
                          className={`text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl font-normal ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          {t.home.intro}
                        </p>

                        {/* Indicateurs clés d'architecture GAR (sans clic vers d'autres onglets) */}
                        <div
                          className={`grid grid-cols-3 gap-2.5 sm:gap-4 pt-3 border-t ${
                            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
                          }`}
                        >
                          <div
                            className={`p-2.5 sm:p-3 rounded-xl border ${
                              theme === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-white/90 border-slate-200'
                            }`}
                          >
                            <span
                              className={`text-[10px] font-mono uppercase block ${
                                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                              }`}
                            >
                              01 / DIAGNOSTIC
                            </span>
                            <p
                              className={`text-xs sm:text-sm font-black mt-0.5 ${
                                theme === 'dark' ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {lang === 'fr' ? 'Arbre à Problèmes' : 'Problem Tree'}
                            </p>
                          </div>

                          <div
                            className={`p-2.5 sm:p-3 rounded-xl border ${
                              theme === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-white/90 border-slate-200'
                            }`}
                          >
                            <span
                              className={`text-[10px] font-mono uppercase block ${
                                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                              }`}
                            >
                              02 / RENDEMENT
                            </span>
                            <p
                              className={`text-xs sm:text-sm font-black mt-0.5 ${
                                theme === 'dark' ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {lang === 'fr' ? 'Solutions & Intrants' : 'Solutions & Inputs'}
                            </p>
                          </div>

                          <div
                            className={`p-2.5 sm:p-3 rounded-xl border ${
                              theme === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-white/90 border-slate-200'
                            }`}
                          >
                            <span
                              className={`text-[10px] font-mono uppercase block ${
                                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                              }`}
                            >
                              03 / LIVRABLE
                            </span>
                            <p
                              className={`text-xs sm:text-sm font-black mt-0.5 ${
                                theme === 'dark' ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {lang === 'fr' ? 'Matrice TDR & GAR' : 'TOR & RBM Matrix'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-1 flex items-center gap-3">
                          <button
                            onClick={() => scrollToLandingSection('skroll-cycle')}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              theme === 'dark'
                                ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
                                : 'bg-slate-900 text-white border-slate-900 hover:bg-emerald-700 hover:border-emerald-700'
                            }`}
                          >
                            <span>
                              {lang === 'fr'
                                ? 'Défiler vers le bas pour découvrir'
                                : 'Scroll down to discover'}
                            </span>
                            <ArrowDown size={14} className="animate-bounce" />
                          </button>
                        </div>
                      </motion.div>

                      {/* Colonne Droite venant de la DROITE */}
                      <motion.div
                        initial={{ opacity: 0, x: 80 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="lg:col-span-5"
                      >
                        <div
                          className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                            theme === 'dark'
                              ? 'bg-slate-950/90 border-slate-800 shadow-2xl'
                              : 'bg-white/95 border-slate-300 shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              <span
                                className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-slate-800'
                                }`}
                              >
                                FAAB · SYNCHRONISATION LOGIQUE
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                theme === 'dark'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              GAR / TDR
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {[
                              {
                                code: 'NIV. 01',
                                left: lang === 'fr' ? 'Conséquence Globale' : 'Overall Consequence',
                                right: lang === 'fr' ? 'Impact Global (Objectif)' : 'Overall Impact (Goal)'
                              },
                              {
                                code: 'NIV. 02',
                                left: lang === 'fr' ? 'Problème Central' : 'Core Problem',
                                right: lang === 'fr' ? 'Effet Direct Attendu' : 'Expected Outcome'
                              },
                              {
                                code: 'NIV. 03',
                                left: lang === 'fr' ? 'Contrainte Majeure' : 'Major Constraint',
                                right: lang === 'fr' ? 'Extrant (Livrable)' : 'Output (Deliverable)'
                              },
                              {
                                code: 'NIV. 04',
                                left: lang === 'fr' ? 'Cause Profonde & Besoin' : 'Root Cause & Need',
                                right: lang === 'fr' ? 'Activité, Intrants & TDR' : 'Activity, Inputs & TOR'
                              }
                            ].map((row, idx) => (
                              <div
                                key={row.code}
                                onClick={() => setActiveMirrorStage(idx)}
                                className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                                  activeMirrorStage === idx
                                    ? theme === 'dark'
                                      ? 'bg-emerald-950/40 border-emerald-500/60'
                                      : 'bg-emerald-50/70 border-emerald-500'
                                    : theme === 'dark'
                                      ? 'bg-slate-900 border-slate-800'
                                      : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                                  <span
                                    className={`font-black ${
                                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                                    }`}
                                  >
                                    {row.code}
                                  </span>
                                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                                    {lang === 'fr' ? 'Miroir méthodologique' : 'Methodological mirror'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-11 items-center gap-1.5 text-[11px] font-bold">
                                  <div
                                    className={`col-span-5 truncate ${
                                      theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                                    }`}
                                  >
                                    {row.left}
                                  </div>
                                  <div className="col-span-1 text-center text-emerald-600 font-black">⇄</div>
                                  <div
                                    className={`col-span-5 truncate text-right ${
                                      theme === 'dark' ? 'text-emerald-300' : 'text-emerald-800'
                                    }`}
                                  >
                                    {row.right}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div
                            className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[10px] ${
                              theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 font-semibold">
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                              {t.home.compliance}
                            </span>
                            <span className="font-mono font-bold">100% SYNC</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </section>

                {/* SECTION 02 : CYCLE LOGIQUE GAR & TDR (CARTES VENANT DE GAUCHE ET DE DROITE AU DÉFILEMENT, SANS LIEN D'ONGLET) */}
                <section id="skroll-cycle" className="py-6 sm:py-10 scroll-mt-20">
                  <div className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 35 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, amount: 0.2 }}
                      transition={{ duration: 0.5 }}
                      className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4"
                    >
                      <div>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${
                            theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                          }`}
                        >
                          {t.home.frameworkLabel}
                        </span>
                        <h2
                          className={`text-lg sm:text-2xl font-black tracking-tight ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {t.home.frameworkTitle}
                        </h2>
                      </div>
                      <p
                        className={`text-xs sm:text-sm max-w-xl leading-relaxed ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {t.home.frameworkDesc}
                      </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {[
                        {
                          step: '01',
                          fromLeft: true,
                          icon: Lightbulb,
                          title: lang === 'fr' ? 'Brainstorming & Acteurs' : 'Brainstorming & Stakeholders',
                          desc:
                            lang === 'fr'
                              ? 'Collecte illimitée des constats de terrain par paires Problème (Négatif) / Solution (Positif) et cartographie complète des bénéficiaires, services internes, externes et partenaires.'
                              : 'Unlimited collection of field observations in Problem (Negative) / Solution (Positive) pairs and mapping of beneficiaries, internal/external services, and partners.'
                        },
                        {
                          step: '02',
                          fromLeft: false,
                          icon: Network,
                          title: lang === 'fr' ? 'Arbre à Problèmes' : 'Problem Tree Analysis',
                          desc:
                            lang === 'fr'
                              ? 'Hiérarchisation causale rigoureuse : Conséquence Globale (Impact négatif), Problème Central par service, Contraintes majeures, Causes profondes et Besoins.'
                              : 'Rigorous causal hierarchy: Overall Consequence (Negative impact), Core Problem per service, Major Constraints, Root Causes, and Needs.'
                        },
                        {
                          step: '03',
                          fromLeft: true,
                          icon: GitFork,
                          title: lang === 'fr' ? 'Arbre à Solutions & Intrants' : 'Solutions & Inputs Tree',
                          desc:
                            lang === 'fr'
                              ? 'Transformation positive en Impact Global, Effets directs, Extrants livrables, Activités opérationnelles et chiffrage détaillé des ressources humaines et matérielles.'
                              : 'Positive transformation into Overall Impact, Outcomes, Deliverable Outputs, Operational Activities, and detailed costing of human and material resources.'
                        },
                        {
                          step: '04',
                          fromLeft: false,
                          icon: FileText,
                          title: lang === 'fr' ? 'Termes de Référence (TDR)' : 'Terms of Reference (TOR)',
                          desc:
                            lang === 'fr'
                              ? 'Extraction et génération dynamique des TDR par sélection logique de la lignée : Diagnostic, Résultats attendus, Intrants chiffrés, Budget consolidé et Parties Prenantes.'
                              : 'Dynamic extraction and generation of TORs by logical lineage selection: Diagnosis, Expected Results, Costed Inputs, Consolidated Budget, and Stakeholders.'
                        }
                      ].map(card => {
                        const IconComponent = card.icon;
                        return (
                          <motion.div
                            key={card.step}
                            initial={{ opacity: 0, x: card.fromLeft ? -85 : 85 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: false, amount: 0.2 }}
                            transition={{ duration: 0.55, ease: 'easeOut' }}
                            className={`rounded-2xl p-5 sm:p-6 border flex flex-col justify-between backdrop-blur-[2px] ${
                              theme === 'dark'
                                ? 'bg-slate-900/85 border-slate-800 text-white'
                                : 'bg-white/90 border-slate-200 text-slate-900 shadow-2xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span
                                  className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded border ${
                                    theme === 'dark'
                                      ? 'bg-slate-950 text-emerald-400 border-slate-800'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  PHASE {card.step}
                                </span>
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                    theme === 'dark'
                                      ? 'bg-slate-800 border-slate-700 text-emerald-400'
                                      : 'bg-slate-100 border-slate-200 text-emerald-700'
                                  }`}
                                >
                                  <IconComponent size={16} />
                                </div>
                              </div>
                              <h3
                                className={`text-sm sm:text-base font-black mb-2 ${
                                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                                }`}
                              >
                                {card.title}
                              </h3>
                              <p
                                className={`text-xs leading-relaxed ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                                }`}
                              >
                                {card.desc}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* SECTION 03 : GUIDE D'ENREGISTREMENT & SAUVEGARDE DU FICHIER JSON (COMMENT & POURQUOI LE FAIRE) */}
                <section id="skroll-json-guide" className="py-6 sm:py-10 scroll-mt-20">
                  <div className="space-y-5">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, amount: 0.2 }}
                      transition={{ duration: 0.5 }}
                      className="border-b border-slate-200 pb-3"
                    >
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${
                          theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                        }`}
                      >
                        {lang === 'fr'
                          ? 'Gestion des Fichiers & Persistance des Données'
                          : 'File Management & Data Persistence'}
                      </span>
                      <h2
                        className={`text-lg sm:text-2xl font-black tracking-tight ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {lang === 'fr'
                          ? 'Comment enregistrer votre fichier JSON et pourquoi le faire ?'
                          : 'How to save your JSON file and why should you do it?'}
                      </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-stretch">
                      {/* Carte GAUCHE : COMMENT ENREGISTRER ET METTRE À JOUR LE FICHIER JSON */}
                      <motion.div
                        initial={{ opacity: 0, x: -85 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                        className={`md:col-span-6 rounded-2xl p-5 sm:p-6 border flex flex-col justify-between backdrop-blur-[2px] ${
                          theme === 'dark'
                            ? 'bg-slate-900/85 border-slate-800 text-white'
                            : 'bg-white/90 border-slate-200 text-slate-900 shadow-2xs'
                        }`}
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded border ${
                                theme === 'dark'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {lang === 'fr' ? 'PROCÉDURE · COMMENT ENREGISTRER' : 'PROCEDURE · HOW TO SAVE'}
                            </span>
                            <Save size={18} className="text-emerald-600 shrink-0" />
                          </div>

                          <h3
                            className={`text-base sm:text-lg font-black ${
                              theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {lang === 'fr'
                              ? 'Les 3 commandes JSON dans le Menu Burger'
                              : 'The 3 JSON commands inside the Burger Menu'}
                          </h3>

                          <div className="space-y-2.5 text-xs leading-relaxed">
                            <div
                              className={`p-3 rounded-xl border flex items-start gap-3 ${
                                theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="p-1.5 rounded-lg bg-teal-600 text-white shrink-0 mt-0.5">
                                <Save size={14} />
                              </div>
                              <div>
                                <div className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {lang === 'fr'
                                    ? '1. Icône Enregistrer (Écraser & Mettre à jour)'
                                    : '1. Save Icon (Overwrite & Update)'}
                                </div>
                                <p className={theme === 'dark' ? 'text-slate-300 mt-0.5' : 'text-slate-700 mt-0.5'}>
                                  {lang === 'fr'
                                    ? "Ouvrez le menu burger en haut à gauche et cliquez sur l'icône Disquette (Enregistrer). À chaque sauvegarde, l'application met à jour et écrase directement l'ancien fichier .json portant le même nom par la nouvelle version actualisée."
                                    : 'Open the top-left burger menu and click the Floppy Disk (Save) icon. On every save, the app directly updates and overwrites the existing .json file of the same name with the latest version.'}
                                </p>
                              </div>
                            </div>

                            <div
                              className={`p-3 rounded-xl border flex items-start gap-3 ${
                                theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="p-1.5 rounded-lg bg-sky-600 text-white shrink-0 mt-0.5">
                                <Upload size={14} />
                              </div>
                              <div>
                                <div className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {lang === 'fr'
                                    ? '2. Icône Exporter JSON (Archive externe)'
                                    : '2. Export JSON Icon (External Archive)'}
                                </div>
                                <p className={theme === 'dark' ? 'text-slate-300 mt-0.5' : 'text-slate-700 mt-0.5'}>
                                  {lang === 'fr'
                                    ? 'Permet de générer à tout moment un fichier .json complet du portefeuille actif sur votre support (clé USB, disque dur ou dossier partagé).'
                                    : 'Generates a complete .json file of the active portfolio onto your storage device (USB drive, hard disk, or shared folder).'}
                                </p>
                              </div>
                            </div>

                            <div
                              className={`p-3 rounded-xl border flex items-start gap-3 ${
                                theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                                <Download size={14} />
                              </div>
                              <div>
                                <div className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {lang === 'fr'
                                    ? '3. Icône Importer JSON (Rechargement)'
                                    : '3. Import JSON Icon (Reloading)'}
                                </div>
                                <p className={theme === 'dark' ? 'text-slate-300 mt-0.5' : 'text-slate-700 mt-0.5'}>
                                  {lang === 'fr'
                                    ? 'Recharge instantanément un fichier .json existant dans FAAB BRAINSTORMING pour poursuivre votre planification.'
                                    : 'Instantly reloads an existing .json file into FAAB BRAINSTORMING to resume your planning work.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Carte DROITE : POURQUOI ENREGISTRER LE FICHIER JSON */}
                      <motion.div
                        initial={{ opacity: 0, x: 85 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                        className={`md:col-span-6 rounded-2xl p-5 sm:p-6 border flex flex-col justify-between backdrop-blur-[2px] ${
                          theme === 'dark'
                            ? 'bg-slate-900/85 border-slate-800 text-white'
                            : 'bg-white/90 border-slate-200 text-slate-900 shadow-2xs'
                        }`}
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded border ${
                                theme === 'dark'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {lang === 'fr' ? 'IMPORTANCE · POURQUOI LE FAIRE ?' : 'PURPOSE · WHY DO IT?'}
                            </span>
                            <Database size={18} className="text-emerald-600 shrink-0" />
                          </div>

                          <h3
                            className={`text-base sm:text-lg font-black ${
                              theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {lang === 'fr'
                              ? 'Sécurité, Portabilité et Unicité de la Version'
                              : 'Security, Portability, and Single-Source Versioning'}
                          </h3>

                          <div className="space-y-2.5 text-xs leading-relaxed">
                            <div
                              className={`p-3 rounded-xl border ${
                                theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className={`font-black mb-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-800'}`}>
                                {lang === 'fr'
                                  ? '✓ Fichier unique toujours à jour (Sans doublons)'
                                  : '✓ Always up-to-date single file (No duplicates)'}
                              </div>
                              <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                                {lang === 'fr'
                                  ? "En écrasant l'ancien fichier JSON portant le même nom lors de chaque sauvegarde, vous conservez une seule version officielle de référence sans accumuler de multiples copies obsolètes."
                                  : 'By overwriting the existing JSON file of the same name on each save, you maintain a single official reference version without accumulating outdated copies.'}
                              </p>
                            </div>

                            <div
                              className={`p-3 rounded-xl border ${
                                theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className={`font-black mb-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-800'}`}>
                                {lang === 'fr'
                                  ? '✓ Double sécurité : IndexedDB + Fichier physique'
                                  : '✓ Dual protection: IndexedDB + Physical file'}
                              </div>
                              <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                                {lang === 'fr'
                                  ? "L'application enregistre automatiquement vos saisies dans la base IndexedDB de l'appareil. Le fichier JSON constitue votre sauvegarde physique externe en cas de changement d'ordinateur ou de nettoyage du navigateur."
                                  : 'The app automatically persists your entries in the device IndexedDB. The JSON file serves as your physical external backup if you switch computers or clear browser data.'}
                              </p>
                            </div>

                            <div
                              className={`p-3 rounded-xl border ${
                                theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className={`font-black mb-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-800'}`}>
                                {lang === 'fr'
                                  ? '✓ Partage institutionnel & Travail collaboratif'
                                  : '✓ Institutional sharing & Collaborative work'}
                              </div>
                              <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                                {lang === 'fr'
                                  ? 'Transmettez facilement votre fichier .json aux équipes techniques, ministères ou partenaires financiers pour réviser le Brainstorming, les Arbres GAR et les TDR.'
                                  : 'Easily share your .json file with technical teams, ministries, or financial partners to review the Brainstorming, RBM Trees, and TORs.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </section>

                {/* SECTION 04 : CONCEPTION ET INGÉNIERIE (GAUCHE) & CONFORMITÉ INSTITUTIONNELLE (DROITE) */}
                <section id="skroll-ingenierie" className="py-6 sm:py-10 scroll-mt-20">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-stretch">
                    <motion.div
                      initial={{ opacity: 0, x: -85 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: false, amount: 0.2 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      className={`md:col-span-7 rounded-2xl p-5 sm:p-7 border flex flex-col justify-between backdrop-blur-[2px] ${
                        theme === 'dark'
                          ? 'bg-slate-900/85 border-slate-800 text-white'
                          : 'bg-white/90 border-slate-200 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest ${
                              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                            }`}
                          >
                            {t.home.designLabel}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                              theme === 'dark'
                                ? 'bg-slate-950 border-slate-800 text-slate-300'
                                : 'bg-slate-100 border-slate-200 text-slate-800'
                            }`}
                          >
                            ARCHITECTURE GAR
                          </span>
                        </div>

                        <h3
                          className={`text-lg sm:text-2xl font-black tracking-tight ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          KOFFIE FABIEN MICHAEL
                        </h3>
                        <p
                          className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          {t.home.expertBio}
                        </p>
                      </div>

                      <div
                        className={`mt-5 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold ${
                          theme === 'dark' ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-800'
                        }`}
                      >
                        <a
                          href="mailto:fabien.frikupgeneration@gmail.com"
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors break-all ${
                            theme === 'dark'
                              ? 'bg-slate-950 border-slate-800 hover:border-emerald-500/50 text-slate-200'
                              : 'bg-slate-50 border-slate-200 hover:border-emerald-600 text-slate-900'
                          }`}
                        >
                          <Mail size={15} className="text-emerald-600 shrink-0" />
                          <span className="text-[11px]">fabien.frikupgeneration@gmail.com</span>
                        </a>

                        <a
                          href="tel:0022507480827393"
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors font-mono ${
                            theme === 'dark'
                              ? 'bg-slate-950 border-slate-800 hover:border-emerald-500/50 text-slate-200'
                              : 'bg-slate-50 border-slate-200 hover:border-emerald-600 text-slate-900'
                          }`}
                        >
                          <Phone size={15} className="text-emerald-600 shrink-0" />
                          <span className="text-[11px]">00225 07480827393</span>
                        </a>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 85 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: false, amount: 0.2 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      className={`md:col-span-5 rounded-2xl p-5 sm:p-7 border flex flex-col justify-between backdrop-blur-[2px] ${
                        theme === 'dark'
                          ? 'bg-slate-900/85 border-slate-800 text-white'
                          : 'bg-white/90 border-slate-200 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <div>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${
                            theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                          }`}
                        >
                          {t.home.frameworkLabel}
                        </span>
                        <h3
                          className={`text-base sm:text-xl font-black tracking-tight ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {t.home.frameworkTitle}
                        </h3>
                        <p
                          className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          {t.home.frameworkDesc}
                        </p>
                      </div>

                      <div
                        className={`mt-5 pt-4 border-t flex items-center gap-2 text-xs font-bold ${
                          theme === 'dark'
                            ? 'border-slate-800 text-emerald-400'
                            : 'border-slate-200 text-emerald-700'
                        }`}
                      >
                        <CheckCircle2 size={16} className="shrink-0" />
                        <span>{t.home.compliance}</span>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* SECTION 05 : ACCORD DE CONFIDENTIALITÉ & PROPRIÉTÉ INTELLECTUELLE */}
                <section id="skroll-nda" className="pt-2 pb-6 scroll-mt-20">
                  <motion.div
                    initial={{ opacity: 0, x: -70 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.5 }}
                    className={`rounded-2xl p-5 sm:p-6 border backdrop-blur-[2px] ${
                      theme === 'dark'
                        ? 'bg-slate-900/85 border-slate-800 text-slate-200'
                        : 'bg-white/90 border-slate-200 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <h4
                        className={`text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                        {t.home.ndaTitle}
                      </h4>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          theme === 'dark'
                            ? 'bg-slate-950 border-slate-800 text-amber-400'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        PROPRIÉTÉ INTELLECTUELLE
                      </span>
                    </div>
                    <p
                      className={`text-xs sm:text-sm leading-relaxed text-justify ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {t.home.ndaText}
                    </p>
                  </motion.div>
                </section>
              </div>

              {/* FOOTER INSTITUTIONNEL DE LA PAGE DE GARDE (SANS LIENS VERS D'AUTRES ONGLETS) */}
              <footer
                className={`mt-6 rounded-2xl border p-5 sm:p-7 transition-colors backdrop-blur-[2px] ${
                  theme === 'dark'
                    ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                    : 'bg-white/95 border-slate-200 text-slate-700 shadow-2xs'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6 border-b border-slate-200/80">
                  <div className="md:col-span-5 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={BRAIN_LOGO_URL}
                        alt="Logo FAAB BRAINSTORMING"
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-lg object-contain border border-emerald-500/40 bg-white p-0.5 shrink-0"
                      />
                      <span
                        className={`font-black text-sm tracking-tight ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        FAAB BRAINSTORMING
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs leading-relaxed">
                      {lang === 'fr'
                        ? 'Plateforme institutionnelle de Gestion Axée sur les Résultats (GAR) et de génération logique des Termes de Référence (TDR). Utilisez exclusivement l’icône du Menu Burger en haut à gauche pour naviguer dans l’application.'
                        : 'Institutional Results-Based Management (RBM) and logical Terms of Reference (TOR) platform. Use the top-left Burger Menu icon exclusively to navigate the application.'}
                    </p>
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest block ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    >
                      {t.garApproach}
                    </span>
                    <ul className="space-y-1 text-[11px] font-semibold">
                      <li>• {t.tabs.dossier.label}</li>
                      <li>• {t.tabs.brainstorming.label}</li>
                      <li>• {t.tabs.arbre.label}</li>
                      <li>• {t.tabs.solutions.label}</li>
                      <li>• {t.tabs.registre_parties.label}</li>
                      <li>• {t.tabs.tdr.label}</li>
                    </ul>
                  </div>

                  <div className="md:col-span-4 space-y-1.5 text-[11px]">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest block ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    >
                      {t.home.designLabel}
                    </span>
                    <div className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      KOFFIE FABIEN MICHAEL
                    </div>
                    <div className="truncate">fabien.frikupgeneration@gmail.com</div>
                    <div className="font-mono font-semibold">00225 07480827393</div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-medium">
                  <div>
                    © {new Date().getFullYear()} Koffié Fabien Michael · FAAB BRAINSTORMING · {t.home.rights}
                  </div>
                  <button
                    onClick={() => scrollToLandingSection('skroll-hero')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <ChevronUp size={13} />
                    <span>{lang === 'fr' ? 'Haut de page' : 'Back to top'}</span>
                  </button>
                </div>
              </footer>
            </div>
          )}

          {/* ONGLET : PROFIL UTILISATEUR (NOM, PRÉNOM, EMAIL, CONTACT, FONCTION, INSTITUTION) */}
          {activeTab === 'profil' && (
            <div className="relative z-10 flex-1 space-y-4 w-full max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <User size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900">{t.profil.title}</h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Database size={10} />
                        {t.profil.badge}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-2xl">
                      {t.profil.subtitle}
                    </p>
                  </div>
                </div>
                {(userProfile.nom ||
                  userProfile.prenom ||
                  userProfile.email ||
                  userProfile.contact ||
                  userProfile.fonction ||
                  userProfile.institution) && (
                  <Button
                    variant="secondary"
                    icon={RotateCcw}
                    onClick={() => setUserProfile(defaultUserProfile)}
                  >
                    {t.profil.resetBtn}
                  </Button>
                )}
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      {t.profil.nomLabel}
                    </label>
                    <input
                      type="text"
                      value={userProfile.nom}
                      onChange={e => setUserProfile(prev => ({ ...prev, nom: e.target.value }))}
                      placeholder={t.profil.nomPlaceholder}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      {t.profil.prenomLabel}
                    </label>
                    <input
                      type="text"
                      value={userProfile.prenom}
                      onChange={e => setUserProfile(prev => ({ ...prev, prenom: e.target.value }))}
                      placeholder={t.profil.prenomPlaceholder}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      {t.profil.emailLabel}
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={userProfile.email}
                        onChange={e => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                        placeholder={t.profil.emailPlaceholder}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      {t.profil.contactLabel}
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={userProfile.contact}
                        onChange={e => setUserProfile(prev => ({ ...prev, contact: e.target.value }))}
                        placeholder={t.profil.contactPlaceholder}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-900 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      {t.profil.fonctionLabel}
                    </label>
                    <input
                      type="text"
                      value={userProfile.fonction}
                      onChange={e => setUserProfile(prev => ({ ...prev, fonction: e.target.value }))}
                      placeholder={t.profil.fonctionPlaceholder}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      {t.profil.institutionLabel}
                    </label>
                    <input
                      type="text"
                      value={userProfile.institution}
                      onChange={e => setUserProfile(prev => ({ ...prev, institution: e.target.value }))}
                      placeholder={t.profil.institutionPlaceholder}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* APERÇU DE LA REPRISE DANS LE TDR */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-2">
                    {t.profil.previewTitle}
                  </div>
                  {userProfile.nom ||
                  userProfile.prenom ||
                  userProfile.email ||
                  userProfile.contact ||
                  userProfile.fonction ||
                  userProfile.institution ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-700">
                      {(userProfile.nom || userProfile.prenom) && (
                        <span className="font-black text-slate-900">
                          {[userProfile.nom, userProfile.prenom].filter(Boolean).join(' ')}
                        </span>
                      )}
                      {userProfile.fonction && (
                        <span className="font-semibold text-emerald-800">· {userProfile.fonction}</span>
                      )}
                      {userProfile.institution && (
                        <span className="font-bold uppercase text-slate-600">· {userProfile.institution}</span>
                      )}
                      {userProfile.email && (
                        <span className="font-mono text-emerald-700">({userProfile.email})</span>
                      )}
                      {userProfile.contact && (
                        <span className="font-mono text-slate-600">· {userProfile.contact}</span>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3 text-xs text-slate-500 italic">
                      {t.profil.emptyPreview}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ONGLET : DOSSIERS & PROJETS (CRÉATION ILLIMITÉE) */}
          {activeTab === 'dossier' && (
            <div className="flex-1 space-y-4 w-full max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">{t.dossier.title}</h2>
                  <p className="text-[11px] text-slate-500">
                    {t.dossier.subtitle(currentSandboxesCount)}
                  </p>
                </div>
                <Button icon={Plus} onClick={createNewSandbox}>
                  {t.dossier.newProjectBtn}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {activePortfoliosList.map(port => {
                  const isSelected = activeProject?.id === port.id;
                  const totalCost = (port.garData?.rendement?.axes || []).reduce((acc, axe) => {
                    return acc + (axe.projets || []).reduce((pAcc, pr) => pAcc + getProjectEffectiveCost(pr), 0);
                  }, 0);
                  const ideasCount = (port.garData?.brainstorming || []).length;

                  return (
                    <Card
                      key={port.id}
                      className={`transition-all hover:shadow-md flex flex-col justify-between ${
                        isSelected ? 'ring-2 ring-emerald-600 border-emerald-500' : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                            <Briefcase size={16} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isSelected && (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {t.dossier.activeBadge}
                              </span>
                            )}
                            <button
                              onClick={e => handleTrashPortfolio(e, port.id)}
                              className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title={t.dossier.trashTitle}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {port.isEditable ? (
                          <div className="mb-3 space-y-2">
                            <input
                              type="text"
                              value={port.institution}
                              onChange={e => updatePortfolioMeta(port.id, 'institution', e.target.value)}
                              className="w-full font-bold text-[10px] text-slate-600 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none uppercase tracking-wider py-0.5"
                              placeholder={t.dossier.instPlaceholder}
                            />
                            <input
                              type="text"
                              value={port.name}
                              onChange={e => updatePortfolioMeta(port.id, 'name', e.target.value)}
                              className="w-full font-black text-xs sm:text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none py-0.5"
                              placeholder={t.dossier.namePlaceholder}
                            />
                            <textarea
                              value={port.description}
                              onChange={e => updatePortfolioMeta(port.id, 'description', e.target.value)}
                              className="w-full text-[11px] text-slate-600 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none h-11 resize-none custom-scrollbar py-0.5"
                              placeholder={t.dossier.descPlaceholder}
                            />
                          </div>
                        ) : (
                          <div className="mb-3 space-y-2">
                            <div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                                {port.institution}
                              </div>
                              <h3 className="font-black text-xs sm:text-sm text-slate-900 mb-1">{port.name}</h3>
                              <p className="text-[11px] text-slate-600 line-clamp-2">{port.description}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 border-t border-slate-100 pt-2 mb-2.5">
                          <span>
                            {t.dossier.axesCount} {port.garData?.rendement?.axes?.length || 0} · {t.dossier.ideasCount} {ideasCount}
                          </span>
                          <span className="font-mono text-emerald-700 font-bold tabular-nums">
                            {formatAmount(totalCost, currency)}
                          </span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        icon={Settings}
                        onClick={() => handleEnterGAR(port)}
                      >
                        {t.dossier.openGarBtn}
                      </Button>
                    </Card>
                  );
                })}

                <button
                  onClick={createNewSandbox}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-emerald-700 bg-white/50 transition-all min-h-[220px] group"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors mb-2">
                    <Plus size={18} />
                  </div>
                  <h3 className="font-bold text-xs text-slate-800 group-hover:text-emerald-700">{t.dossier.newFolderCard}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.dossier.newFolderSub}</p>
                </button>
              </div>
            </div>
          )}

          {/* ONGLET : BRAINSTORMING */}
          {activeTab === 'brainstorming' &&
            (!activeProject ? (
              <NoProjectScreen setActiveTab={setActiveTab} onImportClick={triggerImportJSON} lang={lang} />
            ) : (
              <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-3">
                <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-3 sm:p-4 flex flex-row justify-between items-center gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900">{t.brainstorming.title}</h2>
                    <p className="text-[10px] sm:text-xs text-slate-500">{t.brainstorming.subtitle}</p>
                  </div>
                  {activeProject.isEditable && (
                    <Button onClick={handleAddIdea} icon={Plus}>
                      {t.brainstorming.newIdeaBtn}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                  {(activeProject.garData?.brainstorming || []).map(idea => (
                    <div
                      key={idea.id}
                      className={`brainstorm-card p-2 sm:p-2.5 rounded-lg shadow-2xs border border-black/10 relative group ${idea.color} flex flex-col h-40 sm:h-44 md:h-48 transition-transform`}
                    >
                      {activeProject.isEditable && (
                        <button
                          onClick={() => handleDeleteIdea(idea.id)}
                          className="absolute -top-1.5 -right-1.5 bg-white hover:bg-red-500 text-slate-500 hover:text-white border border-slate-300 rounded-full p-0.5 shadow-2xs cursor-pointer z-10"
                          title={t.brainstorming.deleteIdeaTitle}
                        >
                          <X size={11} />
                        </button>
                      )}

                      <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                        <div className="flex-1 flex flex-col min-h-0">
                          <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-700 mb-0.5 border-b border-black/10 pb-0.5">
                            {t.brainstorming.negLabel}
                          </span>
                          <textarea
                            className="w-full flex-1 bg-transparent resize-none outline-none font-medium text-slate-900 placeholder-slate-500/60 custom-scrollbar text-[10px] sm:text-[11px] leading-tight"
                            placeholder={t.brainstorming.negPlaceholder}
                            value={idea.textNegative || idea.text || ''}
                            onChange={e => updateIdeaText(idea.id, 'textNegative', e.target.value)}
                            readOnly={!activeProject.isEditable}
                          />
                        </div>

                        <div className="h-px w-full bg-black/10 shrink-0"></div>

                        <div className="flex-1 flex flex-col min-h-0">
                          <span className="text-[8px] sm:text-[9px] font-black uppercase text-emerald-800 mb-0.5 border-b border-black/10 pb-0.5">
                            {t.brainstorming.posLabel}
                          </span>
                          <textarea
                            className="w-full flex-1 bg-transparent resize-none outline-none font-medium text-emerald-950 placeholder-emerald-700/60 custom-scrollbar text-[10px] sm:text-[11px] leading-tight"
                            placeholder={t.brainstorming.posPlaceholder}
                            value={idea.textPositive || ''}
                            onChange={e => updateIdeaText(idea.id, 'textPositive', e.target.value)}
                            readOnly={!activeProject.isEditable}
                          />
                        </div>
                      </div>

                      {activeProject.isEditable && (
                        <div className="flex items-center justify-center gap-1.5 mt-1.5 pt-1.5 border-t border-black/10 shrink-0">
                          {['bg-amber-100', 'bg-sky-100', 'bg-emerald-100', 'bg-rose-100', 'bg-purple-100', 'bg-orange-100'].map(c => (
                            <button
                              key={c}
                              onClick={() => updateIdeaColor(idea.id, c)}
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-black/20 cursor-pointer ${c} ${
                                idea.color === c ? 'ring-1 ring-slate-800 scale-110' : 'hover:scale-105'
                              }`}
                              title={t.brainstorming.colorTitle}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {(activeProject.garData?.brainstorming || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 px-4 bg-white rounded-xl border border-slate-200">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                      <Lightbulb size={24} />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">{t.brainstorming.emptyTitle}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm text-center">
                      {t.brainstorming.emptyDesc}
                    </p>
                    <Button onClick={handleAddIdea} icon={Plus} className="mt-3">
                      {t.brainstorming.addIdeaBtn}
                    </Button>
                  </div>
                )}
              </div>
            ))}

          {/* ONGLET : ARBRE À PROBLÈMES */}
          {activeTab === 'arbre' &&
            (!activeProject ? (
              <NoProjectScreen setActiveTab={setActiveTab} onImportClick={triggerImportJSON} lang={lang} />
            ) : (
              <div className="flex-1 flex flex-col w-full max-w-full mx-auto space-y-2.5">
                <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2.5 sm:p-3 flex flex-wrap justify-between items-center gap-2 no-print">
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">{t.arbre.title}</h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">{t.arbre.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setMobileTreeLayout('tree')}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold cursor-pointer transition-colors ${
                          mobileTreeLayout === 'tree'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <GitFork size={12} />
                        <span>{t.common.treeView}</span>
                      </button>
                      <button
                        onClick={() => setMobileTreeLayout('list')}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold cursor-pointer transition-colors ${
                          mobileTreeLayout === 'list'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LayoutList size={12} />
                        <span>{t.common.listView}</span>
                      </button>
                    </div>

                    {mobileTreeLayout === 'tree' && (
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          onClick={() => setTreeZoom(z => Math.max(50, z - 15))}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded cursor-pointer"
                          title={t.common.zoomOut}
                        >
                          <ZoomOut size={13} />
                        </button>
                        <button
                          onClick={() => setTreeZoom(100)}
                          className="px-1.5 text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                          title={t.common.zoomReset}
                        >
                          {treeZoom}%
                        </button>
                        <button
                          onClick={() => setTreeZoom(z => Math.min(130, z + 15))}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded cursor-pointer"
                          title={t.common.zoomIn}
                        >
                          <ZoomIn size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* VUE LISTE COMPACTE */}
                {mobileTreeLayout === 'list' ? (
                  <div className="space-y-3">
                    <div className="bg-rose-950 text-white p-3 rounded-xl shadow-2xs border border-rose-700">
                      <h4 className="text-[9px] uppercase font-black mb-1.5 text-rose-300 tracking-widest">
                        1. {t.arbre.consequenceGlobale}
                      </h4>
                      {activeProject.isEditable ? (
                        <BrainstormingSelect
                          ideas={activeProject.garData?.brainstorming}
                          value={activeProject.garData?.problems?.consequenceGlobale}
                          onChange={(neg, pos) =>
                            updateProject(p => {
                              p.garData.problems.consequenceGlobale = neg;
                              if (pos) p.garData.rendement.impact = pos;
                            })
                          }
                          className="bg-rose-900 text-white border border-rose-500 rounded"
                          placeholder={t.arbre.selectNegativeImpact}
                        />
                      ) : (
                        <p className="font-bold text-[11px]">{activeProject.garData?.problems?.consequenceGlobale}</p>
                      )}
                    </div>

                    {(activeProject.garData?.problems?.branches || []).map((branch, i) => (
                      <div key={i} className="bg-white rounded-xl border border-rose-200 p-3 space-y-2.5 shadow-2xs">
                        <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                          <div className="flex justify-between items-center mb-1.5 gap-2">
                            <div className="flex-1 flex flex-wrap items-center gap-1 text-[9px] uppercase font-black text-rose-700">
                              {activeProject.isEditable ? (
                                <input
                                  type="text"
                                  className="bg-white border border-rose-300 text-rose-900 px-1.5 py-0.5 rounded outline-none focus:border-rose-500 font-black uppercase text-[10px]"
                                  value={branch.axeName || `${t.common.service} ${i + 1}`}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateProject(p => {
                                      p.garData.problems.branches[i].axeName = val;
                                      if (p.garData.rendement.axes[i]) p.garData.rendement.axes[i].nom = val;
                                    });
                                  }}
                                />
                              ) : (
                                <span>{branch.axeName || `${t.common.service} ${i + 1}`}</span>
                              )}
                              <span>: {t.arbre.problemeCentral}</span>
                            </div>
                            {activeProject.isEditable && (
                              <button
                                onClick={() => handleDeleteAxe(i, branch.axeName)}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {activeProject.isEditable ? (
                            <BrainstormingSelect
                              ideas={activeProject.garData?.brainstorming}
                              value={branch.central}
                              onChange={(neg, pos) =>
                                updateProject(p => {
                                  p.garData.problems.branches[i].central = neg;
                                  if (pos && p.garData.rendement.axes[i]) {
                                    p.garData.rendement.axes[i].effet = pos;
                                  }
                                })
                              }
                              className="bg-white text-rose-950 border border-rose-300"
                              placeholder={t.arbre.chooseCentralProblem}
                            />
                          ) : (
                            <p className="font-bold text-[11px] text-rose-950">{branch.central}</p>
                          )}
                        </div>

                        <div className="space-y-2 pl-2 border-l-2 border-rose-200">
                          {(branch.details || []).map((detail, j) => {
                            const causesArr = ensureArray(detail.cause);
                            const besoinsArr = ensureArray(detail.besoin);
                            const actArr = ensureArray(activeProject.garData.rendement.axes[i]?.projets?.[j]?.activites);
                            const maxLen = Math.max(causesArr.length, actArr.length, besoinsArr.length, 1);
                            const causes = Array.from({ length: maxLen }, (_, idx) => causesArr[idx] || '');
                            const besoins = Array.from({ length: maxLen }, (_, idx) => besoinsArr[idx] || '');

                            return (
                              <div key={j} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
                                    {t.common.branch} {j + 1} · {t.arbre.contrainte} {j + 1}
                                  </span>
                                  {activeProject.isEditable && (
                                    <button
                                      onClick={() => handleDeleteProject(i, j, detail.contrainte)}
                                      className="text-rose-500 hover:text-rose-700 p-0.5"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>

                                {activeProject.isEditable ? (
                                  <BrainstormingSelect
                                    ideas={activeProject.garData?.brainstorming}
                                    value={detail.contrainte}
                                    onChange={(neg, pos) =>
                                      updateProject(p => {
                                        p.garData.problems.branches[i].details[j].contrainte = neg;
                                        if (pos && p.garData.rendement.axes[i]?.projets[j]) {
                                          p.garData.rendement.axes[i].projets[j].extrant = pos;
                                        }
                                      })
                                    }
                                    className="bg-white text-orange-950 border border-orange-300"
                                    placeholder={t.arbre.chooseConstraint}
                                  />
                                ) : (
                                  <p className="text-[11px] font-bold text-orange-950">{detail.contrainte}</p>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {causes.map((c, k) => (
                                    <div key={k} className="bg-white p-2 rounded border border-amber-200 space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase text-amber-800">
                                          {t.arbre.causeProfonde} {k + 1}
                                        </span>
                                        {activeProject.isEditable && causes.length > 1 && (
                                          <button
                                            onClick={() => handleRemoveCauseActivity(i, j, k)}
                                            className="text-rose-500 p-0.5"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        )}
                                      </div>
                                      {activeProject.isEditable ? (
                                        <BrainstormingSelect
                                          ideas={activeProject.garData?.brainstorming}
                                          value={c}
                                          onChange={(neg, pos) =>
                                            updateProject(p => {
                                              const arr = ensureArray(p.garData.problems.branches[i].details[j].cause);
                                              arr[k] = neg;
                                              p.garData.problems.branches[i].details[j].cause = arr;
                                              if (pos && p.garData.rendement.axes[i]?.projets[j]) {
                                                const actArr2 = ensureArray(p.garData.rendement.axes[i].projets[j].activites);
                                                actArr2[k] = pos;
                                                p.garData.rendement.axes[i].projets[j].activites = actArr2;
                                              }
                                            })
                                          }
                                          className="bg-amber-50/60 text-amber-950 border border-amber-300"
                                          placeholder={`${t.arbre.causeProfonde} ${k + 1}...`}
                                        />
                                      ) : (
                                        <p className="text-[10px] text-amber-950">{c}</p>
                                      )}

                                      <div className="pt-1 border-t border-slate-100">
                                        <span className="text-[9px] font-black uppercase text-slate-600 block mb-0.5">
                                          {t.arbre.besoin} {k + 1}
                                        </span>
                                        {activeProject.isEditable ? (
                                          <BrainstormingSelect
                                            ideas={activeProject.garData?.brainstorming}
                                            value={besoins[k]}
                                            onChange={neg =>
                                              updateProject(p => {
                                                const arr = ensureArray(p.garData.problems.branches[i].details[j].besoin);
                                                arr[k] = neg;
                                                p.garData.problems.branches[i].details[j].besoin = arr;
                                              })
                                            }
                                            className="bg-slate-50 text-slate-900 border border-slate-300"
                                            placeholder={`${t.arbre.besoin}...`}
                                          />
                                        ) : (
                                          <p className="text-[10px] text-slate-800">{besoins[k]}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {activeProject.isEditable && (
                                  <button
                                    onClick={() => handleAddCauseActivity(i, j)}
                                    className="w-full py-1 text-[9px] font-bold uppercase text-orange-700 bg-orange-50 hover:bg-orange-100 rounded border border-dashed border-orange-300 flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Plus size={10} /> {t.arbre.addCauseNeed}
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {activeProject.isEditable && (
                            <Button variant="secondary" icon={Plus} onClick={() => handleAddProject(i)} className="w-full">
                              {t.arbre.addBranch}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* VUE ARBRE GRAPHIQUE AUX ÉTIQUETTES COMPACTES */
                  <div className="bg-slate-200/60 rounded-xl border border-slate-300 p-3 sm:p-5 overflow-auto flex-1 min-h-[460px] custom-scrollbar">
                    <div
                      className="min-w-max flex justify-center pb-8 origin-top transition-transform"
                      style={{ transform: `scale(${treeZoom / 100})` }}
                    >
                      <div className="flex flex-col items-center">
                        {/* RACINE: CONSÉQUENCE GLOBALE */}
                        <div className="bg-rose-950 text-white p-2.5 sm:p-3 rounded-lg shadow-sm border border-rose-700 w-[195px] sm:w-[250px] md:w-[300px] text-center z-10 relative">
                          <h4 className="text-[8px] sm:text-[9px] uppercase font-black mb-1 text-rose-300 tracking-wider">
                            {t.arbre.consequenceGlobale}
                          </h4>
                          {activeProject.isEditable ? (
                            <BrainstormingSelect
                              ideas={activeProject.garData?.brainstorming}
                              value={activeProject.garData?.problems?.consequenceGlobale}
                              onChange={(neg, pos) =>
                                updateProject(p => {
                                  p.garData.problems.consequenceGlobale = neg;
                                  if (pos) p.garData.rendement.impact = pos;
                                })
                              }
                              className="bg-rose-900 text-white border border-rose-500 rounded"
                              placeholder={t.arbre.chooseImpact}
                            />
                          ) : (
                            <p className="font-bold text-[10px] sm:text-[11px]">{activeProject.garData?.problems?.consequenceGlobale}</p>
                          )}
                        </div>

                        {/* CONNECTEUR AJOUT AXE */}
                        <div className="flex flex-col items-center">
                          <div className="w-0.5 h-3.5 bg-slate-400"></div>
                          {activeProject.isEditable && (
                            <button
                              onClick={handleAddAxe}
                              className="bg-slate-700 text-white rounded-full p-1 hover:bg-slate-800 shadow-2xs cursor-pointer z-20 relative transition-transform hover:scale-110"
                              title={t.arbre.addServiceTooltip}
                            >
                              <Plus size={12} />
                            </button>
                          )}
                          {(activeProject.garData?.problems?.branches || []).length > 0 && (
                            <div className="w-0.5 h-3.5 bg-slate-400"></div>
                          )}
                        </div>

                        {/* AXES (SERVICES) */}
                        <div className="flex justify-center relative">
                          {(activeProject.garData?.problems?.branches || []).map((branch, i) => {
                            const branches = activeProject.garData.problems.branches || [];
                            const isOnlyAxe = branches.length === 1;
                            return (
                              <div key={i} className="flex flex-col items-center relative px-1.5 sm:px-2.5">
                                {isOnlyAxe ? (
                                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-400"></div>
                                ) : (
                                  <>
                                    {i !== 0 && <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-400"></div>}
                                    {i !== branches.length - 1 && (
                                      <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-400"></div>
                                    )}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-400"></div>
                                  </>
                                )}

                                <div className="bg-rose-50 text-rose-950 p-2 sm:p-2.5 rounded-lg shadow-2xs border border-rose-300 w-[180px] sm:w-[225px] md:w-[260px] text-center z-10 relative mt-5">
                                  <div className="flex justify-between items-center mb-1 gap-1">
                                    <div className="flex-1 flex items-center text-[8px] sm:text-[9px] uppercase font-black text-rose-700 min-w-0">
                                      {activeProject.isEditable ? (
                                        <input
                                          type="text"
                                          className="bg-white border border-rose-200 text-rose-900 px-1 py-0.5 rounded outline-none focus:border-rose-400 w-20 sm:w-24 font-black uppercase text-[8px] sm:text-[9px] mr-1 shadow-2xs"
                                          value={branch.axeName || `${t.common.service} ${i + 1}`}
                                          onChange={e => {
                                            const val = e.target.value;
                                            updateProject(p => {
                                              p.garData.problems.branches[i].axeName = val;
                                              if (p.garData.rendement.axes[i]) p.garData.rendement.axes[i].nom = val;
                                            });
                                          }}
                                        />
                                      ) : (
                                        <span className="mr-1 truncate">{branch.axeName || `${t.common.service} ${i + 1}`}</span>
                                      )}
                                      <span className="truncate">: {t.arbre.problemeCentral}</span>
                                    </div>
                                    {activeProject.isEditable && (
                                      <button
                                        onClick={() => handleDeleteAxe(i, branch.axeName)}
                                        className="text-rose-400 hover:text-rose-700 cursor-pointer shrink-0 p-0.5"
                                        title={t.arbre.deleteAxisTooltip}
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    )}
                                  </div>

                                  {activeProject.isEditable ? (
                                    <BrainstormingSelect
                                      ideas={activeProject.garData?.brainstorming}
                                      value={branch.central}
                                      onChange={(neg, pos) =>
                                        updateProject(p => {
                                          p.garData.problems.branches[i].central = neg;
                                          if (pos && p.garData.rendement.axes[i]) {
                                            p.garData.rendement.axes[i].effet = pos;
                                          }
                                        })
                                      }
                                      className="bg-white text-rose-950 border border-rose-300 rounded"
                                      placeholder={t.arbre.centralProblemShort}
                                    />
                                  ) : (
                                    <p className="font-bold text-[10px]">{branch.central}</p>
                                  )}
                                </div>

                                {/* CONNECTEUR AJOUT PROJET */}
                                <div className="flex flex-col items-center">
                                  <div className="w-0.5 h-3.5 bg-slate-300"></div>
                                  {activeProject.isEditable && (
                                    <button
                                      onClick={() => handleAddProject(i)}
                                      className="bg-slate-600 text-white rounded-full p-1 hover:bg-slate-700 shadow-2xs cursor-pointer z-20 relative transition-transform hover:scale-110"
                                      title={t.arbre.addSubProblemTooltip}
                                    >
                                      <Plus size={11} />
                                    </button>
                                  )}
                                  {(branch.details || []).length > 0 && <div className="w-0.5 h-3.5 bg-slate-300"></div>}
                                </div>

                                {/* SOUS-PROBLÈMES / CONTRAINTES */}
                                <div className="flex justify-center relative">
                                  {(branch.details || []).map((detail, j) => {
                                    const details = branch.details || [];
                                    const isOnlyDetail = details.length === 1;
                                    const causesArr = ensureArray(detail.cause);
                                    const besoinsArr = ensureArray(detail.besoin);
                                    const actArr = ensureArray(
                                      activeProject.garData.rendement.axes[i]?.projets?.[j]?.activites
                                    );
                                    const maxLen = Math.max(causesArr.length, actArr.length, besoinsArr.length, 1);
                                    const causes = Array.from({ length: maxLen }, (_, idx) => causesArr[idx] || '');
                                    const besoins = Array.from({ length: maxLen }, (_, idx) => besoinsArr[idx] || '');

                                    return (
                                      <div key={j} className="flex flex-col items-center relative px-1 sm:px-1.5">
                                        {isOnlyDetail ? (
                                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-300"></div>
                                        ) : (
                                          <>
                                            {j !== 0 && (
                                              <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300"></div>
                                            )}
                                            {j !== details.length - 1 && (
                                              <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300"></div>
                                            )}
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-300"></div>
                                          </>
                                        )}

                                        <div className="bg-white p-2 sm:p-2.5 rounded-lg shadow-2xs border border-slate-300 w-auto inline-flex flex-col items-center z-10 relative mt-5">
                                          {activeProject.isEditable && (
                                            <div className="absolute -top-2 -right-2 z-20">
                                              <button
                                                onClick={() => handleDeleteProject(i, j, detail.contrainte)}
                                                className="bg-white text-rose-500 rounded-full p-1 hover:bg-rose-50 border border-rose-200 shadow-2xs cursor-pointer"
                                                title={t.arbre.deleteBranchTooltip}
                                              >
                                                <Trash2 size={10} />
                                              </button>
                                            </div>
                                          )}

                                          <div className="text-[8px] font-black uppercase text-slate-500 tracking-wider mb-1.5 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                            {t.common.branch} {j + 1}
                                          </div>

                                          {/* CONTRAINTE */}
                                          <div className="bg-orange-50/70 p-1.5 sm:p-2 rounded border border-orange-200 w-[150px] sm:w-[175px] md:w-[195px] text-center z-10 shadow-2xs">
                                            <h5 className="text-[8px] uppercase font-black text-orange-700 mb-0.5">
                                              {t.arbre.contrainte} {j + 1}
                                            </h5>
                                            {activeProject.isEditable ? (
                                              <BrainstormingSelect
                                                ideas={activeProject.garData?.brainstorming}
                                                value={detail.contrainte}
                                                onChange={(neg, pos) =>
                                                  updateProject(p => {
                                                    p.garData.problems.branches[i].details[j].contrainte = neg;
                                                    if (pos && p.garData.rendement.axes[i]?.projets[j]) {
                                                      p.garData.rendement.axes[i].projets[j].extrant = pos;
                                                    }
                                                  })
                                                }
                                                className="bg-white text-orange-950 border border-orange-300 rounded"
                                                placeholder={`${t.arbre.contrainte}...`}
                                              />
                                            ) : (
                                              <p className="text-[10px] font-bold text-orange-950">{detail.contrainte}</p>
                                            )}

                                            {activeProject.isEditable && (
                                              <button
                                                onClick={() => handleAddCauseActivity(i, j)}
                                                className="mt-1.5 text-[8px] font-bold uppercase text-orange-700 bg-orange-100 hover:bg-orange-200 px-1.5 py-1 rounded w-full flex items-center justify-center gap-0.5 border border-orange-300 border-dashed cursor-pointer"
                                              >
                                                <Plus size={9} /> {t.arbre.causeNeedShort}
                                              </button>
                                            )}
                                          </div>

                                          <div className="w-0.5 h-3.5 bg-slate-300"></div>

                                          {/* CAUSES ET BESOINS */}
                                          <div className="flex justify-center relative w-full">
                                            {causes.map((c, k) => (
                                              <div key={k} className="flex flex-col items-center relative px-1">
                                                {causes.length > 1 && (
                                                  <>
                                                    {k !== 0 && (
                                                      <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300"></div>
                                                    )}
                                                    {k !== causes.length - 1 && (
                                                      <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300"></div>
                                                    )}
                                                  </>
                                                )}
                                                <div className="w-0.5 h-3.5 bg-slate-300"></div>

                                                <div className="bg-amber-50/70 p-1.5 sm:p-2 rounded border border-amber-200 w-[135px] sm:w-[155px] md:w-[175px] text-center z-10 relative group shadow-2xs">
                                                  {activeProject.isEditable && causes.length > 1 && (
                                                    <button
                                                      onClick={() => handleRemoveCauseActivity(i, j, k)}
                                                      className="absolute -top-1.5 -right-1.5 bg-white text-rose-500 rounded-full p-0.5 border border-rose-200 cursor-pointer z-20 shadow-2xs"
                                                      title={t.arbre.deleteCauseTooltip}
                                                    >
                                                      <Trash2 size={9} />
                                                    </button>
                                                  )}
                                                  <h5 className="text-[8px] uppercase font-black text-amber-800 mb-0.5">
                                                    {t.arbre.causeProfonde} {k + 1}
                                                  </h5>
                                                  {activeProject.isEditable ? (
                                                    <BrainstormingSelect
                                                      ideas={activeProject.garData?.brainstorming}
                                                      value={c}
                                                      onChange={(neg, pos) =>
                                                        updateProject(p => {
                                                          const arr = ensureArray(
                                                            p.garData.problems.branches[i].details[j].cause
                                                          );
                                                          arr[k] = neg;
                                                          p.garData.problems.branches[i].details[j].cause = arr;
                                                          if (pos && p.garData.rendement.axes[i]?.projets[j]) {
                                                            const actArr = ensureArray(
                                                              p.garData.rendement.axes[i].projets[j].activites
                                                            );
                                                            actArr[k] = pos;
                                                            p.garData.rendement.axes[i].projets[j].activites = actArr;
                                                          }
                                                        })
                                                      }
                                                      className="bg-white text-amber-950 border border-amber-300 rounded"
                                                      placeholder={`${t.arbre.causeProfonde} ${k + 1}...`}
                                                    />
                                                  ) : (
                                                    <p className="text-[10px] font-medium text-amber-950">{c}</p>
                                                  )}
                                                </div>

                                                <div className="w-0.5 h-3.5 bg-slate-300"></div>

                                                <div className="bg-slate-50 p-1.5 sm:p-2 rounded border border-slate-200 w-[135px] sm:w-[155px] md:w-[175px] text-center z-10 relative shadow-2xs">
                                                  <h5 className="text-[8px] uppercase font-black text-slate-700 mb-0.5">
                                                    {t.arbre.besoin} {k + 1}
                                                  </h5>
                                                  {activeProject.isEditable ? (
                                                    <BrainstormingSelect
                                                      ideas={activeProject.garData?.brainstorming}
                                                      value={besoins[k]}
                                                      onChange={neg =>
                                                        updateProject(p => {
                                                          const arr = ensureArray(
                                                            p.garData.problems.branches[i].details[j].besoin
                                                          );
                                                          arr[k] = neg;
                                                          p.garData.problems.branches[i].details[j].besoin = arr;
                                                        })
                                                      }
                                                      className="bg-white text-slate-900 border border-slate-300 rounded"
                                                      placeholder={`${t.arbre.besoin}...`}
                                                    />
                                                  ) : (
                                                    <p className="text-[10px] font-medium text-slate-800">{besoins[k]}</p>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

          {/* ONGLET : ARBRE À SOLUTIONS (AVEC TRAITEMENT SIMULTANÉ EFFET + BRANCHE DE MÊME LIGNÉE) */}
          {activeTab === 'solutions' &&
            (!activeProject ? (
              <NoProjectScreen setActiveTab={setActiveTab} onImportClick={triggerImportJSON} lang={lang} />
            ) : (
              <div className="flex-1 flex flex-col w-full max-w-full mx-auto space-y-2.5">
                <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2.5 sm:p-3 flex flex-wrap justify-between items-center gap-2 no-print">
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">{t.solutions.title}</h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">{t.solutions.subtitle}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setMobileTreeLayout('tree')}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold cursor-pointer transition-colors ${
                          mobileTreeLayout === 'tree'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <GitFork size={12} />
                        <span>{t.common.treeView}</span>
                      </button>
                      <button
                        onClick={() => setMobileTreeLayout('list')}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold cursor-pointer transition-colors ${
                          mobileTreeLayout === 'list'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LayoutList size={12} />
                        <span>{t.common.listView}</span>
                      </button>
                    </div>

                    {mobileTreeLayout === 'tree' && (
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          onClick={() => setTreeZoom(z => Math.max(50, z - 15))}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded cursor-pointer"
                          title={t.common.zoomOut}
                        >
                          <ZoomOut size={13} />
                        </button>
                        <button
                          onClick={() => setTreeZoom(100)}
                          className="px-1.5 text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                          title={t.common.zoomReset}
                        >
                          {treeZoom}%
                        </button>
                        <button
                          onClick={() => setTreeZoom(z => Math.min(130, z + 15))}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded cursor-pointer"
                          title={t.common.zoomIn}
                        >
                          <ZoomIn size={13} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700">{t.budgetLabel}</span>
                      <span className="text-[11px] sm:text-xs font-black font-mono text-emerald-900 tabular-nums">
                        {formatAmount(totalActiveBudget, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VUE LISTE MOBILE / TABLETTE */}
                {mobileTreeLayout === 'list' ? (
                  <div className="space-y-3">
                    <div className="bg-emerald-900 text-white p-3 rounded-xl shadow-2xs border border-emerald-600">
                      <h4 className="text-[9px] uppercase font-black mb-1 text-emerald-200 tracking-widest">
                        1. {t.solutions.impactGlobal}
                      </h4>
                      <div className="font-bold text-[11px] bg-emerald-950/60 p-2 rounded border border-emerald-700 leading-relaxed">
                        {activeProject.garData?.rendement?.impact || (
                          <span className="text-emerald-300 italic">{t.solutions.selectConsequenceHint}</span>
                        )}
                      </div>
                    </div>

                    {(activeProject.garData?.rendement?.axes || []).map((axe, i) => {
                      const isFocusedAxe = (filterContext.focusedAxes || []).includes(i);
                      return (
                        <div key={i} className={`bg-white rounded-xl border p-3 space-y-2.5 shadow-2xs ${isFocusedAxe ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-emerald-200'}`}>
                          <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[9px] uppercase font-black text-emerald-800">
                                {axe.nom || `${t.common.service} ${i + 1}`} : {t.solutions.expectedEffect}
                              </span>
                              <button
                                onClick={() => {
                                  const currentAxes = filterContext.focusedAxes || [];
                                  const newAxes = isFocusedAxe
                                    ? currentAxes.filter(a => a !== i)
                                    : [...currentAxes, i];
                                  applyCombinedFocus(newAxes, filterContext.focusedBranches || []);
                                }}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                                  isFocusedAxe
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-white text-emerald-700 border-emerald-300'
                                }`}
                              >
                                {isFocusedAxe ? t.solutions.effectFocusedBadge : t.solutions.focusEffectBtn}
                              </button>
                            </div>
                            <p className="font-bold text-[11px] text-emerald-950">
                              {axe.effet || t.solutions.linkCentralHint}
                            </p>
                          </div>

                          <div className="space-y-2.5 pl-2 border-l-2 border-emerald-200">
                            {(axe.projets || []).map((proj, j) => {
                              const isFocusedBranch = (filterContext.focusedBranches || []).some(
                                f => f.axeIndex === i && f.projetIndex === j
                              );
                              const activites = Array.from(
                                {
                                  length: Math.max(
                                    ensureArray(activeProject.garData.problems?.branches?.[i]?.details?.[j]?.cause).length,
                                    ensureArray(proj.activites).length,
                                    1
                                  )
                                },
                                (_, idx) => ensureArray(proj.activites)[idx] || ''
                              );

                              return (
                                <div key={j} className={`bg-slate-50 p-2.5 rounded-lg border space-y-2 ${isFocusedBranch ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'}`}>
                                  <div className="bg-teal-50 p-2 rounded border border-teal-200">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="text-[9px] font-black uppercase text-teal-800">
                                        {t.common.branch} {j + 1} · {t.solutions.extrantIndexed(j + 1)}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const currentBranches = filterContext.focusedBranches || [];
                                          const newBranches = isFocusedBranch
                                            ? currentBranches.filter(f => !(f.axeIndex === i && f.projetIndex === j))
                                            : [...currentBranches, { axeIndex: i, projetIndex: j }];
                                          applyCombinedFocus(filterContext.focusedAxes || [], newBranches);
                                        }}
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                                          isFocusedBranch
                                            ? 'bg-emerald-600 text-white border-emerald-700'
                                            : 'bg-white text-teal-800 border-teal-300'
                                        }`}
                                      >
                                        {isFocusedBranch ? t.solutions.branchFocusedBadge : t.solutions.focusBranchBtn}
                                      </button>
                                    </div>
                                    <p className="text-[11px] font-bold text-teal-950">
                                      {proj.extrant || t.solutions.derivedFromConstraint}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {activites.map((act, k) => (
                                      <div key={k} className="bg-white p-2.5 rounded border border-slate-200 space-y-2">
                                        <div className="bg-emerald-50/70 p-2 rounded border border-emerald-200">
                                          <span className="text-[9px] font-black uppercase text-emerald-800 block">
                                            {t.solutions.activite} {k + 1}
                                          </span>
                                          <p className="text-[10px] font-medium text-emerald-950">
                                            {act || t.solutions.derivedFromCause}
                                          </p>
                                        </div>

                                        <div className="space-y-1.5">
                                          <div>
                                            <h6 className="text-[8px] uppercase font-bold text-slate-500 mb-0.5">
                                              {t.solutions.rhFull}
                                            </h6>
                                            <EditableResourceList
                                              isEditable={activeProject.isEditable}
                                              items={getSafe2D(proj?.intrants_rh, k)}
                                              onChange={v => updateIntrants(i, j, k, 'intrants_rh', v)}
                                              placeholderLabel={t.solutions.rolePlaceholder}
                                              lang={lang}
                                              currency={currency}
                                            />
                                          </div>
                                          <div>
                                            <h6 className="text-[8px] uppercase font-bold text-slate-500 mb-0.5">
                                              {t.solutions.mat}
                                            </h6>
                                            <EditableResourceList
                                              isEditable={activeProject.isEditable}
                                              items={getSafe2D(proj?.intrants_mat, k)}
                                              onChange={v => updateIntrants(i, j, k, 'intrants_mat', v)}
                                              placeholderLabel={t.solutions.equipPlaceholder}
                                              lang={lang}
                                              currency={currency}
                                            />
                                          </div>
                                          <div className="pt-1 border-t border-slate-100">
                                            {renderActivityCost(proj, k, lang, currency)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* VUE ARBRE GRAPHIQUE DES SOLUTIONS AUX ÉTIQUETTES RÉDUITES */
                  <div className="bg-slate-200/60 rounded-xl border border-slate-300 p-3 sm:p-5 overflow-auto flex-1 min-h-[460px] custom-scrollbar">
                    <div
                      className="min-w-max flex justify-center pb-8 origin-top transition-transform"
                      style={{ transform: `scale(${treeZoom / 100})` }}
                    >
                      <div className="flex flex-col items-center">
                        {/* RACINE: IMPACT GLOBAL */}
                        <div className="bg-emerald-900 text-white p-2.5 sm:p-3 rounded-lg shadow-sm border border-emerald-600 w-[195px] sm:w-[250px] md:w-[300px] text-center z-10 relative">
                          <h4 className="text-[8px] sm:text-[9px] uppercase font-black mb-1 text-emerald-200 tracking-wider">
                            {t.solutions.impactGlobal}
                          </h4>
                          <div className="font-bold text-[10px] sm:text-[11px] bg-emerald-950/60 p-1.5 rounded border border-emerald-700 leading-snug">
                            {activeProject.garData?.rendement?.impact || (
                              <span className="text-emerald-300 italic">
                                {t.solutions.selectConsequenceHint}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CONNECTEUR AXE */}
                        {(activeProject.garData?.rendement?.axes || []).length > 0 && (
                          <div className="w-0.5 h-6 bg-slate-400"></div>
                        )}

                        <div className="flex justify-center relative">
                          {(activeProject.garData?.rendement?.axes || []).map((axe, i) => {
                            const axes = activeProject.garData.rendement.axes || [];
                            const isOnlyAxe = axes.length === 1;

                            const isFocused = (filterContext.focusedAxes || []).includes(i);
                            const dependentAxes: number[] = [];
                            axes.forEach((_, aIdx) => {
                              if (aIdx === i) return;
                              const targetRisk = (activeProject.garData.risks || []).find(
                                r => r.axe === aIdx + 1 && r.niveau === 'EFFET'
                              );
                              if (
                                targetRisk &&
                                (targetRisk.linkedAxeIndex === i ||
                                  (targetRisk.hypothese && targetRisk.hypothese === axe.effet))
                              ) {
                                dependentAxes.push(aIdx);
                              }
                            });

                            return (
                              <div key={i} className="flex flex-col items-center relative px-1.5 sm:px-2.5">
                                {isOnlyAxe ? (
                                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-400"></div>
                                ) : (
                                  <>
                                    {i !== 0 && <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-400"></div>}
                                    {i !== axes.length - 1 && (
                                      <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-400"></div>
                                    )}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-400"></div>
                                  </>
                                )}

                                <div
                                  className={`bg-white text-slate-900 p-2 sm:p-2.5 rounded-lg shadow-2xs border ${
                                    isFocused
                                      ? 'border-emerald-600 ring-2 ring-emerald-200'
                                      : dependentAxes.length > 0
                                      ? 'border-rose-400 ring-1 ring-rose-100'
                                      : 'border-slate-300'
                                  } w-[180px] sm:w-[225px] md:w-[260px] text-center z-10 relative mt-5 transition-all`}
                                >
                                  <div className="flex justify-between items-center mb-1 gap-1">
                                    <div className="flex-1 flex items-center text-[8px] sm:text-[9px] uppercase font-black text-emerald-800 truncate">
                                      <span className="mr-1 truncate">{axe.nom || `${t.common.service} ${i + 1}`}</span>
                                      <span>: {t.solutions.effetShort}</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-1 w-full mb-1.5">
                                    {isFocused && (
                                      <div className="bg-emerald-100 text-emerald-900 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-300 text-center uppercase flex items-center justify-between">
                                        <span>{t.solutions.effectFocusedBadge}</span>
                                        <button
                                          onClick={() => {
                                            const newAxes = (filterContext.focusedAxes || []).filter(f => f !== i);
                                            applyCombinedFocus(newAxes, filterContext.focusedBranches || []);
                                          }}
                                          className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer"
                                          title={t.solutions.unfocusEffectTooltip}
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    )}
                                    {dependentAxes.map(depIdx => (
                                      <div
                                        key={depIdx}
                                        className="bg-rose-50 text-rose-800 text-[8px] font-bold px-1.5 py-0.5 rounded border border-rose-200 flex justify-between items-center"
                                      >
                                        <span className="truncate">
                                          {t.solutions.conditionLabel} {axes[depIdx].nom || `${t.common.service} ${depIdx + 1}`}
                                        </span>
                                        {activeProject.isEditable && (
                                          <button
                                            onClick={() => {
                                              updateRisk(depIdx + 1, 'EFFET', 'hypothese', '');
                                              updateRisk(depIdx + 1, 'EFFET', 'linkedAxeIndex', null);
                                            }}
                                            className="text-rose-500 hover:text-rose-800 cursor-pointer p-0.5 shrink-0"
                                            title={t.common.delete}
                                          >
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  <div className="mb-1.5 w-full text-left">
                                    <select
                                      className="w-full bg-slate-50 border border-slate-300 text-[9px] font-bold rounded p-1 outline-none cursor-pointer hover:border-emerald-500 transition-all"
                                      value=""
                                      onChange={e => {
                                        const val = e.target.value;
                                        if (!val) return;
                                        if (val === 'focus_axe') {
                                          const currentFocused = filterContext.focusedAxes || [];
                                          const newFocused = currentFocused.includes(i)
                                            ? currentFocused
                                            : [...currentFocused, i];
                                          applyCombinedFocus(newFocused, filterContext.focusedBranches || []);
                                        } else if (val === 'unfocus_axe') {
                                          const currentFocused = filterContext.focusedAxes || [];
                                          const newFocused = currentFocused.filter(f => f !== i);
                                          applyCombinedFocus(newFocused, filterContext.focusedBranches || []);
                                        } else if (val.startsWith('add_hypo_axe_')) {
                                          const targetIdx = parseInt(val.split('_')[3]);
                                          const textHypo = `${axe.effet || t.common.undefinedText}`;
                                          updateRisk(targetIdx + 1, 'EFFET', 'hypothese', textHypo);
                                          updateRisk(targetIdx + 1, 'EFFET', 'linkedAxeIndex', i);
                                        }
                                        e.target.value = '';
                                      }}
                                    >
                                      <option value="">{t.solutions.effectActionsPlaceholder}</option>
                                      <optgroup label={t.solutions.studyFocusGroup}>
                                        {isFocused ? (
                                          <option value="unfocus_axe">{t.solutions.unfocusEffectOption}</option>
                                        ) : (
                                          <option value="focus_axe">{t.solutions.focusEffectOption}</option>
                                        )}
                                      </optgroup>
                                      {activeProject.isEditable && axes.length > 1 && (
                                        <optgroup label={t.solutions.hypothesisGroup}>
                                          {axes.map((a, aIdx) => {
                                            if (aIdx === i) return null;
                                            const targetRisk = (activeProject.garData.risks || []).find(
                                              r => r.axe === aIdx + 1 && r.niveau === 'EFFET'
                                            );
                                            const isAlreadyConditioned =
                                              targetRisk?.linkedAxeIndex !== undefined &&
                                              targetRisk?.linkedAxeIndex !== null;
                                            if (!dependentAxes.includes(aIdx) && !isAlreadyConditioned) {
                                              return (
                                                <option key={aIdx} value={`add_hypo_axe_${aIdx}`}>
                                                  {a.nom || `${t.common.service} ${aIdx + 1}`}
                                                </option>
                                              );
                                            }
                                            return null;
                                          })}
                                        </optgroup>
                                      )}
                                    </select>
                                  </div>

                                  <div className="font-bold text-[10px] bg-emerald-50 text-emerald-950 p-1.5 rounded border border-emerald-200 leading-snug">
                                    {axe.effet || (
                                      <span className="text-slate-400 italic">
                                        {t.solutions.derivedFromCentral}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* CONNECTEUR PROJET */}
                                {(axe.projets || []).length > 0 && <div className="w-0.5 h-5 bg-slate-300"></div>}

                                {/* PROJETS / EXTRANTS */}
                                <div className="flex justify-center relative">
                                  {(axe.projets || []).map((proj, j) => {
                                    const projs = axe.projets || [];
                                    const isOnlyProj = projs.length === 1;
                                    const isFocusedBranch = (filterContext.focusedBranches || []).some(
                                      f => f.axeIndex === i && f.projetIndex === j
                                    );

                                    const dependentBranches: number[] = [];
                                    projs.forEach((_, pIndex) => {
                                      if (pIndex === j) return;
                                      const targetRisk = (activeProject.garData.risks || []).find(
                                        r => r.axe === i + 1 && r.niveau === `EXTRANT ${pIndex + 1}`
                                      );
                                      if (targetRisk && targetRisk.linkedBranchIndex === j) {
                                        dependentBranches.push(pIndex);
                                      }
                                    });

                                    const activites = Array.from(
                                      {
                                        length: Math.max(
                                          ensureArray(
                                            activeProject.garData.problems?.branches?.[i]?.details?.[j]?.cause
                                          ).length,
                                          ensureArray(proj.activites).length,
                                          1
                                        )
                                      },
                                      (_, idx) => ensureArray(proj.activites)[idx] || ''
                                    );

                                    return (
                                      <div key={j} className="flex flex-col items-center relative px-1 sm:px-1.5">
                                        {isOnlyProj ? (
                                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-300"></div>
                                        ) : (
                                          <>
                                            {j !== 0 && (
                                              <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300"></div>
                                            )}
                                            {j !== projs.length - 1 && (
                                              <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300"></div>
                                            )}
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-300"></div>
                                          </>
                                        )}

                                        <div
                                          className={`bg-white p-2 sm:p-2.5 rounded-lg shadow-2xs border ${
                                            isFocusedBranch
                                              ? 'border-emerald-600 ring-2 ring-emerald-200'
                                              : dependentBranches.length > 0
                                              ? 'border-rose-400 ring-1 ring-rose-100'
                                              : 'border-slate-300'
                                          } w-auto inline-flex flex-col items-center z-10 relative mt-5 transition-all`}
                                        >
                                          <div className="text-[8px] font-black uppercase text-slate-500 tracking-wider mb-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                            {t.common.branch} {j + 1}
                                          </div>

                                          <div className="flex flex-col gap-1 w-[150px] sm:w-[175px] md:w-[195px] mb-1.5">
                                            {isFocusedBranch && (
                                              <div className="bg-emerald-100 text-emerald-900 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-300 text-center uppercase flex items-center justify-between">
                                                <span>{t.solutions.branchFocusedBadge}</span>
                                                <button
                                                  onClick={() => {
                                                    const newBranches = (filterContext.focusedBranches || []).filter(
                                                      f => !(f.axeIndex === i && f.projetIndex === j)
                                                    );
                                                    applyCombinedFocus(filterContext.focusedAxes || [], newBranches);
                                                  }}
                                                  className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer"
                                                  title={t.solutions.unfocusBranchOption}
                                                >
                                                  <X size={10} />
                                                </button>
                                              </div>
                                            )}
                                            {dependentBranches.map(depIdx => (
                                              <div
                                                key={depIdx}
                                                className="bg-rose-50 text-rose-800 text-[8px] font-bold px-1.5 py-0.5 rounded border border-rose-200 flex justify-between items-center"
                                              >
                                                <span>
                                                  {t.solutions.conditionBranchLabel} {depIdx + 1}
                                                </span>
                                                {activeProject.isEditable && (
                                                  <button
                                                    onClick={() => {
                                                      const targetNiveau = `EXTRANT ${depIdx + 1}`;
                                                      updateRisk(i + 1, targetNiveau, 'hypothese', '');
                                                      updateRisk(i + 1, targetNiveau, 'linkedBranchIndex', null);
                                                    }}
                                                    className="text-rose-500 hover:text-rose-800 cursor-pointer p-0.5"
                                                  >
                                                    <X size={10} />
                                                  </button>
                                                )}
                                              </div>
                                            ))}
                                          </div>

                                          <div className="mb-2 w-[150px] sm:w-[175px] md:w-[195px]">
                                            <select
                                              className="w-full bg-slate-50 border border-slate-300 text-[9px] font-bold rounded p-1 outline-none cursor-pointer hover:border-emerald-500 transition-all"
                                              value=""
                                              onChange={e => {
                                                const val = e.target.value;
                                                if (!val) return;
                                                if (val === 'focus') {
                                                  const currentFocused = filterContext.focusedBranches || [];
                                                  const exists = currentFocused.some(
                                                    f => f.axeIndex === i && f.projetIndex === j
                                                  );
                                                  const newFocused = exists
                                                    ? currentFocused
                                                    : [...currentFocused, { axeIndex: i, projetIndex: j }];
                                                  applyCombinedFocus(filterContext.focusedAxes || [], newFocused);
                                                } else if (val === 'unfocus') {
                                                  const currentFocused = filterContext.focusedBranches || [];
                                                  const newFocused = currentFocused.filter(
                                                    f => !(f.axeIndex === i && f.projetIndex === j)
                                                  );
                                                  applyCombinedFocus(filterContext.focusedAxes || [], newFocused);
                                                } else if (val.startsWith('add_hypo_')) {
                                                  const targetIdx = parseInt(val.split('_')[2]);
                                                  const targetNiveau = `EXTRANT ${targetIdx + 1}`;
                                                  const textHypo = `${proj.extrant || t.common.undefinedText}`;
                                                  updateRisk(i + 1, targetNiveau, 'hypothese', textHypo);
                                                  updateRisk(i + 1, targetNiveau, 'linkedBranchIndex', j);
                                                }
                                                e.target.value = '';
                                              }}
                                            >
                                              <option value="">
                                                {t.solutions.branchActionsPlaceholder} {j + 1}...
                                              </option>
                                              <optgroup label={t.solutions.studyFocusGroup}>
                                                {isFocusedBranch ? (
                                                  <option value="unfocus">{t.solutions.unfocusBranchOption}</option>
                                                ) : (
                                                  <option value="focus">{t.solutions.focusBranchOption}</option>
                                                )}
                                              </optgroup>
                                              {activeProject.isEditable && projs.length > 1 && (
                                                <optgroup label={t.solutions.hypothesisGroup}>
                                                  {projs.map((_p, pIndex) => {
                                                    if (pIndex === j) return null;
                                                    const targetRisk = (activeProject.garData.risks || []).find(
                                                      r => r.axe === i + 1 && r.niveau === `EXTRANT ${pIndex + 1}`
                                                    );
                                                    const isAlreadyConditioned =
                                                      targetRisk?.linkedBranchIndex !== undefined &&
                                                      targetRisk?.linkedBranchIndex !== null;
                                                    if (!dependentBranches.includes(pIndex) && !isAlreadyConditioned) {
                                                      return (
                                                        <option key={pIndex} value={`add_hypo_${pIndex}`}>
                                                          {t.common.branch} {pIndex + 1}
                                                        </option>
                                                      );
                                                    }
                                                    return null;
                                                  })}
                                                </optgroup>
                                              )}
                                            </select>
                                          </div>

                                          {/* EXTRANT (LIVRABLE) */}
                                          <div className="bg-teal-50/70 p-1.5 sm:p-2 rounded border border-teal-200 w-[150px] sm:w-[175px] md:w-[195px] text-center z-10 shadow-2xs">
                                            <h5 className="text-[8px] uppercase font-black text-teal-800 mb-0.5">
                                              {t.solutions.extrantIndexed(j + 1)}
                                            </h5>
                                            <p className="text-[10px] font-bold text-teal-950 bg-white/80 p-1.5 rounded border border-teal-200 leading-snug">
                                              {proj.extrant || (
                                                <span className="text-slate-400 italic">
                                                  {t.solutions.derivedFromConstraint}
                                                </span>
                                              )}
                                            </p>
                                          </div>

                                          <div className="w-0.5 h-3.5 bg-slate-300"></div>

                                          {/* ACTIVITÉS & INTRANTS */}
                                          <div className="flex justify-center relative w-full">
                                            {activites.map((act, k) => (
                                              <div key={k} className="flex flex-col items-center relative px-1">
                                                {activites.length > 1 && (
                                                  <>
                                                    {k !== 0 && (
                                                      <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300"></div>
                                                    )}
                                                    {k !== activites.length - 1 && (
                                                      <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300"></div>
                                                    )}
                                                  </>
                                                )}
                                                <div className="w-0.5 h-3.5 bg-slate-300"></div>

                                                <div className="bg-emerald-50/70 p-1.5 sm:p-2 rounded border border-emerald-200 w-[145px] sm:w-[170px] md:w-[190px] text-center z-10 relative shadow-2xs">
                                                  <h5 className="text-[8px] uppercase font-black text-emerald-800 mb-0.5">
                                                    {t.solutions.activite} {k + 1}
                                                  </h5>
                                                  <p className="text-[10px] font-medium text-emerald-950 bg-white/80 p-1.5 rounded border border-emerald-200 leading-snug">
                                                    {act || (
                                                      <span className="text-slate-400 italic">
                                                        {t.solutions.derivedFromCause}
                                                      </span>
                                                    )}
                                                  </p>
                                                </div>

                                                <div className="w-0.5 h-3.5 bg-slate-300"></div>

                                                <div className="bg-slate-50 p-2 rounded border border-slate-300 w-[145px] sm:w-[170px] md:w-[190px] text-left z-10 shadow-2xs relative">
                                                  <h5 className="text-[8px] uppercase font-black text-slate-800 mb-1.5 text-center border-b border-slate-200 pb-0.5">
                                                    {t.solutions.intrants} #{k + 1}
                                                  </h5>
                                                  <div className="space-y-2">
                                                    <div>
                                                      <h6 className="text-[7px] uppercase font-bold text-slate-500 mb-0.5">
                                                        {t.solutions.rh}
                                                      </h6>
                                                      <EditableResourceList
                                                        isEditable={activeProject.isEditable}
                                                        items={getSafe2D(proj?.intrants_rh, k)}
                                                        onChange={v =>
                                                          updateIntrants(i, j, k, 'intrants_rh', v)
                                                        }
                                                        placeholderLabel={t.solutions.rolePlaceholder}
                                                        lang={lang}
                                                        currency={currency}
                                                      />
                                                    </div>
                                                    <div>
                                                      <h6 className="text-[7px] uppercase font-bold text-slate-500 mb-0.5">
                                                        {t.solutions.mat}
                                                      </h6>
                                                      <EditableResourceList
                                                        isEditable={activeProject.isEditable}
                                                        items={getSafe2D(proj?.intrants_mat, k)}
                                                        onChange={v =>
                                                          updateIntrants(i, j, k, 'intrants_mat', v)
                                                        }
                                                        placeholderLabel={t.solutions.equipPlaceholder}
                                                        lang={lang}
                                                        currency={currency}
                                                      />
                                                    </div>
                                                    <div className="pt-1.5 border-t border-slate-200">
                                                      <h6 className="text-[7px] uppercase font-bold text-emerald-800 mb-0.5 text-center">
                                                        {t.solutions.activityBudget}
                                                      </h6>
                                                      {renderActivityCost(proj, k, lang, currency)}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

          {/* ONGLET : REGISTRE PARTIES PRENANTES */}
          {activeTab === 'registre_parties' &&
            (!activeProject ? (
              <NoProjectScreen setActiveTab={setActiveTab} onImportClick={triggerImportJSON} lang={lang} />
            ) : (
              <div className="flex-1 flex flex-col w-full max-w-full mx-auto space-y-3">
                <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">{t.stakeholders.title}</h2>
                    <p className="text-[10px] sm:text-xs text-slate-500">{t.stakeholders.subtitle}</p>
                  </div>
                  {hasAnyFocus && (
                    <div className="flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Filter size={12} />
                      <span className="font-bold">{t.stakeholders.filteredByFocus}</span>
                    </div>
                  )}
                </div>

                {/* VUE CARTES COMPACTES SUR MOBILE (< md) */}
                <div className="md:hidden space-y-3">
                  {(activeProject.garData.rendement?.axes || []).map((axe, i) => {
                    if (!isAxeFocused(i)) return null;
                    const cats = [
                      { key: 'beneficiaires', label: t.stakeholders.beneficiaires },
                      { key: 'instCentralises', label: t.stakeholders.instCentralises },
                      { key: 'instDecentralises', label: t.stakeholders.instDecentralises },
                      { key: 'operateursTechniques', label: t.stakeholders.operateursTechniques },
                      { key: 'ptf', label: t.stakeholders.ptf }
                    ];

                    return (
                      <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="bg-slate-800 text-white px-3 py-2 font-black text-[11px] uppercase tracking-wider">
                          {axe?.nom || `${t.common.service} ${i + 1}`}
                        </div>
                        <div className="p-2.5 space-y-3">
                          {(axe.projets || []).map((proj, pIdx) => {
                            if (!isProjFocused(i, pIdx)) return null;
                            return (
                              <div key={pIdx} className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-100 px-2.5 py-1.5 font-bold text-slate-700 text-[10px] uppercase border-b border-slate-200">
                                  {t.common.project} {pIdx + 1} : {proj?.extrant || '-'}
                                </div>
                                <div className="p-2.5 space-y-2.5 bg-white">
                                  {cats.map(cat => {
                                    const actors = (activeProject.garData.stakeholders?.[cat.key] || [])
                                      .map((a, idx) => ({ ...a, absIdx: idx }))
                                      .filter(a => a.axe === i + 1 && a.projetIndex === pIdx);
                                    return (
                                      <div key={cat.key} className="space-y-1">
                                        <div className="text-[9px] font-black uppercase text-slate-500">
                                          {cat.label}
                                        </div>
                                        {actors.map(act => (
                                          <div
                                            key={act.absIdx}
                                            className="flex items-start gap-1 bg-slate-50 p-1.5 rounded border border-slate-200"
                                          >
                                            <div className="flex-1">
                                              <EditableCell
                                                isEditable={activeProject.isEditable}
                                                value={act.nom}
                                                onChange={v =>
                                                  updateStakeholder(cat.key, i + 1, pIdx, act.absIdx, 'nom', v)
                                                }
                                                type="textarea"
                                                placeholder={t.stakeholders.placeholder}
                                              />
                                            </div>
                                            {activeProject.isEditable && (
                                              <button
                                                onClick={() => deleteStakeholder(cat.key, act.absIdx)}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                        {activeProject.isEditable && (
                                          <button
                                            onClick={() => addStakeholder(cat.key, i + 1, pIdx)}
                                            className="flex w-full items-center justify-center gap-1 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-600 rounded border border-dashed border-slate-300 text-[9px] font-bold uppercase cursor-pointer"
                                          >
                                            <Plus size={10} /> {t.common.add} ({cat.label})
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* VUE TABLEAU MATRICIEL SUR TABLETTE & DESKTOP (>= md) */}
                <div className="hidden md:block bg-white rounded-xl shadow-2xs border border-slate-300 overflow-auto flex-1 min-h-[450px] relative custom-scrollbar">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse mb-0 min-w-[900px]">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                      <tr>
                        <th style={{ width: '20%' }} className="sticky top-0 z-30 px-2.5 py-2.5 border-r border-slate-800 bg-slate-900 font-bold">
                          {t.stakeholders.beneficiaires}
                        </th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2.5 py-2.5 border-r border-slate-800 bg-slate-900 font-bold">
                          {t.stakeholders.instCentralises}
                        </th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2.5 py-2.5 border-r border-slate-800 bg-slate-900 font-bold">
                          {t.stakeholders.instDecentralises}
                        </th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2.5 py-2.5 border-r border-slate-800 bg-slate-900 font-bold">
                          {t.stakeholders.operateursTechniques}
                        </th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2.5 py-2.5 bg-slate-900 font-bold">
                          {t.stakeholders.ptf}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {(activeProject.garData.rendement?.axes || []).map((axe, i) => {
                        if (!isAxeFocused(i)) return null;
                        return (
                          <React.Fragment key={i}>
                            <AxeRow axe={axe} colSpan={5} />
                            {(axe.projets || []).map((proj, pIdx) => {
                              if (!isProjFocused(i, pIdx)) return null;
                              const cats = [
                                { key: 'beneficiaires', label: t.stakeholders.beneficiaires },
                                { key: 'instCentralises', label: t.stakeholders.instCentralises },
                                { key: 'instDecentralises', label: t.stakeholders.instDecentralises },
                                { key: 'operateursTechniques', label: t.stakeholders.operateursTechniques },
                                { key: 'ptf', label: t.stakeholders.ptf }
                              ];
                              return (
                                <React.Fragment key={pIdx}>
                                  <ProjRow proj={proj} pIdx={pIdx} colSpan={5} lang={lang} />
                                  <tr className="border-b border-slate-200 bg-white">
                                    {cats.map((cat, catIdx) => {
                                      const actors = (
                                        activeProject.garData.stakeholders?.[cat.key] || []
                                      )
                                        .map((a, idx) => ({ ...a, absIdx: idx }))
                                        .filter(a => a.axe === i + 1 && a.projetIndex === pIdx);

                                      return (
                                        <td
                                          key={cat.key}
                                          className={`p-2 align-top ${
                                            catIdx < cats.length - 1 ? 'border-r border-slate-200' : ''
                                          }`}
                                        >
                                          <div className="space-y-1.5">
                                            {actors.map(act => (
                                              <div
                                                key={act.absIdx}
                                                className="flex items-start gap-1 bg-slate-50 p-1.5 rounded border border-slate-200 shadow-2xs group"
                                              >
                                                <div className="flex-1">
                                                  <EditableCell
                                                    isEditable={activeProject.isEditable}
                                                    value={act.nom}
                                                    onChange={v =>
                                                      updateStakeholder(
                                                        cat.key,
                                                        i + 1,
                                                        pIdx,
                                                        act.absIdx,
                                                        'nom',
                                                        v
                                                      )
                                                    }
                                                    type="textarea"
                                                    placeholder={t.stakeholders.placeholder}
                                                  />
                                                </div>
                                                {activeProject.isEditable && (
                                                  <button
                                                    onClick={() => deleteStakeholder(cat.key, act.absIdx)}
                                                    className="p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity"
                                                    title={t.common.delete}
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                )}
                                              </div>
                                            ))}
                                            {activeProject.isEditable && (
                                              <button
                                                onClick={() => addStakeholder(cat.key, i + 1, pIdx)}
                                                className="flex w-full items-center justify-center gap-1 py-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-500 rounded border border-dashed border-slate-300 text-[9px] font-bold uppercase transition-colors cursor-pointer"
                                              >
                                                <Plus size={10} /> {t.common.add}
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

          {/* DERNIER ONGLET : TDR (TERMES DE RÉFÉRENCE PAR CHOIX LOGIQUE) */}
          {activeTab === 'tdr' &&
            (!activeProject ? (
              <NoProjectScreen setActiveTab={setActiveTab} onImportClick={triggerImportJSON} lang={lang} />
            ) : (
              <div className="flex-1 flex flex-col w-full max-w-6xl mx-auto space-y-3">
                {/* BARRE DE PILOTAGE ET DE CHOIX LOGIQUE DU TDR */}
                <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-3 sm:p-4 space-y-3 no-print">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                        <FileText size={16} className="text-emerald-600" />
                        {t.tdr.title}
                      </h2>
                      <p className="text-[10px] sm:text-xs text-slate-500">{t.tdr.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        icon={Filter}
                        onClick={() => setTdrShowConfig(!tdrShowConfig)}
                      >
                        {tdrShowConfig ? t.tdr.hideFieldsBtn : t.tdr.showFieldsBtn}
                      </Button>
                      <Button icon={Printer} onClick={handlePrint}>
                        {t.tdr.printTdrBtn}
                      </Button>
                    </div>
                  </div>

                  {/* SÉLECTEURS DE LIGNÉE LOGIQUE (Service / Effet -> Branche / Extrant -> Activité) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                        {t.tdr.step1Label}
                      </label>
                      <select
                        value={tdrSelectedAxe}
                        onChange={e => {
                          setTdrSelectedAxe(e.target.value);
                          setTdrSelectedBranch('all');
                          setTdrSelectedActivity('all');
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-[11px] font-bold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="focus">
                          {hasAnyFocus ? t.tdr.byActiveFocus : t.tdr.allServices}
                        </option>
                        <option value="all">{t.tdr.allServicesUnfiltered}</option>
                        {(activeProject.garData.rendement?.axes || []).map((ax, idx) => (
                          <option key={idx} value={String(idx)}>
                            {ax.nom || `${t.common.service} ${idx + 1}`} — {ax.effet ? ax.effet.substring(0, 40) + '...' : t.tdr.fields.effet}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                        {t.tdr.step2Label}
                      </label>
                      <select
                        value={tdrSelectedBranch}
                        onChange={e => {
                          setTdrSelectedBranch(e.target.value);
                          setTdrSelectedActivity('all');
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-[11px] font-bold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="all">{t.tdr.allBranches}</option>
                        {tdrSelectedAxe !== 'all' &&
                          tdrSelectedAxe !== 'focus' &&
                          (activeProject.garData.rendement?.axes?.[Number(tdrSelectedAxe)]?.projets || []).map(
                            (pr, pIdx) => (
                              <option key={pIdx} value={String(pIdx)}>
                                {t.common.branch} {pIdx + 1} : {pr.extrant ? pr.extrant.substring(0, 45) : `Extrant ${pIdx + 1}`}
                              </option>
                            )
                          )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                        {t.tdr.step3Label}
                      </label>
                      <select
                        value={tdrSelectedActivity}
                        onChange={e => setTdrSelectedActivity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-[11px] font-bold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="all">{t.tdr.allActivities}</option>
                        {tdrSelectedAxe !== 'all' &&
                          tdrSelectedAxe !== 'focus' &&
                          tdrSelectedBranch !== 'all' &&
                          ensureArray(
                            activeProject.garData.rendement?.axes?.[Number(tdrSelectedAxe)]?.projets?.[
                              Number(tdrSelectedBranch)
                            ]?.activites
                          ).map((act, aIdx) => (
                            <option key={aIdx} value={String(aIdx)}>
                              {t.solutions.activite} {aIdx + 1} : {act ? act.substring(0, 45) : `${t.solutions.activite} ${aIdx + 1}`}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* PANNEAU DE COCHAGE DES RUBRIQUES DU TDR */}
                  {tdrShowConfig && (
                    <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg">
                      {tdrFieldGroups.map(grp => (
                        <div key={grp.group} className="space-y-1.5">
                          <div className="text-[9px] font-black uppercase text-emerald-800 border-b border-slate-200 pb-1">
                            {grp.group}
                          </div>
                          {grp.items.map(it => (
                            <button
                              key={it.key}
                              onClick={() => toggleTdrField(it.key)}
                              className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 hover:text-slate-950 w-full text-left cursor-pointer py-0.5"
                            >
                              {tdrFields[it.key] ? (
                                <CheckSquare size={13} className="text-emerald-600 shrink-0" />
                              ) : (
                                <Square size={13} className="text-slate-400 shrink-0" />
                              )}
                              <span className="truncate">{it.label}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DOCUMENT TDR GÉNÉRÉ */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-300 p-4 sm:p-6 md:p-8 space-y-6">
                  {/* ENTÊTE OFFICIEL DU DOCUMENT TDR */}
                  <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 block">
                        {userProfile.institution?.trim() || activeProject.institution || 'Institution'}
                      </span>
                      <h1 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
                        {t.tdr.docTitlePrefix} {activeProject.name}
                      </h1>
                      {activeProject.description && (
                        <p className="text-[11px] text-slate-600 mt-1 max-w-3xl">{activeProject.description}</p>
                      )}
                      {(userProfile.nom ||
                        userProfile.prenom ||
                        userProfile.fonction ||
                        userProfile.institution ||
                        userProfile.email ||
                        userProfile.contact) && (
                        <div className="mt-2 inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-slate-700">
                          <span className="font-black uppercase text-emerald-800">
                            {t.tabs.profil.label} :
                          </span>
                          {(userProfile.nom || userProfile.prenom) && (
                            <span className="font-bold text-slate-900">
                              {[userProfile.nom, userProfile.prenom].filter(Boolean).join(' ')}
                            </span>
                          )}
                          {userProfile.fonction && <span>· {userProfile.fonction}</span>}
                          {userProfile.institution && (
                            <span className="font-semibold text-slate-800">· {userProfile.institution}</span>
                          )}
                          {userProfile.email && (
                            <span className="font-mono text-emerald-700">({userProfile.email})</span>
                          )}
                          {userProfile.contact && (
                            <span className="font-mono text-slate-600">· {userProfile.contact}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-right shrink-0">
                      <span className="text-[9px] font-bold uppercase text-emerald-700 block">
                        {t.tdr.consolidatedBudget}
                      </span>
                      <span className="text-sm font-black font-mono text-emerald-950 tabular-nums">
                        {(() => {
                          let sum = 0;
                          (activeProject.garData.rendement?.axes || []).forEach((axe, i) => {
                            const axeMatch =
                              tdrSelectedAxe === 'all'
                                ? true
                                : tdrSelectedAxe === 'focus'
                                ? isAxeFocused(i)
                                : Number(tdrSelectedAxe) === i;
                            if (!axeMatch) return;
                            (axe.projets || []).forEach((proj, j) => {
                              const projMatch =
                                tdrSelectedBranch !== 'all'
                                  ? Number(tdrSelectedBranch) === j
                                  : tdrSelectedAxe === 'focus'
                                  ? isProjFocused(i, j)
                                  : true;
                              if (!projMatch) return;
                              const actCount = Math.max(
                                ensureArray(activeProject.garData.problems?.branches?.[i]?.details?.[j]?.cause).length,
                                ensureArray(proj.activites).length,
                                1
                              );
                              for (let k = 0; k < actCount; k++) {
                                if (tdrSelectedActivity !== 'all' && Number(tdrSelectedActivity) !== k) continue;
                                sum += calculateActivityTotal(proj, k).sum;
                              }
                            });
                          });
                          return formatAmount(sum, currency);
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* NIVEAU MACRO : CONSÉQUENCE GLOBALE (IMPACT NÉGATIF) <-> IMPACT GLOBAL (OBJECTIF GÉNÉRAL) */}
                  {(tdrFields.consequenceGlobale || tdrFields.impactGlobal) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      {tdrFields.consequenceGlobale && (
                        <div className="bg-rose-950 text-white p-3 rounded-lg border border-rose-800">
                          <span className="text-[9px] font-black uppercase tracking-wider text-rose-300 block mb-1">
                            {t.tdr.fields.consequenceGlobale}
                          </span>
                          <p className="text-xs font-bold leading-snug">
                            {activeProject.garData.problems?.consequenceGlobale || t.common.notSpecified}
                          </p>
                        </div>
                      )}
                      {tdrFields.impactGlobal && (
                        <div className="bg-emerald-900 text-white p-3 rounded-lg border border-emerald-700">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-200 block mb-1">
                            {t.tdr.fields.impactGlobal}
                          </span>
                          <p className="text-xs font-bold leading-snug">
                            {activeProject.garData.rendement?.impact || t.common.notSpecified}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DÉCLINAISON PAR AXE / SERVICE -> BRANCHE -> ACTIVITÉ */}
                  <div className="space-y-6">
                    {(activeProject.garData.rendement?.axes || []).map((axe, i) => {
                      const axeMatch =
                        tdrSelectedAxe === 'all'
                          ? true
                          : tdrSelectedAxe === 'focus'
                          ? isAxeFocused(i)
                          : Number(tdrSelectedAxe) === i;
                      if (!axeMatch) return null;

                      const probBranch = activeProject.garData.problems?.branches?.[i];

                      return (
                        <div key={i} className="border-2 border-slate-300 rounded-xl overflow-hidden space-y-4 pb-4">
                          {/* ENTÊTE DU SERVICE : PROBLÈME CENTRAL <-> EFFET */}
                          <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider">
                              {axe.nom || probBranch?.axeName || `${t.common.service} ${i + 1}`}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-300">
                              {t.tdr.serviceLineage} #{i + 1}
                            </span>
                          </div>

                          {(tdrFields.problemeCentral || tdrFields.effet) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
                              {tdrFields.problemeCentral && (
                                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg">
                                  <span className="text-[9px] font-black uppercase text-rose-700 block mb-1">
                                    {t.tdr.fields.problemeCentral}
                                  </span>
                                  <p className="text-xs font-bold text-rose-950">
                                    {probBranch?.central || t.common.notSpecified}
                                  </p>
                                </div>
                              )}
                              {tdrFields.effet && (
                                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                                  <span className="text-[9px] font-black uppercase text-emerald-800 block mb-1">
                                    {t.tdr.fields.effet}
                                  </span>
                                  <p className="text-xs font-bold text-emerald-950">
                                    {axe.effet || t.common.notSpecified}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* BRANCHES / PROJETS DU SERVICE */}
                          <div className="space-y-4 px-4">
                            {(axe.projets || []).map((proj, j) => {
                              const projMatch =
                                tdrSelectedBranch !== 'all'
                                  ? Number(tdrSelectedBranch) === j
                                  : tdrSelectedAxe === 'focus'
                                  ? isProjFocused(i, j)
                                  : true;
                              if (!projMatch) return null;

                              const probDetail = probBranch?.details?.[j];
                              const causesArr = ensureArray(probDetail?.cause);
                              const besoinsArr = ensureArray(probDetail?.besoin);
                              const actsArr = ensureArray(proj.activites);
                              const maxActLen = Math.max(causesArr.length, besoinsArr.length, actsArr.length, 1);

                              const stakeholderCategories = [
                                { key: 'beneficiaires', label: t.tdr.fields.beneficiaires, enabled: tdrFields.beneficiaires },
                                { key: 'instCentralises', label: t.tdr.fields.instCentralises, enabled: tdrFields.instCentralises },
                                { key: 'instDecentralises', label: t.tdr.fields.instDecentralises, enabled: tdrFields.instDecentralises },
                                { key: 'operateursTechniques', label: t.tdr.fields.operateursTechniques, enabled: tdrFields.operateursTechniques },
                                { key: 'ptf', label: t.tdr.fields.ptf, enabled: tdrFields.ptf }
                              ].filter(c => c.enabled);

                              return (
                                <div
                                  key={j}
                                  className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-4"
                                >
                                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                    <span className="text-[11px] font-black uppercase text-slate-800">
                                      {t.common.branch} {j + 1} ({t.common.project} {j + 1})
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                      {t.tdr.branchSubtotal} {formatAmount(getProjectEffectiveCost(proj), currency)}
                                    </span>
                                  </div>

                                  {/* CONTRAINTE <-> EXTRANT (LIVRABLE) */}
                                  {(tdrFields.contrainte || tdrFields.extrant) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {tdrFields.contrainte && (
                                        <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-lg">
                                          <span className="text-[9px] font-black uppercase text-orange-800 block mb-0.5">
                                            {t.tdr.fields.contrainte}
                                          </span>
                                          <p className="text-xs font-bold text-orange-950">
                                            {probDetail?.contrainte || t.common.notSpecified}
                                          </p>
                                        </div>
                                      )}
                                      {tdrFields.extrant && (
                                        <div className="bg-teal-50 border border-teal-200 p-2.5 rounded-lg">
                                          <span className="text-[9px] font-black uppercase text-teal-800 block mb-0.5">
                                            {t.tdr.fields.extrant}
                                          </span>
                                          <p className="text-xs font-bold text-teal-950">
                                            {proj.extrant || t.common.notSpecified}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* TABLEAU / FICHES PAR ACTIVITÉ */}
                                  <div className="space-y-2.5">
                                    {Array.from({ length: maxActLen }, (_, k) => {
                                      if (tdrSelectedActivity !== 'all' && Number(tdrSelectedActivity) !== k) {
                                        return null;
                                      }
                                      const causeText = causesArr[k] || '';
                                      const besoinText = besoinsArr[k] || '';
                                      const actText = actsArr[k] || '';
                                      const rhList = getSafe2D(proj.intrants_rh, k);
                                      const matList = getSafe2D(proj.intrants_mat, k);
                                      const { sum: activityBudget } = calculateActivityTotal(proj, k);

                                      return (
                                        <div
                                          key={k}
                                          className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5 shadow-2xs"
                                        >
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                            {tdrFields.causeProfonde && (
                                              <div className="bg-amber-50/70 border border-amber-200 p-2 rounded">
                                                <span className="text-[8px] font-black uppercase text-amber-800 block mb-0.5">
                                                  {t.tdr.fields.causeProfonde} #{k + 1}
                                                </span>
                                                <p className="text-[11px] font-medium text-amber-950">
                                                  {causeText || '-'}
                                                </p>
                                              </div>
                                            )}
                                            {tdrFields.besoin && (
                                              <div className="bg-slate-100 border border-slate-200 p-2 rounded">
                                                <span className="text-[8px] font-black uppercase text-slate-700 block mb-0.5">
                                                  {t.tdr.fields.besoin} #{k + 1}
                                                </span>
                                                <p className="text-[11px] font-medium text-slate-900">
                                                  {besoinText || '-'}
                                                </p>
                                              </div>
                                            )}
                                            {tdrFields.activite && (
                                              <div className="bg-emerald-50/80 border border-emerald-200 p-2 rounded">
                                                <span className="text-[8px] font-black uppercase text-emerald-800 block mb-0.5">
                                                  {t.tdr.fields.activite} #{k + 1}
                                                </span>
                                                <p className="text-[11px] font-bold text-emerald-950">
                                                  {actText || '-'}
                                                </p>
                                              </div>
                                            )}
                                          </div>

                                          {/* INTRANTS : RESSOURCES HUMAINES, RESSOURCES MATÉRIELLES, BUDGET ACTIVITÉ */}
                                          {tdrFields.intrants &&
                                            (tdrFields.ressourcesHumaines ||
                                              tdrFields.ressourcesMaterielles ||
                                              tdrFields.budgetActivite) && (
                                              <div className="pt-2 border-t border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-500 block mb-1.5">
                                                  {t.tdr.activityInputsTitle} #{k + 1}
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                  {tdrFields.ressourcesHumaines && (
                                                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                                      <span className="text-[8px] font-bold uppercase text-slate-600 block mb-1">
                                                        {t.tdr.fields.ressourcesHumaines}
                                                      </span>
                                                      {rhList.length === 0 ? (
                                                        <span className="text-[10px] italic text-slate-400">
                                                          {t.tdr.noRh}
                                                        </span>
                                                      ) : (
                                                        <ul className="text-[10px] space-y-0.5 list-disc pl-3.5 text-slate-800">
                                                          {rhList.map((item, idx) => (
                                                            <li key={idx}>
                                                              {item.label || '-'}{' '}
                                                              {item.amount && (
                                                                <span className="font-bold text-emerald-700">
                                                                  ({formatResourceAmount(item.amount, currency)})
                                                                </span>
                                                              )}
                                                            </li>
                                                          ))}
                                                        </ul>
                                                      )}
                                                    </div>
                                                  )}

                                                  {tdrFields.ressourcesMaterielles && (
                                                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                                      <span className="text-[8px] font-bold uppercase text-slate-600 block mb-1">
                                                        {t.tdr.fields.ressourcesMaterielles}
                                                      </span>
                                                      {matList.length === 0 ? (
                                                        <span className="text-[10px] italic text-slate-400">
                                                          {t.tdr.noMat}
                                                        </span>
                                                      ) : (
                                                        <ul className="text-[10px] space-y-0.5 list-disc pl-3.5 text-slate-800">
                                                          {matList.map((item, idx) => (
                                                            <li key={idx}>
                                                              {item.label || '-'}{' '}
                                                              {item.amount && (
                                                                <span className="font-bold text-emerald-700">
                                                                  ({formatResourceAmount(item.amount, currency)})
                                                                </span>
                                                              )}
                                                            </li>
                                                          ))}
                                                        </ul>
                                                      )}
                                                    </div>
                                                  )}

                                                  {tdrFields.budgetActivite && (
                                                    <div className="bg-emerald-50 p-2 rounded border border-emerald-200 flex flex-col justify-center items-center text-center">
                                                      <span className="text-[8px] font-bold uppercase text-emerald-800 block mb-0.5">
                                                        {t.tdr.fields.budgetActivite} #{k + 1}
                                                      </span>
                                                      <span className="text-xs font-black font-mono text-emerald-950 tabular-nums">
                                                        {formatAmount(activityBudget, currency)}
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* PARTIES PRENANTES DE LA BRANCHE */}
                                  {stakeholderCategories.length > 0 && (
                                    <div className="pt-2 border-t border-slate-200">
                                      <span className="text-[9px] font-black uppercase text-slate-600 block mb-2">
                                        {t.tdr.associatedStakeholders} ({t.common.branch} {j + 1})
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                        {stakeholderCategories.map(cat => {
                                          const actors = (
                                            activeProject.garData.stakeholders?.[cat.key] || []
                                          ).filter(a => a.axe === i + 1 && a.projetIndex === j);
                                          return (
                                            <div
                                              key={cat.key}
                                              className="bg-white p-2 rounded border border-slate-200"
                                            >
                                              <span className="text-[8px] font-black uppercase text-slate-700 block mb-1 border-b border-slate-100 pb-0.5">
                                                {cat.label}
                                              </span>
                                              {actors.length === 0 ? (
                                                <span className="text-[10px] italic text-slate-400">
                                                  {t.common.notSpecified}
                                                </span>
                                              ) : (
                                                <ul className="text-[10px] space-y-0.5 list-disc pl-3.5 text-slate-800 font-medium">
                                                  {actors.map((act, aIdx) => (
                                                    <li key={aIdx}>{act.nom || '-'}</li>
                                                  ))}
                                                </ul>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
        </main>
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full border border-slate-200">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <AlertCircle size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-900">{confirmModal.title}</h3>
            </div>
            <p className="text-slate-600 mb-5 text-xs leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeConfirmModal}>
                {t.common.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  closeConfirmModal();
                }}
              >
                {t.common.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
