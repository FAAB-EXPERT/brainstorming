import React, { useState, useMemo, useEffect } from 'react';
import {
  Dossier,
  GARData,
  GARAxe,
  GARBranch,
  GARNodeInput,
  GARResourceItem,
  GARHypotheses,
  GARProjectStakeholders,
  GARBrainstormingIdea,
  UserProfile,
  CurrencyCode,
  LanguageCode,
  ThemeMode,
  Axe,
  Project,
  Task
} from '../types';
import { formatCurrencyValue } from '../i18n';
import { ensureDossierCategorizedActors } from '../db';
import {
  Lightbulb,
  GitFork,
  Target,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  List,
  LayoutGrid,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Wrench,
  ShieldAlert,
  Coins,
  UserCheck,
  Briefcase,
  Package,
  Users,
  Building,
  Building2,
  Landmark,
  Filter,
  ChevronRight,
  Download,
  RefreshCw,
  ArrowRightLeft
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export type GarTabId = 'brainstorming' | 'arbre' | 'solutions' | 'registre_parties' | 'tdr';

interface GarBrainstormingTabsViewProps {
  activeTab: GarTabId;
  dossier: Dossier;
  onUpdateDossier: (updater: (d: Dossier) => Dossier) => void;
  userProfile: UserProfile;
  currency: CurrencyCode;
  language: LanguageCode;
  theme: ThemeMode;
  onShowToast?: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const BRAINSTORMING_COLORS = [
  { id: 'slate', bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700', accent: 'bg-slate-400', label: 'Neutre' },
  { id: 'rose', bg: 'bg-rose-50/70 dark:bg-rose-950/30', border: 'border-rose-300 dark:border-rose-800', accent: 'bg-rose-500', label: 'Urgent / Critique' },
  { id: 'amber', bg: 'bg-amber-50/70 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-800', accent: 'bg-amber-500', label: 'Attention / Risque' },
  { id: 'emerald', bg: 'bg-emerald-50/70 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-800', accent: 'bg-emerald-500', label: 'Priorité / Solution' },
  { id: 'sky', bg: 'bg-sky-50/70 dark:bg-sky-950/30', border: 'border-sky-300 dark:border-sky-800', accent: 'bg-sky-500', label: 'Opérationnel' },
  { id: 'violet', bg: 'bg-violet-50/70 dark:bg-violet-950/30', border: 'border-violet-300 dark:border-violet-800', accent: 'bg-violet-500', label: 'Stratégique' }
];

const DEFAULT_BRAINSTORMING_IDEAS: GARBrainstormingIdea[] = [
  { id: 'bs-1', problemText: 'Perte des parts de marché, baisse drastique de la rentabilité et risque de faillite à moyen terme', solutionText: 'Croissance durable du chiffre d\'affaires (+35%), leadership régional et pérennité financière de l\'entreprise', color: 'violet' },
  { id: 'bs-2', problemText: 'Chute des ventes et faible acquisition de nouveaux clients', solutionText: 'Dynamisation commerciale et augmentation du portefeuille clients actifs', color: 'rose' },
  { id: 'bs-3', problemText: 'Visibilité digitale quasi inexistante face à la concurrence', solutionText: 'Présence digitale omnicanale performante et génératrice de leads qualifiés', color: 'sky' },
  { id: 'bs-4', problemText: 'Site web obsolète, lent et non adapté au mobile', solutionText: 'Refonte complète de la plateforme web e-commerce responsive et optimisée SEO', color: 'emerald' },
  { id: 'bs-5', problemText: 'Absence de stratégie publicitaire et d\'animation sur les réseaux sociaux', solutionText: 'Déploiement de campagnes d\'acquisition sponsorisées (Ads) et création de contenu engageant', color: 'amber' },
  { id: 'bs-6', problemText: 'Faible taux de conversion des prospects et perte des clients existants', solutionText: 'Processus de vente structuré et fidélisation accrue de la clientèle', color: 'rose' },
  { id: 'bs-7', problemText: 'Suivi commercial manuel sur des fichiers dispersés sans relance automatique', solutionText: 'Intégration d\'un logiciel CRM centralisé avec automatisation du suivi prospect', color: 'sky' },
  { id: 'bs-8', problemText: 'Équipe de vente peu formée aux techniques de négociation modernes', solutionText: 'Programme intensif de formation au closing et mise en place d\'un système de primes', color: 'emerald' },
  { id: 'bs-9', problemText: 'Coûts d\'exploitation excessifs et retards récurrents de livraison', solutionText: 'Excellence opérationnelle, réduction des coûts (-20%) et livraisons dans les délais', color: 'violet' },
  { id: 'bs-10', problemText: 'Ruptures de stocks fréquentes sur les produits phares et surstockage d\'invendus', solutionText: 'Chaîne d\'approvisionnement agile et gestion des stocks en flux tendu', color: 'amber' },
  { id: 'bs-11', problemText: 'Absence d\'outil de suivi des entrées/sorties de marchandises en temps réel', solutionText: 'Déploiement d\'un ERP de gestion des stocks avec alertes de réapprovisionnement', color: 'sky' },
  { id: 'bs-12', problemText: 'Dépendance à un fournisseur unique souvent défaillant', solutionText: 'Diversification des fournisseurs et signature de contrats-cadres avec pénalités de retard', color: 'emerald' }
];

export function buildDefaultGarDataFromDossier(dossier: Dossier): GARData {
  if (dossier.garData && Array.isArray(dossier.garData.axes) && dossier.garData.axes.length > 0) {
    return dossier.garData;
  }

  const actors = dossier.categorizedActors || [];
  const getActorLabels = (cat: string, axeId?: string, projId?: string): string[] => {
    const filtered = actors.filter((a) => {
      if (a.category !== cat) return false;
      if (projId && a.projectId !== 'ALL' && a.projectId !== projId) return false;
      if (axeId && a.axeId !== 'ALL' && a.axeId !== axeId) return false;
      return true;
    });
    if (filtered.length > 0) {
      return filtered.map((a) => a.name);
    }
    return [];
  };

  const axes: GARAxe[] = (dossier.axes || []).map((axe: Axe, axeIdx: number) => {
    const branches: GARBranch[] = (axe.projects || []).map((proj: Project, projIdx: number) => {
      const inputs: GARNodeInput[] = (proj.tasks || []).map((task: Task, taskIdx: number) => {
        const totalCost = Math.max(0, Number(task.budget) || 0);
        const rhShare = Math.round(totalCost * 0.6);
        const matShare = Math.max(0, totalCost - rhShare);
        const rhLabel = (task.assignee || 'Expert / Équipe technique').split(',')[0].trim() || 'Expert / Équipe technique';
        const matLabel = task.livrable || 'Logistique & Supports d’exécution';

        return {
          id: task.id || `in-${axeIdx + 1}-${projIdx + 1}-${taskIdx + 1}`,
          problemText: `Insuffisance opérationnelle ou goulot d'étranglement concernant : ${task.name}`,
          solutionText: task.name,
          needText: `Mobilisation des ressources et expertise requises pour ${task.livrable || task.name}`,
          budget: `${totalCost.toLocaleString('fr-FR')} FCFA`,
          rh: [`${rhLabel} (1 x ${rhShare.toLocaleString('fr-FR')} = ${rhShare.toLocaleString('fr-FR')})`],
          materiel: [`${matLabel} (1 x ${matShare.toLocaleString('fr-FR')} = ${matShare.toLocaleString('fr-FR')})`],
          rhDetails: [
            {
              id: `rh-${axeIdx + 1}-${projIdx + 1}-${taskIdx + 1}`,
              label: rhLabel,
              quantity: 1,
              unitCost: rhShare
            }
          ],
          materielDetails: [
            {
              id: `mat-${axeIdx + 1}-${projIdx + 1}-${taskIdx + 1}`,
              label: matLabel,
              quantity: 1,
              unitCost: matShare
            }
          ],
          beneficiaires: getActorLabels('Bénéficiaires', axe.id, proj.id),
          acteursInternes: [task.assignee || 'Équipe Projet Interne'].filter(Boolean),
          acteursExternes: getActorLabels('Externe', axe.id, proj.id),
          partenairesTechniques: getActorLabels('Prestataire', axe.id, proj.id),
          partenairesFinanciers: getActorLabels('Partenaire Financier', axe.id, proj.id),
          tdrObjectifSpecifique: task.responsabilite || `Assurer la réalisation intégrale de l'activité « ${task.name} » dans le respect des standards de qualité.`,
          tdrResultatsAttendus: `Livrable validé : ${task.livrable || task.name}.`,
          tdrTachesMandat: `1. Préparation méthodologique et cadrage de l'activité (${task.phase}) ;\n2. Exécution opérationnelle : ${task.name} ;\n3. Production et validation du livrable : ${task.livrable || 'Rapport d’exécution'}.`,
          tdrLivrables: `- ${task.livrable || 'Livrable technique validé'}\n- Procès-verbal de réception et rapport d'exécution`,
          tdrDureeCalendrier: `Période prévue : ${task.startDate || 'Selon calendrier'} au ${task.endDate || 'Selon calendrier'}`,
          tdrLieuMission: 'Siège de l’Institution & Zones d’intervention du programme',
          tdrProfilExperts: `Spécialiste confirmé / Responsable : ${task.assignee || 'Expert Senior'} justifiant d'au moins 5 à 10 ans d'expérience pertinente.`,
          tdrModalitesPaiement: '30% au démarrage sur validation de la note méthodologique, 40% à la remise du livrable provisoire, 30% après réception définitive.'
        };
      });

      return {
        id: proj.id || `b-${axeIdx + 1}-${projIdx + 1}`,
        constraint: `Contrainte opérationnelle ou déficit structurel affectant : ${proj.name}`,
        output: proj.name,
        hypotheses: {
          globale: 'Disponibilité effective des ressources et stabilité du calendrier opérationnel',
          interne: 'Mobilisation continue des équipes internes et validation rapide des livrables',
          externe: 'Obtention dans les délais des autorisations et validations réglementaires',
          partenaires: 'Respect des engagements contractuels des prestataires et partenaires financiers'
        },
        stakeholders: {
          beneficiaires: getActorLabels('Bénéficiaires', axe.id, proj.id).length > 0
            ? getActorLabels('Bénéficiaires', axe.id, proj.id)
            : ['Usagers finaux, populations cibles et directions bénéficiaires'],
          acteursInternes: getActorLabels('Interne', axe.id, proj.id).length > 0
            ? getActorLabels('Interne', axe.id, proj.id)
            : ['Unité de Gestion du Programme (UGP / PMO)', 'Directions Techniques Internes'],
          acteursExternes: getActorLabels('Externe', axe.id, proj.id).length > 0
            ? getActorLabels('Externe', axe.id, proj.id)
            : ['Ministère de Tutelle & Autorités de Régulation'],
          partenairesTechniques: getActorLabels('Prestataire', axe.id, proj.id).length > 0
            ? getActorLabels('Prestataire', axe.id, proj.id)
            : ['Cabinets d’études, consultants spécialisés et opérateurs techniques'],
          partenairesFinanciers: getActorLabels('Partenaire Financier', axe.id, proj.id).length > 0
            ? getActorLabels('Partenaire Financier', axe.id, proj.id)
            : ['Budget Institutionnel & Partenaires Techniques et Financiers (PTF)']
        },
        inputs: inputs.length > 0 ? inputs : [
          {
            id: `in-empty-${axeIdx + 1}-${projIdx + 1}`,
            problemText: 'Cause profonde à préciser',
            solutionText: 'Activité opérationnelle à préciser',
            needText: 'Besoin opérationnel associé',
            budget: '0 FCFA',
            rh: [],
            materiel: [],
            rhDetails: [],
            materielDetails: []
          }
        ]
      };
    });

    return {
      id: axe.id || `axe-${axeIdx + 1}`,
      service: axe.name,
      centralProblem: `Déficit de performance et de structuration au niveau de : ${axe.name}`,
      effect: `Renforcement durable de la performance de : ${axe.name}`,
      hypotheses: {
        globale: 'Alignement stratégique maintenu sur toute la durée du programme',
        interne: 'Appropriation des outils et processus par les équipes internes de l’axe',
        externe: 'Environnement institutionnel, économique et réglementaire favorable',
        partenaires: 'Décaissements réguliers et appui technique continu des partenaires'
      },
      branches
    };
  });

  const syncedIdeas: GARBrainstormingIdea[] = [];
  axes.forEach((ax, aIdx) => {
    syncedIdeas.push({
      id: `bs-axe-${ax.id}`,
      problemText: ax.centralProblem,
      solutionText: ax.effect,
      color: BRAINSTORMING_COLORS[(aIdx + 1) % BRAINSTORMING_COLORS.length].id
    });
    ax.branches.forEach((br, bIdx) => {
      syncedIdeas.push({
        id: `bs-br-${br.id}`,
        problemText: br.constraint,
        solutionText: br.output,
        color: BRAINSTORMING_COLORS[(aIdx + bIdx + 2) % BRAINSTORMING_COLORS.length].id
      });
      br.inputs.forEach((inp, iIdx) => {
        syncedIdeas.push({
          id: `bs-in-${inp.id}`,
          problemText: inp.problemText,
          solutionText: inp.solutionText,
          color: BRAINSTORMING_COLORS[(iIdx + 3) % BRAINSTORMING_COLORS.length].id
        });
      });
    });
  });

  return {
    organizationName: dossier.institution || 'Institution / Organisation',
    projectTitle: dossier.name || 'Programme Stratégique',
    projectDescription: dossier.description || '',
    consequence: `Risque de sous-performance globale, de retard sur le chemin critique et de non-atteinte des cibles stratégiques du programme « ${dossier.name} »`,
    impact: `Réalisation intégrale des objectifs de « ${dossier.name} », création de valeur durable et impact mesurable auprès des bénéficiaires`,
    hypothesesImpact: {
      globale: 'Stabilité macro-économique, institutionnelle et engagement continu des parties prenantes',
      interne: 'Gouvernance PMO rigoureuse, maîtrise du chemin critique PERT/CPM et rétention des compétences clés',
      externe: 'Adhésion des bénéficiaires finaux et soutien des autorités de régulation',
      partenaires: 'Mobilisation effective et ponctuelle des financements et de l’assistance technique'
    },
    brainstormingIdeas: syncedIdeas.length > 0 ? syncedIdeas : DEFAULT_BRAINSTORMING_IDEAS,
    axes
  };
}

// Helper for auto-resizing textareas
const AutoResizeTextarea = ({ value, onChange, className, placeholder }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(scrollHeight, 24) + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      className={`${className || ''} overflow-hidden resize-none`}
    />
  );
};

// Dropdown to quickly inject an idea from the Brainstorming tab
const BrainstormingSelect = ({ ideas, type, onSelect, currentValue }: {
  ideas: GARBrainstormingIdea[];
  type: 'problem' | 'solution';
  onSelect: (text: string) => void;
  currentValue?: string;
}) => {
  const validIdeas = (ideas || []).filter((i) =>
    type === 'problem' ? i.problemText.trim() !== '' : i.solutionText.trim() !== ''
  );
  if (validIdeas.length === 0) return null;

  return (
    <div className="mb-1.5 flex items-center justify-end">
      <div className="relative inline-flex items-center max-w-full">
        <Lightbulb size={11} className="absolute left-2 text-amber-500 pointer-events-none shrink-0" />
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              onSelect(e.target.value);
            }
          }}
          className="text-[10px] bg-amber-50/90 hover:bg-amber-100/90 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 rounded-md pl-6 pr-5 py-0.5 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer max-w-[230px] truncate transition-colors shadow-2xs"
          title="Importer une carte depuis le Brainstorming"
        >
          <option value="">
            {type === 'problem' ? 'Choisir un problème (Brainstorming)...' : 'Choisir une solution (Brainstorming)...'}
          </option>
          {validIdeas.map((idea, idx) => {
            const text = type === 'problem' ? idea.problemText : idea.solutionText;
            const isSelected = currentValue === text;
            return (
              <option key={idea.id} value={text}>
                {isSelected ? '✓ ' : ''}#{idx + 1} - {text.length > 55 ? text.substring(0, 55) + '...' : text}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
};

// Component for Problem Tree: only choosing from Brainstorming, automatically carries corresponding solution
const ProblemChooser: React.FC<{
  ideas: GARBrainstormingIdea[];
  value: string;
  onSelect: (problemText: string, solutionText: string) => void;
  label?: string;
  placeholder?: string;
  badge?: string;
}> = ({
  ideas,
  value,
  onSelect,
  label,
  placeholder = 'Choisir un problème (Brainstorming)...',
  badge = 'Sélection Brainstorming'
}) => {
  const validIdeas = (ideas || []).filter((i) => (i.problemText || '').trim() !== '');

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
            {label}
          </span>
          <span className="text-[8.5px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-1.5 py-0.2 rounded-full">
            {badge}
          </span>
        </div>
      )}
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => {
            const probText = e.target.value;
            const match = validIdeas.find((i) => i.problemText === probText);
            onSelect(probText, match?.solutionText || '');
          }}
          className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700/80 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer shadow-2xs truncate"
        >
          <option value="">-- {placeholder} --</option>
          {validIdeas.map((idea, idx) => (
            <option key={idea.id} value={idea.problemText}>
              #{idx + 1} - {idea.problemText.length > 70 ? idea.problemText.substring(0, 70) + '...' : idea.problemText}
            </option>
          ))}
        </select>
      </div>
      {value ? (
        <div className="p-2.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 text-xs font-semibold text-rose-950 dark:text-rose-100 leading-snug">
          {value}
        </div>
      ) : (
        <div className="p-2 rounded-lg border border-dashed border-rose-300/60 dark:border-rose-800/40 text-[10.5px] text-rose-600/70 italic text-center">
          Aucun problème sélectionné. Choisissez une idée renseignée dans le Brainstorming ci-dessus.
        </div>
      )}
    </div>
  );
};

