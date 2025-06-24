

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa';
import './AffairesListe.css'; // On réutilise les mêmes styles pour la cohérence

const SallesListe = () => {
  const { id_affaire } = useParams();
  const [salles, setSalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id_affaire) {
      const fetchSalles = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/affaires/${id_affaire}/salles`);
          setSalles(response.data);
        } catch (err) {
          setError('Impossible de charger les données. Vérifiez la route backend !');
          console.error("Erreur de récupération des salles :", err);
        } finally {
          setLoading(false);
        }
      };
      fetchSalles();
    } else {
      setLoading(false);
    }
  }, [id_affaire]);

  if (loading) return <div className="container-box"><h1 className="page-title">Chargement...</h1></div>;
  if (error) return <div className="container-box"><h1 className="page-title" style={{ color: 'red' }}>{error}</h1></div>;

  return (
    <div className="container-box">
      <div className="page-header">
        <h1 className="page-title">Liste des Salles de l'Affaire #{id_affaire}</h1>
        <button className="btn-primary">Ajouter une salle</button>
      </div>

      <table className="affaires-table">
        <thead>
          <tr>
            <th>ID Salle</th>
            <th>Dimensions (Lxlxh)</th>
            <th>Volume (m³)</th>
            <th>Surface (m²)</th>         
            <th>Surface Totale (m²)</th> 
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {salles.length === 0 ? (
            <tr>
              
              <td colSpan="6" style={{ textAlign: 'center' }}>
                Aucune salle n'a encore été ajoutée pour cette affaire.
              </td>
            </tr>
          ) : (
            salles.map((salle) => (
              <tr key={salle.id_salle}>
                <td>{salle.id_salle}</td>
                <td>{`${salle.longueur}m x ${salle.largeur}m x ${salle.hauteur}m`}</td>
                <td>{salle.volume}</td>
                <td>{salle.surface}</td>       
                <td>{salle.surfaceTotale}</td>   
                <td className="actions-cell">
                  <Link to={`/salles/${salle.id_salle}/sources`}>
                    <button className="btn-primary">Gérer les sources</button>
                  </Link>
                  <div className="action-icons">
                    <FaEye className="icon-action icon-view" title="Détails" />
                    <FaPencilAlt className="icon-action icon-edit" title="Modifier" />
                    <FaTrash className="icon-action icon-delete" title="Supprimer" />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SallesListe;