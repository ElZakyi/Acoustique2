import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AffairesListe = () => {
  const [affaires, setAffaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm,setShowForm] = useState(false);
  const [formData,setFormData] = useState({
    numero_affaire:'',
    objet : '',
    client : '',
    reponsable : '',
    observation : ''
  });
  const [message,setMessage] = useState('');

  //fonction du soumission du formulaire 
  const handleInputChange = (e) => {
    setFormData({...formData,[e.target.name] : e.target.value});
  };

  const handleFormSubmit = async(e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/affaires', formData);
      setMessage(response.data.message);
      setFormData({ numero_affaire: '', objet: '', client: '', responsable: '', observation: '' });
      setShowForm(false);
      // recharge les données
      const res = await axios.get('http://localhost:5000/api/affaires');
      setAffaires(res.data);
    }catch(err){
      console.error("Erreur ajout d'affaire : ",err);
      setMessage("Erreur lors de l'ajout de l'affaire");
    }
  }

  useEffect(() => {
    const fetchAffaires = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/affaire');
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
        <button className="btn-primary" onClick={()=>setShowForm(!showForm)}>{showForm? "Annuler" : "Ajouter une affaire"}</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Objet</th>
            <th>Client</th>
            <th>Responsable</th>
            <th>NumeroAffaire</th>
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
                <button>Voir</button>
                <button>Modifier</button>
                <button>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showForm&&(
        <form onSubmit={handleFormSubmit} className='box'>
          <h3>Nouvelle affaire</h3>
          <input 
            className="input"
            type = "text"
            name = "numero_affaire"
            placeholder="numero d'affaire"
            value = {formData.numero_affaire}
            onChange={handleInputChange}
            />
            <input
              className="input"
              type="text"
              name = "objet"
              placeholder='Objet'
              value={formData.objet}
              onChange={handleInputChange}
            />
            <input
              className="input"
              type="text"
              name="client"
              placeholder="Client"
              value={formData.client}
              onChange={handleInputChange}
          />
          <input
              className="input"
              type="text"
              name="responsable"
              placeholder="Responsable"
              value={formData.responsable}
              onChange={handleInputChange}
          />
          <input
              className="input"
              type="text"
              name="observation"
              placeholder="Observation"
              value={formData.observation}
              onChange={handleInputChange}
          />
          <button className='btn' type='submit'>Valider</button>
          {message && <p className="succes">{message}</p>}

        </form>
      )}
    </div>
  );
};

export default AffairesListe;