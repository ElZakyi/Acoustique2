import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import './AffairesListe.css'; // S'assure que le CSS est importé

const AffairesListe = () => {
    // --- États pour la gestion des affaires ---
    const [affaires, setAffaires] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAffaireForm, setShowAffaireForm] = useState(false); // Renommé pour clarté
    const [affaireFormData, setAffaireFormData] = useState({ // Renommé pour clarté
        id_affaire: null,
        numero_affaire: '',
        objet: '',
        client: '',
        responsable: '',
        observation: ''
    });
    const [affaireMessage, setAffaireMessage] = useState(''); // Renommé pour clarté
    const [isAffaireErreur, setIsAffaireErreur] = useState(false); // Renommé pour clarté

    // --- États pour la gestion des utilisateurs ---
    const [users, setUsers] = useState([]);
    const [showUserForm, setShowUserForm] = useState(false);
    const [userFormData, setUserFormData] = useState({
        id: null,
        email: '',
        mot_de_passe: '',
        role: 'technicien' // Rôle par défaut pour la création
    });
    const [userMessage, setUserMessage] = useState('');
    const [isUserError, setIsUserError] = useState(false);

    const [currentUser, setCurrentUser] = useState(null); // Pour stocker les infos de l'utilisateur connecté

    const navigate = useNavigate();

    useEffect(() => {
        const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
        if (!utilisateur || !utilisateur.id || !utilisateur.role) {
            setError("Utilisateur non identifié. Veuillez vous reconnecter.");
            setLoading(false);
            navigate('/connexion');
            return;
        }
        setCurrentUser(utilisateur);
        
        fetchAffaires(utilisateur);
        if (utilisateur.role === "administrateur") {
            fetchUsers(utilisateur);
        }
    }, [navigate]); // Les dépendances de useEffect devraient inclure les fonctions si elles ne sont pas stables

    // --- Fonctions de récupération des données ---

    // Récupérer les affaires
    const fetchAffaires = async (utilisateur) => {
        try {
            // Assurez-vous que l'utilisateur est défini
            if (!utilisateur) return;

            const response = await axios.get('http://localhost:5000/api/affaires', {
                params: {
                    id_utilisateur: utilisateur.id,
                    role: utilisateur.role
                }
            });

            setAffaires(response.data);
            setError(null);
        } catch (err) {
            setError('Impossible de charger les affaires. Le serveur backend est-il lancé ?');
            console.error("Erreur de récupération des affaires :", err);
        } finally {
            setLoading(false);
        }
    };

    // Récupérer les utilisateurs (Admin seulement)
    const fetchUsers = async (utilisateur) => {
        if (!utilisateur || utilisateur.role !== "administrateur") {
            setUserMessage("Accès non autorisé pour lister les utilisateurs.");
            setIsUserError(true);
            return;
        }
        try {
            const response = await axios.get('http://localhost:5000/api/utilisateurs', {
                params: {
                    id_utilisateur: utilisateur.id, // Envoyer l'ID de l'admin pour l'autorisation backend
                    role: utilisateur.role // Envoyer le rôle de l'admin pour l'autorisation backend
                }
            });
            setUsers(response.data);
            setUserMessage(""); // Réinitialise le message d'erreur utilisateur
        } catch (err) {
            console.error("Erreur de récupération des utilisateurs :", err);
            setIsUserError(true);
            setUserMessage(err.response?.data?.message || "Erreur lors du chargement des utilisateurs.");
        }
    };

    // --- Fonctions de gestion des affaires ---

    const handleAffaireInputChange = (e) => {
        setAffaireFormData({ ...affaireFormData, [e.target.name]: e.target.value });
    };

    const handleAffaireFormSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser || !currentUser.id) {
            setAffaireMessage("Utilisateur non identifié. Impossible de créer/modifier l'affaire.");
            setIsAffaireErreur(true);
            return;
        }

        const dataToSend = {
            ...affaireFormData,
            id_utilisateur: currentUser.id,
            responsable: affaireFormData.responsable || currentUser.email
        };

        try {
            let response;
            if (affaireFormData.id_affaire) {
                response = await axios.put(`http://localhost:5000/api/affaires/${affaireFormData.id_affaire}`, dataToSend);
                setAffaireMessage(response.data.message);
            } else {
                response = await axios.post('http://localhost:5000/api/affaires', dataToSend);
                setAffaireMessage(response.data.message);
            }

            setIsAffaireErreur(false);
            setShowAffaireForm(false);
            fetchAffaires(currentUser); // Mettre à jour la liste après succès
        } catch (err) {
            console.error("Erreur soumission formulaire affaire :", err);
            setIsAffaireErreur(true);
            setAffaireMessage(err.response?.data?.message || "Erreur lors de l'opération sur l'affaire.");
        }
    };

    const handleAffaireDelete = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette affaire ? Cela supprimera aussi toutes les salles associées.")) return;
        try {
            await axios.delete(`http://localhost:5000/api/affaires/${id}`);
            setAffaireMessage("Affaire supprimée avec succès !");
            setIsAffaireErreur(false);
            fetchAffaires(currentUser); // Mettre à jour la liste après suppression
        } catch (err) {
            console.error("Erreur lors de la suppression de l'affaire :", err);
            setIsAffaireErreur(true);
            setAffaireMessage(err.response?.data?.message || "Erreur lors de la suppression de l'affaire.");
        }
    };

    const handleAffaireEdit = (affaire) => {
        setAffaireFormData(affaire);
        setShowAffaireForm(true);
        setAffaireMessage("");
    };

    // --- Fonctions de gestion des utilisateurs (Admin seulement) ---

    const handleUserInputChange = (e) => {
        setUserFormData({ ...userFormData, [e.target.name]: e.target.value });
    };

    const handleUserFormSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser || currentUser.role !== "administrateur") {
            setUserMessage("Accès non autorisé pour gérer les utilisateurs.");
            setIsUserError(true);
            return;
        }

        const dataToSend = {
            email: userFormData.email,
            mot_de_passe: userFormData.mot_de_passe,
            role: userFormData.role,
            // Pour l'autorisation côté serveur lors de la modification/suppression
            current_user_id: currentUser.id, 
            current_user_role: currentUser.role
        };
        
        try {
            let response;
            if (userFormData.id) { // Modification d'un utilisateur existant
                response = await axios.put(`http://localhost:5000/api/utilisateurs/${userFormData.id}`, dataToSend);
                setUserMessage(response.data.message);
            } else { // Création d'un nouvel utilisateur
                // Assurez-vous que le mot de passe est fourni pour la création
                if (!dataToSend.mot_de_passe) {
                    setUserMessage("Le mot de passe est requis pour la création d'un utilisateur.");
                    setIsUserError(true);
                    return;
                }
                response = await axios.post('http://localhost:5000/api/utilisateurs', dataToSend);
                setUserMessage(response.data.message);
            }

            setIsUserError(false);
            setShowUserForm(false);
            fetchUsers(currentUser); // Mettre à jour la liste après succès
            // Réinitialiser le formulaire après succès
            setUserFormData({ id: null, email: '', mot_de_passe: '', role: 'technicien' });
        } catch (err) {
            console.error("Erreur soumission formulaire utilisateur :", err);
            setIsUserError(true);
            setUserMessage(err.response?.data?.message || "Erreur lors de l'opération sur l'utilisateur.");
        }
    };

    const handleUserEdit = (user) => {
        // Ne pas pré-remplir le mot de passe pour des raisons de sécurité
        setUserFormData({ id: user.id, email: user.email, mot_de_passe: '', role: user.role });
        setShowUserForm(true);
        setUserMessage("");
    };

    const handleUserDelete = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
        if (!currentUser || currentUser.role !== "administrateur") {
            setUserMessage("Accès non autorisé pour supprimer les utilisateurs.");
            setIsUserError(true);
            return;
        }
        // Empêcher un admin de se supprimer lui-même
        if (id === currentUser.id) {
            setUserMessage("Vous ne pouvez pas supprimer votre propre compte !");
            setIsUserError(true);
            return;
        }

        try {
            await axios.delete(`http://localhost:5000/api/utilisateurs/${id}`, {
                params: { // Envoyer l'ID et le rôle de l'admin pour l'autorisation backend
                    current_user_id: currentUser.id, 
                    current_user_role: currentUser.role
                }
            });
            setUserMessage("Utilisateur supprimé avec succès !");
            setIsUserError(false);
            fetchUsers(currentUser); // Mettre à jour la liste
        } catch (err) {
            console.error("Erreur lors de la suppression de l'utilisateur :", err);
            setIsUserError(true);
            setUserMessage(err.response?.data?.message || "Erreur lors de la suppression de l'utilisateur.");
        }
    };

    // --- Fonction de déconnexion ---
    const handleLogout = () => {
        localStorage.removeItem("utilisateur");
        navigate('/connexion');
    };

    // --- Rendu conditionnel ---
    if (loading) return <div className="container-box"><h1 className="page-title">Chargement...</h1></div>;
    if (error) return <div className="container-box"><h1 className="page-title error">{error}</h1></div>;

    return (
        <>
            <div className="logout-global">
                <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
            </div>

            {/* Section de gestion des affaires */}
            <div className="container-box">
                <div className="page-header">
                    <h1 className="page-title">Liste des Affaires</h1>
                    {affaireMessage && <p className={isAffaireErreur ? "form-error" : "form-success"}>{affaireMessage}</p>}
                    <button className="btn-primary" onClick={() => {
                        setShowAffaireForm(!showAffaireForm);
                        setAffaireFormData({ id_affaire: null, numero_affaire: '', objet: '', client: '', responsable: currentUser?.email || '', observation: '' });
                        setAffaireMessage("");
                    }}>
                        {showAffaireForm ? "Annuler" : "Ajouter une affaire"}
                    </button>
                </div>

                {showAffaireForm && (
                    <form onSubmit={handleAffaireFormSubmit} className="affaires-form">
                        <h3 className="form-title">{affaireFormData.id_affaire ? "Modifier l'affaire" : "Nouvelle affaire"}</h3>
                        <input className="form-input" type="text" name="numero_affaire" placeholder="Numéro d'affaire" value={affaireFormData.numero_affaire} onChange={handleAffaireInputChange} required />
                        <input className="form-input" type="text" name="objet" placeholder="Objet" value={affaireFormData.objet} onChange={handleAffaireInputChange} required />
                        <input className="form-input" type="text" name="client" placeholder="Client" value={affaireFormData.client} onChange={handleAffaireInputChange} required />
                        <input className="form-input" type="text" name="responsable" placeholder="Responsable" value={affaireFormData.responsable} onChange={handleAffaireInputChange} required />
                        <input className="form-input" type="text" name="observation" placeholder="Observation" value={affaireFormData.observation} onChange={handleAffaireInputChange} />
                        <button className="form-button" type="submit">{affaireFormData.id_affaire ? "Mettre à jour" : "Valider"}</button>
                    </form>
                )}

                <div className="table-wrapper">
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
                                                onClick={() => handleAffaireEdit(affaire)}
                                            />
                                            <FaTrash
                                                className="icon-action icon-delete"
                                                title="Supprimer"
                                                onClick={() => handleAffaireDelete(affaire.id_affaire)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section de gestion des utilisateurs (visible uniquement pour les administrateurs) */}
            {currentUser && currentUser.role === "administrateur" && (
                <div className="container-box user-management-section">
                    <div className="page-header">
                        <h1 className="page-title">Gestion des Utilisateurs</h1>
                        {userMessage && <p className={isUserError ? "form-error" : "form-success"}>{userMessage}</p>}
                        <button className="btn-primary" onClick={() => {
                            setShowUserForm(!showUserForm);
                            setUserFormData({ id: null, email: '', mot_de_passe: '', role: 'technicien' });
                            setUserMessage("");
                        }}>
                            {showUserForm ? "Annuler" : "Créer un utilisateur"}
                        </button>
                    </div>

                    {showUserForm && (
                        <form onSubmit={handleUserFormSubmit} className="affaires-form"> {/* Réutilisation du style de formulaire */}
                            <h3 className="form-title">{userFormData.id ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</h3>
                            <input className="form-input" type="email" name="email" placeholder="E-mail" value={userFormData.email} onChange={handleUserInputChange} required />
                            <input className="form-input" type="password" name="mot_de_passe" placeholder={userFormData.id ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"} value={userFormData.mot_de_passe} onChange={handleUserInputChange} required={!userFormData.id} />
                            <select className="form-input" name="role" value={userFormData.role} onChange={handleUserInputChange} required>
                                <option value="technicien">Technicien</option>
                                <option value="administrateur">Administrateur</option>
                            </select>
                            <button className="form-button" type="submit">{userFormData.id ? "Mettre à jour" : "Valider"}</button>
                        </form>
                    )}

                    <div className="table-wrapper">
                        <table className="affaires-table"> {/* Réutilisation du style de tableau */}
                            <thead>
                                <tr>
                                    <th>E-mail</th>
                                    <th>Rôle</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.email}</td>
                                        <td>{user.role}</td>
                                        <td className="actions-cell">
                                            <div className="action-icons">
                                                <FaPencilAlt
                                                    className="icon-action icon-edit"
                                                    title="Modifier l'utilisateur"
                                                    onClick={() => handleUserEdit(user)}
                                                />
                                                <FaTrash
                                                    className="icon-action icon-delete"
                                                    title="Supprimer l'utilisateur"
                                                    onClick={() => handleUserDelete(user.id)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
};

export default AffairesListe;