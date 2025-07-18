import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import './AffairesListe.css';

// Imports pour React DnD 
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import update from 'immutability-helper';

// Type d'élément draggable
const ItemTypes = {
  TRONCON: 'troncon',
};

//Composant DraggableTronconRow
const DraggableTronconRow = ({
    troncon,
    index,
    moveTroncon,
    handleEdit,
    handleDelete,
    id_source,
}) => {
    const ref = useRef(null);

    const [{ handlerId, isOver }, drop] = useDrop({
        accept: ItemTypes.TRONCON,
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
                isOver: monitor.isOver(),
            };
        },
        hover(item, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

            moveTroncon(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.TRONCON,
        item: () => ({ id: troncon.id_troncon, index }),
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    const className = `
        ${isDragging ? 'is-dragging' : ''}
        ${isOver ? 'is-over' : ''}
    `.trim();

    drag(drop(ref));

    return (
        <tr ref={ref} className={className} style={{ opacity: isDragging ? 0 : 1 }} data-handler-id={handlerId}>
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
                <Link to={`/troncons/${troncon.id_troncon}/${id_source}/elements`} className="btn-action">
                    Gérer éléments
                </Link>
                <div className="action-icons">
                    <FaPencilAlt className="icon-action icon-edit" onClick={() => handleEdit(troncon)} />
                    <FaTrash className="icon-action icon-delete" onClick={() => handleDelete(troncon.id_troncon)} />
                </div>
            </td>
        </tr>
    );
};


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
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        forme: 'rectangulaire', // par défaut
        largeur: '',
        hauteur: '',
        diametre: '',
        debit: ''
    });

    const debouncedSaveNewOrderRef = useRef();
    const scrollContainerRef = useRef(null); 
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

    // Drag & Drop : Fonctions de déplacement et de sauvegarde
    const moveTroncon = useCallback((dragIndex, hoverIndex) => {
        setTroncons((prevTroncons) =>
            update(prevTroncons, {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, prevTroncons[dragIndex]],
                ],
            }),
        );
    }, []);

    const saveNewOrder = useCallback(async () => {
        const newOrder = troncons.map((troncon, index) => ({
            id_troncon: troncon.id_troncon,
            ordre: index,
        }));

        try {
            await axios.put(`http://localhost:5000/api/sources/${id_source}/troncons/reorder`, newOrder);
            setMessage("Ordre des tronçons mis à jour avec succès !");
            setIsErreur(false);
            await fetchTroncons(); 
        } catch (err) {
            console.error("Erreur lors de la sauvegarde du nouvel ordre :", err);
            setMessage("Erreur lors de la sauvegarde de l'ordre.");
            setIsErreur(true);
        }
    }, [troncons, id_source, fetchTroncons]);

    // EFFETS
    useEffect(() => {
        const utilisateur = localStorage.getItem("utilisateur");
        if (!utilisateur) {
            navigate('/connexion')
            return; 
        }
        const loadData = async () => {
            await fetchTroncons();
            await fetchSourceInfo();
        };
        loadData();
    }, [fetchTroncons, fetchSourceInfo, navigate]); 

    useEffect(() => {
        if (debouncedSaveNewOrderRef.current) {
            clearTimeout(debouncedSaveNewOrderRef.current);
        }
        debouncedSaveNewOrderRef.current = setTimeout(() => {
            if (troncons.length > 0) {
                saveNewOrder();
            }
        }, 500);

        return () => {
            if (debouncedSaveNewOrderRef.current) {
                clearTimeout(debouncedSaveNewOrderRef.current);
            }
        };
    }, [troncons, saveNewOrder]);

    const handleLogout = () => {
        localStorage.removeItem("utilisateur");
        navigate('/connexion');
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'forme') {
                newState.largeur = '';
                newState.hauteur = '';
                newState.diametre = '';
            }
            return newState;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let vitesse = 0;
            const debit_m3s = parseFloat(formData.debit) / 3600;

            if (formData.forme === 'rectangulaire') {
                const surface = (parseFloat(formData.largeur) / 1000) * (parseFloat(formData.hauteur) / 1000);
                vitesse = surface > 0 ? debit_m3s / surface : 0;
            } else if (formData.forme === 'circulaire') {
                const diametre_m = parseFloat(formData.diametre) * 0.001;
                const surface = Math.PI * Math.pow(diametre_m, 2) / 4;
                const debit_m3h = parseFloat(formData.debit);
                vitesse = surface > 0 ? (debit_m3h / surface) / 3600 : 0;
            }

            const payload = { ...formData, vitesse: vitesse.toFixed(2) };

            if (editingId) {
                await axios.put(`http://localhost:5000/api/troncons/${editingId}`, payload);
                setMessage("Tronçon mis à jour avec succès !");
                setEditingId(null);
            } else {
                await axios.post(`http://localhost:5000/api/sources/${id_source}/troncons`, payload);
                setMessage("Tronçon ajouté avec succès !");
            }

            setIsErreur(false);
            setFormData({ forme: 'rectangulaire', largeur: '', hauteur: '', 'diametre': '', debit: '' });
            setShowForm(false);
            fetchTroncons();

        } catch (error) {
            setMessage(error.response?.data?.message || "Une erreur est survenue.");
            setIsErreur(true);
        }
    };

    const handleEdit = (troncon) => {
        setEditingId(troncon.id_troncon);
        setFormData({
            forme: troncon.forme,
            largeur: troncon.largeur || '',
            hauteur: troncon.hauteur || '',
            diametre: troncon.diametre || '',
            debit: troncon.debit
        });
        setShowForm(true);
        setMessage('');
    };

    const handleDelete = async (id_troncon) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce tronçon ?")) {
            try {
                await axios.delete(`http://localhost:5000/api/troncons/${id_troncon}`);           
                setMessage("Tronçon supprimé avec succès !");
                setIsErreur(false);
                fetchTroncons();     
            } catch (error) {
                setMessage(error.response?.data?.message || "Erreur lors de la suppression.");
                setIsErreur(true);
            }
        }
    };
    if (loading) return <div>Chargement des troncons en cours ...</div>;
    if (error) return <div>{error}</div>;

    return (
        //DndProvider pour activer le d&d
        <DndProvider backend={HTML5Backend}>
            <div className="logout-global">
                <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
            </div>
        
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
                    <form onSubmit={handleSubmit} className="affaires-form">
                        <h3>{editingId ? 'Modifier le tronçon' : 'Ajouter un tronçon'}</h3>
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
                        <button className="form-button" type="submit">{editingId ? 'Mettre à jour' : 'Ajouter'}</button>
                    </form>
                )}

                <div ref={scrollContainerRef} className="table-scroll-container">
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
                                <DraggableTronconRow
                                    key={troncon.id_troncon}
                                    troncon={troncon}
                                    index={index}
                                    moveTroncon={moveTroncon}
                                    handleEdit={handleEdit}
                                    handleDelete={handleDelete}
                                    id_source={id_source}
                                />
                            ))}
                        </tbody>
                    </table>
                </div> 
                
                <div className="footer-actions">
                    <button onClick={() => navigate(-1)} className="btn-secondary">Retour</button>
                </div>
            </div>
        </DndProvider>
    )
};
export default TronconsListe;