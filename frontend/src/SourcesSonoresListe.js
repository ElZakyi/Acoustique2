import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';
import './AffairesListe.css'; // On réutilise les mêmes styles

const SourcesSonoresListe = () => {
    const { id_salle } = useParams();
    const navigate = useNavigate();
    
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showForm, setShowForm] = useState(false);
    // ✅ CORRECTION : La valeur par défaut du 'type' doit correspondre à une des options.
    const [formData, setFormData] = useState({ id_source: null, nom: '', type: 'soufflage' }); 
    const [message, setMessage] = useState('');
    const [isErreur, setIsErreur] = useState(false);

    // Fonction pour récupérer les sources de la salle actuelle
    const fetchSources = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/salles/${id_salle}/sources`);
            setSources(response.data);
        } catch (err) {
            setError("Impossible de charger les sources sonores.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const utilisateur = localStorage.getItem("utilisateur");
        if (!utilisateur) {
            navigate('/connexion');
        } else {
            fetchSources();
        }
    }, [id_salle, navigate]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.id_source) {
                alert("La modification n'est pas encore implémentée.");
            } else {
                await axios.post(`http://localhost:5000/api/salles/${id_salle}/sources`, formData);
                setMessage("Source ajoutée avec succès !");
            }
            setIsErreur(false);
            setShowForm(false);
            setFormData({ id_source: null, nom: '', type: 'soufflage' }); // Réinitialiser le formulaire
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

    if (loading) return <div className="container-box"><h1>Chargement...</h1></div>;
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

                {showForm && (
                    <form onSubmit={handleFormSubmit} className="affaires-form">
                        <h3>{formData.id_source ? "Modifier la Source" : "Nouvelle Source Sonore"}</h3>
                        <input
                            className="form-input" type="text" name="nom"
                            placeholder="Nom de la source sonore"
                            value={formData.nom} onChange={handleInputChange} required
                        />
                        <select
                            className="form-input" name="type"
                            value={formData.type} onChange={handleInputChange} required
                        >
                            {/* ✅ CORRECTION : Chaque option a maintenant une valeur unique. */}
                            <option value="soufflage">Soufflage</option>
                            <option value="extraction">Extraction</option>
                            <option value="VC CRSL-ECM 2 /soufflage">VC CRSL-ECM 2 /soufflage</option>
                            <option value="VC CRSL-ECM 2 /reprise">VC CRSL-ECM 2 /reprise</option>
                        </select>
                        <button type="submit" className="form-button">
                            {formData.id_source ? "Mettre à jour" : "Enregistrer"}
                        </button>
                    </form>
                )}

                <table className="affaires-table">
                    <thead>
                        <tr>
                            <th>ID Source</th>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sources.length > 0 ? (
                            sources.map((source) => (
                                <tr key={source.id_source}>
                                    <td>{source.id_source}</td>
                                    <td>{source.nom}</td>
                                    <td>{source.type}</td>
                                    <td className="actions-cell">
                                        {/* ✅ CORRECTION : Le texte du bouton a été changé. */}
                                        <Link to={`/sources/${source.id_source}/composants`} className="btn-action">
                                            Gérer les composants
                                        </Link>
                                        <div className="action-icons">
                                            <FaPencilAlt
                                                className="icon-action icon-edit"
                                                title="Modifier"
                                                onClick={() => handleEdit(source)}
                                            />
                                            <FaTrash
                                                className="icon-action icon-delete"
                                                title="Supprimer"
                                                onClick={() => handleDelete(source.id_source)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center' }}>Aucune source sonore ajoutée pour cette salle.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                
                <div className="footer-actions">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>
                        Retour à la page précédente
                    </button>
                </div>
            </div>
        </>
    );
};

export default SourcesSonoresListe;