import React from 'react';
import './AffairesListe.css'; // Ton fichier CSS complet déjà donné

const BANDES = [63, 125, 250, 500, 1000, 2000, 4000];
const TYPES_LIGNES = ["Soufflage", "reprise", "extraction", "Lp tot"];

const ResultatsPage = () => {
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
                                <td key={freq}></td> // cellule vide
                            ))}
                            <td></td> {/* cellule Global dBA vide */}
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