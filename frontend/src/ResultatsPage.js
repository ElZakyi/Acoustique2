import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AffairesListe.css';
import { useParams, useLocation } from 'react-router-dom';
const BANDES = [63, 125, 250, 500, 1000, 2000, 4000];
const TYPES_LIGNES = ["Soufflage", "reprise", "extraction", "Lp tot"];

//calcule de Lp total
const calculateLpTot = (lpSoufflageVal, lpRepriseVal, lpExtractionVal) => {
    const val1 = parseFloat(lpSoufflageVal);
    const val2 = parseFloat(lpRepriseVal);
    const val3 = parseFloat(lpExtractionVal);
    if (isNaN(val1) || isNaN(val2) || isNaN(val3)) {
        return '';
    }

    // formule
    const sumPowers = Math.pow(10, val1 / 10) + Math.pow(10, val2 / 10) + Math.pow(10, val3 / 10);
    if (sumPowers <= 0) {
        return '';
    }

    const result = 10 * Math.log10(sumPowers);
    return result.toFixed(3);
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
    }, []);

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


    return (
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
                        <td key={freq}>{
                        type === "reprise" ? lpReprise[freq] ?? '' :
                        type === "extraction" ? lpExtraction[freq] ?? '' :
                        type === "Soufflage" ? lpSoufflage[freq] ?? '' :
                        type === "Lp tot" ? calculateLpTot(lpSoufflage[freq], lpReprise[freq], lpExtraction[freq]) :
                        ''
                        }</td>
                    ))}
                    <td>
                    {type === "reprise"
                        ? lpGlobalDBA["vc crsl-ecm 2 /reprise"] ?? ''
                        : type === "extraction"
                        ? lpGlobalDBA["extraction"] ?? ''
                        : type === "Soufflage"
                        ? lpGlobalDBA["vc crsl-ecm 2 /soufflage"] ?? ''
                        : type === "Lp tot"
                        ? calculateLpTot(
                            lpGlobalDBA["vc crsl-ecm 2 /soufflage"],
                            lpGlobalDBA["vc crsl-ecm 2 /reprise"],
                            lpGlobalDBA["extraction"]
                          )
                        : ''}
                    </td>

                    </tr>
                ))}
                </tbody>

            </table>
            <h3 className="page-title">Tableau NR (Référence)</h3>
            <table className="affaires-table synthese-table">
            <thead>
                <tr>
                <th>Hz / NR</th>
                <th>NR 0</th>
                <th>NR 10</th>
                <th>NR 20</th>
                <th>NR 30</th>
                <th>NR 35</th>
                <th>NR 40</th>
                <th>NR 45</th>
                <th>NR 50</th>
                <th>NR 60</th>
                </tr>
            </thead>
            <tbody>
                {nrReference.map((row, index) => (
                <tr key={index}>
                    <td>{row.bande}</td>
                    <td>{row.nr0}</td>
                    <td>{row.nr10}</td>
                    <td>{row.nr20}</td>
                    <td>{row.nr30}</td>
                    <td>{row.nr35}</td>
                    <td>{row.nr40}</td>
                    <td>{row.nr45}</td>
                    <td>{row.nr50}</td>
                    <td>{row.nr60}</td>
                </tr>
                ))}
            </tbody>
            </table>


            <div className="footer-actions">
                <button className="btn-secondary" onClick={() => window.history.back()}>
                    Retour
                </button>
            </div>
        </div>
    );
};

export default ResultatsPage;