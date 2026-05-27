// Quantica Risk — Core Type Definitions
// Open-PSA MEF対応データモデル

// ===== Distribution Types =====
export interface Distribution {
  type: 'point' | 'lognormal' | 'normal' | 'uniform' | 'beta' | 'gamma' | 'weibull';
  mean?: number;         // Mean or Median
  errorFactor?: number;   // For Lognormal
  stdDev?: number;        // For Normal (replacing previous 'alpha' for clarity)
  lower?: number;         // For Uniform
  upper?: number;         // For Uniform
  shape?: number;         // For Gamma, Weibull (k)
  scale?: number;         // For Gamma, Weibull (lambda/theta)
  alpha?: number;         // For Beta
  beta?: number;          // For Beta
}

// ===== Parameter (Failure Rate Data) =====
export interface Parameter {
  id: string;
  name: string;
  failureType: 'time' | 'demand';
  value: number; // failure rate or demand probability
  distribution?: Distribution;
  source?: string;
  description?: string;
}

// ===== Basic Event =====
export interface BasicEvent {
  id: string;
  name: string;
  eventId?: string; // User-defined customizable event ID
  eventType?: 'basicEvent' | 'houseEvent' | 'undeveloped' | 'transferGate';
  tags: string[];
  failureMode?: string; // Failure mode description (e.g. Fail to open)
  parameterId?: string; // If set, refers to a Parameter
  failureType?: 'time' | 'demand';
  failureRate: number;
  repairTime?: number;
  probability?: number;
  missionTime?: number;
  demands?: number;
  distribution: Distribution;
  source: string;
  memo: string;
  seismicFragilityId?: string; // Reference to SeismicFragility
  linkedFaultTreeId?: string; // For transferGate type
  position?: { x: number; y: number };
}

// ===== House Event =====
export interface HouseEvent {
  id: string;
  name: string;
  state: boolean; // TRUE or FALSE
}

// ===== Gate Types =====
export type GateType = 'AND' | 'OR' | 'ATLEAST' | 'NOT' | 'XOR' | 'VOTE' | 'TRANSFER';

export interface Gate {
  id: string;
  name: string;
  type: GateType;
  k?: number;
  children: string[];
  position: { x: number; y: number };
  collapsed?: boolean;
  linkedFaultTreeId?: string; // For TRANSFER type
}

// ===== Fault Tree =====
export interface FaultTree {
  id: string;
  name: string;
  topGateId: string;
  gates: Gate[];
}

// ===== End State =====
export interface EndState {
  id: string;
  name: string;
  categories: string[];
  category?: string; // Optional support for single category string mapping
  description?: string;
  color?: string;
  groupKey?: string;
}

// ===== Event Tree =====
export interface Branch {
  id: string;
  label: string;
  description?: string;
  probability?: number;
  condition?: string;
}

export interface FunctionalEvent {
  id: string;
  code: string;     // Alphanumeric ID (e.g. RPS)
  name: string;     // Descriptive name (e.g. Reactor Protection System)
  linkedFaultTreeId?: string;
  branches: Branch[];
}

export interface BranchDecision {
  functionalEventId: string;
  branchId: string;
}

export interface Sequence {
  id: string;
  name?: string;    // Auto-generated ID (e.g. IE-01)
  path: BranchDecision[];
  endStateId: string;
  transferETId?: string;
  frequency?: number;
}

export interface EventTree {
  id: string;
  name: string;
  initiatingEventId: string;
  functionalEvents: FunctionalEvent[];
  sequences: Sequence[];
}

// ===== Initiating Event =====
export interface InitiatingEvent {
  id: string;
  code: string;     // Alphanumeric ID (e.g. LOCA)
  name: string;     // Descriptive name (e.g. Loss of Coolant Accident)
  frequency: number;
  distribution?: Distribution;
  description?: string;
  linkedFaultTreeId?: string;
}

// ===== Flag Systems (Logical Pruning) =====
export interface FlagItem {
  eventId: string;
  state: boolean; // TRUE (1) or FALSE (0)
}

export interface FlagGroup {
  id: string;
  name: string;
  items: FlagItem[];
}

// ===== Recovery Rules (Post-processing) =====
export type RecoveryAction = 'add' | 'remove' | 'replace' | 'set_probability';

export interface RecoveryRule {
  id: string;
  name: string;
  description?: string;
  condition: string[]; // Match criteria: all eventIds must be present in the cutset
  action: RecoveryAction;
  targetEventId?: string; // Event to add or replace with
  probability?: number; // For 'set_probability' or custom recovery events
  priority: number; // Order of application
}

export interface RecoveryGroup {
  id: string;
  name: string;
  description?: string;
  rules: RecoveryRule[];
}


// ===== CCF Group =====
export interface CCFGroup {
  id: string;
  name: string;
  model: 'beta_factor' | 'mgl' | 'alpha_factor';
  members: string[];
  parameters: Record<string, number>;
}

// ===== Seismic Hazard & Fragility =====
export interface SeismicHazardPoint {
  pga: number;       // Peak Ground Acceleration (e.g. in g)
  frequency: number; // Annual exceedance frequency
}

export interface SeismicHazardFractile {
  id: string;
  name: string;      // e.g. "Mean", "Median", "95%"
  percentile: number; // 0 to 1, or -1 for 'Mean'
  points: SeismicHazardPoint[];
}

export interface SeismicHazardCurve {
  id: string;
  name: string;
  fractiles: SeismicHazardFractile[];
}

