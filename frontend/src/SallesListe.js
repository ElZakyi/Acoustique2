import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa';
import './AffairesListe.css'; // Réutilisation du style

const SallesListe = () => {
  const { id_affaire } = useParams();
  const [salles, setSalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm,setShowForm] = useState(false);
  const [formData,setFormData] = useState({
    longueur: '',
    largeur : '',
    hauteur : '',
    tr : ''
  });
  const [calculs,setCalculs] = useState({
    surface:0,
    volume:0,
    surface_totale:0,
    a_moyenne:0,
    r:0,
  })
  const [message,setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...formData, [name]: value };
    setFormData(updatedForm);

    const l = parseFloat(updatedForm.longueur);
    const L = parseFloat(updatedForm.largeur);
    const h = parseFloat(updatedForm.hauteur);
    const tr = parseFloat(updatedForm.tr);

    if (!isNaN(l) && !isNaN(L) && !isNaN(h) && !isNaN(tr) && tr > 0) {
      const surface = l * L;
      const volume = surface * h;
      const surface_totale = 2 * (l * L + l * h + L * h);
      const a_moyenne = (0.16 * volume) / (surface_totale * tr);
      const r = (a_moyenne * surface_totale) / (1 - a_moyenne);

      setCalculs({
        surface: surface.toFixed(2),
        volume: volume.toFixed(2),
        surface_totale: surface_totale.toFixed(2),
        a_moyenne: a_moyenne.toFixed(4),
        r: r.toFixed(2),
      });
    }
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    const payload = {
        ...formData,
        surface : parseFloat(calculs.surface),
        volume : parseFloat(calculs.volume),
        surface_totale : parseFloat(calculs.surface_totale),
        a_moyenne: parseFloat(calculs.a_moyenne),
        r: parseFloat(calculs.r),
    };
    try {
        await axios.post(`http://localhost:5000/api/affaires/${id_affaire}/salles`, payload);
        setMessage("Salle ajoutée avec succès !");
        setFormData({ longueur: '', largeur: '', hauteur: '', tr: '' });
        setShowForm(false);

        const reload = await axios.get(`http://localhost:5000/api/affaires/${id_affaire}/salles`);
        setSalles(reload.data);
    }catch(err){
        console.error("Erreur lors de l'ajout :", err);
        setMessage("Erreur serveur !");
    }
  };

  useEffect(() => {
    if (id_affaire) {
      const fetchSalles = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/affaires/${id_affaire}/salles`);
          setSalles(response.data);
        } catch (err) {
          setError("Impossible de charger les données. Vérifiez la route backend !");
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
        <button className="btn-primary" onClick={()=>setShowForm(!showForm)}>{showForm? 'annuler' : 'ajouter une salle'}</button>
      </div>
      <table className="affaires-table">
        <thead>
          <tr>
            <th>ID Salle</th>
            <th>Dimensions (L x l x h)</th>
            <th>Volume (m³)</th>
            <th>Surface (m²)</th>
            <th>Surface Totale</th>
            <th>TR</th>
            <th>a_moyenne</th>
            <th>R</th>
            <th>Affaire</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {salles.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center' }}>
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
                <td>{salle.surface_totale}</td>
                <td>{salle.tr}</td>
                <td>{salle.a_moyenne}</td>
                <td>{salle.r}</td>
                <td>{salle.id_affaire}</td>
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
      {showForm && (
        <form onSubmit={handleSubmit} className='affaires-form'>
            <h3 className='form-title'>Nouvelle salle</h3>
            <input type="number" name="longueur" placeholder="Longueur" value={formData.longueur} onChange={handleChange} required />
            <input type="number" name="largeur" placeholder="Largeur" value={formData.largeur} onChange={handleChange} required />
            <input type="number" name="hauteur" placeholder="Hauteur" value={formData.hauteur} onChange={handleChange} required />
            <input type="number" name="tr" placeholder="TR" value={formData.tr} onChange={handleChange} required />
            <div className="results">
            <p>Surface : {calculs.surface} m²</p>
            <p>Volume : {calculs.volume} m³</p>
            <p>Surface Totale : {calculs.surface_totale} m²</p>
            <p>a_moyenne : {calculs.a_moyenne}</p>
            <p>R : {calculs.r}</p>
            </div>

            <button type="submit" className="btn-primary">Enregistrer</button>
            {message && <p>{message}</p>}
        </form>
      )}
    </div>
    
  );
};

export default SallesListe;
