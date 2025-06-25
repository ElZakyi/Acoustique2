import React, { useState, useEffect,useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';
import './AffairesListe.css'; // Assurez-vous d'avoir les styles pour les modales ici

// On définit les bandes de fréquence standard
const BANDES_FREQUENCE = [63, 125, 250, 500, 1000, 2000, 4000];

// --- SOUS-COMPOSANT POUR LE FORMULAIRE DU SPECTRE LW ---
const LwSourceForm = ({ source, onClose }) => {
    const [spectre, setSpectre] = useState({});
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isError,setIsError] = useState(false);

    useEffect(() => {
        axios.get(`http://localhost:5000/api/sources/${source.id_source}/lwsource`)
            .then(response => {
                const spectreInitial = {};
                BANDES_FREQUENCE.forEach(bande => {
                    const data = response.data.find(d => d.bande === bande);
                    spectreInitial[bande] = data ? data.valeur_lw : '';
                });
                setSpectre(spectreInitial);
            })
            .catch(error => console.error("Erreur de chargement du spectre", error))
            .finally(() => setLoading(false));
    }, [source.id_source]);

    const handleChange = (bande, valeur) => {
        setSpectre(prev => ({ ...prev, [bande]: valeur }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const spectreArray = Object.entries(spectre).map(([bande, valeur_lw]) => ({
            bande: parseInt(bande),
            valeur_lw: parseFloat(valeur_lw) || 0
        }));

        try {
            const response = await axios.post(`http://localhost:5000/api/sources/${source.id_source}/lwsource`, { spectre: spectreArray });
            setMessage(response.data.message);
            setIsError(false);
            setTimeout(() => {
                setMessage('');
                onClose();
            }, 1000);
        } catch (error) {
            setMessage(error.response?.data.message || "Erreur lors de la sauvegarde du spectre.");
            setIsError(true);
            console.error(error);
        }
    };
    
    if (loading) return (
        <div className="modal-overlay">
            <div className="modal-content">Chargement du spectre...</div>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Spectre Lw pour la source "{source.nom}"</h3>
                {message && <p className={isError? 'form-error' : 'form-success'}>{message}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="spectre-grid">
                        {BANDES_FREQUENCE.map(bande => (
                            <div key={bande} className="spectre-input-group">
                                <label>{bande} Hz</label>
                                <input type="number" step="0.1" className="form-input"
                                    value={spectre[bande] || ''}
                                    onChange={(e) => handleChange(bande, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="btn-primary">Enregistrer</button>
                        <button type="button" className="btn-secondary" onClick={onClose}>Fermer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL ---
const SourcesSonoresListe = () => {
    const { id_salle } = useParams();
    const navigate = useNavigate();
    
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ id_source: null, nom: '', type: 'soufflage' });
    const [message, setMessage] = useState('');
    const [isErreur, setIsErreur] = useState(false);
    const [selectedSource, setSelectedSource] = useState(null);


    const fetchSources = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5000/api/salles/${id_salle}/sources`);
            setSources(response.data);
        } catch (err) {
            setError("Impossible de charger les sources sonores.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    },[id_salle]);

    useEffect(() => {
        const utilisateur = localStorage.getItem("utilisateur");
        if (!utilisateur) {
            navigate('/connexion');
        } else {
            fetchSources();
        }
    }, [navigate,fetchSources]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.id_source) {
                const response = await axios.put(`http://localhost:5000/api/sources/${formData.id_source}`, formData);
                setMessage(response.data.message);
                 
            } else {
                await axios.post(`http://localhost:5000/api/salles/${id_salle}/sources`, formData);
                setMessage("Source ajoutée avec succès !");
            }
            setIsErreur(false);
            setShowForm(false);
            setFormData({ id_source: null, nom: '', type: 'soufflage' });
            fetchSources();
        } catch (err) {
            setMessage(err.response?.data?.message || "Erreur lors de l'opération.");
            setIsErreur(true);
        }
    };

    const handleDelete = async (id_source) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette source ?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/sources/${id_source}`);
            setMessage("Source supprimée avec succès !");
            setIsErreur(false);
            fetchSources();
        } catch (err) {
            setMessage(err.response?.data?.message || "Erreur lors de la suppression.");
            setIsErreur(true);
        }
    };

    const handleEdit = (source) => {
        setFormData(source);
        setShowForm(true);
        setMessage("");
    };

    const handleLogout = () => {
        localStorage.removeItem("utilisateur");
        navigate('/connexion');
    };

    if (loading && sources.length === 0) return <div className="container-box"><h1>Chargement...</h1></div>;
    if (error) return <div className="container-box"><h1 className="error">{error}</h1></div>;

    return (
        <>
            <div className="logout-global">
                <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
            </div>

            <div className="container-box">
                <div className="page-header">
                    <h1 className="page-title">Sources Sonores de la Salle #{id_salle}</h1>
                    <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Annuler' : 'Ajouter une Source'}
                    </button>
                </div>

                {message && <p className={isErreur ? "form-error" : "form-success"}>{message}</p>}

                <table className="affaires-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sources.map((source) => (
                            <tr key={source.id_source}>
                                <td>{source.id_source}</td>
                                <td>{source.nom}</td>
                                <td>{source.type}</td>
                                <td className="actions-cell">
                                    <button className="btn-action" onClick={() => setSelectedSource(source)}>
                                        Spectre Lw initial
                                    </button>
                                    <Link to={`/sources/${source.id_source}/composants`} className="btn-action">
                                        Gérer les composants
                                    </Link>
                                    <div className="action-icons">
                                        <FaPencilAlt className="icon-action icon-edit" onClick={() => handleEdit(source)} />
                                        <FaTrash className="icon-action icon-delete" onClick={() => handleDelete(source.id_source)} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {showForm && (
                    <form onSubmit={handleFormSubmit} className="affaires-form">
                        <h3>{formData.id_source ? "Modifier la Source" : "Nouvelle Source Sonore"}</h3>
                        <input className="form-input" type="text" name="nom" placeholder="Nom de la source" value={formData.nom} onChange={handleInputChange} required />
                        <select className="form-input" name="type" value={formData.type} onChange={handleInputChange} required>
                            <option value="soufflage">Soufflage</option>
                            <option value="extraction">Extraction</option>
                            <option value="VC CRSL-ECM 2 /soufflage">VC CRSL-ECM 2 /soufflage</option>
                            <option value="VC CRSL-ECM 2 /reprise">VC CRSL-ECM 2 /reprise</option>
                        </select>
                        <button type="submit" className="form-button">{formData.id_source ? "Mettre à jour" : "Enregistrer"}</button>
                    </form>
                )}
                
                <div className="footer-actions">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>
                        Retour
                    </button>
                </div>
            </div>
            
            {selectedSource && (
                <LwSourceForm 
                    source={selectedSource}
                    onClose={() => setSelectedSource(null)}
                />
            )}
        </>
    );
};

export default SourcesSonoresListe;