const EditableList = ({ items, onChange, placeholder, bulletColor = 'text-slate-400', textColor = 'text-slate-600 dark:text-slate-300' }: {
  items: string[];
  onChange: (newItems: string[]) => void;
  placeholder?: string;
  bulletColor?: string;
  textColor?: string;
}) => {
  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };
  const handleAddItem = () => {
    onChange([...items, '']);
  };
  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-1 group">
          <span className={`text-[10px] sm:text-[11px] mt-0.5 ${bulletColor}`}>•</span>
          <AutoResizeTextarea
            value={item}
            onChange={(e) => handleItemChange(idx, e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-transparent text-[10px] sm:text-[11px] font-semibold focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50 rounded px-1 py-0.5 ${textColor}`}
          />
          <button
            onClick={() => handleRemoveItem(idx)}
            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity p-0.5 shrink-0"
            title="Supprimer"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}
      <button
        onClick={handleAddItem}
        className="text-[10px] font-semibold text-slate-400 hover:text-[#16a34a] dark:hover:text-[#86efac] flex items-center gap-1 mt-1 py-0.5 px-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <Plus size={10} /> Ajouter
      </button>
    </div>
  );
};

const EditableResourceList = ({
  items,
  onChange,
  placeholder,
  accentColor = 'sky',
  currency = 'FCFA'
}: {
  items: GARResourceItem[];
  onChange: (newItems: GARResourceItem[]) => void;
  placeholder?: string;
  accentColor?: 'sky' | 'amber';
  currency?: CurrencyCode;
}) => {
  const handleItemChange = (index: number, field: keyof GARResourceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleAddItem = () => {
    onChange([
      ...items,
      {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: '',
        quantity: 1,
        unitCost: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);

  const badgeBg =
    accentColor === 'sky'
      ? 'bg-sky-100/80 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800'
      : 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800';

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => {
        const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
        return (
          <div
            key={item.id || idx}
            className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1 group"
          >
            <div className="flex items-start gap-1">
              <AutoResizeTextarea
                value={item.label}
                onChange={(e) => handleItemChange(idx, 'label', e.target.value)}
                placeholder={placeholder || 'Désignation...'}
                className="w-full bg-transparent text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800 rounded px-1 py-0.5"
              />
              <button
                onClick={() => handleRemoveItem(idx)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-0.5 shrink-0"
                title="Supprimer la ligne"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <div className="grid grid-cols-12 gap-1 items-center pt-0.5 border-t border-slate-100 dark:border-slate-800">
              <div className="col-span-3 flex items-center gap-0.5">
                <span className="text-[9px] font-bold uppercase text-slate-400">Qté:</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full text-[10px] font-bold text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
              <div className="col-span-5 flex items-center gap-0.5">
                <span className="text-[9px] font-bold uppercase text-slate-400">PU:</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={item.unitCost}
                  onChange={(e) => handleItemChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                  className="w-full text-[10px] font-bold text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
              <div className="col-span-4 text-right">
                <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${badgeBg} truncate max-w-full`}>
                  {formatCurrencyValue(lineTotal, currency)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleAddItem}
          className="text-[10px] font-bold text-slate-500 hover:text-[#16a34a] dark:text-slate-400 dark:hover:text-[#86efac] flex items-center gap-1 py-0.5 px-1.5 rounded bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700 transition-colors"
        >
          <Plus size={10} /> Ajouter ligne
        </button>
        <div className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
          Sous-total: <span className="text-slate-900 dark:text-white">{formatCurrencyValue(subtotal, currency)}</span>
        </div>
      </div>
    </div>
  );
};

