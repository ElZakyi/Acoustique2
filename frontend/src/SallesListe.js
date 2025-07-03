import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';
import './AffairesListe.css';

const SallesListe = () => {
  const location = useLocation();
  const { numero_affaire, ordre } = location.state || {};
  const { id_affaire } = useParams();
  const [salles, setSalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isError, setIsError] = useState(false);
  const [formData, setFormData] = useState({
    id_salle: null,
    nom: '',
    longueur: '',
    largeur: '',
    hauteur: '',
    tr: ''
  });
  const [calculs, setCalculs] = useState({
    surface: 0,
    volume: 0,
    surface_totale: 0,
    a_moyenne: 0,
    r: 0,
  });
  const [message, setMessage] = useState('');

  const [correctionsSpectrales, setCorrectionsSpectrales] = useState([]);
  const [correctionForm, setCorrectionForm] = useState({
    63: '', 125: '', 250: '', 500: '', 1000: '', 2000: '', 4000: ''
  });
  const [selectedSalle, setSelectedSalle] = useState(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);

  const navigate = useNavigate();

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

  const handleLogout = () => {
    localStorage.removeItem("email");
    localStorage.removeItem("id_utilisateur");
    navigate("/connexion");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      surface: parseFloat(calculs.surface),
      volume: parseFloat(calculs.volume),
      surface_totale: parseFloat(calculs.surface_totale),
      a_moyenne: parseFloat(calculs.a_moyenne),
      r: parseFloat(calculs.r),
    };
    try {
      if (formData.id_salle) {
        const response = await axios.put(`http://localhost:5000/api/salles/${formData.id_salle}`, payload);
        setMessage(response.data.message);
      } else {
        const response = await axios.post(`http://localhost:5000/api/affaires/${id_affaire}/salles`, payload);
        setMessage(response.data.message);
      }
      setIsError(false);
      setFormData({ nom: '', longueur: '', largeur: '', hauteur: '', tr: '' });
      setShowForm(false);

      const reload = await axios.get(`http://localhost:5000/api/affaires/${id_affaire}/salles`);
      setSalles(reload.data);
    } catch (err) {
      console.error("Erreur lors de l'ajout :", err);
      setMessage("Erreur serveur !");
      setIsError(true);
    }
  };

  const handleEdit = (salle) => {
    setFormData({
      id_salle: salle.id_salle,
      nom: salle.nom,
      longueur: salle.longueur,
      largeur: salle.largeur,
      hauteur: salle.hauteur,
      tr: salle.tr
    });
    setShowForm(true);
    setMessage('');
    setIsError(false);
  };

  const handleDelete = async (id_salle) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette salle ?")) return;
    try {
      const response = await axios.delete(`http://localhost:5000/api/salles/${id_salle}`);
      setMessage(response.data.message);
      setIsError(false);

      const reload = await axios.get(`http://localhost:5000/api/affaires/${id_affaire}/salles`);
      setSalles(reload.data);
    } catch (err) {
      console.error("Erreur lors de suppression de la salle : ", err);
      setMessage("Erreur lors de suppression ");
      setIsError(true);
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

   useEffect(() => {
      const fetchCorrection = async () => {
        try {
          const { data } = await axios.get("http://localhost:5000/api/correctionspectral");
          setCorrectionsSpectrales(data);
        } catch (err) {
          console.error('Erreur de recuperation correction : ', err);
        }
      };
      fetchCorrection();
    }, []);

  if (loading) return <div className="container-box"><h1 className="page-title">Chargement...</h1></div>;
  if (error) return <div className="container-box"><h1 className="page-title" style={{ color: 'red' }}>{error}</h1></div>;

  return (
    <>
      <div className="logout-global">
        <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
      </div>
      <div className="container-box">
        <div className="page-header">
          <h1 className="page-title">
            Liste des salles de l'affaire {numero_affaire ? `"${numero_affaire}"` : ''} 
            {ordre ? ` - n° ${ordre}` : ''}
          </h1>

          {message && <p className={isError ? 'form-error' : 'form-success'}>{message}</p>}
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annuler' : 'Ajouter une salle'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className='affaires-form'>
            <h3 className='form-title'>{formData.id_salle ? 'Modifier la salle' : 'Nouvelle salle'}</h3>
            <input type="text" name="nom" placeholder="Nom de la salle" value={formData.nom} onChange={handleChange} required />
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
            <button type="submit" className="btn-primary">{formData.id_salle ? "Mettre à jour" : "Enregistrer"}</button>
          </form>
        )}
        {showCorrectionForm && selectedSalle && (
          <div className='modal-overlay'>
          <div className='modal'>
            <h3> Correction spectrale – {selectedSalle.nom}</h3>
            {Object.keys(correctionForm).map((bande) => (
              <div key={bande} className="correction-field">
                <label htmlFor={`bande-${bande}`}>{bande} Hz</label>
                <input
                  id={`bande-${bande}`}
                  type="number"
                  value={correctionForm[bande]}
                  onChange={(e) => {
                    setCorrectionForm({ ...correctionForm, [bande]: e.target.value });
                  }}
                />
              </div>
            ))}

            <button 
              className='btn-primary'
              onClick={async() => {
                const corrections = Object.entries(correctionForm).map(([bande,valeur])=>({
                  bande : parseInt(bande),
                  valeur : parseFloat(valeur)
                }));
                try {
                  await axios.post(`http://localhost:5000/api/salles/${selectedSalle.id_salle}/correctionspectral`,{corrections});
                
                  const reload = await axios.get("http://localhost:5000/api/correctionspectral");

                  setCorrectionsSpectrales(reload.data);
                  setShowCorrectionForm(false);
                  setCorrectionForm({ 63: '', 125: '', 250: '', 500: '', 1000: '', 2000: '', 4000: '' })
                }catch (err) {
                  console.error('Erreur Api : ',err);
                }
              }}
            >
              Enregistrer
            </button>
            <button className="btn-secondary" onClick={() => setShowCorrectionForm(false)}>Fermer</button>
          </div>
          </div>
        )}
        <table className="affaires-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nom</th>
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
                <td colSpan={11} style={{ textAlign: 'center' }}>
                  Aucune salle n'a encore été ajoutée pour cette affaire.
                </td>
              </tr>
            ) : (
              salles.map((salle, index) => (
                <tr key={salle.id_salle}>
                  <td>{index + 1}</td>
                  <td>{salle.nom}</td>
                  <td>{`${salle.longueur}m x ${salle.largeur}m x ${salle.hauteur}m`}</td>
                  <td>{salle.volume}</td>
                  <td>{salle.surface}</td>
                  <td>{salle.surface_totale}</td>
                  <td>{salle.tr}</td>
                  <td>{salle.a_moyenne}</td>
                  <td>{salle.r}</td>
                  <td>{salle.id_affaire}</td>
                  <td className="actions-cell">
                    <Link 
                      to={`/salles/${salle.id_salle}/sources`}
                      state={{ nomSalle: salle.nom, numeroSalle: index + 1 }}
                    >
                      <button className="btn-primary">Gérer les sources</button>
                    </Link>
                    <div className="action-icons">
                      <FaPencilAlt className="icon-action icon-edit" title="Modifier" onClick={() => handleEdit(salle)} />
                      <FaTrash className="icon-action icon-delete" title="Supprimer" onClick={() => handleDelete(salle.id_salle)} />
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setSelectedSalle(salle);
                        const existing = correctionsSpectrales[salle.id_salle] || {};
                        setCorrectionForm({
                            63 : existing["63"]  ?? "",
                            125 : existing["125"] ?? "",
                            250 : existing["250"] ?? "",
                            500 : existing["500"] ?? "",
                            1000 : existing["1000"] ?? "",
                            2000 : existing["2000"] ?? "",
                            4000 : existing["4000"] ?? "",
                        });
                        setShowCorrectionForm(true);
                      }}
                    >
                      Correction Spectrale
                  </button>

                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <>
        <h2>Tableau des corrections spectrales</h2>
        <table className='affaires-table'>
          <thead>
            <tr>
              <th># Salle</th>
              <th>63Hz</th>
              <th>125Hz</th>
              <th>250Hz</th>
              <th>500Hz</th>
              <th>1000Hz</th>
              <th>2000Hz</th>
              <th>4000Hz</th>
            </tr>
          </thead>
          <tbody>
            {salles.map((salle)=>{
              const c = correctionsSpectrales[salle.id_salle] || {}
              return (
                <tr key = {salle.id_salle}>
                  <td>{salle.nom}</td>
                  <td>{c[63] ?? "-"}</td>
                  <td>{c[125] ?? "-"}</td>
                  <td>{c[250] ?? "-"}</td>
                  <td>{c[500] ?? "-"}</td>
                  <td>{c[1000] ?? "-"}</td>
                  <td>{c[2000] ?? "-"}</td>
                  <td>{c[4000] ?? "-"}</td>

                </tr>
              )
            })}
          </tbody>

        </table>
        </>

        <div className="footer-actions">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Retour
          </button>
        </div>
      </div>
    </>
  );
};

export default SallesListe;
