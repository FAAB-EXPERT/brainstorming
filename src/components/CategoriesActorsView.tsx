import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Briefcase,
  Layers,
  Filter,
  CreditCard,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Search,
  Lock,
  Award,
  Landmark,
  Handshake,
  Phone,
  Mail,
  MapPin,
  Building2,
  UserPlus,
  Trash2,
  Database
} from 'lucide-react';
import {
  ACTOR_CATEGORIES_ORDERED,
  ActorCategoryType,
  ActorGovernanceInstance,
  CategorizedActor,
  Dossier,
  LanguageCode,
  UserProfile,
  CustomDocFields,
  InstitutionalDocType
} from '../types';
import {
  ensureDossierCategorizedActors,
  getRaciDatabaseActorsPool
} from '../db';
import { InternalActorProfileModal } from './InternalActorProfileModal';
import { QrBarcodeScannerModal } from './QrBarcodeScannerModal';

interface CategoriesActorsViewProps {
  dossier: Dossier;
  activeDossier?: Dossier;
  dossiers: Dossier[];
  onSelectDossier: (dossierId: string) => void;
  userProfile: UserProfile;
  language: LanguageCode;
  filterAxeId: string;
  setFilterAxeId: (id: string) => void;
  filterProjectId: string;
  setFilterProjectId: (id: string) => void;
  onUpdateCategorizedActors: (updatedActors: CategorizedActor[]) => void;
  onRenameActorInRaci?: (oldName: string, newName: string) => void;
  onAddActorFromRaci?: (
    actorName: string,
    category: ActorCategoryType,
    raciRole: 'R' | 'A' | 'C' | 'I'
  ) => void;
  onDeleteActorsFromRaci?: (actorNames: string[]) => void;
  onUpdateUserProfile?: (profile: UserProfile) => void;
  onApplyProfileToDoc?: (
    docType: InstitutionalDocType,
    fields: Partial<CustomDocFields>
  ) => void;
  onNavigateToDocGen?: (docType?: InstitutionalDocType) => void;
}

const GOVERNANCE_OPTIONS: {
  value: ActorGovernanceInstance;
  labelFr: string;
  labelEn: string;
  badgeClass: string;
}[] = [
  {
    value: 'COPIL',
    labelFr: 'COPIL (Comité de Pilotage)',
    labelEn: 'COPIL (Steering Committee)',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
  },
  {
    value: 'COPROJ',
    labelFr: 'COPROJ (Comité de Projet)',
    labelEn: 'COPROJ (Project Committee)',
    badgeClass:
      'bg-sky-50 dark:bg-sky-950/60 text-[#14532d] dark:text-[#86efac] border-sky-300 dark:border-sky-700'
  },
  {
    value: 'COPIL & COPROJ',
    labelFr: 'COPIL & COPROJ',
    labelEn: 'COPIL & COPROJ',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
  },
  {
    value: 'Opérationnel / Aucun',
    labelFr: 'Opérationnel / Aucun',
    labelEn: 'Operational / None',
    badgeClass:
      'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
  }
];

