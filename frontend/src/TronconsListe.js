import React, { useEffect, useState ,useCallback} from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import './AffairesListe.css';

const TronconsListe = () => {
    const { id_source } = useParams();
    const navigate = useNavigate();
    const [troncons, setTroncons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState('');
    const [isErreur, setIsErreur] = useState(false);
    const [sourceInfo, setSourceInfo] = useState({ nom: '', ordre: null });



    const [formData, setFormData] = useState({
        forme: 'rectangulaire', // Valeur par défaut
        largeur: '',
        hauteur: '',
        diametre: '', 
        debit: ''
    });

    const fetchTroncons = useCallback(async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/sources/${id_source}/troncons`);
            setTroncons(res.data);
        } catch (err) {
            setError("Erreur lors du chargement des troncons");
            console.error("Erreur fetchTroncons:", err);
        } finally {
            setLoading(false);
        }
    },[id_source]);

    const fetchSourceInfo = useCallback(async () => {
    try {
        const res = await axios.get(`http://localhost:5000/api/sources/${id_source}`);
        setSourceInfo({
            nom: res.data.nom,
            ordre: res.data.ordre  
        });
    } catch (err) {
        console.error("Erreur lors de la récupération des infos source :", err);
    }
},[id_source]);

    useEffect(() => {
    const loadData = async () => {
        await fetchTroncons();
        await fetchSourceInfo();
    };
    loadData();
}, [fetchTroncons, fetchSourceInfo]);


    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            // Si on change la forme on réinitialise les dimensions 
            if (name === 'forme') {
                newState.largeur = '';
                newState.hauteur = '';
                newState.diametre = '';
            }
            return newState;
        });
    };

    const handleAddTroncon = async (e) => {
        e.preventDefault();
        try {
            let vitesse = 0;
            const debit_m3s = parseFloat(formData.debit)/3600;
            if(formData.forme === 'rectangulaire'){
                const surface = (parseFloat(formData.largeur)/1000)*(parseFloat(formData.hauteur)/1000);
                vitesse = debit_m3s/surface;
            }else if (formData.forme === 'circulaire'){
                const diametre_m = parseFloat(formData.diametre) * 0.001; // mm → m
                const surface = Math.PI * Math.pow(diametre_m, 2) / 4;     // Surface du cercle
                const debit_m3h = parseFloat(formData.debit);              // Débit en m³/h
                vitesse = (debit_m3h / surface) / 3600;  
            }
            const payload = {
                ...formData,
                vitesse: vitesse.toFixed(2)  // On arrondit à 2 chiffres
            };
            const res = await axios.post(`http://localhost:5000/api/sources/${id_source}/troncons`, payload);
            setMessage(res.data.message);
            setIsErreur(false);
            // Réinitialisation 
            setFormData({ forme: 'rectangulaire', largeur: '', hauteur: '', diametre: '', vitesse: '', debit: '' });
            setShowForm(false);
            fetchTroncons();
        } catch (error) {
            setMessage(error.response?.data?.message || "Une erreur est survenue.");
            setIsErreur(true);
            console.error("Erreur lors de l'ajout du tronçon :", error);
        }
    };

    if (loading) return <div>Chargement des troncons en cours ...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className='container-box'>

            <div className="page-header">
                <h1 className="page-title">
                Tronçons de la source "{sourceInfo.nom}" {sourceInfo.ordre ? `- n°${sourceInfo.ordre}` : ""}
                </h1>

                <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                    {showForm ? "Annuler" : "Ajouter un Tronçon"}
                </button>
            </div>
            {message && <p className={isErreur ? 'form-error' : 'form-success'}>{message}</p>}


            {showForm && (
                <form onSubmit={handleAddTroncon} className="affaires-form">
                    <h3>Ajouter un tronçon</h3>
                    <select name="forme" value={formData.forme} onChange={handleFormChange} className="form-input" required>
                        <option value="rectangulaire">Rectangulaire</option>
                        <option value="circulaire">Circulaire</option>
                    </select>


                    {formData.forme === 'rectangulaire' && (
                        <>
                            <input type="number" name="largeur" placeholder="Largeur (mm)" value={formData.largeur} onChange={handleFormChange} className="form-input" required />
                            <input type="number" name="hauteur" placeholder="Hauteur (mm)" value={formData.hauteur} onChange={handleFormChange} className="form-input" required />
                        </>
                    )}
                    {formData.forme === 'circulaire' && (
                        <input type="number" name="diametre" placeholder="Diamètre (mm)" value={formData.diametre} onChange={handleFormChange} className="form-input" required />
                    )}
                    <input type="number" name="debit" placeholder="Débit (m³/h)" value={formData.debit} onChange={handleFormChange} className="form-input" required />
                    <button className="form-button" type="submit">Ajouter</button>
                </form>
            )}


            <table className='affaires-table'>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Forme</th>
                        <th>Dimensions (mm)</th>
                        <th>Vitesse (m/s)</th>
                        <th>Debit (m³/h)</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {troncons.map((troncon, index) => (
                        <tr key={troncon.id_troncon}>
                            <td>{index + 1}</td>
                            <td>{troncon.forme}</td>

                            <td>
                                {troncon.forme === 'rectangulaire'
                                    ? `${troncon.largeur} x ${troncon.hauteur}`
                                    : `Ø ${troncon.diametre}`
                                }
                            </td>
                            <td>{troncon.vitesse}</td>
                            <td>{troncon.debit}</td>

                            <td className="actions-cell">
                                <Link to={`/troncons/${troncon.id_troncon}/elements`} className="btn-action">
                                    Gérer éléments
                                </Link>
                                <div className="action-icons">
                                    <FaPencilAlt className="icon-action icon-edit" />
                                    <FaTrash className="icon-action icon-delete" />
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