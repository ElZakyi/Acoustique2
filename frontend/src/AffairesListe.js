// -- MODIFIÉ -- On importe Link pour la navigation et les icônes
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import './AffairesListe.css'; // Assurez-vous que ce fichier contient les styles des icônes


const AffairesListe = () => {
  const [affaires, setAffaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id_affaire: null,
    numero_affaire: '',
    objet: '',
    client: '',
    responsable: '',
    observation: ''
  });
  const [message, setMessage] = useState('');
  const [erreur, setIsErreur] = useState(false);

  const navigate = useNavigate();

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

  useEffect(() => {
    fetchAffaires();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id_affaire) {
        await axios.put(`http://localhost:5000/api/affaires/${formData.id_affaire}`, formData);
        setMessage("Affaire mise à jour avec succès !");
      } else {
        await axios.post('http://localhost:5000/api/affaires', {
          ...formData,
          id_utilisateur:localStorage.getItem("id_utilisateur"),
          responsable:localStorage.getItem("email")});
        setMessage("Affaire ajoutée avec succès !");
      }
      setIsErreur(false);
      setFormData({ id_affaire: null, numero_affaire: '', objet: '', client: '', responsable: '', observation: '' });
      setShowForm(false);
      fetchAffaires(); // On rafraîchit la liste
    } catch (err) {
      console.error("Erreur soumission formulaire :", err);
      setIsErreur(true);
      setMessage("Erreur lors de l'opération.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette affaire ?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/affaires/${id}`);
      setMessage("Affaire supprimée avec succès !");
      setIsErreur(false);
      fetchAffaires(); // On rafraîchit la liste au lieu de filtrer
    } catch (err) {
      console.error("Erreur lors de la suppression de l'affaire :", err);
      setIsErreur(true);
      alert("Erreur lors de la suppression");
    }
  }

  const handleEdit = (affaire) => {
    setFormData({ ...affaire }); // Copie toutes les propriétés de l'affaire
    setShowForm(true);
    setMessage("");
  }

  const handleLogout = () => {
    localStorage.removeItem("email");
    localStorage.removeItem("id_utilisateur");
    navigate('/connexion');
  }
  
  // ... (le reste de vos fonctions ne change pas) ...

  if (loading) {
    return <div className="container-box"><h1 className="page-title">Chargement...</h1></div>;
  }

  if (error) {
    return <div className="container-box"><h1 className="page-title error">{error}</h1></div>;
  }

  return (
    <>
    <div className="logout-global">
      <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
    </div>
    <div className="container-box">
      <div className="page-header">
        <h1 className="page-title">Liste des Affaires</h1>
        {message && <p className={erreur ? "form-error" : "form-success"}>{message}</p>}
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
          setFormData({ id_affaire: null, numero_affaire: '', objet: '', client: '', responsable: '', observation: '' }); // Réinitialise le form
          setMessage("");
        }}>
          {showForm ? "Annuler" : "Ajouter une affaire"}
        </button>
      </div>

      <table className="affaires-table">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Objet</th>
            <th>Client</th>
            <th>Responsable</th>

            <th>Observation</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {affaires.map((affaire) => (
            <tr key={affaire.id_affaire}>
              <td>{affaire.numero_affaire}</td>
              <td>{affaire.objet}</td>
              <td>{affaire.client}</td>
              <td>{affaire.responsable}</td>

              <td>{affaire.observation}</td>
              {/* -- MODIFIÉ -- La cellule des actions a été entièrement revue */}
              <td className="actions-cell">
                <Link to={`/affaires/${affaire.id_affaire}/salles`}>
                  <button className="btn-primary">Gérer les salles</button>
                </Link>
                <div className="action-icons">
                  <FaEye 
                    className="icon-action icon-view"
                    onClick={() => alert(`Détails de l'affaire:\n\nNuméro: ${affaire.numero_affaire}\nObjet: ${affaire.objet}\nClient: ${affaire.client}`)}
                  />
                  <FaPencilAlt 
                    className="icon-action icon-edit"
                    onClick={() => handleEdit(affaire)} 
                  />
                  <FaTrash 
                    className="icon-action icon-delete" 
                    onClick={() => handleDelete(affaire.id_affaire)} 
                  />
                </div>
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <form onSubmit={handleFormSubmit} className="affaires-form">
          <h3 className="form-title">{formData.id_affaire ? "Modifier l'affaire" : "Nouvelle affaire"}</h3>
          <input className="form-input" type="text" name="numero_affaire" placeholder="Numéro d'affaire" value={formData.numero_affaire} onChange={handleInputChange} />
          <input className="form-input" type="text" name="objet" placeholder="Objet" value={formData.objet} onChange={handleInputChange} />
          <input className="form-input" type="text" name="client" placeholder="Client" value={formData.client} onChange={handleInputChange} />
          {/* <input className="form-input" type="text" name="responsable" placeholder="Responsable" value={formData.responsable} onChange={handleInputChange} /> */}
          <input className="form-input" type="text" name="observation" placeholder="Observation" value={formData.observation} onChange={handleInputChange} />
          <button className="form-button" type="submit">{formData.id_affaire ? "Mettre à jour" : "Valider"}</button>
        </form>
      )}
    </div>
    </>
  );
};


export default AffairesListe;
