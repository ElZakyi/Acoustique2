import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AffairesListe = () => {
  const [affaires, setAffaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAffaires = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/affaires');
        setAffaires(response.data);
      } catch (err) {
        setError('Impossible de charger les données. Vérifiez que le serveur backend est bien lancé.');
        console.error("Erreur lors de la récupération des affaires :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAffaires();
  }, []);

  if (loading) {
    return <div className="container-box"><h1 className="page-title">Chargement...</h1></div>;
  }

  if (error) {
    return <div className="container-box"><h1 className="page-title" style={{ color: 'red' }}>{error}</h1></div>;
  }

  return (
    <div className="container-box">
      <div className="page-header">
        <h1 className="page-title">Liste des Affaires</h1>
        <button className="btn-primary">Ajouter une affaire</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Objet</th>
            <th>Client</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {affaires.map((affaire) => (
            <tr key={affaire.id_affaire}>
              <td>{affaire.numero_affaire}</td>
              <td>{affaire.objet}</td>
              <td>{affaire.client}</td>
              <td>
                <button>Voir</button>
                <button>Modifier</button>
                <button>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AffairesListe;