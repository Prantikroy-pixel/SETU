import React, { useState, useEffect, useRef, useCallback } from 'react';
import { boundaryAPI } from '../api';
import {
  Truck,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Navigation,
  Compass,
  Zap,
  Activity,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Radio,
  Gauge,
  Layers,
} from 'lucide-react';

// High-density highway centerlines strictly following paved NH-6 & NH-27 road geometries
const PRIMARY_CONVOY_PATH = [
  {
    "lat": 26.11581,
    "lon": 91.82114,
    "name": "Guwahati (Khanapara Logistics Depot)"
  },
  {
    "lat": 26.11667,
    "lon": 91.83202,
    "name": "NH-6 Paved Expressway (Km 3)"
  },
  {
    "lat": 26.11176,
    "lon": 91.83944,
    "name": "NH-6 Paved Expressway (Km 6)"
  },
  {
    "lat": 26.10584,
    "lon": 91.85528,
    "name": "NH-6 Paved Expressway (Km 8)"
  },
  {
    "lat": 26.10149,
    "lon": 91.86633,
    "name": "NH-6 Paved Expressway (Km 11)"
  },
  {
    "lat": 26.09691,
    "lon": 91.87921,
    "name": "NH-6 Paved Expressway (Km 14)"
  },
  {
    "lat": 26.08112,
    "lon": 91.87657,
    "name": "NH-6 Paved Expressway (Km 17)"
  },
  {
    "lat": 26.05077,
    "lon": 91.87144,
    "name": "NH-6 Paved Expressway (Km 20)"
  },
  {
    "lat": 26.02412,
    "lon": 91.86793,
    "name": "NH-6 Paved Expressway (Km 22)"
  },
  {
    "lat": 26.01165,
    "lon": 91.86516,
    "name": "NH-6 Paved Expressway (Km 25)"
  },
  {
    "lat": 25.98417,
    "lon": 91.85986,
    "name": "NH-6 Paved Expressway (Km 28)"
  },
  {
    "lat": 25.95877,
    "lon": 91.85527,
    "name": "NH-6 Paved Expressway (Km 31)"
  },
  {
    "lat": 25.95692,
    "lon": 91.85199,
    "name": "NH-6 Paved Expressway (Km 34)"
  },
  {
    "lat": 25.95733,
    "lon": 91.86263,
    "name": "NH-6 Paved Expressway (Km 36)"
  },
  {
    "lat": 25.9539,
    "lon": 91.86559,
    "name": "NH-6 Paved Expressway (Km 39)"
  },
  {
    "lat": 25.9412,
    "lon": 91.87201,
    "name": "NH-6 Paved Expressway (Km 42)"
  },
  {
    "lat": 25.91433,
    "lon": 91.87743,
    "name": "NH-6 Paved Expressway (Km 45)"
  },
  {
    "lat": 25.88175,
    "lon": 91.88272,
    "name": "NH-6 Paved Expressway (Km 48)"
  },
  {
    "lat": 25.85101,
    "lon": 91.87721,
    "name": "Nongpoh Ri-Bhoi Arterial"
  },
  {
    "lat": 25.82784,
    "lon": 91.87463,
    "name": "NH-6 Paved Expressway (Km 53)"
  },
  {
    "lat": 25.81309,
    "lon": 91.8749,
    "name": "NH-6 Paved Expressway (Km 56)"
  },
  {
    "lat": 25.79846,
    "lon": 91.87371,
    "name": "NH-6 Paved Expressway (Km 59)"
  },
  {
    "lat": 25.78708,
    "lon": 91.8727,
    "name": "NH-6 Paved Expressway (Km 62)"
  },
  {
    "lat": 25.7754,
    "lon": 91.87474,
    "name": "NH-6 Paved Expressway (Km 64)"
  },
  {
    "lat": 25.76014,
    "lon": 91.88003,
    "name": "NH-6 Paved Expressway (Km 67)"
  },
  {
    "lat": 25.74494,
    "lon": 91.88425,
    "name": "NH-6 Paved Expressway (Km 70)"
  },
  {
    "lat": 25.71805,
    "lon": 91.88876,
    "name": "NH-6 Paved Expressway (Km 73)"
  },
  {
    "lat": 25.70913,
    "lon": 91.895,
    "name": "NH-6 Paved Expressway (Km 76)"
  },
  {
    "lat": 25.70195,
    "lon": 91.90043,
    "name": "NH-6 Paved Expressway (Km 78)"
  },
  {
    "lat": 25.68272,
    "lon": 91.90058,
    "name": "NH-6 Paved Expressway (Km 81)"
  },
  {
    "lat": 25.67403,
    "lon": 91.90024,
    "name": "NH-6 Paved Expressway (Km 84)"
  },
  {
    "lat": 25.66717,
    "lon": 91.90023,
    "name": "NH-6 Paved Expressway (Km 87)"
  },
  {
    "lat": 25.66001,
    "lon": 91.90068,
    "name": "NH-6 Paved Expressway (Km 90)"
  },
  {
    "lat": 25.64914,
    "lon": 91.90022,
    "name": "NH-6 Paved Expressway (Km 92)"
  },
  {
    "lat": 25.65084,
    "lon": 91.89345,
    "name": "NH-6 Paved Expressway (Km 95)"
  },
  {
    "lat": 25.64106,
    "lon": 91.89186,
    "name": "NH-6 Paved Expressway (Km 98)"
  },
  {
    "lat": 25.63204,
    "lon": 91.89166,
    "name": "NH-6 Paved Expressway (Km 101)"
  },
  {
    "lat": 25.62412,
    "lon": 91.88484,
    "name": "NH-6 Paved Expressway (Km 104)"
  },
  {
    "lat": 25.61698,
    "lon": 91.87673,
    "name": "NH-6 Paved Expressway (Km 106)"
  },
  {
    "lat": 25.60716,
    "lon": 91.87196,
    "name": "NH-6 Paved Expressway (Km 109)"
  },
  {
    "lat": 25.59658,
    "lon": 91.87005,
    "name": "NH-6 Paved Expressway (Km 112)"
  },
  {
    "lat": 25.59042,
    "lon": 91.87991,
    "name": "NH-6 Paved Expressway (Km 115)"
  },
  {
    "lat": 25.58232,
    "lon": 91.88225,
    "name": "Shillong Bypass Expressway"
  },
  {
    "lat": 25.57859,
    "lon": 91.89388,
    "name": "NH-6 Paved Expressway (Km 120)"
  },
  {
    "lat": 25.57458,
    "lon": 91.89731,
    "name": "NH-6 Paved Expressway (Km 123)"
  },
  {
    "lat": 25.56565,
    "lon": 91.89996,
    "name": "NH-6 Paved Expressway (Km 126)"
  },
  {
    "lat": 25.55998,
    "lon": 91.90827,
    "name": "NH-6 Paved Expressway (Km 129)"
  },
  {
    "lat": 25.5587,
    "lon": 91.91244,
    "name": "NH-6 Paved Expressway (Km 132)"
  },
  {
    "lat": 25.55323,
    "lon": 91.91849,
    "name": "NH-6 Paved Expressway (Km 134)"
  },
  {
    "lat": 25.54437,
    "lon": 91.92163,
    "name": "NH-6 Paved Expressway (Km 137)"
  },
  {
    "lat": 25.53365,
    "lon": 91.92504,
    "name": "NH-6 Paved Expressway (Km 140)"
  },
  {
    "lat": 25.52543,
    "lon": 91.93105,
    "name": "NH-6 Paved Expressway (Km 143)"
  },
  {
    "lat": 25.52959,
    "lon": 91.94176,
    "name": "NH-6 Paved Expressway (Km 146)"
  },
  {
    "lat": 25.54135,
    "lon": 91.94953,
    "name": "NH-6 Paved Expressway (Km 148)"
  },
  {
    "lat": 25.53801,
    "lon": 91.96042,
    "name": "NH-6 Paved Expressway (Km 151)"
  },
  {
    "lat": 25.53878,
    "lon": 91.97125,
    "name": "NH-6 Paved Expressway (Km 154)"
  },
  {
    "lat": 25.53957,
    "lon": 91.98831,
    "name": "NH-6 Paved Expressway (Km 157)"
  },
  {
    "lat": 25.53596,
    "lon": 91.9995,
    "name": "NH-6 Paved Expressway (Km 160)"
  },
  {
    "lat": 25.54708,
    "lon": 92.00903,
    "name": "NH-6 Paved Expressway (Km 162)"
  },
  {
    "lat": 25.5422,
    "lon": 92.01266,
    "name": "NH-6 Paved Expressway (Km 165)"
  },
  {
    "lat": 25.53951,
    "lon": 92.02434,
    "name": "Jowai West Jaintia Pass"
  },
  {
    "lat": 25.54157,
    "lon": 92.03936,
    "name": "NH-6 Paved Expressway (Km 171)"
  },
  {
    "lat": 25.5499,
    "lon": 92.04845,
    "name": "NH-6 Paved Expressway (Km 174)"
  },
  {
    "lat": 25.55099,
    "lon": 92.06331,
    "name": "NH-6 Paved Expressway (Km 176)"
  },
  {
    "lat": 25.55237,
    "lon": 92.07483,
    "name": "NH-6 Paved Expressway (Km 179)"
  },
  {
    "lat": 25.54639,
    "lon": 92.08098,
    "name": "NH-6 Paved Expressway (Km 182)"
  },
  {
    "lat": 25.54299,
    "lon": 92.09299,
    "name": "NH-6 Paved Expressway (Km 185)"
  },
  {
    "lat": 25.54538,
    "lon": 92.10644,
    "name": "NH-6 Paved Expressway (Km 188)"
  },
  {
    "lat": 25.53688,
    "lon": 92.10869,
    "name": "NH-6 Paved Expressway (Km 190)"
  },
  {
    "lat": 25.53165,
    "lon": 92.11678,
    "name": "NH-6 Paved Expressway (Km 193)"
  },
  {
    "lat": 25.52214,
    "lon": 92.13767,
    "name": "NH-6 Paved Expressway (Km 196)"
  },
  {
    "lat": 25.50758,
    "lon": 92.16911,
    "name": "NH-6 Paved Expressway (Km 199)"
  },
  {
    "lat": 25.47864,
    "lon": 92.17459,
    "name": "NH-6 Paved Expressway (Km 202)"
  },
  {
    "lat": 25.4612,
    "lon": 92.18706,
    "name": "NH-6 Paved Expressway (Km 204)"
  },
  {
    "lat": 25.44491,
    "lon": 92.18928,
    "name": "NH-6 Paved Expressway (Km 207)"
  },
  {
    "lat": 25.45791,
    "lon": 92.20888,
    "name": "NH-6 Paved Expressway (Km 210)"
  },
  {
    "lat": 25.46686,
    "lon": 92.24673,
    "name": "NH-6 Paved Expressway (Km 213)"
  },
  {
    "lat": 25.46784,
    "lon": 92.26364,
    "name": "NH-6 Paved Expressway (Km 216)"
  },
  {
    "lat": 25.45731,
    "lon": 92.29507,
    "name": "Lumshnong Vulnerable Pass"
  },
  {
    "lat": 25.41688,
    "lon": 92.28733,
    "name": "NH-6 Paved Expressway (Km 221)"
  },
  {
    "lat": 25.36933,
    "lon": 92.32804,
    "name": "NH-6 Paved Expressway (Km 224)"
  },
  {
    "lat": 25.33898,
    "lon": 92.36657,
    "name": "NH-6 Paved Expressway (Km 227)"
  },
  {
    "lat": 25.29897,
    "lon": 92.38632,
    "name": "NH-6 Paved Expressway (Km 230)"
  },
  {
    "lat": 25.26967,
    "lon": 92.37806,
    "name": "NH-6 Paved Expressway (Km 232)"
  },
  {
    "lat": 25.23051,
    "lon": 92.38006,
    "name": "NH-6 Paved Expressway (Km 235)"
  },
  {
    "lat": 25.2028,
    "lon": 92.37197,
    "name": "NH-6 Paved Expressway (Km 238)"
  },
  {
    "lat": 25.19236,
    "lon": 92.37811,
    "name": "NH-6 Paved Expressway (Km 241)"
  },
  {
    "lat": 25.18002,
    "lon": 92.37764,
    "name": "NH-6 Paved Expressway (Km 244)"
  },
  {
    "lat": 25.16985,
    "lon": 92.39069,
    "name": "NH-6 Paved Expressway (Km 246)"
  },
  {
    "lat": 25.15743,
    "lon": 92.37838,
    "name": "NH-6 Paved Expressway (Km 249)"
  },
  {
    "lat": 25.14871,
    "lon": 92.3742,
    "name": "NH-6 Paved Expressway (Km 252)"
  },
  {
    "lat": 25.1388,
    "lon": 92.38021,
    "name": "NH-6 Paved Expressway (Km 255)"
  },
  {
    "lat": 25.12286,
    "lon": 92.38517,
    "name": "NH-6 Paved Expressway (Km 258)"
  },
  {
    "lat": 25.11218,
    "lon": 92.36554,
    "name": "Sonapur Mountain Highway Tunnel"
  },
  {
    "lat": 25.09107,
    "lon": 92.35572,
    "name": "NH-6 Paved Expressway (Km 263)"
  },
  {
    "lat": 25.08017,
    "lon": 92.35655,
    "name": "NH-6 Paved Expressway (Km 266)"
  },
  {
    "lat": 25.07536,
    "lon": 92.36398,
    "name": "NH-6 Paved Expressway (Km 269)"
  },
  {
    "lat": 25.07272,
    "lon": 92.37548,
    "name": "NH-6 Paved Expressway (Km 272)"
  },
  {
    "lat": 25.06191,
    "lon": 92.38432,
    "name": "NH-6 Paved Expressway (Km 274)"
  },
  {
    "lat": 25.05602,
    "lon": 92.39532,
    "name": "NH-6 Paved Expressway (Km 277)"
  },
  {
    "lat": 25.04951,
    "lon": 92.40323,
    "name": "NH-6 Paved Expressway (Km 280)"
  },
  {
    "lat": 25.04663,
    "lon": 92.40808,
    "name": "NH-6 Paved Expressway (Km 283)"
  },
  {
    "lat": 25.04317,
    "lon": 92.41915,
    "name": "NH-6 Paved Expressway (Km 286)"
  },
  {
    "lat": 25.04426,
    "lon": 92.4276,
    "name": "NH-6 Paved Expressway (Km 288)"
  },
  {
    "lat": 25.03809,
    "lon": 92.43708,
    "name": "NH-6 Paved Expressway (Km 291)"
  },
  {
    "lat": 25.03667,
    "lon": 92.43938,
    "name": "Kalain / Badarpur Junction"
  },
  {
    "lat": 25.03952,
    "lon": 92.44527,
    "name": "NH-6 Paved Expressway (Km 297)"
  },
  {
    "lat": 25.03137,
    "lon": 92.45549,
    "name": "NH-6 Paved Expressway (Km 300)"
  },
  {
    "lat": 25.02856,
    "lon": 92.4617,
    "name": "NH-6 Paved Expressway (Km 302)"
  },
  {
    "lat": 25.01729,
    "lon": 92.48634,
    "name": "NH-6 Paved Expressway (Km 305)"
  },
  {
    "lat": 25.00144,
    "lon": 92.50779,
    "name": "NH-6 Paved Expressway (Km 308)"
  },
  {
    "lat": 24.97821,
    "lon": 92.52322,
    "name": "NH-6 Paved Expressway (Km 311)"
  },
  {
    "lat": 24.9677,
    "lon": 92.57327,
    "name": "NH-6 Paved Expressway (Km 314)"
  },
  {
    "lat": 24.95711,
    "lon": 92.60839,
    "name": "NH-6 Paved Expressway (Km 316)"
  },
  {
    "lat": 24.94172,
    "lon": 92.63327,
    "name": "NH-6 Paved Expressway (Km 319)"
  },
  {
    "lat": 24.91118,
    "lon": 92.66929,
    "name": "NH-6 Paved Expressway (Km 322)"
  },
  {
    "lat": 24.89986,
    "lon": 92.71467,
    "name": "NH-6 Paved Expressway (Km 325)"
  },
  {
    "lat": 24.86381,
    "lon": 92.74633,
    "name": "NH-6 Paved Expressway (Km 328)"
  },
  {
    "lat": 24.8472,
    "lon": 92.77605,
    "name": "NH-6 Paved Expressway (Km 330)"
  },
  {
    "lat": 24.83319,
    "lon": 92.77888,
    "name": "Silchar Central Relief Terminal"
  }
];

