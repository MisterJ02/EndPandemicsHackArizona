// Mutable application state — shared across all modules via global scope.
let reports    = [];
let markers    = [];
let map        = null;
let userMarker = null;
let tempMarker = null;
let locMode    = false;

let userLat = 33.4484;    // Default: Phoenix
let userLng = -112.0740;

let riskScore  = 0;
let pendingLat, pendingLng;
let selDisease  = DISEASES[0];
let selSeverity = 'medium';

// Monotonic ID counter — each new report gets a unique string ID
let _nextId = 1;

// Gauge needle animation
let needleCurrent = -90;
let needleTarget  = -90;
let needleRAF     = null;
