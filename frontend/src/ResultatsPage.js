import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AffairesListe.css';

const BANDES = [63, 125, 250, 500, 1000, 2000, 4000];
const TYPES_LIGNES = ["Soufflage", "reprise", "extraction", "Lp tot"];

const ResultatsPage = () => {
    const [lpReprise, setLpReprise] = useState({});

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
                console.log(valeurs);

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
                        <td key={freq}>
                        {type === "reprise" ? lpReprise[freq] ?? '' : ''}
                        </td>
                    ))}
                    <td>{/* Pas encore de calcul pour GLOBAL dBA */}</td>
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