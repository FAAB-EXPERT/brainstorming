import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ListChecks,
  Users,
  Filter,
  Briefcase,
  Layers,
  Trash2,
  ChevronDown,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X
} from 'lucide-react';
import {
  Dossier,
  Task,
  CurrencyCode,
  LanguageCode
} from '../types';
import {
  STANDARD_PHASES,
  computeTaskMetrics,
  getTodayISO
} from '../pertUtils';
import { formatCurrency, convertFromFCFA, convertToFCFA } from '../i18n';
import { buildDefaultGarDataFromDossier } from './GarBrainstormingTabsView';
import { normalizeLegacyActorToPoste } from '../db';

export interface StakeholderRegistryItem {
  name: string;
  category: string;
  organization?: string;
  role?: string;
  label: string;
}

interface RaciMultiActorCellProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  isPrimary?: boolean;
  suggestions?: string[];
  stakeholders?: StakeholderRegistryItem[];
  datalistId: string;
  language?: LanguageCode;
  allowNeant?: boolean;
}

const isNeantToken = (val?: string): boolean => {
  const clean = (val || '').trim().toLowerCase();
  return clean === 'néant' || clean === 'neant' || clean === 'none';
};

const RaciMultiActorCell: React.FC<RaciMultiActorCellProps> = ({
  value,
  onChange,
  isPrimary = false,
  stakeholders = [],
  language = 'FR',
  allowNeant = false
}) => {
  const [pendingRemoveIdx, setPendingRemoveIdx] = useState<number | null>(null);
  const neantLabel = language === 'EN' ? 'None' : 'Néant';

  const actors = useMemo(() => {
    if (!value || !value.trim()) return [];
    return value
      .split(',')
      .map(s => normalizeLegacyActorToPoste(s.trim()))
      .filter(Boolean);
  }, [value]);

  const isCurrentlyNeant = useMemo(
    () => actors.length === 1 && isNeantToken(actors[0]),
    [actors]
  );

  const handleSelectNeant = () => {
    onChange(neantLabel);
  };

  const handleAddActor = (rawToUse: string) => {
    const trimmed = rawToUse.trim().replace(/,/g, '');
    if (!trimmed) return;
    if (allowNeant && isNeantToken(trimmed)) {
      handleSelectNeant();
      return;
    }
    const baseActors = actors.filter(a => !isNeantToken(a));
    if (baseActors.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    const next = [...baseActors, trimmed];
    onChange(next.join(', '));
  };

  const handleRemoveActor = (indexToRemove: number) => {
    const next = actors.filter((_, idx) => idx !== indexToRemove);
    onChange(next.join(', '));
  };

  return (
    <div className="space-y-1">
      {/* Validation modal before removing a RACI actor */}
      {pendingRemoveIdx !== null && actors[pendingRemoveIdx] !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 whitespace-normal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#86efac] max-w-md w-full p-5 shadow-2xl space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {language === 'EN'
                    ? 'Deletion Confirmation Required'
                    : 'Validation de Suppression Requise'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {language === 'EN'
                    ? 'Do you confirm the permanent removal of actor « '
                    : 'Confirmez-vous la suppression définitive du responsable « '}
                  <strong className="text-[#14532d] dark:text-[#86efac]">
                    {actors[pendingRemoveIdx]}
                  </strong>{' '}
                  » ?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingRemoveIdx(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {language === 'EN' ? 'Cancel' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveActor(pendingRemoveIdx);
                  setPendingRemoveIdx(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase cursor-pointer"
              >
                {language === 'EN' ? 'Confirm deletion' : 'Valider la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing actors list (read-only badges from Registre des Parties Prenantes) */}
      {actors.length > 0 && (
        <div className="flex flex-col gap-1 w-full max-w-full min-w-0">
          {actors.map((actor, idx) => {
            const actorIsNeant = isNeantToken(actor);
            return (
              <div
                key={`${idx}-${actor}`}
                className={`w-full max-w-full flex items-start justify-between gap-1 rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold border whitespace-normal break-words ${
                  actorIsNeant
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 italic'
                    : isPrimary
                    ? 'bg-[#14532d]/10 dark:bg-sky-950/60 border-[#86efac] text-[#14532d] dark:text-[#86efac]'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <span className="whitespace-normal break-words leading-snug flex-1 min-w-0">
                  {actor}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    actorIsNeant ? handleRemoveActor(idx) : setPendingRemoveIdx(idx)
                  }
                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer shrink-0"
                  title={
                    actorIsNeant
                      ? language === 'EN'
                        ? 'Clear None'
                        : 'Retirer Néant'
                      : 'Retirer ce responsable'
                  }
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Direct selector from Registre des Parties Prenantes database + Néant button */}
      <div className="flex flex-wrap items-center gap-1 pt-0.5 w-full max-w-full min-w-0">
        <select
          value=""
          onChange={e => {
            if (e.target.value) {
              handleAddActor(e.target.value);
              e.target.value = '';
            }
          }}
          className="w-full max-w-full min-w-0 bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-[9px] sm:text-[10px] font-bold text-emerald-950 dark:text-emerald-200 px-1 py-0.5 rounded cursor-pointer truncate shadow-2xs"
          title={
            language === 'EN'
              ? '+ Select position / function from Stakeholder Register'
              : '+ Choisir un poste (fonction) depuis le Registre des Parties Prenantes'
          }
        >
          <option value="">
            {language === 'EN'
              ? '+ Position / Function...'
              : '+ Poste / Fonction...'}
          </option>
          {allowNeant && !isCurrentlyNeant && (
            <option value={neantLabel}>— {neantLabel} —</option>
          )}
          {stakeholders.map((stk, sIdx) => (
            <option key={`${sIdx}-${stk.name}`} value={stk.name}>
              {stk.label}
            </option>
          ))}
        </select>
        {allowNeant && !isCurrentlyNeant && (
          <button
            type="button"
            onClick={handleSelectNeant}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-slate-300 dark:border-slate-700 hover:border-amber-400 text-slate-600 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 text-[8.5px] font-extrabold shrink-0 cursor-pointer transition-colors"
            title={
              language === 'EN'
                ? 'Select "None" if there is no actor for this column'
                : 'Choisir « Néant » s’il n’y a pas d’acteur pour cette colonne'
            }
          >
            {neantLabel}
          </button>
        )}
      </div>
    </div>
  );
};

interface OperationalMatricesProps {
  mode: 'planification' | 'processus' | 'raci';
  dossier: Dossier;
  currency: CurrencyCode;
  language: LanguageCode;
  filterAxeId: string;
  setFilterAxeId: (id: string) => void;
  filterProjectId: string;
  setFilterProjectId: (id: string) => void;
  onAddAxe: () => void;
  onUpdateAxeName: (axeId: string, name: string) => void;
  onDeleteAxe: (axeId: string) => void;
  onAddProject: (axeId?: string) => void;
  onUpdateProjectName: (projectId: string, name: string) => void;
  onDeleteProject: (projectId: string) => void;
  onAddTaskInPhase: (
    projectId: string,
    phaseName: string,
    type: 'tache' | 'jalon'
  ) => void;
  onUpdateTask: (
    projectId: string,
    taskId: string,
    patch: Partial<Task>
  ) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
}

interface EnrichedTaskItem {
  task: Task;
  projectId: string;
  projectName: string;
  axeId: string;
  axeName: string;
  axeIdx: number;
  projIdx: number;
  code: string;
  projectTaskOptions: Array<{ id: string; code: string; name: string }>;
}

export const OperationalMatrices: React.FC<OperationalMatricesProps> = ({
  mode,
  dossier,
  currency,
  language,
  filterAxeId,
  setFilterAxeId,
  filterProjectId,
  setFilterProjectId,
  onAddTaskInPhase,
  onUpdateTask,
  onDeleteTask
}) => {
  const [filterPhase, setFilterPhase] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<{
    projectId: string;
    taskId: string;
    taskName: string;
    code: string;
  } | null>(null);

  const todayISO = getTodayISO();
  const axes = dossier.axes || [];

  const filteredAxes = useMemo(() => {
    if (filterAxeId === 'ALL') return axes;
    return axes.filter(a => a.id === filterAxeId);
  }, [axes, filterAxeId]);

  const availableProjects = useMemo(() => {
    return filteredAxes.flatMap(a => a.projects || []);
  }, [filteredAxes]);

  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    axes.forEach(ax => {
      (ax.projects || []).forEach(pr => {
        (pr.tasks || []).forEach(tk => {
          if (tk.assignee && tk.assignee.trim()) {
            tk.assignee
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
              .forEach(actor => set.add(actor));
          }
        });
      });
    });
    return Array.from(set).sort();
  }, [axes]);

  // Comprehensive list of positions/functions (postes/fonctions) from the "Registre des Parties Prenantes" database
  const stakeholderActors = useMemo<StakeholderRegistryItem[]>(() => {
    const result: StakeholderRegistryItem[] = [];
    const seen = new Set<string>();

    const addActor = (name?: string, category = 'Partie Prenante', org?: string, role?: string) => {
      const clean = normalizeLegacyActorToPoste((name || '').trim());
      if (!clean || isNeantToken(clean)) return;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          name: clean,
          category,
          organization: org,
          role,
          label: `${clean} — [${category}]`
        });
      }
    };

    const activeGar = dossier.garData || buildDefaultGarDataFromDossier(dossier);

    // 1. Primary source: Registre des Parties Prenantes (GAR stakeholders across the 5 categories)
    (activeGar.axes || []).forEach(axe => {
      (axe.branches || []).forEach(br => {
        const st = br.stakeholders;
        if (st) {
          (st.beneficiaires || []).forEach(n => addActor(n, 'Bénéficiaires'));
          (st.acteursInternes || []).forEach(n => addActor(n, 'Interne'));
          (st.acteursExternes || []).forEach(n => addActor(n, 'Externe'));
          (st.partenairesTechniques || []).forEach(n => addActor(n, 'Prestataire'));
          (st.partenairesFinanciers || []).forEach(n => addActor(n, 'Partenaire Financier'));
        }
        (br.inputs || []).forEach(inp => {
          (inp.beneficiaires || []).forEach(n => addActor(n, 'Bénéficiaires'));
          (inp.acteursInternes || []).forEach(n => addActor(n, 'Interne'));
          (inp.acteursExternes || []).forEach(n => addActor(n, 'Externe'));
          (inp.partenairesTechniques || []).forEach(n => addActor(n, 'Prestataire'));
          (inp.partenairesFinanciers || []).forEach(n => addActor(n, 'Partenaire Financier'));
        });
      });
    });

    // 2. Also include actors already in dossier.categorizedActors
    (dossier.categorizedActors || []).forEach(ca => {
      addActor(ca.name, ca.category, ca.organization, ca.roleOrFunction);
    });

    // 3. Include any existing RACI assignees/authorities so existing assignments remain selectable
    axes.forEach(ax => {
      (ax.projects || []).forEach(pr => {
        (pr.tasks || []).forEach(tk => {
          [tk.assignee, tk.autorite, tk.consulte, tk.informe].forEach(raw => {
            if (!raw) return;
            raw
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
              .forEach(actor => addActor(actor, 'Interne'));
          });
        });
      });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [dossier, axes]);

  // Activités issues de l'Arbre à Solutions & Intrants (GAR) rattachées à leur Extrant (Projet)
  const solutionActivities = useMemo(() => {
    const gar =
      dossier.garData && Array.isArray(dossier.garData.axes)
        ? dossier.garData
        : buildDefaultGarDataFromDossier(dossier);
    if (!gar || !Array.isArray(gar.axes)) return [];
    const list: Array<{
      id: string;
      code: string;
      axeIdx: number;
      branchIdx: number;
      axeId: string;
      branchId: string;
      axeName: string;
      branchName: string;
      name: string;
      budgetFCFA: number;
    }> = [];

    gar.axes.forEach((axe, aIdx) => {
      (axe.branches || []).forEach((br, bIdx) => {
        (br.inputs || []).forEach((inp, iIdx) => {
          const rhSum = (inp.rhDetails || []).reduce(
            (s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0),
            0
          );
          const matSum = (inp.materielDetails || []).reduce(
            (s, m) => s + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0),
            0
          );
          const totalB =
            rhSum + matSum > 0
              ? rhSum + matSum
              : Number(String(inp.budget || '0').replace(/[^0-9]/g, '')) || 0;

          list.push({
            id: inp.id,
            code: `A${aIdx + 1}.${bIdx + 1}.${iIdx + 1}`,
            axeIdx: aIdx,
            branchIdx: bIdx,
            axeId: axe.id,
            branchId: br.id,
            axeName: axe.service || `Axe ${aIdx + 1}`,
            branchName: br.output || `Extrant ${bIdx + 1}`,
            name: (inp.solutionText || '').trim(),
            budgetFCFA: totalB
          });
        });
      });
    });
    return list;
  }, [dossier]);

  // Build consolidated list of tasks across filtered Axes and Projects, with consistent codes per project
  const allFilteredEnrichedTasks = useMemo<EnrichedTaskItem[]>(() => {
    const list: EnrichedTaskItem[] = [];

    filteredAxes.forEach(axe => {
      const axeIdx = Math.max(0, axes.findIndex(a => a.id === axe.id));
      const allAxeProjects = axe.projects || [];
      const axeProjects = allAxeProjects.filter(
        p => filterProjectId === 'ALL' || p.id === filterProjectId
      );

      axeProjects.forEach(proj => {
        const projIdx = Math.max(0, allAxeProjects.findIndex(p => p.id === proj.id));
        const rawTasks = proj.tasks || [];
        const codeMap = new Map<string, string>();
        const projectTaskOptions: Array<{ id: string; code: string; name: string }> = [];

        STANDARD_PHASES.forEach((pName, pIdx) => {
          const pTasks = rawTasks.filter(tk => tk.phase === pName);
          pTasks.forEach((tk, tIdx) => {
            const c = `${tk.type === 'jalon' ? 'J' : 'T'}.${pIdx + 1}.${tIdx + 1}`;
            codeMap.set(tk.id, c);
            projectTaskOptions.push({ id: tk.id, code: c, name: tk.name });
          });
        });

        rawTasks
          .filter(tk => !STANDARD_PHASES.includes(tk.phase))
          .forEach((tk, tIdx) => {
            const c = `${tk.type === 'jalon' ? 'J' : 'T'}.X.${tIdx + 1}`;
            codeMap.set(tk.id, c);
            projectTaskOptions.push({ id: tk.id, code: c, name: tk.name });
          });

        rawTasks.forEach(tk => {
          list.push({
            task: tk,
            projectId: proj.id,
            projectName: proj.name,
            axeId: axe.id,
            axeName: axe.name,
            axeIdx,
            projIdx,
            code: codeMap.get(tk.id) || 'T.1.1',
            projectTaskOptions
          });
        });
      });
    });

    return list;
  }, [axes, filteredAxes, filterProjectId]);

  const togglePhaseCollapse = (key: string) => {
    setCollapsedPhases(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Column count per mode:
  // Planification: 11 columns (including Livrable between Responsable and Budget)
  // Processus (Suivi des tâches): 12 columns
  // RACI: 6 columns
  const colSpanCount =
    mode === 'planification' ? 11 : mode === 'processus' ? 12 : 6;

  const phasesToDisplay =
    filterPhase === 'ALL'
      ? STANDARD_PHASES
      : STANDARD_PHASES.filter(ph => ph === filterPhase);

  // Target project when clicking "+" in a Phase header in Planification
  const defaultTargetProjectId = useMemo(() => {
    if (filterProjectId !== 'ALL') return filterProjectId;
    if (availableProjects.length > 0) return availableProjects[0].id;
    const anyProj = axes.flatMap(a => a.projects || [])[0];
    return anyProj ? anyProj.id : '';
  }, [filterProjectId, availableProjects, axes]);

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* VALIDATION MODAL FOR DELETION IN PLANIFICATION */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#86efac] max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {language === 'EN'
                    ? 'Deletion Confirmation Required'
                    : 'Validation de Suppression Requise'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {language === 'EN'
                    ? 'Do you confirm the permanent deletion of item '
                    : 'Confirmez-vous la suppression définitive de l’élément '}
                  <strong className="font-mono text-[#14532d] dark:text-[#86efac]">
                    [{pendingDelete.code}]
                  </strong>{' '}
                  « <strong>{pendingDelete.taskName}</strong> » ?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {language === 'EN' ? 'Cancel' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(pendingDelete.projectId, pendingDelete.taskId);
                  setPendingDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase cursor-pointer"
              >
                {language === 'EN' ? 'Confirm deletion' : 'Valider la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ULTRA-COMPACT TOP FILTER BAR FOR MOBILE (PORTRAIT & LANDSCAPE) */}
      <div className="bg-white dark:bg-slate-900 rounded-md sm:rounded-xl border border-slate-200 dark:border-slate-800 p-1 md:p-2.5 shadow-xs space-y-1 md:space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[10px] sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1 truncate">
            {mode === 'planification' && (
              <>
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#16a34a] dark:text-[#86efac] shrink-0" />
                <span>
                  {language === 'EN' ? 'Macro Planning' : 'Planification Macro'}
                </span>
              </>
            )}
            {mode === 'processus' && (
              <>
                <ListChecks className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#16a34a] dark:text-[#86efac] shrink-0" />
                <span>
                  {language === 'EN'
                    ? 'Task Tracking & Variances'
                    : 'Suivi des Tâches & Écarts'}
                </span>
              </>
            )}
            {mode === 'raci' && (
              <>
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#16a34a] dark:text-[#86efac] shrink-0" />
                <span>{language === 'EN' ? 'RACI Matrix' : 'Matrice RACI'}</span>
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-[9px] font-black text-emerald-900 dark:text-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {language === 'EN'
                    ? `Registre Parties Prenantes: ${stakeholderActors.length} actors`
                    : `Registre Parties Prenantes : ${stakeholderActors.length} acteurs connectés`}
                </span>
              </>
            )}
          </h2>
          <p className="hidden xl:block text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {mode === 'planification' &&
              (language === 'EN'
                ? 'Click on the Code to toggle Task ⇄ Milestone.'
                : 'Cliquez sur le Code pour basculer Tâche ⇄ Jalon.')}
            {mode === 'processus' &&
              (language === 'EN'
                ? 'Only Actual Start and Actual End dates are editable.'
                : 'Seules Déb. Exéc et Fin Exéc sont modifiables.')}
            {mode === 'raci' &&
              (language === 'EN'
                ? 'Add multiple actors in R, C and I (+). Single Authority (A).'
                : 'Ajoutez plusieurs responsables dans R, C et I (+). Autorité (A) unique.')}
          </p>
        </div>

        {/* 5 Filter Dropdowns (Responsive & compact on mobile and tablet) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 sm:gap-1.5">
          {/* 1. Axe */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-1.5 py-1 md:px-2 md:py-1 rounded border border-slate-200 dark:border-slate-700 h-7 md:h-auto">
            <Filter className="hidden md:block w-3 h-3 text-[#16a34a] shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="hidden md:block text-[8px] font-bold uppercase text-slate-400 leading-none">
                {language === 'EN' ? '1. Axis' : '1. Axe'}
              </label>
              <select
                value={filterAxeId}
                onChange={e => {
                  setFilterAxeId(e.target.value);
                  setFilterProjectId('ALL');
                }}
                className="w-full bg-transparent text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none truncate leading-tight"
              >
                <option value="ALL">
                  {language === 'EN' ? `Axis (${axes.length})` : `Axe (${axes.length})`}
                </option>
                {axes.map(ax => (
                  <option key={ax.id} value={ax.id}>
                    {ax.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Projet */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-1.5 py-1 md:px-2 md:py-1 rounded border border-slate-200 dark:border-slate-700 h-7 md:h-auto">
            <Briefcase className="hidden md:block w-3 h-3 text-[#16a34a] shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="hidden md:block text-[8px] font-bold uppercase text-slate-400 leading-none">
                {language === 'EN' ? '2. Project' : '2. Projet'}
              </label>
              <select
                value={filterProjectId}
                onChange={e => setFilterProjectId(e.target.value)}
                className="w-full bg-transparent text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none truncate leading-tight"
              >
                <option value="ALL">
                  {language === 'EN'
                    ? `Project (${availableProjects.length})`
                    : `Projet (${availableProjects.length})`}
                </option>
                {availableProjects.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Phase de Projet */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-1.5 py-1 md:px-2 md:py-1 rounded border border-slate-200 dark:border-slate-700 h-7 md:h-auto">
            <Layers className="hidden md:block w-3 h-3 text-[#16a34a] shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="hidden md:block text-[8px] font-bold uppercase text-slate-400 leading-none">
                3. Phase
              </label>
              <select
                value={filterPhase}
                onChange={e => setFilterPhase(e.target.value)}
                className="w-full bg-transparent text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none truncate leading-tight"
              >
                <option value="ALL">Phases (5)</option>
                {STANDARD_PHASES.map((ph, idx) => (
                  <option key={ph} value={ph}>
                    P{idx + 1}: {ph}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Responsable / Réalisateur (Poste / Fonction) */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-1.5 py-1 md:px-2 md:py-1 rounded border border-slate-200 dark:border-slate-700 h-7 md:h-auto">
            <UserCheck className="hidden md:block w-3 h-3 text-[#16a34a] shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="hidden md:block text-[8px] font-bold uppercase text-slate-400 leading-none">
                4.{' '}
                {language === 'EN'
                  ? mode === 'raci'
                    ? 'Responsible (R)'
                    : 'Position'
                  : mode === 'raci'
                  ? 'Poste Réal. (R)'
                  : 'Poste Resp.'}
              </label>
              <select
                value={filterAssignee}
                onChange={e => setFilterAssignee(e.target.value)}
                className="w-full bg-transparent text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none truncate leading-tight"
              >
                <option value="ALL">
                  {language === 'EN'
                    ? `Position (${allAssignees.length})`
                    : `Postes (${allAssignees.length})`}
                </option>
                {allAssignees.map(resp => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Statut */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-1.5 py-1 md:px-2 md:py-1 rounded border border-slate-200 dark:border-slate-700 h-7 md:h-auto">
            <CheckCircle2 className="hidden md:block w-3 h-3 text-[#16a34a] shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="hidden md:block text-[8px] font-bold uppercase text-slate-400 leading-none">
                {language === 'EN' ? '5. Status' : '5. Statut'}
              </label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-transparent text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none truncate leading-tight"
              >
                <option value="ALL">
                  {language === 'EN' ? 'Status: All' : 'Statut : Tous'}
                </option>
                <option value="À faire">
                  {language === 'EN' ? 'To Do' : 'À Faire'}
                </option>
                <option value="En cours">
                  {language === 'EN' ? 'In Progress' : 'En Cours'}
                </option>
                <option value="Bloqué">
                  {language === 'EN' ? 'Blocked' : 'Bloqué'}
                </option>
                <option value="Terminé">
                  {language === 'EN' ? 'Completed' : 'Terminé'}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SINGLE UNIFIED TABLE PER TAB (First row + First 2 columns "Code" & "Activité / Jalon" locked/sticky!) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[75vh] sm:max-h-[calc(100vh-185px)] relative">
          <table
            className={`${
              mode === 'raci'
                ? 'w-full max-w-[650px] min-w-[540px] table-fixed'
                : 'w-full min-w-[760px]'
            } border-separate border-spacing-0 table-compact`}
          >
            <thead className="sticky top-0 z-30">
              {mode === 'planification' && (
                <tr className="bg-[#14532d] text-white">
                  {/* 1. Code (Locked Row 1 + Col 1) */}
                  <th
                    style={{ position: 'sticky', top: 0, left: 0 }}
                    className="sticky top-0 left-0 z-40 bg-[#14532d] w-[48px] min-w-[48px] max-w-[48px] text-left border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    Code
                  </th>
                  {/* 2. Activité / Jalon (Locked Row 1 + Col 2) */}
                  <th
                    style={{ position: 'sticky', top: 0, left: 48 }}
                    className="sticky top-0 left-[48px] z-40 bg-[#14532d] w-[140px] min-w-[140px] max-w-[140px] sm:w-[160px] sm:min-w-[160px] sm:max-w-[160px] text-left border-r-2 border-[#86efac] border-b-2 border-[#86efac] shadow-[3px_0_6px_rgba(0,0,0,0.28)]"
                  >
                    {language === 'EN' ? 'Activity / Milestone' : 'Activité / Jalon'}
                    <div className="text-[7.5px] font-normal text-[#86efac] uppercase leading-none">
                      {language === 'EN' ? '(Solution Tree)' : '(Arbre Solutions)'}
                    </div>
                  </th>
                  {/* 3. Responsable (légèrement élargie, affichage intégral) */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-20 min-w-[78px] max-w-[92px] px-1 text-left border-r border-sky-800 border-b-2 border-[#86efac] whitespace-normal break-words leading-tight"
                  >
                    <div className="text-[8.5px] font-black leading-tight">
                      {language === 'EN' ? 'Owner (RACI)' : 'Responsable (RACI)'}
                    </div>
                    <div className="text-[7px] font-normal text-[#86efac] uppercase leading-none mt-0.5">
                      {language === 'EN' ? '(Auto RACI)' : '(Auto RACI)'}
                    </div>
                  </th>
                  {/* 4. Livrable (between Responsable and Budget) */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-28 min-w-[100px] text-left border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Deliverable' : 'Livrable'}
                  </th>
                  {/* 5. Budget */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-28 min-w-[96px] text-right border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    Budget ({currency})
                    <div className="text-[7.5px] font-normal text-[#86efac] uppercase leading-none">
                      {language === 'EN' ? '(🔒 Intrants)' : '(🔒 Intrants)'}
                    </div>
                  </th>
                  {/* 5. Mois */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-14 min-w-[50px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Month' : 'Mois'}
                  </th>
                  {/* 6. Antécéd. */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-20 min-w-[70px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Predec.' : 'Antécéd.'}
                  </th>
                  {/* 7. Déb. Prév */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-28 min-w-[100px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Plan. Start' : 'Déb. Prév'}
                  </th>
                  {/* 8. Fin Prév */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-28 min-w-[100px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Plan. End' : 'Fin Prév'}
                  </th>
                  {/* 9. Durée */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-14 min-w-[48px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Dur.' : 'Durée'}
                  </th>
                  {/* 10. Actions */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-12 min-w-[44px] text-center border-b-2 border-[#86efac]"
                  >
                    Actions
                  </th>
                </tr>
              )}

              {mode === 'processus' && (
                <tr className="bg-[#14532d] text-white">
                  {/* 1. Code (Locked Row 1 + Col 1) */}
                  <th
                    style={{ position: 'sticky', top: 0, left: 0 }}
                    className="sticky top-0 left-0 z-40 bg-[#14532d] w-[48px] min-w-[48px] max-w-[48px] text-left border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    Code
                  </th>
                  {/* 2. Activité / Jalon (Locked Row 1 + Col 2) */}
                  <th
                    style={{ position: 'sticky', top: 0, left: 48 }}
                    className="sticky top-0 left-[48px] z-40 bg-[#14532d] w-[116px] min-w-[116px] max-w-[116px] sm:w-[136px] sm:min-w-[136px] sm:max-w-[136px] text-left border-r-2 border-[#86efac] border-b-2 border-[#86efac] shadow-[3px_0_6px_rgba(0,0,0,0.28)]"
                  >
                    {language === 'EN' ? 'Activity / Milestone' : 'Activité / Jalon'}
                  </th>
                  {/* 3. Responsable */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-20 min-w-[76px] text-left border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Owner' : 'Responsable'}
                  </th>
                  {/* 4. Statut */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-24 min-w-[84px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Status' : 'Statut'}
                  </th>
                  {/* 5. Déb. Prév */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-20 min-w-[76px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Plan. Start' : 'Déb. Prév'}
                  </th>
                  {/* 6. Fin Prév */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-20 min-w-[76px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Plan. End' : 'Fin Prév'}
                  </th>
                  {/* 7. Durée */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-12 min-w-[42px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Dur.' : 'Durée'}
                  </th>
                  {/* 8. Déb. Exéc */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-28 min-w-[98px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Act. Start' : 'Déb. Exéc'}
                  </th>
                  {/* 9. Fin Exéc */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-28 min-w-[98px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Act. End' : 'Fin Exéc'}
                  </th>
                  {/* 10. Réel */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-12 min-w-[44px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Actual' : 'Réel'}
                  </th>
                  {/* 11. Écart début */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-20 min-w-[72px] text-center border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'Start Var.' : 'Écart début'}
                  </th>
                  {/* 12. Écart fin */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-20 min-w-[72px] text-center border-b-2 border-[#86efac]"
                  >
                    {language === 'EN' ? 'End Var.' : 'Écart fin'}
                  </th>
                </tr>
              )}

              {mode === 'raci' && (
                <tr className="bg-[#14532d] text-white">
                  {/* 1. Code (Locked Row 1 + Col 1) */}
                  <th
                    style={{ position: 'sticky', top: 0, left: 0 }}
                    className="sticky top-0 left-0 z-40 bg-[#14532d] w-[48px] min-w-[48px] max-w-[48px] text-left border-r border-sky-800 border-b-2 border-[#86efac]"
                  >
                    Code
                  </th>
                  {/* 2. Activité / Jalon (Locked Row 1 + Col 2) */}
                  <th
                    style={{ position: 'sticky', top: 0, left: 48 }}
                    className="sticky top-0 left-[48px] z-40 bg-[#14532d] w-[116px] min-w-[116px] max-w-[116px] sm:w-[136px] sm:min-w-[136px] sm:max-w-[136px] text-left border-r-2 border-[#86efac] border-b-2 border-[#86efac] shadow-[3px_0_6px_rgba(0,0,0,0.28)] whitespace-normal break-words"
                  >
                    {language === 'EN' ? 'Activity / Milestone' : 'Activité / Jalon'}
                  </th>
                  {/* 3. Poste Réalisateur (R) = Responsable (Reduced by 1/3: w-[116px] min-w-[92px] max-w-[118px]) */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 w-[116px] min-w-[92px] max-w-[118px] text-left border-r border-sky-800 border-b-2 border-[#86efac] bg-[#166534] whitespace-normal break-words leading-tight"
                  >
                    <div className="whitespace-normal break-words leading-tight">
                      {language === 'EN' ? 'Responsible Position (R)' : 'Poste Réalisateur (R)'}
                    </div>
                    <div className="text-[8px] font-normal text-[#86efac] whitespace-normal break-words leading-tight">
                      {language === 'EN' ? '(+ Positions / Functions)' : '(+ Postes / Fonctions)'}
                    </div>
                  </th>
                  {/* 4. Poste Autorité (A) (Reduced by 1/3: w-[96px] min-w-[76px] max-w-[98px]) */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-[96px] min-w-[76px] max-w-[98px] text-left border-r border-sky-800 border-b-2 border-[#86efac] whitespace-normal break-words leading-tight"
                  >
                    <div className="whitespace-normal break-words leading-tight">
                      {language === 'EN' ? 'Accountable Position (A)' : 'Poste Autorité (A)'}
                    </div>
                    <div className="text-[8px] font-normal text-amber-300 whitespace-normal break-words leading-tight">
                      {language === 'EN' ? '(1 Position)' : '(1 seul Poste)'}
                    </div>
                  </th>
                  {/* 5. Poste Consulté (C) (Reduced by 1/3: w-[116px] min-w-[92px] max-w-[118px]) */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-[116px] min-w-[92px] max-w-[118px] text-left border-r border-sky-800 border-b-2 border-[#86efac] whitespace-normal break-words leading-tight"
                  >
                    <div className="whitespace-normal break-words leading-tight">
                      {language === 'EN' ? 'Consulted Position (C)' : 'Poste Consulté (C)'}
                    </div>
                    <div className="text-[8px] font-normal text-[#86efac] whitespace-normal break-words leading-tight">
                      {language === 'EN' ? '(+ Positions / Functions)' : '(+ Postes / Fonctions)'}
                    </div>
                  </th>
                  {/* 6. Poste Informé (I) (Reduced by 1/3: w-[116px] min-w-[92px] max-w-[118px]) */}
                  <th
                    style={{ position: 'sticky', top: 0 }}
                    className="sticky top-0 z-30 bg-[#14532d] w-[116px] min-w-[92px] max-w-[118px] text-left border-b-2 border-[#86efac] whitespace-normal break-words leading-tight"
                  >
                    <div className="whitespace-normal break-words leading-tight">
                      {language === 'EN' ? 'Informed Position (I)' : 'Poste Informé (I)'}
                    </div>
                    <div className="text-[8px] font-normal text-[#86efac] whitespace-normal break-words leading-tight">
                      {language === 'EN' ? '(+ Positions / Functions)' : '(+ Postes / Fonctions)'}
                    </div>
                  </th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {phasesToDisplay.map(phaseName => {
                const phaseIndex = STANDARD_PHASES.indexOf(phaseName) + 1;
                const collapseKey = `PHASE__${phaseName}`;
                const isCollapsed = Boolean(collapsedPhases[collapseKey]);

                const phaseItems = allFilteredEnrichedTasks
                  .filter(item => {
                    const tk = item.task;
                    const matchPhase = tk.phase === phaseName;
                    const matchAssignee =
                      filterAssignee === 'ALL' ||
                      (tk.assignee || '').includes(filterAssignee);
                    const effSt = computeTaskMetrics(tk, todayISO).effectiveStatus;
                    const matchStatus =
                      filterStatus === 'ALL' || effSt === filterStatus;
                    return matchPhase && matchAssignee && matchStatus;
                  })
                  .sort((a, b) => {
                    const d1 = a.task.startDate || '9999-12-31';
                    const d2 = b.task.startDate || '9999-12-31';
                    if (d1 !== d2) return d1.localeCompare(d2);
                    const e1 = a.task.endDate || '9999-12-31';
                    const e2 = b.task.endDate || '9999-12-31';
                    return e1.localeCompare(e2);
                  });

                const phaseBudgetFCFA = phaseItems.reduce(
                  (sum, item) => sum + (Number(item.task.budget) || 0),
                  0
                );

                return (
                  <React.Fragment key={collapseKey}>
                    {/* PHASE HEADER ROW */}
                    <tr className="bg-sky-100 dark:bg-slate-800 border-y border-[#86efac] dark:border-sky-800">
                      <td colSpan={colSpanCount} className="px-2.5 py-1 border-b border-[#86efac] dark:border-sky-800">
                        <div className="sticky left-2 inline-flex flex-wrap items-center justify-between gap-3 w-full max-w-[calc(100vw-2.5rem)]">
                          <button
                            onClick={() => togglePhaseCollapse(collapseKey)}
                            className="flex items-center gap-1.5 text-left cursor-pointer"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-[#14532d] dark:text-[#86efac]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#14532d] dark:text-[#86efac]" />
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-[#14532d] text-[#86efac] font-mono text-[8px] font-black uppercase">
                              PHASE {phaseIndex}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac]">
                              {phaseName}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                              ({phaseItems.length})
                            </span>
                          </button>

                          <div className="flex items-center gap-2">
                            {mode === 'planification' && (
                              <>
                                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                  {language === 'EN' ? 'Subtotal:' : 'Sous-total :'}{' '}
                                  {formatCurrency(
                                    phaseBudgetFCFA,
                                    currency,
                                    language
                                  )}
                                </span>
                                {defaultTargetProjectId && (
                                  <button
                                    onClick={() =>
                                      onAddTaskInPhase(
                                        defaultTargetProjectId,
                                        phaseName,
                                        'tache'
                                      )
                                    }
                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#14532d] hover:bg-[#166534] text-[#86efac] font-black text-xs sm:text-sm flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                                    title={
                                      language === 'EN'
                                        ? 'Add an activity or milestone in this phase'
                                        : 'Ajouter une activité ou un jalon dans cette phase'
                                    }
                                  >
                                    +
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* PHASE TASKS & MILESTONES (ORDERED BY DATES) */}
                    {!isCollapsed &&
                      (phaseItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={colSpanCount}
                            className="py-2 text-center text-[10px] text-slate-400 italic bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
                          >
                            {language === 'EN'
                              ? `No item in phase « ${phaseName} ».`
                              : `Aucun élément dans la phase « ${phaseName} ».`}
                            {mode === 'planification' &&
                              (language === 'EN'
                                ? ' Click « + » to add one.'
                                : ' Cliquez sur « + » pour en ajouter.')}
                          </td>
                        </tr>
                      ) : (
                        phaseItems.map(item => {
                          const {
                            task,
                            projectId,
                            code,
                            projectTaskOptions
                          } = item;
                          const isJalon = task.type === 'jalon';
                          const metrics = computeTaskMetrics(task, todayISO);
                          const startD = new Date(task.startDate);
                          const monthStr = !isNaN(startD.getTime())
                            ? startD.toLocaleString(
                                language === 'EN' ? 'en-US' : 'fr-FR',
                                {
                                  month: 'short',
                                  year: '2-digit'
                                }
                              )
                            : '—';

                          const otherProjectTasks = projectTaskOptions.filter(
                            o => o.id !== task.id
                          );

                          const stickyCellBg = isJalon
                            ? 'bg-[#f0f9ff] dark:bg-[#1e293b]'
                            : 'bg-white dark:bg-[#0f172a]';

                          // ==========================================
                          // ROW MODE 1 : PLANIFICATION (10 Columns)
                          // ==========================================
                          if (mode === 'planification') {
                            // Un Projet correspond strictement à un Extrant de l'Arbre à Solutions & Intrants :
                            // seules les activités de cet Extrant (projet) peuvent être sélectionnées ici.
                            const projectSolutionActivities = solutionActivities.filter(sa => {
                              if (sa.branchId && sa.branchId === projectId) return true;
                              const normBr = (sa.branchName || '').trim().toLowerCase();
                              const normProj = (item.projectName || '').trim().toLowerCase();
                              if (normBr && normProj && normBr === normProj) return true;
                              return sa.axeIdx === item.axeIdx && sa.branchIdx === item.projIdx;
                            });
                            const matchingSolution =
                              projectSolutionActivities.find(
                                sa =>
                                  sa.id === task.id ||
                                  (sa.name &&
                                    task.name &&
                                    sa.name.trim().toLowerCase() ===
                                      task.name.trim().toLowerCase())
                              ) ||
                              solutionActivities.find(
                                sa =>
                                  sa.id === task.id ||
                                  (sa.name &&
                                    task.name &&
                                    sa.name.trim().toLowerCase() ===
                                      task.name.trim().toLowerCase())
                              );
                            const effectiveBudgetFCFA = matchingSolution ? matchingSolution.budgetFCFA : (Number(task.budget) || 0);
                            const displayedBudget = Math.round(
                              convertFromFCFA(effectiveBudgetFCFA, currency)
                            );

                            return (
                              <tr
                                key={task.id}
                                className={`${
                                  isJalon
                                    ? 'bg-sky-50/40 dark:bg-slate-800/40'
                                    : 'bg-white dark:bg-slate-900'
                                } hover:bg-sky-50/70 dark:hover:bg-slate-800/70`}
                              >
                                {/* 1. Code (Locked Col 1 — click to switch Tache <-> Jalon) */}
                                <td
                                  style={{ position: 'sticky', left: 0 }}
                                  className={`sticky left-0 z-20 ${stickyCellBg} w-[48px] min-w-[48px] max-w-[48px] align-top border-r border-slate-200 dark:border-slate-800 border-b border-slate-200 dark:border-slate-800 whitespace-normal break-words`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateTask(projectId, task.id, {
                                        type: isJalon ? 'tache' : 'jalon',
                                        ...(isJalon
                                          ? {}
                                          : { endDate: task.startDate })
                                      })
                                    }
                                    className={`w-full text-center font-mono text-[9px] font-black px-1 py-1 rounded leading-tight cursor-pointer transition-transform active:scale-95 ${
                                      isJalon
                                        ? 'bg-[#86efac] text-slate-950'
                                        : 'bg-[#14532d] text-white'
                                    }`}
                                    title="Cliquez sur le code pour convertir Tâche (T) ⇄ Jalon (J)"
                                  >
                                    {code}
                                  </button>
                                </td>

                                {/* 2. Activité / Jalon (Locked Col 2 - Sélection restreinte aux activités de cet Extrant / Projet uniquement) */}
                                <td
                                  style={{ position: 'sticky', left: 48 }}
                                  className={`sticky left-[48px] z-20 ${stickyCellBg} w-[140px] min-w-[140px] max-w-[140px] sm:w-[160px] sm:min-w-[160px] sm:max-w-[160px] align-top border-r-2 border-[#16a34a] dark:border-[#86efac] border-b border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_rgba(12,74,110,0.18)] p-1 whitespace-normal break-words`}
                                >
                                  <div className="space-y-1 w-full">
                                    <div
                                      className={`text-[10px] sm:text-[11px] leading-snug px-1.5 py-1 rounded bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 whitespace-normal break-words ${
                                        isJalon
                                          ? 'font-bold italic text-slate-700 dark:text-slate-200'
                                          : 'font-extrabold text-slate-900 dark:text-white'
                                      }`}
                                    >
                                      {task.name ? (
                                        <span className="whitespace-normal break-words block">
                                          {task.name.replace(/^\[[^\]]+\]\s*/, '')}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic text-[9px] sm:text-[10px]">
                                          Aucune activité sélectionnée
                                        </span>
                                      )}
                                    </div>
                                    <select
                                      value=""
                                      onChange={e => {
                                        const chosen = projectSolutionActivities.find(sa => sa.id === e.target.value);
                                        if (chosen) {
                                          onUpdateTask(projectId, task.id, {
                                            name: chosen.name,
                                            budget: chosen.budgetFCFA
                                          });
                                        }
                                      }}
                                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[9px] sm:text-[10px] font-bold text-emerald-800 dark:text-emerald-300 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#86efac] cursor-pointer"
                                      title={`Activités de l’Extrant / Projet : ${item.projectName}`}
                                    >
                                      <option value="">
                                        {task.name ? '↻ Changer l’activité...' : '-- Choisir l’activité --'}
                                      </option>
                                      {projectSolutionActivities.map(sa => (
                                        <option key={sa.id} value={sa.id}>
                                          {sa.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>

                                {/* 3. Responsable (= Réalisateur R — Renseigné automatiquement par la matrice RACI, colonne légèrement élargie et affichage complet) */}
                                <td className="align-top border-r border-slate-200 dark:border-slate-800 p-1 w-20 min-w-[78px] max-w-[92px] whitespace-normal break-words">
                                  <div className="flex flex-col gap-0.5 w-full">
                                    <div className="flex items-center justify-between gap-0.5 flex-wrap">
                                      <span className="text-[6.5px] font-black uppercase tracking-tighter px-1 py-0.1 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
                                        RACI
                                      </span>
                                      <span className="text-[6.5px] font-bold text-slate-400">🔒</span>
                                    </div>
                                    <div
                                      className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-snug bg-slate-50 dark:bg-slate-800/50 p-1 rounded border border-slate-200/50 dark:border-slate-700/50 whitespace-normal break-words"
                                      title={task.assignee || task.autorite || (language === 'EN' ? 'Not assigned in RACI' : 'Non assigné dans la Matrice RACI')}
                                    >
                                      {task.assignee || task.autorite || (
                                        <span className="text-slate-400 italic font-normal text-[8.5px]">
                                          {language === 'EN' ? 'Set in RACI' : 'À définir dans RACI'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* 4. Livrable (between Responsable and Budget — affichage multi-lignes complet sans élargir la colonne) */}
                                <td className="align-top border-r border-slate-200 dark:border-slate-800 p-1 whitespace-normal break-words">
                                  <textarea
                                    rows={Math.max(2, Math.ceil((task.livrable || '').length / 22))}
                                    value={task.livrable || ''}
                                    placeholder={
                                      language === 'EN'
                                        ? 'Expected deliverable...'
                                        : 'Livrable attendu...'
                                    }
                                    onChange={e =>
                                      onUpdateTask(projectId, task.id, {
                                        livrable: e.target.value
                                      })
                                    }
                                    className="w-full bg-transparent text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-200 px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#86efac] whitespace-normal break-words leading-snug resize-y"
                                  />
                                </td>

                                {/* 5. Budget (Calculé automatiquement depuis les Intrants de l’Arbre à Solutions) */}
                                <td className="align-top border-r border-slate-200 dark:border-slate-800 p-1 text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[7.5px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                                      <span>🔒</span> Intrants
                                    </span>
                                    <div
                                      className="font-mono text-[10px] sm:text-[11px] font-black text-slate-900 dark:text-white bg-emerald-50/50 dark:bg-emerald-950/30 px-1 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60"
                                      title={`Budget calculé depuis l'Arbre à Solutions : ${formatCurrency(effectiveBudgetFCFA, currency, language)}`}
                                    >
                                      {formatCurrency(effectiveBudgetFCFA, currency, language)}
                                    </div>
                                  </div>
                                </td>

                                {/* 5. Mois (Auto) */}
                                <td className="align-top text-center font-bold text-[10px] text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                                  {monthStr}
                                </td>

                                {/* 6. Antécéd. */}
                                <td className="align-top text-center border-r border-slate-200 dark:border-slate-800">
                                  <select
                                    value={task.antecedent || '—'}
                                    onChange={e =>
                                      onUpdateTask(projectId, task.id, {
                                        antecedent: e.target.value
                                      })
                                    }
                                    className="w-full bg-slate-50 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200 rounded px-1 py-0.5"
                                  >
                                    <option value="—">—</option>
                                    {otherProjectTasks.map(opt => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.code}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* 7. Déb. Prév */}
                                <td className="align-top text-center border-r border-slate-200 dark:border-slate-800">
                                  <input
                                    type="date"
                                    value={task.startDate}
                                    onChange={e =>
                                      onUpdateTask(projectId, task.id, {
                                        startDate: e.target.value,
                                        ...(isJalon
                                          ? { endDate: e.target.value }
                                          : {})
                                      })
                                    }
                                    className="bg-transparent text-[10px] font-semibold text-slate-800 dark:text-slate-200 rounded px-1 py-0.5"
                                  />
                                </td>

                                {/* 8. Fin Prév */}
                                <td className="align-top text-center border-r border-slate-200 dark:border-slate-800">
                                  <input
                                    type="date"
                                    value={task.endDate}
                                    onChange={e =>
                                      onUpdateTask(projectId, task.id, {
                                        endDate: e.target.value
                                      })
                                    }
                                    className="bg-transparent text-[10px] font-semibold text-slate-800 dark:text-slate-200 rounded px-1 py-0.5"
                                  />
                                </td>

                                {/* 9. Durée (Auto) */}
                                <td className="align-top text-center font-mono font-black text-[10px] text-[#14532d] dark:text-[#86efac] border-r border-slate-200 dark:border-slate-800">
                                  {metrics.plannedDurationLabel}
                                </td>

                                {/* 10. Actions (Delete with Validation) */}
                                <td className="align-top text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingDelete({
                                        projectId,
                                        taskId: task.id,
                                        taskName: task.name,
                                        code
                                      })
                                    }
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                    title="Supprimer (validation requise)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          }

                          // ==========================================
                          // ROW MODE 2 : SUIVI DES TÂCHES (12 Columns — Read-Only except Déb. Exéc & Fin Exéc, No Add/Delete)
                          // ==========================================
                          if (mode === 'processus') {
                            const effStatus = metrics.effectiveStatus;
                            const displayedStartExec =
                              effStatus === 'À faire'
                                ? ''
                                : metrics.effectiveActualStartDate;
                            const displayedEndExec =
                              effStatus === 'Terminé'
                                ? metrics.effectiveActualEndDate
                                : '';

                            const statusBadgeClass =
                              effStatus === 'Terminé'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                                : effStatus === 'En cours'
                                ? 'bg-sky-100 text-[#14532d] dark:bg-sky-950/60 dark:text-[#86efac] border-[#86efac]'
                                : effStatus === 'Bloqué'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';

                            return (
                              <tr
                                key={task.id}
                                className={`${
                                  isJalon
                                    ? 'bg-sky-50/40 dark:bg-slate-800/40'
                                    : 'bg-white dark:bg-slate-900'
                                } hover:bg-sky-50/70 dark:hover:bg-slate-800/70`}
                              >
                                {/* 1. Code (Locked Col 1, Read-only) */}
                                <td
                                  style={{ position: 'sticky', left: 0 }}
                                  className={`sticky left-0 z-20 ${stickyCellBg} w-[48px] min-w-[48px] max-w-[48px] align-top border-r border-slate-200 dark:border-slate-800 border-b border-slate-200 dark:border-slate-800 whitespace-normal break-words`}
                                >
                                  <span
                                    className={`inline-block font-mono text-[9px] font-black px-1 py-0.5 rounded leading-tight ${
                                      isJalon
                                        ? 'bg-[#86efac] text-slate-950'
                                        : 'bg-[#14532d] text-white'
                                    }`}
                                  >
                                    {code}
                                  </span>
                                </td>

                                {/* 2. Activité / Jalon (Locked Col 2, Read-only) */}
                                <td
                                  style={{ position: 'sticky', left: 48 }}
                                  className={`sticky left-[48px] z-20 ${stickyCellBg} w-[116px] min-w-[116px] max-w-[116px] sm:w-[136px] sm:min-w-[136px] sm:max-w-[136px] align-top border-r-2 border-[#16a34a] dark:border-[#86efac] border-b border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_rgba(12,74,110,0.18)] whitespace-normal break-words`}
                                >
                                  <div
                                    className={`text-[10px] sm:text-[11px] leading-snug whitespace-normal break-words ${
                                      isJalon
                                        ? 'font-bold italic text-slate-700 dark:text-slate-200'
                                        : 'font-extrabold text-slate-900 dark:text-white'
                                    }`}
                                  >
                                    {isJalon ? `◆ ${task.name}` : task.name}
                                  </div>
                                </td>

                                {/* 3. Responsable (Read-only) */}
                                <td className="align-top border-r border-slate-200 dark:border-slate-800 text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-normal break-words">
                                  {task.assignee}
                                </td>

                                {/* 4. Statut (Auto-calculated; click to toggle Bloqué) */}
                                <td className="align-top text-center border-r border-slate-200 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextBlocked = effStatus !== 'Bloqué';
                                      onUpdateTask(projectId, task.id, {
                                        manualBlocked: nextBlocked,
                                        status: nextBlocked
                                          ? 'Bloqué'
                                          : displayedStartExec
                                          ? 'En cours'
                                          : 'À faire',
                                        actualEndDate: ''
                                      });
                                    }}
                                    title={
                                      language === 'EN'
                                        ? 'Auto-computed status (Click to toggle Blocked)'
                                        : 'Statut automatique (Cliquer pour basculer Bloqué)'
                                    }
                                    className={`inline-block px-1.5 py-0.5 rounded border text-[10px] sm:text-[11px] font-black cursor-pointer transition-transform active:scale-95 ${statusBadgeClass}`}
                                  >
                                    {effStatus}
                                  </button>
                                </td>

                                {/* 5. Déb. Prév (Read-only) */}
                                <td className="align-top text-center font-mono text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                                  {task.startDate}
                                </td>

                                {/* 6. Fin Prév (Read-only) */}
                                <td className="align-top text-center font-mono text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                                  {task.endDate}
                                </td>

                                {/* 7. Durée (Read-only) */}
                                <td className="align-top text-center font-mono font-bold text-[10px] sm:text-[11px] text-[#14532d] dark:text-[#86efac] border-r border-slate-200 dark:border-slate-800">
                                  {metrics.plannedDurationLabel}
                                </td>

                                {/* 8. Déb. Exéc (Editable, max = todayISO, empty if À faire) */}
                                <td className="align-top text-center border-r border-slate-200 dark:border-slate-800">
                                  <input
                                    type="date"
                                    max={todayISO}
                                    value={displayedStartExec}
                                    onChange={e => {
                                      const rawVal = e.target.value;
                                      if (!rawVal) {
                                        onUpdateTask(projectId, task.id, {
                                          actualStartDate: '',
                                          actualEndDate: '',
                                          status: task.manualBlocked
                                            ? 'Bloqué'
                                            : 'À faire'
                                        });
                                        return;
                                      }
                                      const clampedStart =
                                        rawVal > todayISO ? todayISO : rawVal;
                                      const validEnd =
                                        displayedEndExec &&
                                        displayedEndExec <= todayISO &&
                                        displayedEndExec >= clampedStart
                                          ? displayedEndExec
                                          : '';
                                      onUpdateTask(projectId, task.id, {
                                        actualStartDate: clampedStart,
                                        actualEndDate: validEnd,
                                        status: validEnd
                                          ? 'Terminé'
                                          : task.manualBlocked
                                          ? 'Bloqué'
                                          : 'En cours',
                                        ...(validEnd
                                          ? { manualBlocked: false }
                                          : {})
                                      });
                                    }}
                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-900 dark:text-white rounded px-1 py-0.5"
                                  />
                                </td>

                                {/* 9. Fin Exéc (Editable only when started & not blocked; max = todayISO; filling both Déb. Exéc & Fin Exéc marks Terminé) */}
                                <td className="align-top text-center border-r border-slate-200 dark:border-slate-800">
                                  {effStatus === 'Bloqué' ||
                                  effStatus === 'À faire' ||
                                  !displayedStartExec ? (
                                    <span
                                      className="inline-block text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 py-0.5"
                                      title={
                                        effStatus === 'Bloqué'
                                          ? language === 'EN'
                                            ? 'Task is blocked: Actual End cannot be displayed'
                                            : 'Tâche bloquée : Fin Exéc ne doit pas être affichée'
                                          : language === 'EN'
                                          ? 'Enter Actual Start first (<= Today)'
                                          : 'Renseignez d’abord Déb. Exéc (<= Aujourd’hui)'
                                      }
                                    >
                                      —
                                    </span>
                                  ) : (
                                    <input
                                      type="date"
                                      min={displayedStartExec}
                                      max={todayISO}
                                      value={displayedEndExec}
                                      onChange={e => {
                                        const rawVal = e.target.value;
                                        if (!rawVal) {
                                          onUpdateTask(projectId, task.id, {
                                            actualEndDate: '',
                                            status: task.manualBlocked
                                              ? 'Bloqué'
                                              : 'En cours'
                                          });
                                          return;
                                        }
                                        const clampedEnd =
                                          rawVal > todayISO ? todayISO : rawVal;
                                        const finalEnd =
                                          clampedEnd < displayedStartExec
                                            ? displayedStartExec
                                            : clampedEnd;
                                        onUpdateTask(projectId, task.id, {
                                          actualStartDate: displayedStartExec,
                                          actualEndDate: finalEnd,
                                          status: 'Terminé',
                                          manualBlocked: false
                                        });
                                      }}
                                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-900 dark:text-white rounded px-1 py-0.5"
                                    />
                                  )}
                                </td>

                                {/* 10. Réel (Auto) */}
                                <td className="align-top text-center font-mono font-bold text-[10px] text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                                  {metrics.realDurationLabel}
                                </td>

                                {/* 11. Écart début (Auto) */}
                                <td className="align-top text-center border-r border-slate-200 dark:border-slate-800">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                      metrics.ecartDebutDays > 0
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : metrics.ecartDebutDays < 0
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {metrics.ecartDebutLabel}
                                  </span>
                                </td>

                                {/* 12. Écart fin (Auto) */}
                                <td className="align-top text-center">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                      metrics.ecartFinDays > 0
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : metrics.ecartFinDays < 0
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {metrics.ecartFinLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          }

                          // ==========================================
                          // ROW MODE 3 : MATRICE RACI (6 Columns — Sticky First 2 cols, Multi-actor add in R, C, I)
                          // ==========================================
                          return (
                            <tr
                              key={task.id}
                              className={`${
                                isJalon
                                  ? 'bg-sky-50/40 dark:bg-slate-800/40'
                                  : 'bg-white dark:bg-slate-900'
                              } hover:bg-sky-50/70 dark:hover:bg-slate-800/70`}
                            >
                              {/* 1. Code (Locked Col 1, Read-only) */}
                              <td
                                style={{ position: 'sticky', left: 0 }}
                                className={`sticky left-0 z-20 ${stickyCellBg} w-[48px] min-w-[48px] max-w-[48px] align-top border-r border-slate-200 dark:border-slate-800 border-b border-slate-200 dark:border-slate-800 whitespace-normal break-words`}
                              >
                                <span
                                  className={`inline-block font-mono text-[9px] font-black px-1 py-0.5 rounded leading-tight ${
                                    isJalon
                                      ? 'bg-[#86efac] text-slate-950'
                                      : 'bg-[#14532d] text-white'
                                  }`}
                                >
                                  {code}
                                </span>
                              </td>

                              {/* 2. Activité / Jalon (Locked Col 2, Read-only) */}
                              <td
                                style={{ position: 'sticky', left: 48 }}
                                className={`sticky left-[48px] z-20 ${stickyCellBg} w-[116px] min-w-[116px] max-w-[116px] sm:w-[136px] sm:min-w-[136px] sm:max-w-[136px] align-top border-r-2 border-[#16a34a] dark:border-[#86efac] border-b border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_rgba(12,74,110,0.18)] whitespace-normal break-words`}
                              >
                                <div
                                  className={`text-[10px] sm:text-[11px] leading-snug whitespace-normal break-words ${
                                    isJalon
                                      ? 'font-bold italic text-slate-700 dark:text-slate-200'
                                      : 'font-extrabold text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {isJalon ? `◆ ${task.name}` : task.name}
                                </div>
                              </td>

                              {/* 3. Poste Réalisateur (R) = Responsable (Reduced by 1/3: w-[116px] min-w-[92px] max-w-[118px], full cell title display) */}
                              <td className="w-[116px] min-w-[92px] max-w-[118px] align-top border-r border-slate-200 dark:border-slate-800 bg-sky-50/30 dark:bg-sky-950/20 whitespace-normal break-words">
                                <RaciMultiActorCell
                                  value={task.assignee || ''}
                                  isPrimary
                                  language={language}
                                  placeholder={
                                    language === 'EN'
                                      ? '+ Responsible (R)...'
                                      : '+ Réalisateur (R)...'
                                  }
                                  suggestions={stakeholderActors.map(s => s.name)}
                                  stakeholders={stakeholderActors}
                                  datalistId={`raci-r-${task.id}`}
                                  onChange={newVal =>
                                    onUpdateTask(projectId, task.id, {
                                      assignee: newVal
                                    })
                                  }
                                />
                              </td>

                              {/* 4. Poste Autorité (A) — 1 single authority strictly from Registre Parties Prenantes (Reduced by 1/3: w-[96px] min-w-[76px] max-w-[98px], full cell title display) */}
                              <td className="w-[96px] min-w-[76px] max-w-[98px] align-top border-r border-slate-200 dark:border-slate-800 whitespace-normal break-words">
                                <div className="space-y-1 w-full max-w-full min-w-0">
                                  {task.autorite && (
                                    <div className="w-full max-w-full flex items-start justify-between gap-1 rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 whitespace-normal break-words">
                                      <span className="whitespace-normal break-words leading-snug flex-1 min-w-0">
                                        {normalizeLegacyActorToPoste(task.autorite)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onUpdateTask(projectId, task.id, {
                                            autorite: ''
                                          })
                                        }
                                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer shrink-0"
                                        title={language === 'EN' ? 'Remove Authority' : 'Retirer cette Autorité'}
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                  <select
                                    value=""
                                    onChange={e => {
                                      if (e.target.value) {
                                        onUpdateTask(projectId, task.id, {
                                          autorite: e.target.value
                                        });
                                        e.target.value = '';
                                      }
                                    }}
                                    className="w-full max-w-full min-w-0 bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-[9px] sm:text-[10px] font-bold text-emerald-950 dark:text-emerald-200 px-1 py-0.5 rounded cursor-pointer truncate shadow-2xs"
                                    title={
                                      language === 'EN'
                                        ? 'Select single Authority from Stakeholder Register'
                                        : 'Choisir l’Autorité depuis le Registre des Parties Prenantes'
                                    }
                                  >
                                    <option value="">
                                      {language === 'EN'
                                        ? '+ Position / Function...'
                                        : '+ Poste / Fonction...'}
                                    </option>
                                    {stakeholderActors.map((stk, sIdx) => (
                                      <option key={`auth-${sIdx}-${stk.name}`} value={stk.name}>
                                        {stk.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>

                              {/* 5. Poste Consulté (C) — Multi-actor addition in cell + option Néant (Reduced by 1/3: w-[116px] min-w-[92px] max-w-[118px], full cell title display) */}
                              <td className="w-[116px] min-w-[92px] max-w-[118px] align-top border-r border-slate-200 dark:border-slate-800 whitespace-normal break-words">
                                <RaciMultiActorCell
                                  value={task.consulte || ''}
                                  allowNeant
                                  language={language}
                                  placeholder={
                                    language === 'EN'
                                      ? '+ Consulted (C) or None...'
                                      : '+ Consulté (C) ou Néant...'
                                  }
                                  suggestions={stakeholderActors.map(s => s.name)}
                                  stakeholders={stakeholderActors}
                                  datalistId={`raci-c-${task.id}`}
                                  onChange={newVal =>
                                    onUpdateTask(projectId, task.id, {
                                      consulte: newVal
                                    })
                                  }
                                />
                              </td>

                              {/* 6. Poste Informé (I) — Multi-actor addition in cell + option Néant (Reduced by 1/3: w-[116px] min-w-[92px] max-w-[118px], full cell title display) */}
                              <td className="w-[116px] min-w-[92px] max-w-[118px] align-top whitespace-normal break-words">
                                <RaciMultiActorCell
                                  value={task.informe || ''}
                                  allowNeant
                                  language={language}
                                  placeholder={
                                    language === 'EN'
                                      ? '+ Informed (I) or None...'
                                      : '+ Informé (I) ou Néant...'
                                  }
                                  suggestions={stakeholderActors.map(s => s.name)}
                                  stakeholders={stakeholderActors}
                                  datalistId={`raci-i-${task.id}`}
                                  onChange={newVal =>
                                    onUpdateTask(projectId, task.id, {
                                      informe: newVal
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