const ALTERNATIVE_SAFE_PATH = [
  {
    "lat": 26.11581,
    "lon": 91.82114,
    "name": "Guwahati (Khanapara Logistics Depot)"
  },
  {
    "lat": 26.11696,
    "lon": 91.83252,
    "name": "NH-27 East-West Expressway (Km 3)"
  },
  {
    "lat": 26.11062,
    "lon": 91.84079,
    "name": "NH-27 East-West Expressway (Km 7)"
  },
  {
    "lat": 26.10387,
    "lon": 91.85923,
    "name": "NH-27 East-West Expressway (Km 10)"
  },
  {
    "lat": 26.10027,
    "lon": 91.86884,
    "name": "NH-27 East-West Expressway (Km 14)"
  },
  {
    "lat": 26.10184,
    "lon": 91.87969,
    "name": "NH-27 East-West Expressway (Km 17)"
  },
  {
    "lat": 26.10573,
    "lon": 91.88698,
    "name": "NH-27 East-West Expressway (Km 20)"
  },
  {
    "lat": 26.1135,
    "lon": 91.89033,
    "name": "NH-27 East-West Expressway (Km 24)"
  },
  {
    "lat": 26.1194,
    "lon": 91.94881,
    "name": "NH-27 East-West Expressway (Km 27)"
  },
  {
    "lat": 26.11889,
    "lon": 91.99913,
    "name": "NH-27 East-West Expressway (Km 31)"
  },
  {
    "lat": 26.1235,
    "lon": 92.03546,
    "name": "NH-27 East-West Expressway (Km 34)"
  },
  {
    "lat": 26.1139,
    "lon": 92.08248,
    "name": "NH-27 East-West Expressway (Km 37)"
  },
  {
    "lat": 26.10502,
    "lon": 92.16218,
    "name": "NH-27 East-West Expressway (Km 41)"
  },
  {
    "lat": 26.12547,
    "lon": 92.23631,
    "name": "NH-27 East-West Expressway (Km 44)"
  },
  {
    "lat": 26.10163,
    "lon": 92.29394,
    "name": "NH-27 East-West Expressway (Km 48)"
  },
  {
    "lat": 26.12106,
    "lon": 92.34977,
    "name": "NH-27 East-West Expressway (Km 51)"
  },
  {
    "lat": 26.17133,
    "lon": 92.36038,
    "name": "NH-27 East-West Expressway (Km 54)"
  },
  {
    "lat": 26.20544,
    "lon": 92.42482,
    "name": "NH-27 East-West Expressway (Km 58)"
  },
  {
    "lat": 26.20742,
    "lon": 92.48374,
    "name": "NH-27 East-West Expressway (Km 61)"
  },
  {
    "lat": 26.23191,
    "lon": 92.51771,
    "name": "NH-27 East-West Expressway (Km 65)"
  },
  {
    "lat": 26.26326,
    "lon": 92.57762,
    "name": "NH-27 East-West Expressway (Km 68)"
  },
  {
    "lat": 26.30381,
    "lon": 92.62724,
    "name": "NH-27 East-West Expressway (Km 71)"
  },
  {
    "lat": 26.34919,
    "lon": 92.68092,
    "name": "NH-27 East-West Expressway (Km 75)"
  },
  {
    "lat": 26.31202,
    "lon": 92.71141,
    "name": "NH-27 East-West Expressway (Km 78)"
  },
  {
    "lat": 26.25549,
    "lon": 92.74462,
    "name": "Jagiroad NH-27 Expressway"
  },
  {
    "lat": 26.18313,
    "lon": 92.73616,
    "name": "NH-27 East-West Expressway (Km 85)"
  },
  {
    "lat": 26.14179,
    "lon": 92.78859,
    "name": "NH-27 East-West Expressway (Km 88)"
  },
  {
    "lat": 26.12153,
    "lon": 92.85741,
    "name": "NH-27 East-West Expressway (Km 92)"
  },
  {
    "lat": 26.04573,
    "lon": 92.90982,
    "name": "NH-27 East-West Expressway (Km 95)"
  },
  {
    "lat": 25.9293,
    "lon": 92.95547,
    "name": "NH-27 East-West Expressway (Km 99)"
  },
  {
    "lat": 25.89628,
    "lon": 92.99883,
    "name": "NH-27 East-West Expressway (Km 102)"
  },
  {
    "lat": 25.8688,
    "lon": 93.05257,
    "name": "NH-27 East-West Expressway (Km 105)"
  },
  {
    "lat": 25.84714,
    "lon": 93.10315,
    "name": "NH-27 East-West Expressway (Km 109)"
  },
  {
    "lat": 25.81659,
    "lon": 93.11039,
    "name": "NH-27 East-West Expressway (Km 112)"
  },
  {
    "lat": 25.77792,
    "lon": 93.15722,
    "name": "NH-27 East-West Expressway (Km 116)"
  },
  {
    "lat": 25.74762,
    "lon": 93.17268,
    "name": "NH-27 East-West Expressway (Km 119)"
  },
  {
    "lat": 25.72491,
    "lon": 93.13969,
    "name": "NH-27 East-West Expressway (Km 122)"
  },
  {
    "lat": 25.68829,
    "lon": 93.12309,
    "name": "NH-27 East-West Expressway (Km 126)"
  },
  {
    "lat": 25.65405,
    "lon": 93.12047,
    "name": "NH-27 East-West Expressway (Km 129)"
  },
  {
    "lat": 25.63326,
    "lon": 93.09516,
    "name": "NH-27 East-West Expressway (Km 133)"
  },
  {
    "lat": 25.60026,
    "lon": 93.09818,
    "name": "NH-27 East-West Expressway (Km 136)"
  },
  {
    "lat": 25.56368,
    "lon": 93.09377,
    "name": "NH-27 East-West Expressway (Km 139)"
  },
  {
    "lat": 25.53291,
    "lon": 93.10527,
    "name": "Nagaon 4-Lane Flyover Junction"
  },
  {
    "lat": 25.49771,
    "lon": 93.11126,
    "name": "NH-27 East-West Expressway (Km 146)"
  },
  {
    "lat": 25.46924,
    "lon": 93.14223,
    "name": "NH-27 East-West Expressway (Km 150)"
  },
  {
    "lat": 25.43359,
    "lon": 93.14035,
    "name": "NH-27 East-West Expressway (Km 153)"
  },
  {
    "lat": 25.41547,
    "lon": 93.13136,
    "name": "NH-27 East-West Expressway (Km 156)"
  },
  {
    "lat": 25.39772,
    "lon": 93.1305,
    "name": "NH-27 East-West Expressway (Km 160)"
  },
  {
    "lat": 25.37342,
    "lon": 93.12793,
    "name": "NH-27 East-West Expressway (Km 163)"
  },
  {
    "lat": 25.36013,
    "lon": 93.14328,
    "name": "NH-27 East-West Expressway (Km 167)"
  },
  {
    "lat": 25.3373,
    "lon": 93.12796,
    "name": "NH-27 East-West Expressway (Km 170)"
  },
  {
    "lat": 25.30618,
    "lon": 93.12606,
    "name": "NH-27 East-West Expressway (Km 173)"
  },
  {
    "lat": 25.28001,
    "lon": 93.14517,
    "name": "NH-27 East-West Expressway (Km 177)"
  },
  {
    "lat": 25.26905,
    "lon": 93.14665,
    "name": "NH-27 East-West Expressway (Km 180)"
  },
  {
    "lat": 25.24566,
    "lon": 93.143,
    "name": "NH-27 East-West Expressway (Km 184)"
  },
  {
    "lat": 25.20431,
    "lon": 93.13729,
    "name": "NH-27 East-West Expressway (Km 187)"
  },
  {
    "lat": 25.18706,
    "lon": 93.11355,
    "name": "NH-27 East-West Expressway (Km 190)"
  },
  {
    "lat": 25.17758,
    "lon": 93.07808,
    "name": "NH-27 East-West Expressway (Km 194)"
  },
  {
    "lat": 25.15594,
    "lon": 93.0628,
    "name": "NH-27 East-West Expressway (Km 197)"
  },
  {
    "lat": 25.13117,
    "lon": 93.04002,
    "name": "NH-27 East-West Expressway (Km 201)"
  },
  {
    "lat": 25.1314,
    "lon": 93.02446,
    "name": "Lumding Safe Strategic Corridor"
  },
  {
    "lat": 25.13562,
    "lon": 93.01857,
    "name": "NH-27 East-West Expressway (Km 207)"
  },
  {
    "lat": 25.14348,
    "lon": 93.02267,
    "name": "NH-27 East-West Expressway (Km 211)"
  },
  {
    "lat": 25.15376,
    "lon": 93.02497,
    "name": "NH-27 East-West Expressway (Km 214)"
  },
  {
    "lat": 25.16352,
    "lon": 93.02392,
    "name": "NH-27 East-West Expressway (Km 218)"
  },
  {
    "lat": 25.16782,
    "lon": 93.02386,
    "name": "NH-27 East-West Expressway (Km 221)"
  },
  {
    "lat": 25.18084,
    "lon": 93.02046,
    "name": "NH-27 East-West Expressway (Km 224)"
  },
  {
    "lat": 25.18836,
    "lon": 93.02015,
    "name": "NH-27 East-West Expressway (Km 228)"
  },
  {
    "lat": 25.19977,
    "lon": 93.017,
    "name": "NH-27 East-West Expressway (Km 231)"
  },
  {
    "lat": 25.20485,
    "lon": 93.02108,
    "name": "NH-27 East-West Expressway (Km 235)"
  },
  {
    "lat": 25.21803,
    "lon": 93.01428,
    "name": "NH-27 East-West Expressway (Km 238)"
  },
  {
    "lat": 25.21493,
    "lon": 93.02164,
    "name": "NH-27 East-West Expressway (Km 241)"
  },
  {
    "lat": 25.21407,
    "lon": 93.02494,
    "name": "NH-27 East-West Expressway (Km 245)"
  },
  {
    "lat": 25.21368,
    "lon": 93.02981,
    "name": "NH-27 East-West Expressway (Km 248)"
  },
  {
    "lat": 25.21107,
    "lon": 93.03857,
    "name": "NH-27 East-West Expressway (Km 252)"
  },
  {
    "lat": 25.21202,
    "lon": 93.04467,
    "name": "NH-27 East-West Expressway (Km 255)"
  },
  {
    "lat": 25.21225,
    "lon": 93.05329,
    "name": "NH-27 East-West Expressway (Km 258)"
  },
  {
    "lat": 25.21131,
    "lon": 93.06155,
    "name": "NH-27 East-West Expressway (Km 262)"
  },
  {
    "lat": 25.20636,
    "lon": 93.06832,
    "name": "NH-27 East-West Expressway (Km 265)"
  },
  {
    "lat": 25.19769,
    "lon": 93.06648,
    "name": "NH-27 East-West Expressway (Km 269)"
  },
  {
    "lat": 25.19336,
    "lon": 93.06413,
    "name": "NH-27 East-West Expressway (Km 272)"
  },
  {
    "lat": 25.18894,
    "lon": 93.06869,
    "name": "Maibang Safe Grade Cut"
  },
  {
    "lat": 25.19588,
    "lon": 93.08577,
    "name": "NH-27 East-West Expressway (Km 279)"
  },
  {
    "lat": 25.193,
    "lon": 93.09978,
    "name": "NH-27 East-West Expressway (Km 282)"
  },
  {
    "lat": 25.1905,
    "lon": 93.11473,
    "name": "NH-27 East-West Expressway (Km 286)"
  },
  {
    "lat": 25.18779,
    "lon": 93.09031,
    "name": "NH-27 East-West Expressway (Km 289)"
  },
  {
    "lat": 25.15763,
    "lon": 93.06848,
    "name": "NH-27 East-West Expressway (Km 292)"
  },
  {
    "lat": 25.14213,
    "lon": 93.04421,
    "name": "NH-27 East-West Expressway (Km 296)"
  },
  {
    "lat": 25.1231,
    "lon": 93.02549,
    "name": "NH-27 East-West Expressway (Km 299)"
  },
  {
    "lat": 25.11806,
    "lon": 93.01319,
    "name": "NH-27 East-West Expressway (Km 303)"
  },
  {
    "lat": 25.11119,
    "lon": 93.00536,
    "name": "NH-27 East-West Expressway (Km 306)"
  },
  {
    "lat": 25.11173,
    "lon": 92.99915,
    "name": "NH-27 East-West Expressway (Km 309)"
  },
  {
    "lat": 25.10904,
    "lon": 92.99501,
    "name": "NH-27 East-West Expressway (Km 313)"
  },
  {
    "lat": 25.10572,
    "lon": 92.98558,
    "name": "NH-27 East-West Expressway (Km 316)"
  },
  {
    "lat": 25.10719,
    "lon": 92.97437,
    "name": "NH-27 East-West Expressway (Km 320)"
  },
  {
    "lat": 25.11157,
    "lon": 92.97135,
    "name": "NH-27 East-West Expressway (Km 323)"
  },
  {
    "lat": 25.11299,
    "lon": 92.9542,
    "name": "NH-27 East-West Expressway (Km 326)"
  },
  {
    "lat": 25.10951,
    "lon": 92.92298,
    "name": "NH-27 East-West Expressway (Km 330)"
  },
  {
    "lat": 25.10795,
    "lon": 92.90519,
    "name": "Haflong Hill Bypass"
  },
  {
    "lat": 25.11089,
    "lon": 92.87826,
    "name": "NH-27 East-West Expressway (Km 337)"
  },
  {
    "lat": 25.10724,
    "lon": 92.86778,
    "name": "NH-27 East-West Expressway (Km 340)"
  },
  {
    "lat": 25.10775,
    "lon": 92.84896,
    "name": "NH-27 East-West Expressway (Km 343)"
  },
  {
    "lat": 25.0873,
    "lon": 92.81585,
    "name": "NH-27 East-West Expressway (Km 347)"
  },
  {
    "lat": 25.07904,
    "lon": 92.81226,
    "name": "NH-27 East-West Expressway (Km 350)"
  },
  {
    "lat": 25.07058,
    "lon": 92.81289,
    "name": "NH-27 East-West Expressway (Km 354)"
  },
  {
    "lat": 25.06142,
    "lon": 92.80678,
    "name": "NH-27 East-West Expressway (Km 357)"
  },
  {
    "lat": 25.04838,
    "lon": 92.7949,
    "name": "NH-27 East-West Expressway (Km 360)"
  },
  {
    "lat": 25.03086,
    "lon": 92.7763,
    "name": "NH-27 East-West Expressway (Km 364)"
  },
  {
    "lat": 25.01404,
    "lon": 92.75992,
    "name": "Harangajao Valley Highway"
  },
  {
    "lat": 25.00316,
    "lon": 92.74817,
    "name": "NH-27 East-West Expressway (Km 371)"
  },
  {
    "lat": 24.99601,
    "lon": 92.74142,
    "name": "NH-27 East-West Expressway (Km 374)"
  },
  {
    "lat": 24.98438,
    "lon": 92.75302,
    "name": "NH-27 East-West Expressway (Km 377)"
  },
  {
    "lat": 24.97504,
    "lon": 92.76377,
    "name": "NH-27 East-West Expressway (Km 381)"
  },
  {
    "lat": 24.95628,
    "lon": 92.75727,
    "name": "NH-27 East-West Expressway (Km 384)"
  },
  {
    "lat": 24.93002,
    "lon": 92.76721,
    "name": "NH-27 East-West Expressway (Km 388)"
  },
  {
    "lat": 24.90597,
    "lon": 92.77398,
    "name": "NH-27 East-West Expressway (Km 391)"
  },
  {
    "lat": 24.88687,
    "lon": 92.76533,
    "name": "NH-27 East-West Expressway (Km 394)"
  },
  {
    "lat": 24.85732,
    "lon": 92.7708,
    "name": "NH-27 East-West Expressway (Km 398)"
  },
  {
    "lat": 24.83073,
    "lon": 92.79239,
    "name": "NH-27 East-West Expressway (Km 401)"
  },
  {
    "lat": 24.83319,
    "lon": 92.77888,
    "name": "Silchar Central Relief Terminal"
  }
];

