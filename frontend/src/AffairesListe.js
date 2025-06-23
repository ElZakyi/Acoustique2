// src/AffairesListe.js

import React, { useState, useEffect } from 'react';

// Données de test 
const fakeAffaires = [
  { id_affaire: 1, objet: 'Etude acoustique', client: 'Société', numero_affaire: 'AF2024-001' },
  { id_affaire: 2, objet: ' hôpital', client: 'HP', responsable: 'Marie Curie', numero_affaire: 'AF2024-002' },
  { id_affaire: 3, objet: 'Conception un silencieux', client: 'Tech', responsable: 'Pierre Martin', numero_affaire: 'AF2024-003' }
];

const AffairesListe = () => {
  const [affaires, setAffaires] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setAffaires(fakeAffaires);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
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