export interface SeismicFragilityPoint {
  pga: number;
  probability: number; // 0 to 1
}

export interface SeismicFragility {
  id: string;
  name: string;
  type?: 'lognormal' | 'discrete';
  am?: number;    // Median capacity
  betaR?: number; // Randomness (Logarithmic standard deviation)
  betaU?: number; // Uncertainty (Logarithmic standard deviation)
  points?: SeismicFragilityPoint[];
  description?: string;
}

export interface SeismicSettings {
  hazardCurveId: string;
  selectedETIds: string[]; // List of ETs to evaluate
  minPGA: number;
  maxPGA: number;
  intervals: number;
  uncertaintyEnabled?: boolean;
  samples?: number;
}

export interface GlobalQuantificationSettings {
  cutOff: number;
  bddCutOff: number;
  enablePruning?: boolean;
  approximation: ('bdd_exact' | 'rare_event' | 'mcub')[];
  monteCarloSamples: number;
  useLHS: boolean;
  runUncertainty: boolean;
  maxCutsets: number;
}

// ===== PRA Model (Top Level) =====
export interface PRAModel {
  id: string;
  name: string;
  description: string;
  version: number;
  locale: 'ja' | 'en';
  createdAt: string;
  updatedAt: string;
  faultTrees: FaultTree[];
  eventTrees: EventTree[];
  basicEvents: BasicEvent[];
  parameters: Parameter[];
  houseEvents: HouseEvent[];
  ccfGroups: CCFGroup[];
  initiatingEvents: InitiatingEvent[];
  endStates: EndState[];
  seismicHazards: SeismicHazardCurve[];
  seismicFragilities: SeismicFragility[];
  seismicSettings: SeismicSettings;
  quantificationSettings: GlobalQuantificationSettings;
  flagGroups: FlagGroup[];
  recoveryRules: RecoveryRule[];
  recoveryGroups?: RecoveryGroup[];
  activeFlagGroupId?: string;
  activeRecoveryGroupId?: string;
}

// ===== Quantification Results =====
export interface CutSet {
  events: string[];
  probability: number;
  order: number;
}

export interface ImportanceMeasure {
  eventId: string;
  eventName: string;
  fv: number;       // Fussell-Vesely
  raw: number;      // Risk Achievement Worth
  rrw: number;      // Risk Reduction Worth
  birnbaum: number; // Birnbaum
}

export interface EndStateResult {
  endStateId: string;
  endStateName: string;
  category: string;
  frequency: number;
  cdfContribution: number; // percentage
}

export interface SequenceResult {
  sequenceId: string;
  sequenceName: string;
  pathDescription: string;
  frequency: number;
  cutSets?: CutSet[];
  rawCutSetCount?: number;
  importanceMeasures?: ImportanceMeasure[];
  appliedRecoveryCount?: number;
}

export interface SeismicPointResult {
  pga: number;
  frequency: number;    // Interval hazard frequency (delta H)
  hazardFreq: number;   // Absolute hazard frequency H(a)
  ccdp: number;         // Conditional failure probability P(f|a)
  contribution: number; // Risk contribution (pFailure * delta H)
  cutSets?: CutSet[];   // Top cut sets at this specific PGA
}

export interface SeismicUncertaintyResult {
  mean: number;
  median: number;
  p05: number;
  p95: number;
  distribution: { value: number; probability: number }[]; // For histogram
  fractileCurves: { percentile: number; curve: SeismicPointResult[] }[];
}

export interface SeismicResult {
  totalFrequency: number;
  curve: SeismicPointResult[];
  cutSets?: CutSet[];   // Overall aggregated top cut sets
  uncertaintyResult?: SeismicUncertaintyResult;
}

export interface QuantificationResult {
  topEventProbability: number;
  topEventProbabilityApprox: number; // Rare event approx for comparison
  cutSets: CutSet[];
  rawCutSetCount?: number;
  importanceMeasures: ImportanceMeasure[];
  totalCDF?: number;
  totalRiskBDD?: any; // Storing the BDD root for Monte Carlo
  sequenceBDDs?: Record<string, any>; // Map sequenceId to BDDNode
  endStateResults?: EndStateResult[];
  sequenceResults?: SequenceResult[];
  seismicResult?: SeismicResult;
  computeTimeMs: number;
  method: 'bdd_exact' | 'rare_event' | 'mcub' | 'seismic_integration' | 'analytical_approx';
  baseProbabilities?: Record<string, number>; // Added for sensitivity analysis
  uncertainty?: any; // Monte Carlo result
  cutoff?: number;
  bddCutOff?: number;
  enablePruning?: boolean;
  appliedRecoveryCount?: number;
}

// ===== Editor Node Types (React Flow) =====
export type FTNodeType = 'andGate' | 'orGate' | 'atleastGate' | 'basicEvent' | 'houseEvent' | 'transferGate' | 'undeveloped' | 'topEvent';

export interface FTNodeData extends Record<string, unknown> {
  label: string;
  nodeType: FTNodeType;
  gateType?: GateType;
  k?: number;
  eventId?: string;       // Reference to BasicEvent or HouseEvent
  linkedTreeId?: string;  // For transfer gates
  probability?: number;
  failureType?: 'time' | 'demand';
  isFlagged?: boolean;
  flagState?: boolean;
  isFlagGroupActive?: boolean;
  isRecovery?: boolean;
  isRecoveryGroupActive?: boolean;
  isCCF?: boolean;
}