export const GarBrainstormingTabsView: React.FC<GarBrainstormingTabsViewProps> = ({
  activeTab,
  dossier,
  onUpdateDossier,
  userProfile,
  currency,
  language,
  onShowToast,
  onNavigateTab
}) => {
  const isEn = language === 'EN';

  // Ensure garData is always available for the active dossier
  const garData: GARData = useMemo(() => buildDefaultGarDataFromDossier(dossier), [dossier]);

  const updateGarData = (updater: (prev: GARData) => GARData) => {
    onUpdateDossier((d) => {
      const current = buildDefaultGarDataFromDossier(d);
      const next = updater(JSON.parse(JSON.stringify(current)));
      const todayIso = new Date().toISOString().split('T')[0];

      // Auto-propagate activities and intrant budgets from Solution Tree directly to Operational Planning
      const updatedAxes: Axe[] = next.axes.map((gAxe, aIdx) => {
        const existingAxe = d.axes.find((ax) => ax.id === gAxe.id) || d.axes[aIdx];
        const updatedProjects: Project[] = gAxe.branches.map((gBranch, bIdx) => {
          const existingProj = existingAxe?.projects.find((p) => p.id === gBranch.id) || existingAxe?.projects[bIdx];
          const updatedTasks: Task[] = gBranch.inputs.map((gInput, tIdx) => {
            const existingTask = existingProj?.tasks.find((t) => t.id === gInput.id) || existingProj?.tasks[tIdx];
            const rhCost = (gInput.rhDetails || []).reduce((acc, r) => acc + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0);
            const matCost = (gInput.materielDetails || []).reduce((acc, r) => acc + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0);
            const numericBudget = rhCost + matCost || Number(String(gInput.budget || '0').replace(/[^0-9]/g, '')) || 0;

            return {
              id: existingTask?.id || gInput.id || `task-${aIdx + 1}-${bIdx + 1}-${tIdx + 1}`,
              type: existingTask?.type || 'tache',
              phase: existingTask?.phase || 'EXÉCUTION',
              name: gInput.solutionText || existingTask?.name || `Activité ${tIdx + 1}`,
              startDate: existingTask?.startDate || todayIso,
              endDate: existingTask?.endDate || todayIso,
              actualStartDate: existingTask?.actualStartDate,
              actualEndDate: existingTask?.actualEndDate,
              status: existingTask?.status || 'À faire',
              assignee: existingTask?.assignee || gInput.acteursInternes?.[0] || userProfile.fullName || 'Chef de Projet',
              autorite: existingTask?.autorite || 'Comité de Pilotage (COPIL)',
              consulte: existingTask?.consulte || (gInput.partenairesTechniques || []).join(', ') || 'Experts Techniques',
              informe: existingTask?.informe || (gInput.beneficiaires || []).join(', ') || 'Parties Prenantes',
              responsabilite: gInput.tdrObjectifSpecifique || existingTask?.responsabilite || gBranch.output,
              livrable: gInput.tdrLivrables?.split('\n')[0]?.replace(/^-\s*/, '') || existingTask?.livrable || 'Livrable validé',
              budget: numericBudget,
              antecedent: existingTask?.antecedent || '—'
            };
          });

          return {
            id: existingProj?.id || gBranch.id || `proj-${aIdx + 1}-${bIdx + 1}`,
            name: gBranch.output || existingProj?.name || `Projet ${bIdx + 1}`,
            tasks: updatedTasks
          };
        });

        return {
          id: existingAxe?.id || gAxe.id || `axe-${aIdx + 1}`,
          name: gAxe.service || existingAxe?.name || `Axe Stratégique ${aIdx + 1}`,
          projects: updatedProjects
        };
      });

      const nextDossier: Dossier = {
        ...d,
        axes: updatedAxes,
        garData: next
      };
      return {
        ...nextDossier,
        categorizedActors: ensureDossierCategorizedActors(nextDossier, userProfile)
      };
    });
  };

  // Push GAR Solution Tree (Axes -> Branches -> Activités) into Dossier's Operational Planning
  const handlePushGarToPlanning = () => {
    onUpdateDossier((d) => {
      const currentGar = buildDefaultGarDataFromDossier(d);
      const todayIso = new Date().toISOString().split('T')[0];

      const updatedAxes: Axe[] = currentGar.axes.map((gAxe, aIdx) => {
        const existingAxe = d.axes.find((ax) => ax.id === gAxe.id) || d.axes[aIdx];
        const updatedProjects: Project[] = gAxe.branches.map((gBranch, bIdx) => {
          const existingProj = existingAxe?.projects.find((p) => p.id === gBranch.id) || existingAxe?.projects[bIdx];
          const updatedTasks: Task[] = gBranch.inputs.map((gInput, tIdx) => {
            const existingTask = existingProj?.tasks.find((t) => t.id === gInput.id) || existingProj?.tasks[tIdx];
            const rhCost = (gInput.rhDetails || []).reduce((acc, r) => acc + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0);
            const matCost = (gInput.materielDetails || []).reduce((acc, r) => acc + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0);
            const numericBudget = rhCost + matCost || Number(String(gInput.budget || '0').replace(/[^0-9]/g, '')) || 0;

            return {
              id: existingTask?.id || gInput.id || `task-${aIdx + 1}-${bIdx + 1}-${tIdx + 1}`,
              type: existingTask?.type || 'tache',
              phase: existingTask?.phase || 'EXÉCUTION',
              name: gInput.solutionText || existingTask?.name || `Activité ${tIdx + 1}`,
              startDate: existingTask?.startDate || todayIso,
              endDate: existingTask?.endDate || todayIso,
              actualStartDate: existingTask?.actualStartDate,
              actualEndDate: existingTask?.actualEndDate,
              status: existingTask?.status || 'À faire',
              assignee: gInput.acteursInternes?.[0] || existingTask?.assignee || userProfile.fullName || 'Chef de Projet',
              autorite: existingTask?.autorite || 'Comité de Pilotage (COPIL)',
              consulte: existingTask?.consulte || (gInput.partenairesTechniques || []).join(', ') || 'Experts Techniques',
              informe: existingTask?.informe || (gInput.beneficiaires || []).join(', ') || 'Parties Prenantes',
              responsabilite: gInput.tdrObjectifSpecifique || existingTask?.responsabilite || gBranch.output,
              livrable: gInput.tdrLivrables?.split('\n')[0]?.replace(/^-\s*/, '') || existingTask?.livrable || 'Livrable validé',
              budget: numericBudget,
              antecedent: existingTask?.antecedent || '—'
            };
          });

          return {
            id: existingProj?.id || gBranch.id || `proj-${aIdx + 1}-${bIdx + 1}`,
            name: gBranch.output || existingProj?.name || `Projet ${bIdx + 1}`,
            tasks: updatedTasks
          };
        });

        return {
          id: existingAxe?.id || gAxe.id || `axe-${aIdx + 1}`,
          name: gAxe.service || existingAxe?.name || `Axe Stratégique ${aIdx + 1}`,
          projects: updatedProjects
        };
      });

      const nextDossier: Dossier = {
        ...d,
        name: currentGar.projectTitle || d.name,
        institution: currentGar.organizationName || d.institution,
        description: currentGar.projectDescription || d.description,
        axes: updatedAxes,
        garData: currentGar
      };
      return {
        ...nextDossier,
        categorizedActors: ensureDossierCategorizedActors(nextDossier, userProfile)
      };
    });
    onShowToast?.(
      isEn
        ? 'Operational Planning (Axes, Projects, Tasks & Budgets) updated from GAR Solution Tree!'
        : 'Planification Opérationnelle (Axes, Projets, Tâches & Budgets) mise à jour depuis l’Arbre à Solutions GAR !'
    );
  };

  // Local UI state for Tree / List display and zoom
  const [treeZoom, setTreeZoom] = useState<number>(85);
  const [treeDisplayMode, setTreeDisplayMode] = useState<'tree' | 'list'>('tree');
  const [activeAxeId, setActiveAxeId] = useState<string>(garData.axes[0]?.id || '');
  const [activeBranchId, setActiveBranchId] = useState<string>(garData.axes[0]?.branches[0]?.id || '');
  const [stakeholderFilterAxeId, setStakeholderFilterAxeId] = useState<string>('ALL');
  const [stakeholderFilterBranchId, setStakeholderFilterBranchId] = useState<string>('ALL');

  // TDR Filters & Checkboxes
  const [tdrAxeId, setTdrAxeId] = useState<string>('ALL');
  const [tdrBranchId, setTdrBranchId] = useState<string>('ALL');
  const [tdrActivityId, setTdrActivityId] = useState<string>('ALL');
  const [tdrFields, setTdrFields] = useState({
    contexteJustification: true,
    objectifGlobal: true,
    objectifsSpecifiques: true,
    resultatsAttendus: true,
    tachesMandat: true,
    livrablesAttendus: true,
    dureeCalendrier: true,
    profilExperts: true,
    ressourcesBudget: true,
    partiesPrenantes: true,
    hypothesesRisques: true,
    modalitesPaiement: true
  });

  useEffect(() => {
    if (!garData.axes.some((a) => a.id === activeAxeId)) {
      const firstAxe = garData.axes[0];
      setActiveAxeId(firstAxe?.id || '');
      setActiveBranchId(firstAxe?.branches[0]?.id || '');
    }
  }, [garData.axes, activeAxeId]);

  const activeAxe = garData.axes.find((a) => a.id === activeAxeId) || garData.axes[0];
  const activeBranch = activeAxe?.branches.find((b) => b.id === activeBranchId) || activeAxe?.branches[0];

  // Calculate total budget of an input node
  const computeInputTotal = (input: GARNodeInput): number => {
    const rhSum = (input.rhDetails || []).reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0);
    const matSum = (input.materielDetails || []).reduce((s, m) => s + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0), 0);
    if (rhSum + matSum > 0) return rhSum + matSum;
    return Number(String(input.budget || '0').replace(/[^0-9]/g, '')) || 0;
  };

  const totalGarBudget = useMemo(() => {
    return garData.axes.reduce(
      (sumAxe, ax) =>
        sumAxe +
        ax.branches.reduce(
          (sumBr, br) => sumBr + br.inputs.reduce((sumIn, inp) => sumIn + computeInputTotal(inp), 0),
          0
        ),
      0
    );
  }, [garData]);

  // CRUD Mutations for GAR Tree
  const handleAddAxe = () => {
    const newAxeId = `axe-${Date.now()}`;
    const newBranchId = `b-${Date.now()}-1`;
    updateGarData((prev) => {
      prev.axes.push({
        id: newAxeId,
        service: `Nouvel Axe / Service ${prev.axes.length + 1}`,
        centralProblem: 'Problème central à définir',
        effect: 'Effet attendu (Objectif spécifique) à définir',
        hypotheses: {
          globale: 'Hypothèse globale à préciser',
          interne: 'Condition interne à préciser',
          externe: 'Condition externe à préciser',
          partenaires: 'Engagement des partenaires à préciser'
        },
        branches: [
          {
            id: newBranchId,
            constraint: 'Contrainte principale à définir',
            output: 'Extrant (Livrable majeur) à définir',
            hypotheses: {
              globale: 'Stabilité opérationnelle',
              interne: 'Mobilisation interne',
              externe: 'Validation externe',
              partenaires: 'Appui des partenaires'
            },
            stakeholders: {
              beneficiaires: ['Bénéficiaires finaux'],
              acteursInternes: ['Équipe Projet Interne'],
              acteursExternes: ['Autorité de Régulation / Tutelle'],
              partenairesTechniques: ['Prestataires Techniques'],
              partenairesFinanciers: ['Partenaires Financiers']
            },
            inputs: [
              {
                id: `in-${Date.now()}-1`,
                problemText: 'Cause profonde à préciser',
                solutionText: 'Activité opérationnelle à préciser',
                needText: 'Besoin opérationnel associé',
                budget: '0 FCFA',
                rh: [],
                materiel: [],
                rhDetails: [],
                materielDetails: []
              }
            ]
          }
        ]
      });
      return prev;
    });
    setActiveAxeId(newAxeId);
    setActiveBranchId(newBranchId);
  };

  const handleRemoveAxe = (axeIdx: number) => {
    if (garData.axes.length <= 1) return;
    updateGarData((prev) => {
      prev.axes.splice(axeIdx, 1);
      return prev;
    });
  };

  const handleAddBranch = (axeIdx: number) => {
    const newBranchId = `b-${Date.now()}`;
    updateGarData((prev) => {
      prev.axes[axeIdx].branches.push({
        id: newBranchId,
        constraint: 'Nouvelle contrainte identifiée',
        output: 'Nouvel extrant attendu',
        hypotheses: {
          globale: 'Hypothèse globale de la branche',
          interne: 'Condition interne de la branche',
          externe: 'Condition externe de la branche',
          partenaires: 'Condition partenaires de la branche'
        },
        stakeholders: {
          beneficiaires: [],
          acteursInternes: [],
          acteursExternes: [],
          partenairesTechniques: [],
          partenairesFinanciers: []
        },
        inputs: [
          {
            id: `in-${Date.now()}`,
            problemText: 'Nouvelle cause profonde',
            solutionText: 'Nouvelle activité à réaliser',
            needText: 'Besoin opérationnel associé',
            budget: '0 FCFA',
            rh: [],
            materiel: [],
            rhDetails: [],
            materielDetails: []
          }
        ]
      });
      return prev;
    });
    setActiveAxeId(garData.axes[axeIdx].id);
    setActiveBranchId(newBranchId);
  };

  const handleRemoveBranch = (axeIdx: number, branchIdx: number) => {
    if (garData.axes[axeIdx].branches.length <= 1) return;
    updateGarData((prev) => {
      prev.axes[axeIdx].branches.splice(branchIdx, 1);
      return prev;
    });
  };

  const handleAddInput = (axeIdx: number, branchIdx: number) => {
    updateGarData((prev) => {
      prev.axes[axeIdx].branches[branchIdx].inputs.push({
        id: `in-${Date.now()}`,
        problemText: 'Nouvelle cause profonde',
        solutionText: 'Nouvelle activité opérationnelle',
        needText: 'Nouveau besoin identifié',
        budget: '0 FCFA',
        rh: [],
        materiel: [],
        rhDetails: [],
        materielDetails: []
      });
      return prev;
    });
  };

  const handleRemoveInput = (axeIdx: number, branchIdx: number, inputIdx: number) => {
    if (garData.axes[axeIdx].branches[branchIdx].inputs.length <= 1) return;
    updateGarData((prev) => {
      prev.axes[axeIdx].branches[branchIdx].inputs.splice(inputIdx, 1);
      return prev;
    });
  };

  const updateResourceDetails = (
    axeIdx: number,
    branchIdx: number,
    inputIdx: number,
    type: 'rh' | 'materiel',
    newItems: GARResourceItem[]
  ) => {
    updateGarData((prev) => {
      const inp = prev.axes[axeIdx].branches[branchIdx].inputs[inputIdx];
      if (type === 'rh') {
        inp.rhDetails = newItems;
        inp.rh = newItems.map(
          (i) => `${i.label || 'Ressource'} (${i.quantity} x ${i.unitCost.toLocaleString('fr-FR')} = ${(i.quantity * i.unitCost).toLocaleString('fr-FR')})`
        );
      } else {
        inp.materielDetails = newItems;
        inp.materiel = newItems.map(
          (i) => `${i.label || 'Matériel'} (${i.quantity} x ${i.unitCost.toLocaleString('fr-FR')} = ${(i.quantity * i.unitCost).toLocaleString('fr-FR')})`
        );
      }
      const rhTotal = (inp.rhDetails || []).reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0);
      const matTotal = (inp.materielDetails || []).reduce((s, m) => s + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0), 0);
      inp.budget = `${(rhTotal + matTotal).toLocaleString('fr-FR')} FCFA`;
      return prev;
    });
  };

  // Top Sub-navigation bar for seamless switching between the 5 GAR tabs + Sync actions
  const renderGarTopBar = () => {
    const garTabs: { id: GarTabId; labelFr: string; labelEn: string; badge: string; icon: React.ReactNode }[] = [
      { id: 'brainstorming', labelFr: 'Brainstorming', labelEn: 'Brainstorming', badge: `${(garData.brainstormingIdeas || []).length}`, icon: <Lightbulb className="w-3.5 h-3.5" /> },
      { id: 'arbre', labelFr: 'Arbre à Problèmes', labelEn: 'Problem Tree', badge: `${garData.axes.length} Axes`, icon: <GitFork className="w-3.5 h-3.5" /> },
      { id: 'solutions', labelFr: 'Arbre à Solutions & Intrants', labelEn: 'Solution Tree & Inputs', badge: formatCurrencyValue(totalGarBudget, currency), icon: <Target className="w-3.5 h-3.5" /> },
      { id: 'registre_parties', labelFr: 'Registre Parties Prenantes', labelEn: 'Stakeholder Register', badge: '5 Cat.', icon: <BookOpen className="w-3.5 h-3.5" /> },
      { id: 'tdr', labelFr: 'Générateur TDR (GAR)', labelEn: 'Logical TOR Generator', badge: 'PDF A4', icon: <FileText className="w-3.5 h-3.5" /> }
    ];

    return (
      <div className="mb-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#14532d] text-[#86efac] flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#14532d] text-[#86efac]">
                  MODULE GAR & BRAINSTORMING
                </span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {dossier.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {isEn
                  ? 'Results-Based Management (RBM): Brainstorming, Problem Tree, Solution Tree, Stakeholders & Logical TOR'
                  : 'Gestion Axée sur les Résultats (GAR) : Brainstorming, Arbre à problèmes, Arbre à solutions, Parties Prenantes & TDR'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePushGarToPlanning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#14532d] hover:bg-[#166534] text-white shadow-xs transition-colors cursor-pointer"
              title="Propager les Axes, Extrants, Activités et Budgets de l'Arbre à Solutions vers la Planification Opérationnelle"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#86efac]" />
              <span>{isEn ? 'Sync to Planning' : 'Synchroniser vers Planification'}</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 no-scrollbar">
          {garTabs.map((t) => {
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onNavigateTab?.(t.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-[#14532d] text-white border-[#14532d] shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={isCurrent ? 'text-[#86efac]' : 'text-slate-500 dark:text-slate-400'}>{t.icon}</span>
                <span>{isEn ? t.labelEn : t.labelFr}</span>
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                    isCurrent
                      ? 'bg-[#86efac] text-slate-950'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================================
  // TAB 1: BRAINSTORMING
  // ============================================================================
  const renderBrainstormingTab = () => {
    const ideas = garData.brainstormingIdeas || [];

    const handleAddIdea = () => {
      updateGarData((prev) => {
        if (!prev.brainstormingIdeas) prev.brainstormingIdeas = [];
        prev.brainstormingIdeas.push({
          id: `bs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          problemText: '',
          solutionText: '',
          color: 'slate'
        });
        return prev;
      });
    };

    const handleUpdateIdea = (index: number, field: keyof GARBrainstormingIdea, value: string) => {
      updateGarData((prev) => {
        if (!prev.brainstormingIdeas) prev.brainstormingIdeas = [];
        prev.brainstormingIdeas[index] = {
          ...prev.brainstormingIdeas[index],
          [field]: value
        };
        return prev;
      });
    };

    const handleDeleteIdea = (index: number) => {
      updateGarData((prev) => {
        if (!prev.brainstormingIdeas) return prev;
        prev.brainstormingIdeas.splice(index, 1);
        return prev;
      });
    };

    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Lightbulb size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isEn ? 'Brainstorming Board (Problems & Solutions)' : 'Tableau de Brainstorming (Problèmes & Solutions)'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEn
                    ? 'Formulate negative findings (Problems) and transform them into positive states (Solutions) before structuring your GAR trees.'
                    : 'Notez librement toutes vos idées de constats négatifs (Problèmes) et d’états positifs (Solutions) avant de les organiser dans les Arbres GAR.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddIdea}
                className="flex items-center gap-2 px-4 py-2 bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus size={15} />
                <span>{isEn ? 'Add Idea Card' : 'Ajouter une carte d’idée'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3 mt-3">
            {ideas.map((idea, idx) => {
              const colorObj = BRAINSTORMING_COLORS.find((c) => c.id === idea.color) || BRAINSTORMING_COLORS[0];
              return (
                <div
                  key={idea.id}
                  className={`${colorObj.bg} border ${colorObj.border} rounded-lg p-2.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-2 relative overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 ${colorObj.accent}`} />

                  {/* Card Header: Number + Color Picker + Delete */}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      Idée #{idx + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5 bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        {BRAINSTORMING_COLORS.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleUpdateIdea(idx, 'color', c.id)}
                            title={`Couleur : ${c.label}`}
                            className={`w-2.5 h-2.5 rounded-full ${c.accent} transition-transform ${
                              idea.color === c.id ? 'scale-125 ring-1 ring-offset-1 ring-slate-700 dark:ring-white' : 'opacity-60 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => handleDeleteIdea(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
                        title="Supprimer cette carte"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Problem Input (Negative) */}
                  <div className="bg-white/90 dark:bg-slate-900/90 rounded-md p-1.5 border border-rose-200 dark:border-rose-900/60 shadow-2xs space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-[8.5px] font-black uppercase tracking-wide text-rose-700 dark:text-rose-400 truncate">
                        {isEn ? 'Problem (Negative)' : 'Problème (Négatif)'}
                      </span>
                    </div>
                    <AutoResizeTextarea
                      value={idea.problemText}
                      onChange={(e) => handleUpdateIdea(idx, 'problemText', e.target.value)}
                      placeholder="Ex: Constat négatif..."
                      className="w-full bg-transparent text-[10.5px] leading-snug text-slate-800 dark:text-slate-200 font-medium focus:outline-none min-h-[34px]"
                    />
                  </div>

                  {/* Solution Input (Positive) */}
                  <div className="bg-white/90 dark:bg-slate-900/90 rounded-md p-1.5 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[8.5px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400 truncate">
                        {isEn ? 'Solution (Positive)' : 'Solution (Positive)'}
                      </span>
                    </div>
                    <AutoResizeTextarea
                      value={idea.solutionText}
                      onChange={(e) => handleUpdateIdea(idx, 'solutionText', e.target.value)}
                      placeholder="Ex: Solution formulée..."
                      className="w-full bg-transparent text-[10.5px] leading-snug text-slate-800 dark:text-slate-200 font-medium focus:outline-none min-h-[34px]"
                    />
                  </div>
                </div>
              );
            })}

            {/* Add Card Tile (Half-size) */}
            <button
              onClick={handleAddIdea}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#16a34a] dark:hover:border-[#86efac] bg-slate-50/50 dark:bg-slate-800/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 rounded-lg p-3 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#16a34a] dark:hover:text-[#86efac] transition-all min-h-[140px] group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                <Plus size={16} />
              </div>
              <span className="text-[11px] font-bold">{isEn ? 'Add Idea Card' : 'Ajouter une idée'}</span>
              <span className="text-[9.5px] text-slate-400 text-center max-w-[150px]">
                {isEn ? 'Problem / Solution' : 'Problème / Solution'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // TAB 2 & 3: ARBRE À PROBLÈMES & ARBRE À SOLUTIONS
  // ============================================================================
  const renderTreesTab = (mode: 'problem' | 'solution') => {
    const isProblem = mode === 'problem';
    const ideas = garData.brainstormingIdeas || [];

    return (
      <div className="space-y-4">
        {/* Toolbar: Tree vs List View + Zoom Controls + Add Axe */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setTreeDisplayMode('tree')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  treeDisplayMode === 'tree'
                    ? 'bg-[#14532d] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{isEn ? 'Graphic Tree View' : 'Vue Arbre Graphique'}</span>
              </button>
              <button
                type="button"
                onClick={() => setTreeDisplayMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  treeDisplayMode === 'list'
                    ? 'bg-[#14532d] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>{isEn ? 'Structured List View' : 'Vue Liste Compacte'}</span>
              </button>
            </div>

            {treeDisplayMode === 'tree' && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTreeZoom((z) => Math.max(50, z - 10))}
                  className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                  title="Zoom -"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 min-w-[42px] text-center">
                  {treeZoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setTreeZoom((z) => Math.min(130, z + 10))}
                  className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                  title="Zoom +"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTreeZoom(85)}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded"
                  title="Réinitialiser le zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isProblem && (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Budget GAR Consolidé : {formatCurrencyValue(totalGarBudget, currency)}</span>
              </div>
            )}
            {isProblem && (
              <button
                type="button"
                onClick={handleAddAxe}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#86efac]" />
                <span>{isEn ? 'Add Strategic Axis / Service' : 'Ajouter un Axe / Service'}</span>
              </button>
            )}
          </div>
        </div>

        {/* LIST VIEW MODE */}
        {treeDisplayMode === 'list' ? (
          <div className="space-y-4">
            {/* Level 1: Consequence / Impact */}
            {/* Level 1: Consequence / Impact */}
            {isProblem ? (
              <div className="p-4 rounded-xl border-2 shadow-xs bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800">
                <ProblemChooser
                  ideas={ideas}
                  value={garData.consequence}
                  onSelect={(prob, sol) =>
                    updateGarData((prev) => {
                      prev.consequence = prob;
                      if (sol) prev.impact = sol;
                      return prev;
                    })
                  }
                  label="Niveau 1 : Conséquence Globale (Constat Négatif Majeur)"
                  placeholder="Sélectionner la conséquence globale parmi les idées du Brainstorming..."
                />
              </div>
            ) : (
              <div className="p-4 rounded-xl border-2 shadow-xs bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      Niveau 1 : Impact Global (Objectif Général)
                    </span>
                  </div>
                  <span className="text-[8.5px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <span>🔒</span> Non modifiable (Arbre à Problèmes)
                  </span>
                </div>
                <div className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                  {garData.impact || <span className="text-slate-400 italic">En attente de sélection de la Conséquence Globale dans l’Arbre à Problèmes</span>}
                </div>
              </div>
            )}

            {/* Axes */}
            {garData.axes.map((axe, axeIdx) => (
              <div
                key={axe.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                <div className="bg-[#14532d] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#86efac] text-slate-950">
                      AXE {axeIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={axe.service}
                      onChange={(e) =>
                        updateGarData((prev) => {
                          prev.axes[axeIdx].service = e.target.value;
                          return prev;
                        })
                      }
                      className="bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white font-extrabold text-sm rounded px-2.5 py-1 flex-1 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {isProblem && (
                      <button
                        type="button"
                        onClick={() => handleAddBranch(axeIdx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter Branche
                      </button>
                    )}
                    {isProblem && garData.axes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAxe(axeIdx)}
                        className="p-1.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 cursor-pointer"
                        title="Supprimer cet Axe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Problème Central / Effet Attendu + Hypothèse */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    {isProblem ? (
                      <ProblemChooser
                        ideas={ideas}
                        value={axe.centralProblem}
                        onSelect={(prob, sol) =>
                          updateGarData((prev) => {
                            prev.axes[axeIdx].centralProblem = prob;
                            if (sol) prev.axes[axeIdx].effect = sol;
                            return prev;
                          })
                        }
                        label="Problème Central de l’Axe"
                        placeholder="Sélectionner le problème central de l’axe..."
                      />
                    ) : (
                      <div className="space-y-3">
                        {/* Hypothèse & Contre-Axe Conditionnel */}
                        <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac]">
                              Hypothèse de l'Axe (Axe Conditionnel / Contre-Axe)
                            </span>
                            <span className="text-[8.5px] font-bold text-slate-500">Condition de réussite</span>
                          </div>
                          <select
                            value={axe.conditionAxeId || ''}
                            onChange={(e) => {
                              const targetAxeId = e.target.value;
                              const targetAxe = garData.axes.find((a) => a.id === targetAxeId);
                              updateGarData((prev) => {
                                prev.axes[axeIdx].conditionAxeId = targetAxeId;
                                if (targetAxe) {
                                  prev.axes[axeIdx].hypotheses.globale = `Conditionné par la réussite de : ${targetAxe.service}`;
                                }
                                return prev;
                              });
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#86efac]"
                          >
                            <option value="">-- Choisir un autre axe comme hypothèse/condition --</option>
                            {garData.axes
                              .filter((a) => a.id !== axe.id)
                              .map((otherAxe) => (
                                <option key={otherAxe.id} value={otherAxe.id}>
                                  Contre-Axe : {otherAxe.service}
                                </option>
                              ))}
                          </select>
                          {axe.conditionAxeId && (
                            <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 bg-white/90 dark:bg-slate-900/90 p-2 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                Condition de réussite liée à : <strong>{garData.axes.find((a) => a.id === axe.conditionAxeId)?.service || axe.conditionAxeId}</strong>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Effet Attendu (Objectif Spécifique) - Non modifiable */}
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-black uppercase tracking-wider text-[#16a34a] dark:text-[#86efac]">
                              Effet Attendu (Objectif Spécifique de l’Axe)
                            </div>
                            <span className="text-[8px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded-full">
                              🔒 Non modifiable
                            </span>
                          </div>
                          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100">
                            {axe.effect || <span className="text-slate-400 italic">En attente de sélection du Problème Central dans l’Arbre à Problèmes</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Branches */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {axe.branches.map((branch, bIdx) => (
                      <div
                        key={branch.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 bg-slate-50/40 dark:bg-slate-800/30 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {isProblem ? `Contrainte ${axeIdx + 1}.${bIdx + 1}` : `Extrant ${axeIdx + 1}.${bIdx + 1}`}
                          </span>
                          <div className="flex items-center gap-1">
                            {isProblem && (
                              <button
                                type="button"
                                onClick={() => handleAddInput(axeIdx, bIdx)}
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 hover:bg-sky-200 cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Cause
                              </button>
                            )}
                            {isProblem && axe.branches.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBranch(axeIdx, bIdx)}
                                className="p-1 text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {isProblem ? (
                          <ProblemChooser
                            ideas={ideas}
                            value={branch.constraint}
                            onSelect={(prob, sol) =>
                              updateGarData((prev) => {
                                prev.axes[axeIdx].branches[bIdx].constraint = prob;
                                if (sol) prev.axes[axeIdx].branches[bIdx].output = sol;
                                return prev;
                              })
                            }
                            label={`Contrainte ${axeIdx + 1}.${bIdx + 1}`}
                            placeholder="Sélectionner la contrainte parmi les idées du Brainstorming..."
                          />
                        ) : (
                          <div className="p-2.5 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-800/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 dark:text-sky-300">
                                Extrant {axeIdx + 1}.{bIdx + 1}
                              </span>
                              <span className="text-[8px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-900/60 px-1 py-0.2 rounded-full">
                                🔒 Non modifiable
                              </span>
                            </div>
                            <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {branch.output || <span className="text-slate-400 italic">En attente de sélection de la Contrainte dans l’Arbre à Problèmes</span>}
                            </div>

                            {/* Choix de l'Hypothèse de l'Extrant (uniquement parmi les autres Extrants) */}
                            {(() => {
                              const otherExtrants = garData.axes
                                .flatMap((oa, oaIdx) =>
                                  oa.branches.map((ob, obIdx) => ({
                                    id: ob.id,
                                    code: `${oaIdx + 1}.${obIdx + 1}`,
                                    output: ob.output || `Extrant ${oaIdx + 1}.${obIdx + 1}`
                                  }))
                                )
                                .filter((item) => item.id !== branch.id);

                              const selectedExtrant = otherExtrants.find(
                                (item) =>
                                  item.id === branch.conditionBranchId ||
                                  branch.hypotheseText === `Conditionné par l’Extrant ${item.code} : ${item.output}`
                              );

                              return (
                                <div className="p-2 rounded bg-white/90 dark:bg-slate-900/90 border border-sky-200 dark:border-sky-800/70 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9.5px] font-black uppercase tracking-wider text-sky-900 dark:text-sky-300">
                                      Hypothèse de l’Extrant (Autre Extrant Conditionnel)
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-500">Condition</span>
                                  </div>
                                  <select
                                    value={selectedExtrant?.id || branch.conditionBranchId || ''}
                                    onChange={(e) => {
                                      const targetBranchId = e.target.value;
                                      const target = otherExtrants.find((item) => item.id === targetBranchId);
                                      const hypLabel = target
                                        ? `Conditionné par l’Extrant ${target.code} : ${target.output}`
                                        : '';
                                      updateGarData((prev) => {
                                        prev.axes[axeIdx].branches[bIdx].conditionBranchId = targetBranchId || undefined;
                                        prev.axes[axeIdx].branches[bIdx].hypotheseText = hypLabel;
                                        if (!prev.axes[axeIdx].branches[bIdx].hypotheses) {
                                          prev.axes[axeIdx].branches[bIdx].hypotheses = {
                                            globale: hypLabel,
                                            interne: '',
                                            externe: '',
                                            partenaires: ''
                                          };
                                        } else {
                                          prev.axes[axeIdx].branches[bIdx].hypotheses!.globale = hypLabel;
                                        }
                                        return prev;
                                      });
                                    }}
                                    className="w-full bg-sky-50/60 dark:bg-slate-800 border border-sky-300 dark:border-sky-700 rounded px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                                  >
                                    <option value="">-- Choisir un autre extrant comme hypothèse/condition --</option>
                                    {otherExtrants.map((item) => (
                                      <option key={`ext-hyp-${item.id}`} value={item.id}>
                                        Contre-Extrant {item.code} : {item.output}
                                      </option>
                                    ))}
                                  </select>
                                  {selectedExtrant && (
                                    <div className="text-[10.5px] font-semibold text-sky-900 dark:text-sky-200 bg-sky-50/80 dark:bg-slate-800/90 p-1.5 rounded border border-sky-200 dark:border-sky-800 flex items-center gap-1.5">
                                      <ArrowRightLeft className="w-3 h-3 text-sky-600 shrink-0" />
                                      <span>
                                        Condition liée à l’Extrant {selectedExtrant.code} : <strong>{selectedExtrant.output}</strong>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Inputs (Causes / Activités) */}
                        <div className="space-y-2 pl-3 border-l-2 border-slate-300 dark:border-slate-700">
                          {branch.inputs.map((inp, iIdx) => (
                            <div
                              key={inp.id}
                              className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500">
                                  {isProblem
                                    ? `Cause ${axeIdx + 1}.${bIdx + 1}.${iIdx + 1}`
                                    : `Activité ${axeIdx + 1}.${bIdx + 1}.${iIdx + 1}`}
                                </span>
                                {isProblem && branch.inputs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInput(axeIdx, bIdx, iIdx)}
                                    className="text-slate-400 hover:text-rose-500"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {isProblem ? (
                                <ProblemChooser
                                  ideas={ideas}
                                  value={inp.problemText}
                                  onSelect={(prob, sol) =>
                                    updateGarData((prev) => {
                                      prev.axes[axeIdx].branches[bIdx].inputs[iIdx].problemText = prob;
                                      if (sol) prev.axes[axeIdx].branches[bIdx].inputs[iIdx].solutionText = sol;
                                      return prev;
                                    })
                                  }
                                  label={`Cause ${axeIdx + 1}.${bIdx + 1}.${iIdx + 1}`}
                                  placeholder="Sélectionner la cause parmi les idées du Brainstorming..."
                                />
                              ) : (
                                <div className="p-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#14532d] dark:text-[#86efac]">
                                      Activité {axeIdx + 1}.{bIdx + 1}.${iIdx + 1}
                                    </span>
                                    <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-1 py-0.2 rounded-full">
                                      🔒 Non modifiable
                                    </span>
                                  </div>
                                  <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white">
                                    {inp.solutionText || <span className="text-slate-400 italic">En attente de sélection de la Cause dans l’Arbre à Problèmes</span>}
                                  </div>

                                  {/* Choix de l'Hypothèse de l'Activité (uniquement parmi les autres Activités) */}
                                  {(() => {
                                    const otherActivities = garData.axes
                                      .flatMap((oa, oaIdx) =>
                                        oa.branches.flatMap((ob, obIdx) =>
                                          ob.inputs.map((oi, oiIdx) => ({
                                            id: oi.id,
                                            code: `${oaIdx + 1}.${obIdx + 1}.${oiIdx + 1}`,
                                            solutionText: oi.solutionText || `Activité ${oaIdx + 1}.${obIdx + 1}.${oiIdx + 1}`
                                          }))
                                        )
                                      )
                                      .filter((item) => item.id !== inp.id);

                                    const selectedActivity = otherActivities.find(
                                      (item) =>
                                        item.id === inp.conditionInputId ||
                                        inp.hypotheseText === `Conditionnée par l’Activité ${item.code} : ${item.solutionText}`
                                    );

                                    return (
                                      <div className="p-1.5 rounded bg-white/90 dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-800/70 space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac]">
                                            Hypothèse de l’Activité (Autre Activité Conditionnelle)
                                          </span>
                                          <span className="text-[7.5px] font-bold text-slate-500">Condition</span>
                                        </div>
                                        <select
                                          value={selectedActivity?.id || inp.conditionInputId || ''}
                                          onChange={(e) => {
                                            const targetInputId = e.target.value;
                                            const target = otherActivities.find((item) => item.id === targetInputId);
                                            const hypLabel = target
                                              ? `Conditionnée par l’Activité ${target.code} : ${target.solutionText}`
                                              : '';
                                            updateGarData((prev) => {
                                              prev.axes[axeIdx].branches[bIdx].inputs[iIdx].conditionInputId =
                                                targetInputId || undefined;
                                              prev.axes[axeIdx].branches[bIdx].inputs[iIdx].hypotheseText = hypLabel;
                                              prev.axes[axeIdx].branches[bIdx].inputs[iIdx].needText = hypLabel;
                                              return prev;
                                            });
                                          }}
                                          className="w-full bg-emerald-50/50 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 text-[10.5px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                                        >
                                          <option value="">-- Choisir une autre activité comme hypothèse/condition --</option>
                                          {otherActivities.map((item) => (
                                            <option key={`act-hyp-${item.id}`} value={item.id}>
                                              Contre-Activité {item.code} : {item.solutionText}
                                            </option>
                                          ))}
                                        </select>
                                        {selectedActivity && (
                                          <div className="text-[10px] font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-50/80 dark:bg-slate-800/90 p-1.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                                            <ArrowRightLeft className="w-3 h-3 text-emerald-600 shrink-0" />
                                            <span>
                                              Condition liée à l’Activité {selectedActivity.code} :{' '}
                                              <strong>{selectedActivity.solutionText}</strong>
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                              {!isProblem && (
                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                                    <span>Budget Activité :</span>
                                    <span>{formatCurrencyValue(computeInputTotal(inp), currency)}</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="p-2 rounded bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/50">
                                      <div className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-300 mb-1">
                                        Ressources Humaines (RH)
                                      </div>
                                      <EditableResourceList
                                        items={inp.rhDetails || []}
                                        onChange={(newItems) => updateResourceDetails(axeIdx, bIdx, iIdx, 'rh', newItems)}
                                        accentColor="sky"
                                        currency={currency}
                                      />
                                    </div>
                                    <div className="p-2 rounded bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/50">
                                      <div className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 mb-1">
                                        Matériel & Logistique
                                      </div>
                                      <EditableResourceList
                                        items={inp.materielDetails || []}
                                        onChange={(newItems) =>
                                          updateResourceDetails(axeIdx, bIdx, iIdx, 'materiel', newItems)
                                        }
                                        accentColor="amber"
                                        currency={currency}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* GRAPHIC TREE VIEW MODE */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs overflow-x-auto">
            <div
              style={{
                zoom: treeZoom / 100
              }}
              className="min-w-[980px] flex flex-col items-center pb-6"
            >
              {/* TOP NODE: CONSEQUENCE / IMPACT */}
              <div className="w-full max-w-2xl z-10">
                <div
                  className={`p-5 rounded-2xl border-2 transition-all duration-300 shadow-sm ${
                    isProblem
                      ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                      : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  }`}
                >
                  {isProblem ? (
                    <ProblemChooser
                      ideas={ideas}
                      value={garData.consequence}
                      onSelect={(prob, sol) =>
                        updateGarData((prev) => {
                          prev.consequence = prob;
                          if (sol) prev.impact = sol;
                          return prev;
                        })
                      }
                      label="Conséquence Globale (Problème Central Supérieur)"
                      placeholder="Sélectionner la conséquence globale parmi les idées du Brainstorming..."
                    />
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Sparkles size={16} className="text-emerald-600" />
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-80">
                          Impact Global (Objectif Général)
                        </span>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200/90 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                          🔒 Non modifiable
                        </span>
                      </div>
                      <div className="w-full text-center font-extrabold text-base text-emerald-950 dark:text-emerald-100 p-1">
                        {garData.impact || <span className="text-slate-400 italic text-sm">En attente de sélection de la Conséquence Globale dans l’Arbre à Problèmes</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector */}
              <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-700" />

              {/* AXES ROW */}
              <div className="flex justify-center w-full">
                {garData.axes.map((axe, axeIdx) => {
                  const isFirstAxe = axeIdx === 0;
                  const isLastAxe = axeIdx === garData.axes.length - 1;
                  const isOnlyAxe = garData.axes.length === 1;

                  return (
                    <div key={axe.id} className="flex-1 flex flex-col items-center relative px-4 min-w-[420px]">
                      {!isOnlyAxe && (
                        <>
                          {!isFirstAxe && (
                            <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300 dark:bg-slate-700" />
                          )}
                          {!isLastAxe && (
                            <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300 dark:bg-slate-700" />
                          )}
                        </>
                      )}
                      <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-700" />

                      {/* Axe Card */}
                      <div
                        onClick={() => {
                          setActiveAxeId(axe.id);
                          if (axe.branches.length > 0) setActiveBranchId(axe.branches[0].id);
                        }}
                        className={`w-full max-w-md p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer relative group ${
                          activeAxeId === axe.id
                            ? isProblem
                              ? 'bg-white dark:bg-slate-900 border-rose-500 shadow-md ring-4 ring-rose-50 dark:ring-rose-950/40'
                              : 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md ring-4 ring-indigo-50 dark:ring-indigo-950/40'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2 gap-1">
                          <input
                            type="text"
                            value={axe.service}
                            onChange={(e) =>
                              updateGarData((prev) => {
                                prev.axes[axeIdx].service = e.target.value;
                                return prev;
                              })
                            }
                            className="text-[11px] font-black px-2.5 py-1 rounded bg-[#14532d] text-white uppercase tracking-wider focus:outline-none w-full"
                          />
                          {isProblem && garData.axes.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAxe(axeIdx);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 transition-opacity"
                              title="Supprimer cet axe"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {isProblem ? (
                          <ProblemChooser
                            ideas={ideas}
                            value={axe.centralProblem}
                            onSelect={(prob, sol) =>
                              updateGarData((prev) => {
                                prev.axes[axeIdx].centralProblem = prob;
                                if (sol) prev.axes[axeIdx].effect = sol;
                                return prev;
                              })
                            }
                            label="Problème Central de l’Axe"
                            placeholder="Sélectionner le problème central parmi le Brainstorming..."
                          />
                        ) : (
                          <div className="space-y-2 mt-1">
                            {/* Choix Hypothèse / Contre-Axe */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-left space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9.5px] font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac]">
                                  Hypothèse / Contre-Axe
                                </span>
                                <span className="text-[8px] font-bold text-slate-500">Condition</span>
                              </div>
                              <select
                                value={axe.conditionAxeId || ''}
                                onChange={(e) => {
                                  const targetAxeId = e.target.value;
                                  const targetAxe = garData.axes.find((a) => a.id === targetAxeId);
                                  updateGarData((prev) => {
                                    prev.axes[axeIdx].conditionAxeId = targetAxeId;
                                    if (targetAxe) {
                                      prev.axes[axeIdx].hypotheses.globale = `Conditionné par la réussite de : ${targetAxe.service}`;
                                    }
                                    return prev;
                                  });
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                              >
                                <option value="">-- Choisir un autre axe comme hypothèse --</option>
                                {garData.axes
                                  .filter((a) => a.id !== axe.id)
                                  .map((otherAxe) => (
                                    <option key={otherAxe.id} value={otherAxe.id}>
                                      Contre-Axe : {otherAxe.service}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            {/* Effet Attendu (Objectif Spécifique) - Non modifiable */}
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-left space-y-0.5">
                              <div className="flex items-center justify-between">
                                <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                                  Effet Attendu (Objectif Spécifique)
                                </div>
                                <span className="text-[7.5px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-900/60 px-1 py-0.2 rounded-full">
                                  🔒 Non modifiable
                                </span>
                              </div>
                              <div className="font-bold text-slate-800 dark:text-slate-100 text-xs p-0.5">
                                {axe.effect || <span className="text-slate-400 italic">En attente de sélection dans l’Arbre à Problèmes</span>}
                              </div>
                            </div>
                          </div>
                        )}

                        {isProblem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddBranch(axeIdx);
                            }}
                            className="mt-2 w-full py-1 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 hover:text-[#16a34a] hover:border-[#16a34a] flex items-center justify-center gap-1 text-[11px] font-bold transition-colors"
                          >
                            <Plus size={12} /> Ajouter une branche (Contrainte)
                          </button>
                        )}
                      </div>

                      <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-700" />

                      {/* BRANCHES ROW */}
                      <div className="flex justify-center w-full">
                        {axe.branches.map((branch, bIdx) => {
                          const isFirstBranch = bIdx === 0;
                          const isLastBranch = bIdx === axe.branches.length - 1;
                          const isOnlyBranch = axe.branches.length === 1;

                          return (
                            <div key={branch.id} className="flex-1 flex flex-col items-center relative px-2 min-w-[230px]">
                              {!isOnlyBranch && (
                                <>
                                  {!isFirstBranch && (
                                    <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300 dark:bg-slate-700" />
                                  )}
                                  {!isLastBranch && (
                                    <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300 dark:bg-slate-700" />
                                  )}
                                </>
                              )}
                              <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-700" />

                              {/* Branch Card */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAxeId(axe.id);
                                  setActiveBranchId(branch.id);
                                }}
                                className={`w-full p-3.5 rounded-xl border transition-all duration-200 relative group cursor-pointer ${
                                  activeBranchId === branch.id
                                    ? isProblem
                                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900 shadow-md'
                                      : 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900 shadow-md'
                                    : isProblem
                                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-2xs'
                                    : 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/60 shadow-2xs'
                                }`}
                              >
                                {isProblem && axe.branches.length > 1 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveBranch(axeIdx, bIdx);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-slate-400 hover:text-rose-500 p-1 transition-opacity"
                                    title="Supprimer cette branche"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                {isProblem ? (
                                  <ProblemChooser
                                    ideas={ideas}
                                    value={branch.constraint}
                                    onSelect={(prob, sol) =>
                                      updateGarData((prev) => {
                                        prev.axes[axeIdx].branches[bIdx].constraint = prob;
                                        if (sol) prev.axes[axeIdx].branches[bIdx].output = sol;
                                        return prev;
                                      })
                                    }
                                    label={`Contrainte ${axeIdx + 1}.${bIdx + 1}`}
                                    placeholder="Sélectionner la contrainte parmi les idées du Brainstorming..."
                                  />
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <CheckCircle2 size={13} className="text-sky-600" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                          Extrant {axeIdx + 1}.{bIdx + 1}
                                        </span>
                                      </div>
                                      <span className="text-[7.5px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-900/60 px-1 py-0.2 rounded-full">
                                        🔒 Non modifiable
                                      </span>
                                    </div>
                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 p-1 bg-white/70 dark:bg-slate-900/70 rounded border border-slate-200/60 dark:border-slate-700/60">
                                      {branch.output || <span className="text-slate-400 italic text-[11px]">En attente de sélection dans l’Arbre à Problèmes</span>}
                                    </div>

                                    {/* Choix de l'Hypothèse de l'Extrant dans l'Arbre (uniquement parmi les autres Extrants) */}
                                    {(() => {
                                      const otherExtrants = garData.axes
                                        .flatMap((oa, oaIdx) =>
                                          oa.branches.map((ob, obIdx) => ({
                                            id: ob.id,
                                            code: `${oaIdx + 1}.${obIdx + 1}`,
                                            output: ob.output || `Extrant ${oaIdx + 1}.${obIdx + 1}`
                                          }))
                                        )
                                        .filter((item) => item.id !== branch.id);

                                      const selectedExtrant = otherExtrants.find(
                                        (item) =>
                                          item.id === branch.conditionBranchId ||
                                          branch.hypotheseText === `Conditionné par l’Extrant ${item.code} : ${item.output}`
                                      );

                                      return (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-sky-200 dark:border-sky-800/70 text-left space-y-1"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-[8.5px] font-black uppercase tracking-wider text-sky-900 dark:text-sky-300">
                                              Hypothèse de l’Extrant (Autre Extrant)
                                            </span>
                                            <span className="text-[7.5px] font-bold text-slate-400">Condition</span>
                                          </div>
                                          <select
                                            value={selectedExtrant?.id || branch.conditionBranchId || ''}
                                            onChange={(e) => {
                                              const targetBranchId = e.target.value;
                                              const target = otherExtrants.find((item) => item.id === targetBranchId);
                                              const hypLabel = target
                                                ? `Conditionné par l’Extrant ${target.code} : ${target.output}`
                                                : '';
                                              updateGarData((prev) => {
                                                prev.axes[axeIdx].branches[bIdx].conditionBranchId =
                                                  targetBranchId || undefined;
                                                prev.axes[axeIdx].branches[bIdx].hypotheseText = hypLabel;
                                                if (!prev.axes[axeIdx].branches[bIdx].hypotheses) {
                                                  prev.axes[axeIdx].branches[bIdx].hypotheses = {
                                                    globale: hypLabel,
                                                    interne: '',
                                                    externe: '',
                                                    partenaires: ''
                                                  };
                                                } else {
                                                  prev.axes[axeIdx].branches[bIdx].hypotheses!.globale = hypLabel;
                                                }
                                                return prev;
                                              });
                                            }}
                                            className="w-full bg-sky-50/70 dark:bg-slate-800 border border-sky-300 dark:border-sky-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                                          >
                                            <option value="">-- Choisir un autre extrant comme hypothèse --</option>
                                            {otherExtrants.map((item) => (
                                              <option key={`tree-ext-hyp-${item.id}`} value={item.id}>
                                                Contre-Extrant {item.code} : {item.output}
                                              </option>
                                            ))}
                                          </select>
                                          {selectedExtrant && (
                                            <div className="text-[9.5px] font-semibold text-sky-900 dark:text-sky-200 bg-sky-50/80 dark:bg-slate-800/90 p-1 rounded border border-sky-200 dark:border-sky-800 leading-tight">
                                              Condition : Extrant {selectedExtrant.code} ({selectedExtrant.output})
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>

                              <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700" />

                              {/* INPUTS (Causes / Activités) */}
                              <div className="w-full space-y-3 flex flex-col items-center">
                                {branch.inputs.map((inp, iIdx) => (
                                  <React.Fragment key={inp.id}>
                                    {iIdx > 0 && <div className="w-0.5 h-3 bg-slate-300 dark:bg-slate-700 -my-1.5" />}
                                    <div className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs relative group">
                                      {isProblem && branch.inputs.length > 1 && (
                                        <button
                                          onClick={() => handleRemoveInput(axeIdx, bIdx, iIdx)}
                                          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-slate-400 hover:text-rose-500 p-0.5 transition-opacity"
                                          title="Supprimer cet élément"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                      {isProblem ? (
                                        <ProblemChooser
                                          ideas={ideas}
                                          value={inp.problemText}
                                          onSelect={(prob, sol) =>
                                            updateGarData((prev) => {
                                              prev.axes[axeIdx].branches[bIdx].inputs[iIdx].problemText = prob;
                                              if (sol) prev.axes[axeIdx].branches[bIdx].inputs[iIdx].solutionText = sol;
                                              return prev;
                                            })
                                          }
                                          label={`Cause ${axeIdx + 1}.${bIdx + 1}.${iIdx + 1}`}
                                          placeholder="Sélectionner la cause parmi les idées du Brainstorming..."
                                        />
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                              <Wrench size={12} className="text-emerald-600" />
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                Activité {axeIdx + 1}.{bIdx + 1}.${iIdx + 1}
                                              </span>
                                            </div>
                                            <span className="text-[7.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-1 py-0.2 rounded-full">
                                              🔒 Non modifiable
                                            </span>
                                          </div>
                                          <div className="text-xs text-slate-900 dark:text-white font-medium p-1 bg-slate-50/70 dark:bg-slate-800/70 rounded border border-slate-200/60 dark:border-slate-700/60">
                                            {inp.solutionText || <span className="text-slate-400 italic text-[11px]">En attente de sélection dans l’Arbre à Problèmes</span>}
                                          </div>

                                          {/* Choix de l'Hypothèse de l'Activité dans l'Arbre (uniquement parmi les autres Activités) */}
                                          {(() => {
                                            const otherActivities = garData.axes
                                              .flatMap((oa, oaIdx) =>
                                                oa.branches.flatMap((ob, obIdx) =>
                                                  ob.inputs.map((oi, oiIdx) => ({
                                                    id: oi.id,
                                                    code: `${oaIdx + 1}.${obIdx + 1}.${oiIdx + 1}`,
                                                    solutionText:
                                                      oi.solutionText || `Activité ${oaIdx + 1}.${obIdx + 1}.${oiIdx + 1}`
                                                  }))
                                                )
                                              )
                                              .filter((item) => item.id !== inp.id);

                                            const selectedActivity = otherActivities.find(
                                              (item) =>
                                                item.id === inp.conditionInputId ||
                                                inp.hypotheseText ===
                                                  `Conditionnée par l’Activité ${item.code} : ${item.solutionText}`
                                            );

                                            return (
                                              <div
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/70 text-left space-y-1"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[8.5px] font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac]">
                                                    Hypothèse de l’Activité (Autre Activité)
                                                  </span>
                                                  <span className="text-[7.5px] font-bold text-slate-400">Condition</span>
                                                </div>
                                                <select
                                                  value={selectedActivity?.id || inp.conditionInputId || ''}
                                                  onChange={(e) => {
                                                    const targetInputId = e.target.value;
                                                    const target = otherActivities.find((item) => item.id === targetInputId);
                                                    const hypLabel = target
                                                      ? `Conditionnée par l’Activité ${target.code} : ${target.solutionText}`
                                                      : '';
                                                    updateGarData((prev) => {
                                                      prev.axes[axeIdx].branches[bIdx].inputs[iIdx].conditionInputId =
                                                        targetInputId || undefined;
                                                      prev.axes[axeIdx].branches[bIdx].inputs[iIdx].hypotheseText = hypLabel;
                                                      prev.axes[axeIdx].branches[bIdx].inputs[iIdx].needText = hypLabel;
                                                      return prev;
                                                    });
                                                  }}
                                                  className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                                                >
                                                  <option value="">-- Choisir une autre activité comme hypothèse --</option>
                                                  {otherActivities.map((item) => (
                                                    <option key={`tree-act-hyp-${item.id}`} value={item.id}>
                                                      Contre-Activité {item.code} : {item.solutionText}
                                                    </option>
                                                  ))}
                                                </select>
                                                {selectedActivity && (
                                                  <div className="text-[9.5px] font-semibold text-emerald-900 dark:text-emerald-200 bg-white/90 dark:bg-slate-800/90 p-1 rounded border border-emerald-200 dark:border-emerald-800 leading-tight">
                                                    Condition : Activité {selectedActivity.code} ({selectedActivity.solutionText})
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}

                                      {/* Solution Tree: Intrants RH, Matériels & Budget */}
                                      {!isProblem && (
                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                          <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                              <Coins size={11} /> Budget Activité
                                            </span>
                                            <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                                              {formatCurrencyValue(computeInputTotal(inp), currency)}
                                            </span>
                                          </div>

                                          <div className="p-2 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/50">
                                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-sky-800 dark:text-sky-300 mb-1">
                                              <UserCheck size={11} /> Intrants RH (Qté × PU)
                                            </div>
                                            <EditableResourceList
                                              items={inp.rhDetails || []}
                                              onChange={(newItems) =>
                                                updateResourceDetails(axeIdx, bIdx, iIdx, 'rh', newItems)
                                              }
                                              placeholder="Profil ou poste RH..."
                                              accentColor="sky"
                                              currency={currency}
                                            />
                                          </div>

                                          <div className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/50">
                                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300 mb-1">
                                              <Package size={11} /> Matériel & Logistique (Qté × PU)
                                            </div>
                                            <EditableResourceList
                                              items={inp.materielDetails || []}
                                              onChange={(newItems) =>
                                                updateResourceDetails(axeIdx, bIdx, iIdx, 'materiel', newItems)
                                              }
                                              placeholder="Équipement, licence..."
                                              accentColor="amber"
                                              currency={currency}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </React.Fragment>
                                ))}
                                {isProblem && (
                                  <button
                                    onClick={() => handleAddInput(axeIdx, bIdx)}
                                    className="w-full py-1.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-400 hover:text-[#16a34a] hover:border-[#16a34a] flex items-center justify-center gap-1 text-[11px] font-bold transition-colors"
                                  >
                                    <Plus size={12} /> Ajouter une cause
                                  </button>
                                )}
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
        )}

        {/* FOCUS PANEL ON SELECTED AXE / BRANCH + HYPOTHESES (Solution Mode) */}
        {!isProblem && activeAxe && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#16a34a] dark:text-[#86efac]">
                  ANALYSE DES HYPOTHÈSES CRITIQUES & CONDITIONS DE RÉUSSITE (GAR)
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                  Focus sur l’Axe : {activeAxe.service} {activeBranch ? `— Extrant : ${activeBranch.output}` : ''}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activeAxe.id}
                  onChange={(e) => {
                    const ax = garData.axes.find((a) => a.id === e.target.value);
                    setActiveAxeId(e.target.value);
                    if (ax && ax.branches[0]) setActiveBranchId(ax.branches[0].id);
                  }}
                  className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
                >
                  {garData.axes.map((ax, idx) => (
                    <option key={ax.id} value={ax.id}>
                      Axe {idx + 1} : {ax.service}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(['globale', 'interne', 'externe', 'partenaires'] as (keyof GARHypotheses)[]).map((hKey) => {
                const titles: Record<keyof GARHypotheses, string> = {
                  globale: 'Hypothèse Globale',
                  interne: 'Condition Interne',
                  externe: 'Condition Externe',
                  partenaires: 'Engagement Partenaires'
                };
                const axeIdx = garData.axes.findIndex((a) => a.id === activeAxe.id);
                return (
                  <div
                    key={hKey}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      {titles[hKey]}
                    </div>
                    <AutoResizeTextarea
                      value={activeAxe.hypotheses?.[hKey] || ''}
                      onChange={(e) =>
                        updateGarData((prev) => {
                          if (axeIdx >= 0) {
                            prev.axes[axeIdx].hypotheses = {
                              ...prev.axes[axeIdx].hypotheses,
                              [hKey]: e.target.value
                            };
                          }
                          return prev;
                        })
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // TAB 4: REGISTRE DES PARTIES PRENANTES (GAR)
  // ============================================================================
  const renderStakeholderRegisterTab = () => {
    const updateProjectStakeholders = (
      axeIdx: number,
      branchIdx: number,
      category: keyof GARProjectStakeholders,
      items: string[]
    ) => {
      updateGarData((prev) => {
        const branch = prev.axes[axeIdx].branches[branchIdx];
        if (!branch.stakeholders) {
          branch.stakeholders = {
            beneficiaires: [],
            acteursInternes: [],
            acteursExternes: [],
            partenairesTechniques: [],
            partenairesFinanciers: []
          };
        }
        branch.stakeholders[category] = items;
        return prev;
      });
    };

    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14532d] text-[#86efac] flex items-center justify-center shadow-xs shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isEn
                  ? 'GAR Stakeholder Register (by Axis & Project/Output)'
                  : 'Registre des Parties Prenantes par Axe et Projet'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEn
                  ? 'Consolidated mapping of all stakeholders involved in each strategic axis and project branch.'
                  : 'Cartographie consolidée de l’ensemble des acteurs impliqués dans chaque axe stratégique et projet du programme.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 px-1">
              <Filter size={13} className="text-[#16a34a]" /> Filtrer :
            </span>
            <select
              value={stakeholderFilterAxeId}
              onChange={(e) => {
                setStakeholderFilterAxeId(e.target.value);
                setStakeholderFilterBranchId('ALL');
              }}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">Tous les Axes ({garData.axes.length})</option>
              {garData.axes.map((a, idx) => (
                <option key={a.id} value={a.id}>
                  Axe {idx + 1} : {a.service}
                </option>
              ))}
            </select>

            <select
              value={stakeholderFilterBranchId}
              onChange={(e) => setStakeholderFilterBranchId(e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-200 max-w-[240px] truncate"
            >
              <option value="ALL">Tous les Projets / Branches</option>
              {garData.axes
                .filter((a) => stakeholderFilterAxeId === 'ALL' || a.id === stakeholderFilterAxeId)
                .flatMap((a) =>
                  a.branches.map((b, bIdx) => (
                    <option key={b.id} value={b.id}>
                      Projet {bIdx + 1} : {b.output}
                    </option>
                  ))
                )}
            </select>
          </div>
        </div>

        {/* Desktop Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-1/6">Axe / Service</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-1/6">Projet (Extrant / Contrainte)</th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-2/15 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300">
                  <div className="flex items-center gap-1.5">
                    <Users size={13} /> Bénéficiaires
                  </div>
                </th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-2/15 bg-blue-50/50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
                  <div className="flex items-center gap-1.5">
                    <Building size={13} /> Interne à l’Institution
                  </div>
                </th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-2/15 bg-purple-50/50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={13} /> Externe à l’Institution
                  </div>
                </th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-2/15 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300">
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={13} /> Partenaires Techniques
                  </div>
                </th>
                <th className="p-3 w-2/15 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <Landmark size={13} /> Partenaires Financiers
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-[10px] sm:text-[11px]">
              {garData.axes.map((axe, axeIdx) => {
                if (stakeholderFilterAxeId !== 'ALL' && axe.id !== stakeholderFilterAxeId) return null;
                const visibleBranches = axe.branches
                  .map((branch, branchIdx) => ({ branch, branchIdx }))
                  .filter(({ branch }) => stakeholderFilterBranchId === 'ALL' || branch.id === stakeholderFilterBranchId);

                if (visibleBranches.length === 0) return null;

                return visibleBranches.map(({ branch, branchIdx }, visibleIdx) => {
                  const st: GARProjectStakeholders = branch.stakeholders || {
                    beneficiaires: [],
                    acteursInternes: [],
                    acteursExternes: [],
                    partenairesTechniques: [],
                    partenairesFinanciers: []
                  };

                  return (
                    <tr key={branch.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {visibleIdx === 0 && (
                        <td
                          rowSpan={visibleBranches.length}
                          className="p-3 border-r border-slate-200 dark:border-slate-700 align-top bg-slate-50/40 dark:bg-slate-800/20"
                        >
                          <div className="font-black text-[#14532d] dark:text-[#86efac] uppercase tracking-wider text-[10px] sm:text-[11px] mb-1">
                            {axe.service}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium mb-1">
                            <span className="font-bold">Effet :</span> {axe.effect}
                          </div>
                        </td>
                      )}
                      <td className="p-3 border-r border-slate-200 dark:border-slate-700 align-top">
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-[10px] sm:text-[11px] mb-1">
                          Projet {axeIdx + 1}.{branchIdx + 1} : {branch.output}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Contrainte :</span> {branch.constraint}
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-700 align-top bg-teal-50/10 dark:bg-teal-950/10">
                        <EditableList
                          items={st.beneficiaires}
                          onChange={(items) => updateProjectStakeholders(axeIdx, branchIdx, 'beneficiaires', items)}
                          placeholder="Ajouter un bénéficiaire..."
                          bulletColor="text-teal-500"
                        />
                      </td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-700 align-top bg-blue-50/10 dark:bg-blue-950/10">
                        <EditableList
                          items={st.acteursInternes}
                          onChange={(items) => updateProjectStakeholders(axeIdx, branchIdx, 'acteursInternes', items)}
                          placeholder="Ajouter un acteur interne..."
                          bulletColor="text-blue-500"
                        />
                      </td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-700 align-top bg-purple-50/10 dark:bg-purple-950/10">
                        <EditableList
                          items={st.acteursExternes}
                          onChange={(items) => updateProjectStakeholders(axeIdx, branchIdx, 'acteursExternes', items)}
                          placeholder="Ajouter un acteur externe..."
                          bulletColor="text-purple-500"
                        />
                      </td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-700 align-top bg-indigo-50/10 dark:bg-indigo-950/10">
                        <EditableList
                          items={st.partenairesTechniques}
                          onChange={(items) =>
                            updateProjectStakeholders(axeIdx, branchIdx, 'partenairesTechniques', items)
                          }
                          placeholder="Ajouter un partenaire technique..."
                          bulletColor="text-indigo-500"
                        />
                      </td>
                      <td className="p-3 align-top bg-emerald-50/10 dark:bg-emerald-950/10">
                        <EditableList
                          items={st.partenairesFinanciers}
                          onChange={(items) =>
                            updateProjectStakeholders(axeIdx, branchIdx, 'partenairesFinanciers', items)
                          }
                          placeholder="Ajouter un bailleur..."
                          bulletColor="text-emerald-500"
                        />
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================================
  // TAB 5: GÉNÉRATEUR LOGIQUE DES TDR (GAR)
  // ============================================================================
  const renderTdrGeneratorTab = () => {
    const selectedAxeObj = garData.axes.find((a) => a.id === tdrAxeId);
    const availableBranches = selectedAxeObj
      ? selectedAxeObj.branches
      : garData.axes.flatMap((a) => a.branches);
    const selectedBranchObj = availableBranches.find((b) => b.id === tdrBranchId);
    const availableActivities = selectedBranchObj
      ? selectedBranchObj.inputs
      : availableBranches.flatMap((b) => b.inputs);

    const filteredAxes = garData.axes
      .filter((a) => tdrAxeId === 'ALL' || a.id === tdrAxeId)
      .map((a) => ({
        ...a,
        branches: a.branches
          .filter((b) => tdrBranchId === 'ALL' || b.id === tdrBranchId)
          .map((b) => ({
            ...b,
            inputs: b.inputs.filter((inp) => tdrActivityId === 'ALL' || inp.id === tdrActivityId)
          }))
          .filter((b) => b.inputs.length > 0)
      }))
      .filter((a) => a.branches.length > 0);

    let totalCalculatedBudget = 0;
    filteredAxes.forEach((a) => {
      a.branches.forEach((b) => {
        b.inputs.forEach((inp) => {
          totalCalculatedBudget += computeInputTotal(inp);
        });
      });
    });

    const toggleTdrField = (key: keyof typeof tdrFields) => {
      setTdrFields((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleDownloadTdrPdf = () => {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 18;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 18) {
          doc.addPage();
          y = 18;
        }
      };

      // Pure white background & institutional navy header
      doc.setFillColor(12, 74, 110);
      doc.rect(margin, y, contentWidth, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('TERMES DE RÉFÉRENCE (TDR) — CADRE LOGIQUE GAR', margin + 5, y + 9);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${garData.organizationName || dossier.institution} — ${garData.projectTitle || dossier.name}`,
        margin + 5,
        y + 16
      );
      doc.text(
        `Budget Consolidé : ${formatCurrencyValue(totalCalculatedBudget, currency)} | Date : ${new Date().toLocaleDateString('fr-FR')}`,
        margin + 5,
        y + 21
      );
      y += 30;

      const printSectionTitle = (title: string) => {
        checkPageBreak(14);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(12, 74, 110);
        doc.text(title.toUpperCase(), margin + 3, y + 5);
        y += 10;
      };

      const printParagraph = (text: string, boldPrefix?: string) => {
        doc.setFont('helvetica', boldPrefix ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const fullText = boldPrefix ? `${boldPrefix} ${text}` : text;
        const lines = doc.splitTextToSize(fullText, contentWidth - 4);
        checkPageBreak(lines.length * 4.5 + 3);
        doc.text(lines, margin + 2, y);
        y += lines.length * 4.5 + 2;
      };

      if (tdrFields.contexteJustification) {
        printSectionTitle('1. Contexte et Justification de la Mission');
        printParagraph(garData.consequence, 'Constat global :');
        filteredAxes.forEach((ax) => {
          printParagraph(`${ax.centralProblem}`, `• Axe [${ax.service}] :`);
        });
      }

      if (tdrFields.objectifGlobal) {
        printSectionTitle('2. Objectif Global (Impact Attendu)');
        printParagraph(garData.impact);
      }

      if (tdrFields.objectifsSpecifiques) {
        printSectionTitle('3. Objectifs Spécifiques (Effets par Axe)');
        filteredAxes.forEach((ax, idx) => {
          printParagraph(ax.effect, `${idx + 1}. [${ax.service}] :`);
        });
      }

      if (tdrFields.resultatsAttendus) {
        printSectionTitle('4. Résultats Attendus (Extrants)');
        filteredAxes.forEach((ax) => {
          ax.branches.forEach((br, bIdx) => {
            printParagraph(br.output, `• Extrant (${ax.service} #${bIdx + 1}) :`);
          });
        });
      }

      if (tdrFields.tachesMandat) {
        printSectionTitle('5. Mandat, Activités et Livrables');
        filteredAxes.forEach((ax) => {
          ax.branches.forEach((br) => {
            br.inputs.forEach((inp, iIdx) => {
              printParagraph(
                `${inp.solutionText} — Budget : ${formatCurrencyValue(computeInputTotal(inp), currency)}`,
                `Activité ${iIdx + 1} :`
              );
              if (inp.tdrLivrables) {
                printParagraph(inp.tdrLivrables.replace(/\n/g, ' | '), '   Livrables :');
              }
            });
          });
        });
      }

      if (tdrFields.ressourcesBudget) {
        printSectionTitle('6. Ressources Mobilisées & Synthèse Budgétaire');
        printParagraph(
          `Enveloppe budgétaire totale estimée pour le périmètre sélectionné : ${formatCurrencyValue(
            totalCalculatedBudget,
            currency
          )}.`
        );
      }

      checkPageBreak(25);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(12, 74, 110);
      doc.text(`Établi par : ${userProfile.fullName || 'Coordonnateur du Programme'}`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${userProfile.role || ''} — ${userProfile.institution || ''}`, margin, y + 5);

      doc.save(`TDR_GAR_${(dossier.name || 'Programme').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      onShowToast?.(isEn ? 'GAR Logical TOR exported to PDF!' : 'Termes de Référence (TDR GAR) exportés en PDF A4 !');
    };

    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#14532d] text-[#86efac] flex items-center justify-center shadow-xs shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isEn ? 'Logical Terms of Reference (TOR) Generator' : 'Générateur Logique des Termes de Référence (TDR)'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEn
                    ? 'Select the lineage (Axis, Branch, Activity) and sections to generate an official TOR document.'
                    : 'Sélectionnez la lignée (Service, Branche, Activité) et les rubriques à inclure pour générer automatiquement votre TDR.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTdrPdf}
              className="flex items-center gap-2 px-4 py-2 bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Download size={15} />
              <span>{isEn ? 'Download TOR (PDF A4)' : 'Télécharger le TDR (PDF A4)'}</span>
            </button>
          </div>

          {/* Step 1: 3-level lineage filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                1. Axe / Service concerné
              </label>
              <select
                value={tdrAxeId}
                onChange={(e) => {
                  setTdrAxeId(e.target.value);
                  setTdrBranchId('ALL');
                  setTdrActivityId('ALL');
                }}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Tous les Services / Axes ({garData.axes.length})</option>
                {garData.axes.map((a, idx) => (
                  <option key={a.id} value={a.id}>
                    Axe {idx + 1} : {a.service}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                2. Branche (Contrainte / Extrant)
              </label>
              <select
                value={tdrBranchId}
                onChange={(e) => {
                  setTdrBranchId(e.target.value);
                  setTdrActivityId('ALL');
                }}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Toutes les Branches ({availableBranches.length})</option>
                {availableBranches.map((b, idx) => (
                  <option key={b.id} value={b.id}>
                    Branche {idx + 1} : {b.output}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                3. Activité spécifique (Cause / Action)
              </label>
              <select
                value={tdrActivityId}
                onChange={(e) => setTdrActivityId(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Toutes les Activités ({availableActivities.length})</option>
                {availableActivities.map((inp, idx) => (
                  <option key={inp.id} value={inp.id}>
                    Activité {idx + 1} : {inp.solutionText}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Section checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Rubriques du TDR à afficher :
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setTdrFields({
                      contexteJustification: true,
                      objectifGlobal: true,
                      objectifsSpecifiques: true,
                      resultatsAttendus: true,
                      tachesMandat: true,
                      livrablesAttendus: true,
                      dureeCalendrier: true,
                      profilExperts: true,
                      ressourcesBudget: true,
                      partiesPrenantes: true,
                      hypothesesRisques: true,
                      modalitesPaiement: true
                    })
                  }
                  className="text-[11px] font-bold text-[#16a34a] dark:text-[#86efac] hover:underline"
                >
                  Tout cocher
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() =>
                    setTdrFields({
                      contexteJustification: false,
                      objectifGlobal: false,
                      objectifsSpecifiques: false,
                      resultatsAttendus: false,
                      tachesMandat: false,
                      livrablesAttendus: false,
                      dureeCalendrier: false,
                      profilExperts: false,
                      ressourcesBudget: false,
                      partiesPrenantes: false,
                      hypothesesRisques: false,
                      modalitesPaiement: false
                    })
                  }
                  className="text-[11px] font-bold text-slate-500 hover:underline"
                >
                  Tout décocher
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {[
                { key: 'contexteJustification', label: '1. Contexte & Justification' },
                { key: 'objectifGlobal', label: '2. Objectif Global (Impact)' },
                { key: 'objectifsSpecifiques', label: '3. Objectifs Spécifiques' },
                { key: 'resultatsAttendus', label: '4. Résultats Attendus (Extrants)' },
                { key: 'tachesMandat', label: '5. Mandat & Tâches' },
                { key: 'livrablesAttendus', label: '6. Livrables Attendus' },
                { key: 'dureeCalendrier', label: '7. Durée, Calendrier & Lieu' },
                { key: 'profilExperts', label: '8. Profil des Intervenants' },
                { key: 'ressourcesBudget', label: '9. Ressources & Budget' },
                { key: 'partiesPrenantes', label: '10. Parties Prenantes' },
                { key: 'hypothesesRisques', label: '11. Hypothèses & Risques' },
                { key: 'modalitesPaiement', label: '12. Modalités de Paiement' }
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    tdrFields[item.key as keyof typeof tdrFields]
                      ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-200'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tdrFields[item.key as keyof typeof tdrFields]}
                    onChange={() => toggleTdrField(item.key as keyof typeof tdrFields)}
                    className="rounded border-slate-300 text-[#14532d]"
                  />
                  <span className="truncate">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Live Institutional TDR Document Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden max-w-5xl mx-auto">
          <div className="bg-[#14532d] text-white p-6 border-b-4 border-[#86efac]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#86efac] mb-1">
                  DOCUMENT OFFICIEL — TERMES DE RÉFÉRENCE (TDR GAR)
                </div>
                <h1 className="text-xl font-black tracking-tight">
                  {garData.organizationName} — {garData.projectTitle}
                </h1>
                {garData.projectDescription && (
                  <p className="text-xs text-sky-100 mt-1">{garData.projectDescription}</p>
                )}
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/15 text-xs shrink-0">
                <div>
                  <span className="text-sky-200">Périmètre :</span>{' '}
                  <span className="font-bold">{selectedAxeObj ? selectedAxeObj.service : 'Tous les Services'}</span>
                </div>
                <div className="mt-1">
                  <span className="text-sky-200">Budget Consolidé :</span>{' '}
                  <span className="font-black text-[#86efac]">
                    {formatCurrencyValue(totalCalculatedBudget, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
            {tdrFields.contexteJustification && (
              <section className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac] border-b border-slate-200 dark:border-slate-800 pb-1">
                  1. Contexte et Justification de la Mission
                </h3>
                <p className="text-xs">
                  <strong>Constat global :</strong> {garData.consequence}
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1">
                  {filteredAxes.map((ax) => (
                    <li key={ax.id}>
                      <strong>{ax.service} :</strong> {ax.centralProblem}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tdrFields.objectifGlobal && (
              <section className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac] border-b border-slate-200 dark:border-slate-800 pb-1">
                  2. Objectif Global (Impact Attendu)
                </h3>
                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  {garData.impact}
                </div>
              </section>
            )}

            {tdrFields.objectifsSpecifiques && (
              <section className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac] border-b border-slate-200 dark:border-slate-800 pb-1">
                  3. Objectifs Spécifiques (Effets Attendus)
                </h3>
                <div className="space-y-2">
                  {filteredAxes.map((ax, idx) => (
                    <div
                      key={ax.id}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <span className="font-black text-[#16a34a] dark:text-[#86efac]">
                        OS {idx + 1} ({ax.service}) :
                      </span>{' '}
                      <span className="font-semibold">{ax.effect}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tdrFields.resultatsAttendus && (
              <section className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac] border-b border-slate-200 dark:border-slate-800 pb-1">
                  4. Résultats Attendus (Extrants)
                </h3>
                <ul className="list-disc pl-5 text-xs space-y-1">
                  {filteredAxes.flatMap((ax) =>
                    ax.branches.map((br) => (
                      <li key={br.id}>
                        <strong>[{ax.service}] :</strong> {br.output}
                      </li>
                    ))
                  )}
                </ul>
              </section>
            )}

            {tdrFields.tachesMandat && (
              <section className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#14532d] dark:text-[#86efac] border-b border-slate-200 dark:border-slate-800 pb-1">
                  5. Mandat, Activités et Livrables Opérationnels
                </h3>
                <div className="space-y-2">
                  {filteredAxes.flatMap((ax) =>
                    ax.branches.flatMap((br) =>
                      br.inputs.map((inp, idx) => (
                        <div
                          key={inp.id}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              Activité {idx + 1} : {inp.solutionText}
                            </span>
                            <span className="font-black text-emerald-700 dark:text-emerald-400">
                              {formatCurrencyValue(computeInputTotal(inp), currency)}
                            </span>
                          </div>
                          {inp.tdrObjectifSpecifique && (
                            <p className="text-slate-600 dark:text-slate-300">
                              <strong>Objectif :</strong> {inp.tdrObjectifSpecifique}
                            </p>
                          )}
                          {inp.tdrLivrables && (
                            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                              <strong>Livrables :</strong> {inp.tdrLivrables}
                            </p>
                          )}
                        </div>
                      ))
                    )
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderGarTopBar()}
      {activeTab === 'brainstorming' && renderBrainstormingTab()}
      {activeTab === 'arbre' && renderTreesTab('problem')}
      {activeTab === 'solutions' && renderTreesTab('solution')}
      {activeTab === 'registre_parties' && renderStakeholderRegisterTab()}
      {activeTab === 'tdr' && renderTdrGeneratorTab()}
    </div>
  );
};