export default function LiveGpsTrackerSimulation({ onUpdateSimulationState }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRerouted, setIsRerouted] = useState(false);
  const [injectedHazard, setInjectedHazard] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [speed, setSpeed] = useState(380); // ms per waypoint for smooth real-time road curvature progression

  const activePath = isRerouted ? ALTERNATIVE_SAFE_PATH : PRIMARY_CONVOY_PATH;
  const currentVehiclePos = activePath[Math.min(currentStep, activePath.length - 1)];

  // Sync simulation state up to parent Map layer
  const syncState = useCallback(() => {
    if (onUpdateSimulationState) {
      onUpdateSimulationState({
        vehiclePos: currentVehiclePos,
        currentPath: activePath,
        isRerouted,
        injectedHazard,
        scanMetrics: {
          riskScore: scanResult?.primary_route_scan?.route_composite_risk ?? (injectedHazard ? 0.84 : 0.22),
          threatLevel: scanResult?.primary_route_scan?.threat_level ?? (injectedHazard ? 'critical' : 'low'),
          statusLabel: scanResult?.primary_route_scan?.status_label ?? (injectedHazard ? 'Hazard Blockage Detected' : 'Corridor Clear'),
        },
      });
    }
  }, [currentVehiclePos, activePath, isRerouted, injectedHazard, scanResult, onUpdateSimulationState]);

  useEffect(() => {
    syncState();
  }, [syncState]);

  // Periodic GPS convoy motion simulation
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= activePath.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, activePath.length, speed]);

  // Run AI Route Hazard Scan API
  const handleScanRoute = async (hazard) => {
    setScanning(true);
    try {
      const res = await boundaryAPI.scanRoute(PRIMARY_CONVOY_PATH, hazard);
      setScanResult(res);
      return res;
    } catch (err) {
      console.error('Route scan failed', err);
    } finally {
      setScanning(false);
    }
  };

  // Inject or remove simulated hazard
  const handleToggleHazard = async () => {
    if (injectedHazard) {
      setInjectedHazard(null);
      await handleScanRoute(null);
    } else {
      const hazard = {
        lat: 25.1812,
        lon: 92.3800,
        type: 'landslide',
        title: 'Landslide Blockage at Lumshnong Pass',
      };
      setInjectedHazard(hazard);
      const res = await handleScanRoute(hazard);
      if (res?.has_hazard_blockage) {
        // Auto-switch to alternative bypass
        setIsRerouted(true);
        setCurrentStep(0);
      }
    }
  };

  const handleManualReroute = () => {
    setIsRerouted((prev) => !prev);
    setCurrentStep(0);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setIsRerouted(false);
    setInjectedHazard(null);
    setScanResult(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Live GPS Convoy Telemetry & AI Rerouting Engine</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" />
                Live GPS
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Real-time vehicle simulation along strategic corridors with proactive AI hazard avoidance.
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-primary hover:bg-primary/90 text-on-primary'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Simulate GPS</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Convoy Telemetry Status Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] uppercase font-bold text-slate-400">Target Vehicle</div>
          <div className="text-xs font-black text-slate-900 mt-0.5 flex items-center gap-1">
            <span>AS-11-BC-4401</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">5-Ton</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{currentVehiclePos.name}</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] uppercase font-bold text-slate-400">Active Corridor</div>
          <div className={`text-xs font-black mt-0.5 flex items-center gap-1 ${isRerouted ? 'text-emerald-700' : 'text-blue-700'}`}>
            <span>{isRerouted ? 'NH-27 Lumding Bypass' : 'NH-6 Meghalaya Pass'}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            {isRerouted ? 'Safe Autonomous Reroute' : 'Standard Primary Lifeline'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] uppercase font-bold text-slate-400">AI Threat Level</div>
          <div className="text-xs font-black mt-0.5 flex items-center gap-1">
            {injectedHazard ? (
              <span className="text-red-600 flex items-center gap-1">
                <AlertOctagon className="w-3 h-3 text-red-500" />
                Critical Threat (0.84)
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Clear & Safe (0.22)
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            {injectedHazard ? 'Disruption imminent on pass' : 'No blockages detected'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] uppercase font-bold text-slate-400">Convoy Waypoint</div>
          <div className="text-xs font-black text-slate-900 mt-0.5">
            Step {currentStep + 1} of {activePath.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5 font-mono">
            {currentVehiclePos.lat.toFixed(4)}°N, {currentVehiclePos.lon.toFixed(4)}°E
          </div>
        </div>
      </div>

      {/* Interactive Scenario Injector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-lg border border-slate-200/80">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleHazard}
            disabled={scanning}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              injectedHazard
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-white border border-red-200 text-red-700 hover:bg-red-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{injectedHazard ? 'Clear Injected Hazard' : 'Inject Landslide Blockage on NH-6'}</span>
          </button>

          <button
            onClick={handleManualReroute}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              isRerouted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isRerouted ? 'Switch to NH-6 Lifeline' : 'Switch to NH-27 Bypass'}</span>
          </button>
        </div>

        {injectedHazard && (
          <div className="text-xs font-semibold text-red-700 flex items-center gap-1.5 animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            <span>AI Automated Rerouting Activated: Diverting convoy via NH-27 Lumding Corridor (Saved ~180 mins).</span>
          </div>
        )}
      </div>
    </div>
  );
}
