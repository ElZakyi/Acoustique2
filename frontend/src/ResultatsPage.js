import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AffairesListe.css';

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

    useEffect(() => {
    const fetchLpGlobalDBA = async () => {
        try {
        const response = await axios.get('http://localhost:5000/api/lp-dba');
        const data = response.data;

        const valeurs = {};
        data.forEach(item => {
            valeurs[item.type_source.toLowerCase()] = item.valeur;
        });

        setLpGlobalDBA(valeurs);
        } catch (error) {
        console.error('Erreur chargement Global dBA:', error);
        }
    };

    fetchLpGlobalDBA();
    }, []);


    useEffect(() => {
    const fetchLpSoufflage = async () => {
        try {
        const response = await axios.get('http://localhost:5000/api/lp-vc-soufflage');
        const data = response.data;

        const valeurs = {};
        data.forEach(item => {
            valeurs[item.bande] = item.valeur;
        });

        setLpSoufflage(valeurs);
        } catch (error) {
        console.error('Erreur chargement Lp VC Soufflage:', error);
        }
    };

    fetchLpSoufflage();
    }, []);


    useEffect(() => {
    const fetchLpExtraction = async () => {
        try {
        const response = await axios.get('http://localhost:5000/api/lp-extraction');
        const data = response.data;

        const valeurs = {};
        data.forEach(item => {
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
        const fetchLpReprise = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/lp-vc-reprise');
                const data = response.data;

                // Organiser les valeurs par bande
                const valeurs = {};
                data.forEach(item => {
                    valeurs[item.bande] = item.valeur;
                });

                setLpReprise(valeurs);
            } catch (error) {
                console.error('Erreur chargement Lp VC Reprise:', error);
            }
        };

        fetchLpReprise();
    }, []);

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

            <div className="footer-actions">
                <button className="btn-secondary" onClick={() => window.history.back()}>
                    Retour
                </button>
            </div>
        </div>
    );
};

export default ResultatsPage;