export const CategoriesActorsView: React.FC<CategoriesActorsViewProps> = ({
  dossier: dossierProp,
  activeDossier,
  dossiers,
  userProfile,
  language,
  filterAxeId,
  setFilterAxeId,
  filterProjectId,
  setFilterProjectId,
  onUpdateCategorizedActors,
  onRenameActorInRaci,
  onAddActorFromRaci,
  onDeleteActorsFromRaci,
  onUpdateUserProfile,
  onApplyProfileToDoc,
  onNavigateToDocGen
}) => {
  const dossier = dossierProp || activeDossier || dossiers[0];
  const isEn = language === 'EN';

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    'ALL' | ActorCategoryType
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sélection multiple d'acteurs et ajout / suppression depuis la base de données RACI
  const [selectedActorIds, setSelectedActorIds] = useState<string[]>([]);
  const [selectedRaciPoolActor, setSelectedRaciPoolActor] = useState<string>('');
  const [customNewRaciActorName, setCustomNewRaciActorName] = useState<string>('');
  const [newActorCategory, setNewActorCategory] =
    useState<ActorCategoryType>('Interne');
  const [newActorRaciRole, setNewActorRaciRole] = useState<'R' | 'A' | 'C' | 'I'>('R');

  // Local draft map for editing Nom & Prénom without losing focus while typing
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});

  // Modales Fiche Acteur Interne (CV, Carte, Badge) & Scanner QR/Code-barres
  const [profileModalActorName, setProfileModalActorName] = useState<string>(
    userProfile.fullName
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [scannerInitialPayload, setScannerInitialPayload] = useState<
    string | undefined
  >(undefined);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Liste complète synchronisée à 100 % avec l'onglet RACI du programme actif
  const allProgramActors = useMemo<CategorizedActor[]>(() => {
    if (!dossier) return [];
    return ensureDossierCategorizedActors(dossier, userProfile);
  }, [dossier, userProfile]);

  // Axes et projets disponibles pour le Programme actif
  const programAxes = useMemo(() => dossier?.axes || [], [dossier?.axes]);

  const availableProjectsForFilter = useMemo(() => {
    const axes =
      filterAxeId === 'ALL'
        ? programAxes
        : programAxes.filter(a => a.id === filterAxeId);
    return axes.flatMap(a => a.projects || []);
  }, [programAxes, filterAxeId]);

  // Ensemble des acteurs intervenant dans l'Axe / Projet sélectionné (via les tâches RACI)
  const allowedActorNamesByScope = useMemo<Set<string> | null>(() => {
    if (filterAxeId === 'ALL' && filterProjectId === 'ALL') {
      return null;
    }
    const set = new Set<string>();
    const splitNames = (raw?: string): string[] => {
      if (!raw) return [];
      return raw
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(
          s =>
            s.length > 0 &&
            s !== '—' &&
            s !== '-' &&
            s !== 'néant' &&
            s !== 'neant' &&
            s !== 'none'
        );
    };

    programAxes.forEach(axe => {
      if (filterAxeId !== 'ALL' && axe.id !== filterAxeId) return;
      (axe.projects || []).forEach(proj => {
        if (filterProjectId !== 'ALL' && proj.id !== filterProjectId) return;
        (proj.tasks || []).forEach(task => {
          splitNames(task.assignee || task.raciR || task.responsabilite).forEach(
            n => set.add(n)
          );
          splitNames(task.autorite || task.raciA).forEach(n => set.add(n));
          splitNames(task.consulte || task.raciC).forEach(n => set.add(n));
          splitNames(task.informe || task.raciI).forEach(n => set.add(n));
        });
      });
    });

    return set;
  }, [programAxes, filterAxeId, filterProjectId]);

  // Filtrage hiérarchique Programme (Global) -> Axe -> Projet + Catégorie + Recherche
  const filteredActors = useMemo<CategorizedActor[]>(() => {
    return allProgramActors.filter(actor => {
      if (allowedActorNamesByScope) {
        const inRaciTasksOfScope = allowedActorNamesByScope.has(
          actor.name.trim().toLowerCase()
        );
        const matchExplicitScope =
          (filterAxeId === 'ALL' || actor.axeId === filterAxeId) &&
          (filterProjectId === 'ALL' || actor.projectId === filterProjectId);
        if (!inRaciTasksOfScope && !matchExplicitScope) {
          return false;
        }
      }
      if (
        selectedCategoryFilter !== 'ALL' &&
        actor.category !== selectedCategoryFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          actor.name.toLowerCase().includes(q) ||
          (actor.roleOrFunction || '').toLowerCase().includes(q) ||
          (actor.organization || '').toLowerCase().includes(q) ||
          (actor.phone || '').toLowerCase().includes(q) ||
          (actor.email || '').toLowerCase().includes(q) ||
          (actor.address || '').toLowerCase().includes(q) ||
          (actor.governanceInstance || '').toLowerCase().includes(q) ||
          (actor.matricule || '').toLowerCase().includes(q) ||
          actor.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    allProgramActors,
    allowedActorNamesByScope,
    filterAxeId,
    filterProjectId,
    selectedCategoryFilter,
    searchQuery
  ]);

  // Compteurs par catégorie (dans l'ordre strict des 5 catégories)
  const countsByCategory = useMemo(() => {
    const counts: Record<ActorCategoryType, number> = {
      Bénéficiaires: 0,
      Interne: 0,
      Externe: 0,
      Prestataire: 0,
      'Partenaire Financier': 0
    };
    allProgramActors.forEach(actor => {
      if (allowedActorNamesByScope) {
        const inRaciTasksOfScope = allowedActorNamesByScope.has(
          actor.name.trim().toLowerCase()
        );
        const matchExplicitScope =
          (filterAxeId === 'ALL' || actor.axeId === filterAxeId) &&
          (filterProjectId === 'ALL' || actor.projectId === filterProjectId);
        if (!inRaciTasksOfScope && !matchExplicitScope) {
          return;
        }
      }
      counts[actor.category] = (counts[actor.category] || 0) + 1;
    });
    return counts;
  }, [allProgramActors, allowedActorNamesByScope, filterAxeId, filterProjectId]);

  // Liste exclusive des acteurs "Interne" pour la modale CV / Carte de Visite / Badge
  const internalOnlyActorNames = useMemo<string[]>(() => {
    const names = new Set<string>();
    if (userProfile.fullName) names.add(userProfile.fullName);
    allProgramActors
      .filter(a => a.category === 'Interne')
      .forEach(a => names.add(a.name));
    return Array.from(names);
  }, [allProgramActors, userProfile.fullName]);

  const raciContextForInternalModal = useMemo(() => {
    const rList: string[] = [];
    const aList: string[] = [];
    const cList: string[] = [];
    const iList: string[] = [];
    allProgramActors
      .filter(a => a.category === 'Interne')
      .forEach(act => {
        if (act.raciRoles?.includes('R')) rList.push(act.name);
        if (act.raciRoles?.includes('A')) aList.push(act.name);
        if (act.raciRoles?.includes('C')) cList.push(act.name);
        if (act.raciRoles?.includes('I')) iList.push(act.name);
      });
    return { rList, aList, cList, iList };
  }, [allProgramActors]);

  const handleUpdateSingleActor = (
    actorId: string,
    patch: Partial<CategorizedActor>
  ) => {
    const next = allProgramActors.map(item =>
      item.id === actorId ? { ...item, ...patch } : item
    );
    onUpdateCategorizedActors(next);
  };

  const handleCommitActorRename = (actor: CategorizedActor) => {
    const draft = nameDrafts[actor.id];
    if (draft === undefined) return;
    const cleanNewName = draft.trim();
    if (!cleanNewName || cleanNewName === actor.name) {
      setNameDrafts(prev => {
        const copy = { ...prev };
        delete copy[actor.id];
        return copy;
      });
      return;
    }

    const oldName = actor.name;
    const nextActors = allProgramActors.map(item =>
      item.id === actor.id ? { ...item, name: cleanNewName } : item
    );
    onUpdateCategorizedActors(nextActors);
    if (onRenameActorInRaci) {
      onRenameActorInRaci(oldName, cleanNewName);
    }
    setNameDrafts(prev => {
      const copy = { ...prev };
      delete copy[actor.id];
      return copy;
    });
    triggerToast(
      isEn
        ? `✓ Actor renamed to "${cleanNewName}" & synced with RACI`
        : `✓ Acteur renommé en « ${cleanNewName} » et synchronisé avec RACI`
    );
  };

  const raciDatabasePool = useMemo(() => {
    if (!dossier) return [];
    return getRaciDatabaseActorsPool(dossier);
  }, [dossier]);

  const handleToggleSelectActor = (actorId: string) => {
    setSelectedActorIds(prev =>
      prev.includes(actorId)
        ? prev.filter(id => id !== actorId)
        : [...prev, actorId]
    );
  };

  const handleToggleSelectCategoryActors = (catActors: CategorizedActor[]) => {
    const catIds = catActors.map(a => a.id);
    const allSelected =
      catIds.length > 0 && catIds.every(id => selectedActorIds.includes(id));
    if (allSelected) {
      setSelectedActorIds(prev => prev.filter(id => !catIds.includes(id)));
    } else {
      setSelectedActorIds(prev => Array.from(new Set([...prev, ...catIds])));
    }
  };

  const handleAddActorToCategory = () => {
    const rawName =
      selectedRaciPoolActor === '__NEW__'
        ? customNewRaciActorName.trim()
        : selectedRaciPoolActor.trim();
    if (!rawName) {
      triggerToast(
        isEn
          ? '⚠ Please select an actor from the RACI database or enter a name.'
          : '⚠ Veuillez sélectionner un acteur issu de la base de données RACI ou saisir un nom.'
      );
      return;
    }

    if (onAddActorFromRaci) {
      onAddActorFromRaci(rawName, newActorCategory, newActorRaciRole);
    } else {
      const exists = allProgramActors.find(
        a => a.name.trim().toLowerCase() === rawName.toLowerCase()
      );
      if (exists) {
        onUpdateCategorizedActors(
          allProgramActors.map(a =>
            a.id === exists.id ? { ...a, category: newActorCategory } : a
          )
        );
      } else {
        const created: CategorizedActor = {
          id: `cat-act-${dossier.id}-${Date.now()}`,
          name: rawName,
          category: newActorCategory,
          dossierId: dossier.id,
          axeId: filterAxeId !== 'ALL' ? filterAxeId : programAxes[0]?.id || '',
          projectId:
            filterProjectId !== 'ALL'
              ? filterProjectId
              : availableProjectsForFilter[0]?.id || '',
          roleOrFunction: `Acteur RACI (${newActorRaciRole})`,
          organization: dossier.institution || userProfile.institution || 'UGP',
          department: 'Unité de Gestion du Programme',
          email: '',
          phone: '',
          address: 'Abidjan, Côte d’Ivoire',
          matricule: `RACI-${String(allProgramActors.length + 1).padStart(3, '0')}`,
          raciRoles: [newActorRaciRole],
          accreditationLevel:
            newActorCategory === 'Interne'
              ? 'ZONE A — ACCÈS TOTAL UGP & SITES'
              : 'ACCÈS PARTENAIRE / INSTANCE DE GOUVERNANCE',
          badgeValidity: '31/12/2026',
          governanceInstance: 'COPROJ'
        };
        onUpdateCategorizedActors([...allProgramActors, created]);
      }
    }

    setSelectedRaciPoolActor('');
    setCustomNewRaciActorName('');
    triggerToast(
      isEn
        ? `✓ Actor "${rawName}" (RACI DB) added to "${newActorCategory}"`
        : `✓ Acteur « ${rawName} » (Base de données RACI) ajouté dans « ${newActorCategory} »`
    );
  };

  const handleDeleteSingleActor = (actor: CategorizedActor) => {
    if (onDeleteActorsFromRaci) {
      onDeleteActorsFromRaci([actor.name]);
    } else {
      onUpdateCategorizedActors(
        allProgramActors.filter(a => a.id !== actor.id)
      );
    }
    setSelectedActorIds(prev => prev.filter(id => id !== actor.id));
    triggerToast(
      isEn
        ? `✓ Actor "${actor.name}" removed from Categories & RACI DB`
        : `✓ Acteur « ${actor.name} » supprimé des Catégories et de la base RACI`
    );
  };

  const handleDeleteSelectedActors = () => {
    const actorsToRemove = allProgramActors.filter(a =>
      selectedActorIds.includes(a.id)
    );
    if (actorsToRemove.length === 0) return;
    const names = actorsToRemove.map(a => a.name);
    if (onDeleteActorsFromRaci) {
      onDeleteActorsFromRaci(names);
    } else {
      onUpdateCategorizedActors(
        allProgramActors.filter(a => !selectedActorIds.includes(a.id))
      );
    }
    setSelectedActorIds([]);
    triggerToast(
      isEn
        ? `✓ ${names.length} actor(s) deleted from Categories & RACI DB`
        : `✓ ${names.length} acteur(s) supprimé(s) des Catégories et de la base RACI`
    );
  };

  const handleSyncWithRaciAndMatrices = () => {
    const synced = ensureDossierCategorizedActors(dossier, userProfile);
    onUpdateCategorizedActors(synced);
    triggerToast(
      isEn
        ? '✓ Synchronized 100% with RACI tab & Master Matrices M3 / M4!'
        : '✓ Synchronisation 100 % effectuée avec l’onglet RACI et les Matrices M3 / M4 !'
    );
  };

  const getCategoryBadgeStyle = (cat: ActorCategoryType) => {
    switch (cat) {
      case 'Bénéficiaires':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/50',
          border: 'border-teal-300 dark:border-teal-700',
          text: 'text-teal-800 dark:text-teal-300',
          pill: 'bg-teal-600 text-white',
          icon: Users
        };
      case 'Interne':
        return {
          bg: 'bg-sky-50 dark:bg-sky-950/60',
          border: 'border-[#16a34a] dark:border-[#86efac]',
          text: 'text-[#14532d] dark:text-[#86efac]',
          pill: 'bg-[#14532d] text-[#86efac]',
          icon: ShieldCheck
        };
      case 'Externe':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/50',
          border: 'border-amber-300 dark:border-amber-700',
          text: 'text-amber-900 dark:text-amber-300',
          pill: 'bg-amber-600 text-white',
          icon: Landmark
        };
      case 'Prestataire':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/50',
          border: 'border-indigo-300 dark:border-indigo-700',
          text: 'text-indigo-900 dark:text-indigo-300',
          pill: 'bg-indigo-600 text-white',
          icon: Briefcase
        };
      case 'Partenaire Financier':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/50',
          border: 'border-emerald-300 dark:border-emerald-700',
          text: 'text-emerald-900 dark:text-emerald-300',
          pill: 'bg-emerald-600 text-white',
          icon: Handshake
        };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full overflow-x-hidden">
      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* BARRE DE FILTRAGE HIÉRARCHIQUE : PROGRAMME (LECTURE SEULE GLOBAL) -> AXE -> PROJET + RECHERCHE */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#14532d] dark:text-[#86efac] shrink-0">
              <Filter className="w-4 h-4 text-[#16a34a]" />
              <span>
                {isEn ? 'Hierarchical Scope:' : 'Périmètre Hiérarchique :'}
              </span>
            </div>

            {/* 1. Programme Actif (Lecture seule — piloté par le Sélecteur Global de l'application) */}
            <div
              className="flex items-center gap-1.5 bg-sky-50/90 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-[#86efac] dark:border-sky-700 min-w-0 max-w-full"
              title={
                isEn
                  ? 'Controlled by the global Programme selector in the main navigation menu'
                  : 'Dépend à 100 % du sélecteur de programme global de l’application (en lecture seule ici)'
              }
            >
              <Briefcase className="w-3.5 h-3.5 text-[#14532d] dark:text-[#86efac] shrink-0" />
              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 shrink-0">
                {isEn ? 'Active Programme:' : 'Programme Actif :'}
              </span>
              <span className="text-xs font-black text-[#14532d] dark:text-[#86efac] truncate max-w-[240px] sm:max-w-[320px]">
                {dossier?.name} ({dossier?.horizonPlan})
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#14532d] text-[#86efac] text-[8.5px] font-black uppercase shrink-0">
                {isEn ? 'Global' : 'Sélecteur Global'}
              </span>
            </div>

            {/* 2. Sélecteur d'Axe Stratégique (propre au Programme actif) */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 min-w-0 max-w-full">
              <Layers className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
              <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">
                {isEn ? 'Axis:' : 'Axe :'}
              </span>
              <select
                value={filterAxeId}
                onChange={e => {
                  setFilterAxeId(e.target.value);
                  setFilterProjectId('ALL');
                }}
                className="text-xs font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[240px] truncate"
              >
                <option value="ALL">
                  {isEn
                    ? `All Axes (${programAxes.length})`
                    : `Tous les Axes du Programme (${programAxes.length})`}
                </option>
                {programAxes.map(a => (
                  <option
                    key={a.id}
                    value={a.id}
                    className="dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Sélecteur de Projet Opérationnel (propre à l'Axe sélectionné) */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 min-w-0 max-w-full">
              <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">
                {isEn ? 'Project:' : 'Projet :'}
              </span>
              <select
                value={filterProjectId}
                onChange={e => setFilterProjectId(e.target.value)}
                className="text-xs font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[240px] truncate"
              >
                <option value="ALL">
                  {isEn
                    ? `All Projects (${availableProjectsForFilter.length})`
                    : `Tous les Projets (${availableProjectsForFilter.length})`}
                </option>
                {availableProjectsForFilter.map(p => (
                  <option
                    key={p.id}
                    value={p.id}
                    className="dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recherche + Indicateur Source Unique RACI */}
          <div className="flex flex-wrap items-center gap-2 justify-between xl:justify-end">
            <div className="relative flex-1 sm:flex-initial min-w-[210px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={
                  isEn
                    ? 'Search name, email, phone, COPIL/COPROJ...'
                    : 'Rechercher nom, téléphone, email, siège, COPIL...'
                }
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#86efac]"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-[9.5px] font-black text-[#14532d] dark:text-[#86efac]">
              <Database className="w-3 h-3 text-[#16a34a] shrink-0" />
              <span>
                {isEn
                  ? `100% RACI Actors (${allProgramActors.length}) — Classify by category (1 to 5)`
                  : `Tous les acteurs de la RACI (${allProgramActors.length}) — Rangement par catégorie (1 à 5)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* LES 5 CARTES DE CATÉGORIES DANS L'ORDRE OBLIGATOIRE (1 à 5) AVEC DÉFINITIONS MÉTIER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ACTOR_CATEGORIES_ORDERED.map(catDef => {
          const style = getCategoryBadgeStyle(catDef.id);
          const IconComp = style.icon;
          const isSelected = selectedCategoryFilter === catDef.id;
          const count = countsByCategory[catDef.id] || 0;

          return (
            <button
              key={catDef.id}
              type="button"
              onClick={() =>
                setSelectedCategoryFilter(prev =>
                  prev === catDef.id ? 'ALL' : catDef.id
                )
              }
              className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? 'border-[#14532d] dark:border-[#86efac] bg-sky-50/90 dark:bg-slate-800 shadow-md ring-2 ring-[#86efac]/50'
                  : `${style.bg} ${style.border} hover:shadow-sm`
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${style.pill}`}
                  >
                    {isEn ? catDef.labelEn : catDef.labelFr}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white">
                      {count}
                    </span>
                    <IconComp className={`w-4 h-4 ${style.text}`} />
                  </div>
                </div>

                <p className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                  {isEn ? catDef.definitionEn : catDef.definitionFr}
                </p>
              </div>

              <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-[9.5px] font-extrabold">
                {catDef.allowsPersonalSupports ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Habilité : CV, Carte Pro & Badge</span>
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Exclu des CV / Badges Internes</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* SECTION PAR CATÉGORIE DANS L'ORDRE IMMUABLE (1. Bénéficiaires -> 2. Interne -> 3. Externe -> 4. Prestataire -> 5. Partenaire Financier) */}
      <div className="space-y-5">
        {ACTOR_CATEGORIES_ORDERED.filter(
          catDef =>
            selectedCategoryFilter === 'ALL' ||
            selectedCategoryFilter === catDef.id
        ).map(catDef => {
          const catActors = filteredActors.filter(
            a => a.category === catDef.id
          );
          const style = getCategoryBadgeStyle(catDef.id);
          const IconComp = style.icon;

          return (
            <div
              key={catDef.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
            >
              {/* Bandeau d'en-tête de la Catégorie */}
              <div
                className={`px-4 py-3 border-b ${style.bg} ${style.border} flex flex-wrap items-center justify-between gap-3`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.pill}`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        {isEn ? catDef.labelEn : catDef.labelFr}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-black text-[#14532d] dark:text-[#86efac]">
                        {catActors.length} {isEn ? 'Actor(s)' : 'Acteur(s)'}
                      </span>
                      {catDef.allowsPersonalSupports ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9.5px] font-black uppercase">
                          ✓ Éligible aux CV (Docs 12 & 13), Carte de Visite & Badge d’Accès
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9.5px] font-bold">
                          Catégorie Externe aux Supports Individuels Internes (CV / Carte / Badge)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      {isEn ? catDef.definitionEn : catDef.definitionFr}
                    </p>
                  </div>
                </div>

                {catDef.id === 'Interne' && (
                  <button
                    type="button"
                    onClick={() => {
                      const firstInternal =
                        catActors[0]?.name || userProfile.fullName;
                      setProfileModalActorName(firstInternal);
                      setIsProfileModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14532d] hover:bg-[#166534] text-[#86efac] text-[11px] font-black uppercase cursor-pointer shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isEn
                        ? 'Generate CVs, Business Cards & Badges'
                        : 'Générer CV, Carte de Visite & Badge Interne'}
                    </span>
                  </button>
                )}
              </div>

              {/* Tableau enrichi des acteurs de la catégorie (issu à 100% de la base de données RACI) */}
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[960px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase">
                      <th className="py-2 px-2.5 w-[24%]">
                        Poste / Fonction (Source : RACI) & Nom et Prénoms de l’Acteur
                      </th>
                      <th className="py-2 px-2 w-[14%]">
                        Ranger par Catégorie (1 à 5)
                      </th>
                      <th className="py-2 px-2 w-[18%]">
                        Mobile / Téléphone & Email
                      </th>
                      <th className="py-2 px-2 w-[18%]">
                        Siège & Localisation
                      </th>
                      <th className="py-2 px-2 w-[13%]">
                        Gouvernance (COPIL / COPROJ)
                      </th>
                      <th className="py-2 px-2.5 w-[13%] text-right">
                        Rôles RACI & Supports
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {catActors.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 px-4 text-center text-xs text-slate-400 italic"
                        >
                          {isEn
                            ? `No RACI actor currently assigned to "${catDef.labelEn}" for this scope.`
                            : `Aucun acteur issu de la base de données RACI dans la catégorie « ${catDef.labelFr} » pour ce périmètre.`}
                        </td>
                      </tr>
                    ) : (
                      catActors.map(actor => {
                        const isMainUser =
                          actor.name.trim().toLowerCase() ===
                          userProfile.fullName.trim().toLowerCase();
                        const canHavePersonalSupports =
                          actor.category === 'Interne' || isMainUser;
                        const currentGov: ActorGovernanceInstance =
                          actor.governanceInstance || 'Opérationnel / Aucun';
                        const govStyle =
                          GOVERNANCE_OPTIONS.find(g => g.value === currentGov)
                            ?.badgeClass || GOVERNANCE_OPTIONS[3].badgeClass;
                        const displayedName =
                          nameDrafts[actor.id] !== undefined
                            ? nameDrafts[actor.id]
                            : actor.name;

                        return (
                          <tr
                            key={actor.id}
                            className="transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-800/40"
                          >
                            {/* 1. Poste / Fonction (issu de la RACI) + Nom & Prénoms de l'acteur */}
                            <td className="py-2 px-2.5 align-top space-y-1.5">
                              <div
                                className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-extrabold text-slate-900 dark:text-white text-[10px] sm:text-[11px] leading-snug whitespace-normal break-words"
                                title="Poste / Fonction issu automatiquement de la Matrice RACI"
                              >
                                {actor.name}
                              </div>
                              <div className="space-y-0.5">
                                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  {isEn ? 'Actor Last & First Name:' : 'Nom & Prénoms de l’acteur :'}
                                </label>
                                <input
                                  type="text"
                                  value={actor.roleOrFunction || ''}
                                  onChange={e =>
                                    handleUpdateSingleActor(actor.id, {
                                      roleOrFunction: e.target.value
                                    })
                                  }
                                  placeholder={isEn ? 'Enter Last & First Name...' : 'Saisir Nom & Prénoms de l’acteur...'}
                                  className="w-full px-2 py-1 rounded bg-white dark:bg-slate-800/90 border border-emerald-300 dark:border-emerald-700 focus:border-[#16a34a] text-[10px] sm:text-[11px] font-extrabold text-[#14532d] dark:text-[#86efac] focus:outline-none focus:ring-1 focus:ring-[#86efac]"
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[8.5px] font-bold text-[#14532d] dark:text-[#86efac]">
                                  {actor.matricule}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-[8px] font-black text-emerald-800 dark:text-emerald-300 uppercase">
                                  Poste RACI
                                </span>
                              </div>
                            </td>

                            {/* 2. Catégorie (Ordre strict 1 à 5) */}
                            <td className="py-2.5 px-2.5 align-top space-y-1.5">
                              <select
                                value={actor.category}
                                onChange={e => {
                                  const nextCat = e.target
                                    .value as ActorCategoryType;
                                  handleUpdateSingleActor(actor.id, {
                                    category: nextCat,
                                    accreditationLevel:
                                      nextCat === 'Interne'
                                        ? 'ZONE A — ACCÈS TOTAL UGP & SITES'
                                        : 'PARTENAIRE / EXTERNE (SANS BADGE INTERNE)'
                                  });
                                  triggerToast(
                                    `✓ « ${actor.name} » classé dans « ${nextCat} »`
                                  );
                                }}
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] sm:text-[11px] font-extrabold text-[#14532d] dark:text-[#86efac] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#86efac]"
                              >
                                {ACTOR_CATEGORIES_ORDERED.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {isEn ? c.labelEn : c.labelFr}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* 3. Mobile / Téléphone & Email Professionnel */}
                            <td className="py-2.5 px-2.5 align-top space-y-1.5">
                              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                <Phone className="w-3 h-3 text-[#16a34a] shrink-0" />
                                <input
                                  type="text"
                                  value={actor.phone || ''}
                                  onChange={e =>
                                    handleUpdateSingleActor(actor.id, {
                                      phone: e.target.value
                                    })
                                  }
                                  placeholder={
                                    isEn
                                      ? 'Mobile / Phone...'
                                      : 'Mobile / Téléphone...'
                                  }
                                  className="w-full bg-transparent text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                                <input
                                  type="email"
                                  value={actor.email || ''}
                                  onChange={e =>
                                    handleUpdateSingleActor(actor.id, {
                                      email: e.target.value
                                    })
                                  }
                                  placeholder={
                                    isEn
                                      ? 'Professional email...'
                                      : 'Email professionnel...'
                                  }
                                  className="w-full bg-transparent text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                                />
                              </div>
                            </td>

                            {/* 4. Siège & Localisation géographique + Structure */}
                            <td className="py-2.5 px-2.5 align-top space-y-1.5">
                              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                <input
                                  type="text"
                                  value={actor.address || ''}
                                  onChange={e =>
                                    handleUpdateSingleActor(actor.id, {
                                      address: e.target.value
                                    })
                                  }
                                  placeholder={
                                    isEn
                                      ? 'Headquarters & geographic location...'
                                      : 'Siège & Localisation géographique...'
                                  }
                                  className="w-full bg-transparent text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  value={actor.organization || ''}
                                  onChange={e =>
                                    handleUpdateSingleActor(actor.id, {
                                      organization: e.target.value
                                    })
                                  }
                                  placeholder={
                                    isEn
                                      ? 'Organization / Institution...'
                                      : 'Institution / Organisme...'
                                  }
                                  className="w-full bg-transparent text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-300 focus:outline-none"
                                />
                              </div>
                            </td>

                            {/* 5. Instance de Gouvernance (COPIL / COPROJ) */}
                            <td className="py-2.5 px-2.5 align-top space-y-1.5">
                              <select
                                value={currentGov}
                                onChange={e => {
                                  const nextGov = e.target
                                    .value as ActorGovernanceInstance;
                                  handleUpdateSingleActor(actor.id, {
                                    governanceInstance: nextGov
                                  });
                                  triggerToast(
                                    `✓ Gouvernance de « ${actor.name} » : ${nextGov}`
                                  );
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-black cursor-pointer focus:outline-none ${govStyle}`}
                              >
                                {GOVERNANCE_OPTIONS.map(opt => (
                                  <option
                                    key={opt.value}
                                    value={opt.value}
                                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                                  >
                                    {isEn ? opt.labelEn : opt.labelFr}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* 6. Rôles RACI (Lecture seule issue du RACI) & Supports Individuels (Réservés Catégorie 2 Interne) */}
                            <td className="py-2.5 px-3 align-top text-right space-y-2">
                              <div className="inline-flex items-center justify-end gap-1">
                                {(['R', 'A', 'C', 'I'] as const).map(rCode => {
                                  const active =
                                    actor.raciRoles?.includes(rCode);
                                  return (
                                    <span
                                      key={rCode}
                                      title={
                                        isEn
                                          ? 'RACI role derived from RACI tab'
                                          : 'Rôle issu automatiquement de l’onglet RACI'
                                      }
                                      className={`w-5 h-5 rounded flex items-center justify-center text-[9.5px] font-black ${
                                        active
                                          ? 'bg-[#14532d] text-[#86efac] shadow-2xs'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {rCode}
                                    </span>
                                  );
                                })}
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                {canHavePersonalSupports ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProfileModalActorName(actor.name);
                                        setIsProfileModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#14532d] hover:bg-[#166534] text-[#86efac] text-[10px] font-black uppercase cursor-pointer shadow-2xs"
                                      title="Ouvrir la fiche : Carte de Visite (vCard), Badge CR80 (CODE-128) & 2 Modèles de CV (Docs 12 & 13)"
                                    >
                                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                      <span>Carte, Badge & 2 CVs</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setScannerInitialPayload(
                                          actor.matricule
                                        );
                                        setIsScannerModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black cursor-pointer"
                                      title="Scanner et authentifier le Badge / QR Code de cet acteur interne"
                                    >
                                      <QrCode className="w-3.5 h-3.5 shrink-0" />
                                      <span>Scanner</span>
                                    </button>
                                  </>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[9.5px] font-bold"
                                    title="Conformément aux règles de sécurité institutionnelle, seuls l'utilisateur connecté et les acteurs de la catégorie « Interne » peuvent générer un CV, une Carte de Visite ou un Badge d'Accès."
                                  >
                                    <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>Réservé Catégorie « Interne »</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALE FICHE ACTEUR INTERNE : CARTE DE VISITE (QR VCARD), BADGE (QR & CODE-128) & 2 CVs */}
      {isProfileModalOpen && (
        <InternalActorProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          initialActorName={profileModalActorName}
          allActorsList={internalOnlyActorNames}
          raciContextInfo={raciContextForInternalModal}
          dossier={dossier}
          userProfile={userProfile}
          language={language}
          executingOrgName={
            dossier?.institution ||
            userProfile.institution ||
            'Organisme Pilote du Programme'
          }
          executingDepartment="Unité de Gestion du Programme (UGP / PMO)"
          onApplyToDoc={(docType, fields) => {
            if (onApplyProfileToDoc) {
              onApplyProfileToDoc(docType, fields);
            }
          }}
          onSelectDocType={docType => {
            if (onNavigateToDocGen) {
              onNavigateToDocGen(docType);
            }
          }}
          onUpdateUserProfile={onUpdateUserProfile}
        />
      )}

      {/* MODALE SCANNER QR CODE & CODE-BARRES (CONTRÔLE D'ACCÈS INTERNE) */}
      {isScannerModalOpen && (
        <QrBarcodeScannerModal
          isOpen={isScannerModalOpen}
          onClose={() => setIsScannerModalOpen(false)}
          dossier={dossier}
          userProfile={userProfile}
          language={language}
          initialScanPayload={scannerInitialPayload}
          onOpenInternalActorModal={actorName => {
            setIsScannerModalOpen(false);
            setProfileModalActorName(actorName);
            setIsProfileModalOpen(true);
          }}
        />
      )}
    </div>
  );
};
