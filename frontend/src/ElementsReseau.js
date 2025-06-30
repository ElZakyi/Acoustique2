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
    const [editing, setEditing] = useState(false); // true si on modifie
    const [editId, setEditId] = useState(null); 

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

    //gerer la modification de element reseau
    const handleUpdateElement = async (e) => {
    e.preventDefault();
    try {
        const response = await axios.put(`http://localhost:5000/api/elements/${editId}`, { type });
        setMessage(response.data.message);
        setType('');
        setEditId(null);
        setEditing(false);
        setShowForm(false);
        fetchElements();
    } catch (err) {
        console.error("Erreur mise à jour élément :", err);
        setMessage(err.response?.data?.message || "Erreur serveur");
    }
    };
    //supprimer un element reseau
    const handleDeleteElement = async (id_element) => {
        const confirmDelete = window.confirm("etes vous sur de vouloir supprimer cet element ?");
        if(!confirmDelete) return;
        try {
            const response = await axios.delete(`http://localhost:5000/api/elements/${id_element}`);
            setMessage(response.data.message);
            fetchElements();
        }catch(err){
            console.error("erreur lors de la suppression : ",err);
            setMessage(err.response?.data?.message);
        }
    } 

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
                <form className='affaires-form' onSubmit={editing? handleUpdateElement : handleAddElements}>
                    <input
                        className="form-input"
                        type="text"
                        value={type}
                        placeholder="Type d'élément"
                        onChange={(e) => setType(e.target.value)}
                        required
                    />
                    <button className="form-button" type="submit">{editing? "Modifier l'element " : 'Ajouter'}</button>
                    <button className="btn-secondary" type="button" onClick={()=>
                    {setEditing(false);setEditId(null);setType('');setShowForm(false);}}>Annuler</button>
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
                                        <FaPencilAlt className="icon-action icon-edit" onClick={()=>
                                            {setType(el.type);setEditId(el.id_element);setEditing(true);setShowForm(true);}} />
                                        <FaTrash className="icon-action icon-delete" onClick={()=>{handleDeleteElement(el.id_element)}}/>
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
