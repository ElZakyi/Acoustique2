import React, { useEffect, useState, useMemo } from 'react';

import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './AffairesListe.css';

// Import pour Chart.js
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import DatalabelsPlugin from 'chartjs-plugin-datalabels';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    DatalabelsPlugin 
);

const BANDES = [63, 125, 250, 500, 1000, 2000, 4000];
const TYPES_LIGNES = ["Soufflage", "reprise", "extraction", "Lp tot"];

const NR_OPTIONS = [0, 10, 20, 30, 35, 40, 45, 50, 60];

const calculateLpTot = (lpSoufflageVal, lpRepriseVal, lpExtractionVal) => {
    const val1 = parseFloat(lpSoufflageVal);
    const val2 = parseFloat(lpRepriseVal);
    const val3 = parseFloat(lpExtractionVal);

    if (isNaN(val1) || isNaN(val2) || isNaN(val3)) {
        return null;
    }

    const sumPowers = Math.pow(10, val1 / 10) + Math.pow(10, val2 / 10) + Math.pow(10, val3 / 10);
    if (sumPowers <= 0) {
        return null;
    }

    return 10 * Math.log10(sumPowers);
};

const ResultatsPage = () => {
    const [lpReprise, setLpReprise] = useState({});
    const [lpExtraction, setLpExtraction] = useState({});
    const [lpSoufflage, setLpSoufflage] = useState({});
    const [lpGlobalDBA, setLpGlobalDBA] = useState({});
    const [nrReference, setNrReference] = useState([]);
    const { id_salle: idParam } = useParams();
    const location = useLocation();
    const id_salle = idParam || location.state?.id_salle;

    const [showNRSelectSection, setShowNRSelectSection] = useState(false);
    const [tempSelectedNR, setTempSelectedNR] = useState('');
    const [selectedNRForChart, setSelectedNRForChart] = useState(null);
    const [showChart, setShowChart] = useState(false);
    const [tracabiliteData, setTracabiliteData] = useState([]);

    useEffect(() => {
        if (!id_salle) return;
        const fetchTracabilite = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/tracabilite/${id_salle}`);
                setTracabiliteData(response.data);
            } catch (error) {
                console.error("Erreur chargement tracabilité :", error);
            }
        };
        fetchTracabilite();
    }, [id_salle]);



    const lpTotValues = useMemo(() => {
        const values = {};
        BANDES.forEach(freq => {
            const lpTot = calculateLpTot(lpSoufflage[freq], lpReprise[freq], lpExtraction[freq]);
            if (lpTot !== null) {
                values[freq] = lpTot;
            }
        });
        return values;
    }, [lpSoufflage, lpReprise, lpExtraction]);

    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("email");
        localStorage.removeItem("id_utilisateur");
        navigate("/connexion");
    };

    useEffect(() => {
        const fetchNR = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/nr-reference');
                setNrReference(response.data);
            } catch (error) {
                console.error('Erreur chargement NR:', error);
            }
        };
        fetchNR();
    }, []);

    useEffect(() => {
        if (!id_salle) return;
        const fetchLpSoufflage = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/lp-vc-soufflage/${id_salle}`);
                const valeurs = {};
                response.data.forEach(item => {
                    valeurs[item.bande] = item.valeur;
                });
                setLpSoufflage(valeurs);
            } catch (error) {
                console.error('Erreur chargement Lp VC Soufflage:', error);
            }
        };
        fetchLpSoufflage();
    }, [id_salle]);

    useEffect(() => {
        if (!id_salle) return;
        const fetchLpReprise = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/lp-vc-reprise/${id_salle}`);
                const valeurs = {};
                response.data.forEach(item => {
                    valeurs[item.bande] = item.valeur;
                });
                setLpReprise(valeurs);
            } catch (error) {
                console.error('Erreur chargement Lp VC Reprise:', error);
            }
        };
        fetchLpReprise();
    }, [id_salle]); 

    useEffect(() => {
        if (!id_salle) return;
        const fetchLpExtraction = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/lp-extraction/${id_salle}`);
                const valeurs = {};
                response.data.forEach(item => {
                    valeurs[item.bande] = item.valeur;
                });
                setLpExtraction(valeurs);
            } catch (error) {
                console.error('Erreur chargement Lp Extraction:', error);
            }
        };
        fetchLpExtraction();
    }, [id_salle]);

    useEffect(() => {
        if (!id_salle) return;
        const fetchLpGlobalDBA = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/lp-dba/${id_salle}`);
                const valeurs = {};
                response.data.forEach(item => {
                    valeurs[item.type_source.toLowerCase()] = item.valeur;
                });
                setLpGlobalDBA(valeurs);
            } catch (error) {
                console.error('Erreur chargement Global dBA:', error);
            }
        };
        fetchLpGlobalDBA();
    }, [id_salle]);

    const handleDisplayChartButtonClick = () => {
        setShowNRSelectSection(true);
        setShowChart(false);
        setSelectedNRForChart(null);
        setTempSelectedNR('');
    };

    const handleConfirmNRSelection = () => {
        const nrValue = parseInt(tempSelectedNR);
        if (NR_OPTIONS.includes(nrValue)) {
            setSelectedNRForChart(nrValue);
            setShowChart(true);
            setShowNRSelectSection(false);
        } else {
            alert("Veuillez sélectionner un NR valide.");
        }
    };

    const handleCancelNRSelection = () => {
        setShowNRSelectSection(false);
        setTempSelectedNR('');
    };

    // Prepare chart data en se basant sur lp total et NR
    const chartData = useMemo(() => {
        const nrData = nrReference.map(row => row[`nr${selectedNRForChart}`]);
        const lpTotData = BANDES.map(band => lpTotValues[band] || null);

        return {
            labels: BANDES.map(String),
            datasets: [
                {
                    label: `NR ${selectedNRForChart}`,
                    data: nrData,
                    borderColor: '#ff7f0e', // Orange
                    backgroundColor: '#ff7f0e',
                    tension: 0.1,
                    pointRadius: 0, 
                    pointHitRadius: 0, 
                    pointHoverRadius: 0, 
                },
                {
                    label: 'Lp tot',
                    data: lpTotData,
                    borderColor: '#1f77b4', // Blue
                    backgroundColor: '#1f77b4',
                    tension: 0.1,
                    pointRadius: 0, 
                    pointHitRadius: 0,
                    pointHoverRadius: 0,
                },
            ],
        };
    }, [lpTotValues, selectedNRForChart, nrReference]);

    // Chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
            },
            title: {
                display: true,
                text: 'Courbe de Niveau Sonore',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null && !isNaN(context.parsed.y)) {
                            label += context.parsed.y.toFixed(3);
                        }
                        return label;
                    }
                }
            },
            datalabels: { 
                display: true, 
                color: 'black', 
                align: 'end',
                anchor: 'end', 
                formatter: function(value, context) {
                    return value !== null && !isNaN(value) ? value.toFixed(3) : '';
                },
                font: {
                    weight: 'bold',
                    size: 10,
                },
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(0, 0, 0, 0.2)',
                borderWidth: 0,
                borderRadius: 4,
                padding: {
                    top: 4,
                    bottom: 4,
                    left: 6,
                    right: 6
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Fréquence (Hz)',
                },
                type: 'category',
                labels: BANDES.map(String),
            },
            y: {
                title: {
                    display: true,
                    text: 'Niveau Sonore (dB)',
                },
                beginAtZero: false,
            },
        },
    };

    return (
  <>
    {/* Bouton Déconnexion */}
    <div className="logout-global">
      <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
    </div>

    {/* Disposition en 2 colonnes : traçabilité à gauche + contenu principal à droite */}
    <div className="main-layout">

      {/* Colonne gauche - Traçabilité */}
      {tracabiliteData.length > 0 && (
  <div className="tracabilite-fixed">
    <h3 className="page-title">Traçabilité Affaire → Réseau</h3>
    {(() => {
      const affaire = tracabiliteData[0];
      const lines = [
        `Affaire : ${affaire.numero_affaire} - ${affaire.objet}`,
        `  └── Salle : ${affaire.nom_salle}`
      ];

      const groupedBySource = {};

      // Grouper les données par source, puis tronçon, puis élément
      tracabiliteData.forEach(row => {
        if (!groupedBySource[row.id_source]) {
          groupedBySource[row.id_source] = {
            nom_source: row.nom_source,
            type_source: row.type_source,
            troncons: {}
          };
        }

        if (!groupedBySource[row.id_source].troncons[row.id_troncon]) {
        groupedBySource[row.id_source].troncons[row.id_troncon] = {
            forme: row.forme,
            elements: [] // ✅ tableau dès le départ
        };
        }

        const elementLabel = row.type_element === "vc" && row.type_vc
        ? `${row.type_element} (${row.type_vc})`
        : row.type_element;

        groupedBySource[row.id_source].troncons[row.id_troncon].elements.push(elementLabel);



      });

      // Construire les lignes de l’arborescence
      Object.values(groupedBySource).forEach(source => {
        lines.push(`      └── Source sonore : ${source.nom_source} (${source.type_source})`);
        Object.values(source.troncons).forEach(troncon => {
          lines.push(`          └── Tronçon : ${troncon.forme}`);
          troncon.elements.forEach(el => {
            lines.push(`              └── Élément : ${el}`);
          });
        });
      });

      return <pre className="tracabilite-box">{lines.join('\n')}</pre>;
    })()}
  </div>
)}


      {/* Colonne droite - Contenu principal */}
      <div className="container-box">
        <div className="page-header">
          <h2 className="page-title">Résultats Acoustiques - Synthèse</h2>
        </div>

        <table className="affaires-table synthese-table">
          <thead>
            <tr>
              <th>Type</th>
              {BANDES.map(freq => (
                <th key={freq}>{freq} Hz</th>
              ))}
              <th>GLOBAL dBA</th>
            </tr>
          </thead>
          <tbody>
            {TYPES_LIGNES.map((type, idx) => (
              <tr key={idx}>
                <td>{type}</td>
                {BANDES.map(freq => (
                  <td key={freq}>
                    {
                      type === "reprise" ? (lpReprise[freq]?.toFixed(3) ?? '') :
                      type === "extraction" ? (lpExtraction[freq]?.toFixed(3) ?? '') :
                      type === "Soufflage" ? (lpSoufflage[freq]?.toFixed(3) ?? '') :
                      type === "Lp tot" ? (calculateLpTot(lpSoufflage[freq], lpReprise[freq], lpExtraction[freq])?.toFixed(3) ?? '') :
                      ''
                    }
                  </td>
                ))}
                <td>
                  {type === "reprise"
                    ? (lpGlobalDBA["vc crsl-ecm 2 /reprise"]?.toFixed(3) ?? '')
                    : type === "extraction"
                    ? (lpGlobalDBA["extraction"]?.toFixed(3) ?? '')
                    : type === "Soufflage"
                    ? (lpGlobalDBA["vc crsl-ecm 2 /soufflage"]?.toFixed(3) ?? '')
                    : type === "Lp tot"
                    ? (calculateLpTot(
                        lpGlobalDBA["vc crsl-ecm 2 /soufflage"],
                        lpGlobalDBA["vc crsl-ecm 2 /reprise"],
                        lpGlobalDBA["extraction"]
                      )?.toFixed(3) ?? '')
                    : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="page-title margin-top-table">Tableau NR (Référence)</h3>
        <table className="affaires-table synthese-table">
          <thead>
            <tr>
              <th>Hz / NR</th>
              {NR_OPTIONS.map(nr => (
                <th key={`nr-header-${nr}`}>{`NR ${nr}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nrReference.map((row, index) => (
              <tr key={index}>
                <td>{row.bande}</td>
                {NR_OPTIONS.map(nr => (
                  <td key={`nr-value-${row.bande}-${nr}`}>{row[`nr${nr}`]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Bouton Afficher courbe */}
        <div className="footer-actions chart-actions-container">
          <button className="btn-secondary btn-full-width" onClick={handleDisplayChartButtonClick}>
            Afficher la courbe
          </button>

          {showNRSelectSection && (
            <div className="nr-selection-controls">
              <label htmlFor="nr-select">Choisir un NR:</label>
              <select
                id="nr-select"
                value={tempSelectedNR}
                onChange={(e) => setTempSelectedNR(e.target.value)}
              >
                <option value="" disabled>Sélectionnez un NR</option>
                {NR_OPTIONS.map(nr => (
                  <option key={nr} value={nr}>{`NR ${nr}`}</option>
                ))}
              </select>
              <button
                className="btn-primary"
                onClick={handleConfirmNRSelection}
                disabled={!tempSelectedNR}
              >
                Valider
              </button>
              <button
                className="btn-secondary"
                onClick={handleCancelNRSelection}
              >
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Courbe Chart.js */}
        {showChart && selectedNRForChart !== null && (
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        <div className="footer-actions">
          <button className="btn-secondary" onClick={() => window.history.back()}>
            Retour
          </button>
        </div>
      </div>
    </div>
  </>
);

};

export default ResultatsPage;