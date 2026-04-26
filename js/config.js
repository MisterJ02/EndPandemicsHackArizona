const DISEASES = [
  'Flu',
  'COVID-19',
  'RSV',
  'Norovirus',
  'Food Poisoning',
  'Unknown Respiratory Illness',
];

const D_COLOR = {
  'Flu':                         '#f59e0b',
  'COVID-19':                    '#6366f1',
  'RSV':                         '#ec4899',
  'Norovirus':                   '#10b981',
  'Food Poisoning':              '#f97316',
  'Unknown Respiratory Illness': '#8b5cf6',
};

const SEV_COLOR  = { low: '#22c55e', medium: '#eab308', high: '#ef4444' };
const SEV_WEIGHT = { low: 1,         medium: 2.5,       high: 5 };

const RISK_RADIUS_MI   = 12;   // max distance contributing to risk score
const NEARBY_RADIUS_MI = 5;    // "nearby" threshold for analysis display
const DECAY_MI         = 2.2;  // exponential distance-decay constant

// Google AI Studio model ID — change to any Gemma variant you have access to.
// Get a free key at https://aistudio.google.com/apikey
const GEMMA_MODEL = 'gemma-3-27b-it';
