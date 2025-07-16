import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './AffairesListe.css';
import html2pdf from 'html2pdf.js';
import { useRef } from 'react';

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
    const [showChart, setShowChart] = useState(false); // Cet état contrôle la visibilité du Chart sur la page et dans le PDF.

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [openSidebarSections, setOpenSidebarSections] = useState({});

    const [rawTracabiliteData, setRawTracabiliteData] = useState([]);
    const pdfRef = useRef();

    // Pour stocker les infos de l'affaire et de la salle (en dehors de la traçabilité)
    // On peut les récupérer depuis processedTracabiliteData pour le PDF simplifié
    // const [affaireInfo, setAffaireInfo] = useState(null);
    //const [salleInfo, setSalleInfo] = useState(null);

    useEffect(() => {
        if (!id_salle) return;
        const fetchTracabilite = async () => {
            try {
                const tracabiliteResponse = await axios.get(`http://localhost:5000/api/tracabilite/${id_salle}`);
                setRawTracabiliteData(tracabiliteResponse.data);
            } catch (error) {
                console.error("Erreur chargement des données pour le PDF :", error);
            }
        };
        fetchTracabilite();
    }, [id_salle]);


    // Traitement des données de traçabilité
    const processedTracabiliteData = useMemo(() => {
        if (!rawTracabiliteData || rawTracabiliteData.length === 0) return null;

        const affaire = rawTracabiliteData[0];
        const result = {
            numero_affaire: affaire.numero_affaire,
            objet_affaire: affaire.objet,
            nom_salle: affaire.nom_salle,
            sources: {},
        };

        rawTracabiliteData.forEach(row => {
            if (!result.sources[row.id_source]) {
                result.sources[row.id_source] = {
                    id: row.id_source,
                    nom_source: row.nom_source,
                    type_source: row.type_source,
                    troncons: {},
                };
            }

            const currentSource = result.sources[row.id_source];
            if (!currentSource.troncons[row.id_troncon]) {
                currentSource.troncons[row.id_troncon] = {
                    id: row.id_troncon,
                    forme: row.forme,
                    elements: [],
                };
            }

            // Ajouter l'élément au tronçon
            const currentTroncon = currentSource.troncons[row.id_troncon];
            const elementLabel = row.type_element === "vc" && row.type_vc
                ? `${row.type_element} (${row.type_vc})`
                : row.type_element;
            currentTroncon.elements.push(elementLabel);
        });

        result.sources = Object.values(result.sources).map(source => ({
            ...source,
            troncons: Object.values(source.troncons),
        }));

        return result;
    }, [rawTracabiliteData]);

    // Fonction pour basculer l'état d'une section déplier et replier
    const toggleSidebarSection = (id) => {
        setOpenSidebarSections(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

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
        localStorage.removeItem("utilisateur");
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
            setShowChart(true); // Afficher le graphique sur la page
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

    // Chart options (pas de changement, elles sont déjà bien)
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            title: { display: true, text: 'Courbe de Niveau Sonore' },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null && !isNaN(context.parsed.y)) label += context.parsed.y.toFixed(3);
                        return label;
                    }
                }
            },
            datalabels: {
                display: true,
                color: 'black',
                align: 'end',
                anchor: 'end',
                formatter: function(value, context) { return value !== null && !isNaN(value) ? value.toFixed(3) : ''; },
                font: { weight: 'bold', size: 10 },
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(0, 0, 0, 0.2)',
                borderWidth: 0,
                borderRadius: 4,
                padding: { top: 4, bottom: 4, left: 6, right: 6 }
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Fréquence (Hz)' },
                type: 'category',
                labels: BANDES.map(String),
            },
            y: {
                title: { display: true, text: 'Niveau Sonore (dB)' },
                beginAtZero: false,
            },
        },
    };

    const generatePDF = async () => {
        const element = pdfRef.current;

        // Temporairement, rendre le conteneur du PDF visible et le positionner correctement
        // pour que html2canvas le capture, surtout pour le graphique.
        element.style.opacity = '1';
        element.style.zIndex = '9999';
        element.style.position = 'relative'; // Important pour qu'il soit dans le flux de rendu

        // Petite attente pour s'assurer que Chart.js a fini de dessiner sur le canvas
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms devraient suffire

        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5], // Top, Left, Bottom, Right margin (inches)
            filename: `Resultats_Affaire_${processedTracabiliteData?.numero_affaire || 'export'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, allowTaint: true }, // Scale 2 pour une meilleure résolution
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' } // Format A4, orientation paysage
        };

        // Générer le PDF
        await html2pdf().set(opt).from(element).save();

        // Rendre le conteneur du PDF à nouveau invisible
        element.style.opacity = '0';
        element.style.zIndex = '-1';
        element.style.position = 'fixed'; // Remettre en fixed ou absolute pour ne pas influencer le layout
    };


    return (
        <>
            {/* Bouton Déconnexion*/}
            <div className="logout-global">
                <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
            </div>

            {/* Bouton Hamburger*/}
            <button className="hamburger-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                ☰ Tracabilité
            </button>

            {/* Sidebar de Traçabilité */}
            <div className={`tracabilite-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <h3 className="sidebar-title">Traçabilité Affaire → Réseau</h3>
                {processedTracabiliteData ? (
                    <div className="sidebar-content-scrollable">
                        <div className="sidebar-item-root">
                            <div className="sidebar-label">
                                Affaire : {processedTracabiliteData.numero_affaire} - {processedTracabiliteData.objet_affaire}
                            </div>
                            <div className="sidebar-sub-item-indent">
                                Salle : {processedTracabiliteData.nom_salle}
                            </div>
                        </div>

                        {processedTracabiliteData.sources.map(source => (
                            <div key={`source-${source.id}`} className="sidebar-item-container">
                                <div
                                    className="sidebar-toggle-header"
                                    onClick={() => toggleSidebarSection(`source-${source.id}`)}
                                >
                                    <span className={`sidebar-arrow ${openSidebarSections[`source-${source.id}`] ? 'expanded' : ''}`}>►</span>
                                    <span className="sidebar-label">Source : {source.nom_source} ({source.type_source})</span>
                                </div>
                                {openSidebarSections[`source-${source.id}`] && (
                                    <div className="sidebar-nested-items">
                                        {source.troncons.map(troncon => (
                                            <div key={`troncon-${troncon.id}`} className="sidebar-item-container">
                                                <div
                                                    className="sidebar-toggle-header"
                                                    onClick={() => toggleSidebarSection(`troncon-${troncon.id}`)}
                                                >
                                                    <span className={`sidebar-arrow ${openSidebarSections[`troncon-${troncon.id}`] ? 'expanded' : ''}`}>►</span>
                                                    <span className="sidebar-label">Tronçon : {troncon.forme}</span>
                                                </div>
                                                {openSidebarSections[`troncon-${troncon.id}`] && (
                                                    <div className="sidebar-nested-items">
                                                        {troncon.elements.map((element, elIdx) => (
                                                            <div key={`element-${elIdx}`} className="sidebar-simple-item">
                                                                Élément : {element}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="sidebar-content-scrollable">Aucune donnée de traçabilité disponible.</p>
                )}
            </div>

            {/* Contenu principal de la page */}
            <div className={`main-page-content ${isSidebarOpen ? 'shifted' : ''}`}>
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
                        <button className="btn-primary" onClick={generatePDF}>
                            Exporter en PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENU POUR PDF UNIQUEMENT */}
           <div
            ref={pdfRef}
            style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '1123px', // 📏 pleine largeur A4 paysage
            background: 'white',
            zIndex: -1,
            opacity: 0,
            }}
            >
            <div style={{ padding: "1rem", fontFamily: "Arial, sans-serif", color: "#1a1a1a" }}>
            <h2 style={{
                fontSize: "26px",
                marginBottom: "8px",
                fontWeight: "bold",
                color: "#004080",           // ✅ Couleur bleue professionnelle
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: "1px"
            }}>
                Affaire : {processedTracabiliteData?.numero_affaire}
            </h2>

            <p style={{
                fontSize: "16px",
                margin: "2px 0",
                fontWeight: "500",
                textAlign: "center",
                color: "#333"
            }}>
                Objet : <span style={{ fontWeight: "normal" }}>{processedTracabiliteData?.objet_affaire}</span>
            </p>

            <p style={{
                fontSize: "16px",
                margin: "2px 0 40px",
                fontWeight: "500",
                textAlign: "center",
                color: "#333"
            }}>
                Salle : <span style={{ fontWeight: "normal" }}>{processedTracabiliteData?.nom_salle}</span>
            </p>

            <h3 style={{
                fontSize: "20px",
                marginTop: "40px",
                marginBottom: "15px",
                textAlign: "center",
                color: "#006666",          // ✅ Couleur secondaire douce
                borderBottom: "2px solid #ccc",
                paddingBottom: "5px"
            }}>
                Résultats Acoustiques - Synthèse
            </h3>

                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '9px',
                    tableLayout: 'fixed',
                    wordWrap: 'break-word',
                }} className="affaires-table synthese-table">
                <thead>
                    <tr>
                    <th style = {{width:'8%'}}>Type</th>
                    {BANDES.map(freq => (
                        <th key={freq} style={{ width: '5%' }}>{freq} Hz</th>
                    ))}
                    <th style={{ width: '11%' }}>GLOBAL dBA</th>
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

                {/* ✅ Forcer un saut de page AVANT la courbe */}
                <div style={{ pageBreakBefore: 'always' }} />

                {/* ✅ Courbe sur une nouvelle page */}
                <h3 style={{
                fontSize: "18px",
                marginBottom: "1rem",
                textAlign: "center",
                fontWeight: "bold",
                color: "#006666", // même code couleur secondaire   
                }}>
                Courbe du niveau sonore
                </h3>


                {showChart && selectedNRForChart !== null && (
                                    <div className="chart-container">
                                        <Line data={chartData} options={chartOptions} />
                                    </div>
                                )}

            </div>
            </div>

        </>
    );
};

export default ResultatsPage;