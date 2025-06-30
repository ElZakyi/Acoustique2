import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import './AffairesListe.css';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';
const ElementsReseau = () => {
    const { id_troncon } = useParams();
    const navigate = useNavigate();
    const [elements, setElements] = useState([]);
    const [type, setType] = useState('');
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);

    const fetchElements = useCallback(async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/troncons/${id_troncon}/elements`);
            setElements(res.data);
        } catch (err) {
            console.error("Erreur récupération éléments :", err);
            setMessage(err.response?.data?.message || "Erreur serveur");
        }
    }, [id_troncon]);

    useEffect(() => {
        fetchElements();
    }, [fetchElements]);

    const handleAddElements = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`http://localhost:5000/api/troncons/${id_troncon}/elements`, { type });
            setMessage(response.data.message);
            setType('');
            setShowForm(false); // Fermer le formulaire après ajout
            fetchElements();    // Recharger la liste
        } catch (err) {
            console.error("Erreur ajout élément réseau :", err);
            setMessage(err.response?.data?.message || "Erreur lors de l'ajout");
        }
    };

    return (
        <div className="container-box">
            <div className="page-header">
                <h2 className="page-title">Éléments réseau du tronçon #{id_troncon}</h2>
                <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? "Annuler" : "Ajouter un élément"}
                </button>
            </div>

            {message && <p className="form-success">{message}</p>}

            {showForm && (
                <form className='affaires-form' onSubmit={handleAddElements}>
                    <input
                        className="form-input"
                        type="text"
                        value={type}
                        placeholder="Type d'élément"
                        onChange={(e) => setType(e.target.value)}
                        required
                    />
                    <button className="form-button" type="submit">Ajouter</button>
                </form>
            )}

            <table className="affaires-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>ID Tronçon</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {elements.map((el, i) => (
                        <tr key={el.id_element || i}>
                            <td>{i + 1}</td>
                            <td>{el.type}</td>
                            <td>{el.id_troncon}</td>
                            <td className="actions-cell">        
                                    <div className="action-icons">
                                        <FaPencilAlt className="icon-action icon-edit"  />
                                        <FaTrash className="icon-action icon-delete" />
                                    </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="footer-actions">
                <button className="btn-secondary" onClick={() => navigate(-1)}>Retour</button>
            </div>
        </div>
    );
};

export default ElementsReseau;
