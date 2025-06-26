import React, { useEffect, useState } from 'react';
import { useParams, useNavigate,Link } from 'react-router-dom';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import './AffairesListe.css';
const TronconsListe = () => {
    const {id_source} = useParams();
    const navigate = useNavigate();
    const [troncons,setTroncons] = useState([]);
    const [loading,setLoading] = useState(true);
    const [error,setError] = useState(null);
    const [showForm,setShowForm] = useState(false);
    const [message, setMessage] = useState('');
    const [isErreur, setIsErreur] = useState(false);

    const [formData,setFormData] = useState({
        forme : '',
        largeur : '',
        hauteur : '',
        vitesse : '',
        debit : ''
    });


    useEffect(()=>{
        const fetchTroncons = async() => {
            try {
                const res = await axios.get(`http://localhost:5000/api/sources/${id_source}/troncons`);
                setTroncons(res.data);
            }catch(err){
                setError("Erreur lors du chargement des troncons");
            }finally{
                setLoading(false);
            }
        };
        fetchTroncons();
    },[id_source]);

    const handleAddTroncon = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`http://localhost:5000/api/sources/${id_source}/troncons`, formData);
            setMessage(res.data.message);
            setIsErreur(false);
            setFormData({ forme: '', largeur: '', hauteur: '', vitesse: '', debit: '' });
            setShowForm(false);
            // Recharge les tronçons
            const response = await axios.get(`http://localhost:5000/api/sources/${id_source}/troncons`);
            setTroncons(response.data);
        } catch (error) {
            setMessage(error.response?.data?.message);
            setIsErreur(true);
            console.error("Erreur lors de l'ajout du tronçon :", error);
        }
};

    if(loading) return <div> Chargement des troncons en cours ...</div>;
    if(error) return <div>{error}</div>
    return (
        <div className='container-box'>
            {message && <p className={isErreur? 'form-error' : 'form-success'}>{message}</p>}
            <div className="page-header">
            <h1 className="page-title">Tronçons de la Source #{id_source}</h1>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                {showForm ? "Annuler" : "Ajouter un Tronçon"}
            </button>
            </div>
            {showForm && (
                <form onSubmit={handleAddTroncon} className="affaires-form">
                    <h3>Ajouter un troncon</h3>
                    <input type = "text" placeholder='Forme' value={formData.forme} onChange={e=>setFormData({...formData,forme:e.target.value})} required />
                    <input type="number" placeholder="Largeur" value={formData.largeur} onChange={e => setFormData({ ...formData, largeur: e.target.value })} required />
                    <input type="number" placeholder="Hauteur" value={formData.hauteur} onChange={e => setFormData({ ...formData, hauteur: e.target.value })} required />
                    <input type="number" placeholder="Vitesse" value={formData.vitesse} onChange={e => setFormData({ ...formData, vitesse: e.target.value })} required />
                    <input type="number" placeholder="Débit" value={formData.debit} onChange={e => setFormData({ ...formData, debit: e.target.value })} required />
                    <button className="form-button" type="submit">Ajouter</button>
                </form>
            )}
            <table className='affaires-table'>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Forme</th>
                        <th>Largeur</th>
                        <th>Hauteur</th>
                        <th>Vitesse</th>
                        <th>Debit</th>
                        <th>ID-Source</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {troncons.map((troncon)=>(
                        <tr key = {troncon.id_troncon}>
                            <td>{troncon.id_troncon}</td>
                            <td>{troncon.forme}</td>
                            <td>{troncon.largeur}</td>
                            <td>{troncon.hauteur}</td>
                            <td>{troncon.vitesse}</td>
                            <td>{troncon.debit}</td>
                            <td>{troncon.id_source}</td>
                            <td className="actions-cell">
                                    <Link to={`/sources/${troncon.id_troncon}/troncons`} className="btn-action">
                                        Gérer element reseau
                                    </Link>
                                    <div className="action-icons">
                                        <FaPencilAlt className="icon-action icon-edit" />
                                        <FaTrash className="icon-action icon-delete"  />
                                    </div>
                                </td>
                        </tr>
                    ))}
                </tbody>

            </table>
            <div className="footer-actions">
                <button onClick={() => navigate(-1)} className="btn-secondary">Retour</button>
            </div>
        </div>
    )
};
export default TronconsListe;