import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AffairesListe.css';


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

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if(formData.id_affaire){
        const response = await axios.put(`http://localhost:5000/api/affaires/${formData.id_affaire}`, formData);
        setMessage(response.data.message);
      } else {
        const response = await axios.post('http://localhost:5000/api/affaires', formData);
        setMessage(response.data.message);
      }
      setIsErreur(false);
      setFormData({ numero_affaire: '', objet: '', client: '', responsable: '', observation: '' });
      setShowForm(false);

      const res = await axios.get('http://localhost:5000/api/affaires');
      setAffaires(res.data);
    } catch (err) {
      console.error("Erreur ajout d'affaire :", err);
      setIsErreur(true);
      setMessage("Erreur lors de l'ajout de l'affaire");
    }
  };

  const handleDelete = async(id) => {
    if(!window.confirm("Êtes-vous sûr de vouloir supprimer cette affaire ?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/affaires/${id}`);
      setAffaires(affaires.filter(a=>a.id_affaire !== id));
      setMessage("affaire supprimé avec succés ! ");
      setIsErreur(false);
    }catch(err){
      console.error("erreur lors de la supression de l'affaire :  ",err);
      setIsErreur(true);
      alert("erreur lors de supression");
    }
  }

  const handleEdit = (affaire) => {
    setFormData(affaire);
    setShowForm(true);
    setMessage("");
  }

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
    return <div className="container-box"><h1 className="page-title error">{error}</h1></div>;
  }

  return (
    <div className="container-box">
      <div className="page-header">
        <h1 className="page-title">Liste des Affaires</h1>
        {message && <p className={erreur ? "form-error" : "form-success"}>{message}</p>}
        <button className="btn-primary" onClick={() => {
          setShowForm(!showForm);
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
            <th>Numéro Affaire</th>
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
              <td>{affaire.numero_affaire}</td>
              <td>{affaire.observation}</td>
              <td>
                <button className="btn-view">Voir</button>
                <button className="btn-edit" onClick={()=>handleEdit(affaire)}>Modifier</button>
                <button className="btn-delete" onClick={()=> handleDelete(affaire.id_affaire)}>Supprimer</button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <form onSubmit={handleFormSubmit} className="affaires-form">
          <h3 className="form-title">Nouvelle affaire</h3>
          <input className="form-input" type="text" name="numero_affaire" placeholder="Numéro d'affaire" value={formData.numero_affaire} onChange={handleInputChange} />
          <input className="form-input" type="text" name="objet" placeholder="Objet" value={formData.objet} onChange={handleInputChange} />
          <input className="form-input" type="text" name="client" placeholder="Client" value={formData.client} onChange={handleInputChange} />
          <input className="form-input" type="text" name="responsable" placeholder="Responsable" value={formData.responsable} onChange={handleInputChange} />
          <input className="form-input" type="text" name="observation" placeholder="Observation" value={formData.observation} onChange={handleInputChange} />
          <button className="form-button" type="submit">{formData.id_affaire? "modifier l'affaire" : "Valider"}</button>
        </form>
      )}
    </div>
  );
};

export default AffairesListe;
