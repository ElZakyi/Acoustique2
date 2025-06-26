import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa';
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
    const [isErreur, setIsErreur] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchAffaires = async () => {
            try {
                const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
                if (!utilisateur || !utilisateur.id || !utilisateur.role) {
                    setError("Utilisateur non identifié. Veuillez vous reconnecter.");
                    setLoading(false);
                    navigate('/connexion');
                    return;
                }

                const response = await axios.get('http://localhost:5000/api/affaires', {
                    params: {
                        id_utilisateur: utilisateur.id,
                        role: utilisateur.role
                    }
                });
                
                setAffaires(response.data);
            } catch (err) {
                setError('Impossible de charger les données. Le serveur backend est-il lancé ?');
                console.error("Erreur de récupération des affaires :", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAffaires();
    }, [navigate]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
        if (!utilisateur || !utilisateur.id) {
            setMessage("Utilisateur non identifié. Impossible de créer l'affaire.");
            setIsErreur(true);
            return;
        }

        const dataToSend = {
            ...formData,
            id_utilisateur: utilisateur.id,
            responsable: formData.responsable || utilisateur.email
        };

        try {
            let response;
            if (formData.id_affaire) {
                response = await axios.put(`http://localhost:5000/api/affaires/${formData.id_affaire}`, dataToSend);
                setMessage("Affaire mise à jour avec succès !");
            } else {
                response = await axios.post('http://localhost:5000/api/affaires', dataToSend);
                setMessage("Affaire ajoutée avec succès !");
            }
            
            setIsErreur(false);
            setShowForm(false);

            window.location.reload(); 
        } catch (err) {
            console.error("Erreur soumission formulaire :", err);
            setIsErreur(true);
            setMessage(err.response?.data?.message || "Erreur lors de l'opération.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette affaire ? Cela supprimera aussi toutes les salles associées.")) return;
        try {
            await axios.delete(`http://localhost:5000/api/affaires/${id}`);
            setMessage("Affaire supprimée avec succès !");
            setIsErreur(false);
            window.location.reload();
        } catch (err) {
            console.error("Erreur lors de la suppression :", err);
            setIsErreur(true);
            setMessage(err.response?.data?.message || "Erreur lors de la suppression.");
        }
    };

    const handleEdit = (affaire) => {
        setFormData(affaire);
        setShowForm(true);
        setMessage("");
    };

    const handleLogout = () => {
        localStorage.removeItem("utilisateur");
        navigate('/connexion');
    };

    if (loading) return <div className="container-box"><h1 className="page-title">Chargement...</h1></div>;
    if (error) return <div className="container-box"><h1 className="page-title error">{error}</h1></div>;

    return (
        <>
            <div className="logout-global">
                <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
            </div>
            <div className="container-box">
                <div className="page-header">
                    <h1 className="page-title">Liste des Affaires</h1>
                    {message && <p className={isErreur ? "form-error" : "form-success"}>{message}</p>}
                    <button className="btn-primary" onClick={() => {
                        setShowForm(!showForm);
                        const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
                        setFormData({ id_affaire: null, numero_affaire: '', objet: '', client: '', responsable: utilisateur?.email || '', observation: '' });
                        setMessage("");
                    }}>
                        {showForm ? "Annuler" : "Ajouter une affaire"}
                    </button>
                </div>

                
                {showForm && (
                    <form onSubmit={handleFormSubmit} className="affaires-form">
                        <h3 className="form-title">{formData.id_affaire ? "Modifier l'affaire" : "Nouvelle affaire"}</h3>
                        <input className="form-input" type="text" name="numero_affaire" placeholder="Numéro d'affaire" value={formData.numero_affaire} onChange={handleInputChange} required />
                        <input className="form-input" type="text" name="objet" placeholder="Objet" value={formData.objet} onChange={handleInputChange} required/>
                        <input className="form-input" type="text" name="client" placeholder="Client" value={formData.client} onChange={handleInputChange} required/>
                        <input className="form-input" type="text" name="responsable" placeholder="Responsable" value={formData.responsable} onChange={handleInputChange} required />
                        <input className="form-input" type="text" name="observation" placeholder="Observation" value={formData.observation} onChange={handleInputChange} />
                        <button className="form-button" type="submit">{formData.id_affaire ? "Mettre à jour" : "Valider"}</button>
                    </form>
                )}

                <table className="affaires-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Numéro</th>
                            <th>Objet</th>
                            <th>Client</th>
                            <th>Responsable</th>
                            <th>Observation</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {affaires.map((affaire, index) => (
                            <tr key={affaire.id_affaire}>
                                <td>{index + 1}</td>
                                <td>{affaire.numero_affaire}</td>
                                <td>{affaire.objet}</td>
                                <td>{affaire.client}</td>
                                <td>{affaire.responsable}</td>
                                <td>{affaire.observation}</td>
                                <td className="actions-cell">
                                   <Link 
                                    to={`/affaires/${affaire.id_affaire}/salles`} 
                                    state={{ numero_affaire: affaire.numero_affaire, ordre: index + 1 }} 
                                    className="btn-action"
                                    >
                                    Gérer les salles
                                    </Link>

                                    <div className="action-icons">
                                        <FaEye 
                                            className="icon-action icon-view" 
                                            title="Voir les détails"
                                            onClick={() => alert(`Détails de l'affaire:\n\nNuméro: ${affaire.numero_affaire}\nObjet: ${affaire.objet}\nClient: ${affaire.client}\nObservation: ${affaire.observation}`)}
                                        />
                                        <FaPencilAlt 
                                            className="icon-action icon-edit" 
                                            title="Modifier"
                                            onClick={() => handleEdit(affaire)} 
                                        />
                                        <FaTrash 
                                            className="icon-action icon-delete" 
                                            title="Supprimer"
                                            onClick={() => handleDelete(affaire.id_affaire)} 
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            </div>
        </>
    );
};

export default AffairesListe;