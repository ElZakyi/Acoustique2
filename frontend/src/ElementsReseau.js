import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import './AffairesListe.css';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';


const ELEMENT_CONFIG = {
    silencieux: { label: 'Silencieux', fields: [] },
    conduit: {
        label: 'Conduit',
        fields: [
            { name: 'longueur', label: 'Longueur (m)', type: 'number' },
            { name: 'materiau', label: 'Matériau', type: 'text' },
        ]
    },
    coude: {
        label: 'Coude',
        fields: [
            { name: 'angle', label: 'Angle (°)', type: 'number' },
            { name: 'orientation', label: 'Orientation', type: 'text' },
            { name: 'materiau', label: 'Matériau', type: 'text' },
        ]
    },
    piecetransformation: { label: 'Pièce de transformation', fields: [] },
    grillesoufflage: {
        label: 'Grille de soufflage',
        fields: [{ name: 'distance_r', label: 'Distance R', type: 'number' }]
    },
    plenum: { label: 'Plénum', fields: [] },

    vc : {
        label : 'VC CRSL-ECM 2',
        fields : [
            {name : 'type_vc' , label : 'Type VC ',type : 'select', options : ['Soufflage','Reprise']}
        ]
    }
};

const ElementsReseau = () => {
    const { id_troncon } = useParams();
    const navigate = useNavigate();
    const [elements, setElements] = useState([]);

    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [selectedType, setSelectedType] = useState('');
    const [formData, setFormData] = useState({});
    const [ordreTroncon, setOrdreTroncon] = useState(null);

    const fetchElements = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/troncons/${id_troncon}/elements`);
            setElements(res.data);
            console.log("Éléments récupérés :", res.data);
        } catch (err) {
            console.error("Erreur récupération éléments :", err);
        }
    };

    useEffect(() => {
        fetchElements();
        const fetchOrdreTroncon = async () => {
            try {

                const res = await axios.get(`http://localhost:5000/api/troncons/${id_troncon}/ordre`);
                setOrdreTroncon(res.data.ordre_troncon);
            } catch (err) {
                console.error("Erreur récupération ordre tronçon:", err);
            }
        };

        fetchOrdreTroncon();
    }, [id_troncon]);

    const handleTypeChange = (e) => {
        setSelectedType(e.target.value);
        setFormData({});
    };

    const handleFormInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedType) return;

        // Convertir les valeurs numériques
        const payload = {
            type: selectedType,
            parameters: Object.fromEntries(
                Object.entries(formData).map(([k, v]) => [k, isNaN(v) ? v : Number(v)])
            )
        };

        try {
            if (editingId) {
                await axios.put(`http://localhost:5000/api/elements/${editingId}`, payload);
                setMessage("Élément mis à jour avec succès !");
            } else {
                await axios.post(`http://localhost:5000/api/troncons/${id_troncon}/elements`, payload);
                setMessage("Élément ajouté avec succès !");
            }
            setShowForm(false);
            setEditingId(null);
            setSelectedType('');
            setFormData({});
            fetchElements();
        } catch (err) {
            setMessage(err.response?.data?.message || "Une erreur est survenue.");
        }
    };

    const handleDeleteElement = async (id_element) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/elements/${id_element}`);
            setMessage("Élément supprimé avec succès.");
            fetchElements();
        } catch (err) {
            setMessage(err.response?.data?.message || "Erreur lors de la suppression.");
        }
    };

    const handleEditClick = async (element) => {
        setShowForm(true);
        setMessage('');
        setEditingId(element.id_element);
        setSelectedType(element.type);
        try {
            const res = await axios.get(`http://localhost:5000/api/elements/${element.id_element}`);
            const elementDetails = res.data;
            const config = ELEMENT_CONFIG[elementDetails.type];
            if (config) {
                const initialData = {};
                config.fields.forEach(field => {
                    if (elementDetails[field.name] !== null && elementDetails[field.name] !== undefined) {
                        initialData[field.name] = elementDetails[field.name];
                    }
                });
                setFormData(initialData);
            } else {
                setFormData({});
            }
        } catch (error) {
            console.error("Erreur lors du chargement des détails pour la modification:", error);
            setMessage("Impossible de charger les détails de l'élément.");
            setFormData({});
        }
    };
    

    const renderFormFields = () => {
        if (!selectedType) return null;
        const config = ELEMENT_CONFIG[selectedType];
        if (!config?.fields?.length) {
            return <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>Aucun paramètre spécifique requis.</p>;
        }
        
        return config.fields.map(field => {
            if(field.type === 'select') {
                return (
                    <select
                        key = {field.name}
                        name = {field.name}
                        value = {formData[field.name] || ''}
                        onChange={handleFormInputChange}
                        className="form-input"
                        required
                    >
                        <option value = "" disabled>--{field.label}--</option>
                        {field.options.map(opt=>(<option key = {opt} value = {opt}>{opt}</option>))}
                    </select>
                );
            }
        
            return (
            <input
                key={field.name}
                type={field.type}
                name={field.name}
                placeholder={field.label}
                value={formData[field.name] || ''}
                onChange={handleFormInputChange}
                className="form-input"
                required
            />
            );
        });
    };

    return (
        <div className="container-box">
            <div className="page-header">
                <h2 className="page-title">
                    {ordreTroncon ? `Éléments du tronçon n°${ordreTroncon}` : `Éléments du tronçon #${id_troncon}`}
                </h2>
                <button className="btn-primary" onClick={() => {
                    setShowForm(!showForm);
                    setEditingId(null);
                    setSelectedType('');
                    setMessage('');
                }}>
                    {showForm ? "Annuler" : "Ajouter un élément"}
                </button>
            </div>

            {message && <p className={message.toLowerCase().includes('erreur') ? 'form-error' : 'form-success'}>{message}</p>}

            {showForm && (
                <form className='affaires-form' onSubmit={handleSubmit}>
                    <h3>{editingId ? "Modifier l'élément" : "Ajouter un nouvel élément"}</h3>

                    <select
                        className="form-input"
                        value={selectedType}
                        onChange={handleTypeChange}
                        required
                        disabled={!!editingId}
                    >
                        <option value="" disabled>-- Sélectionnez un type --</option>
                        {Object.keys(ELEMENT_CONFIG).map(key => (
                            <option key={key} value={key}>{ELEMENT_CONFIG[key].label}</option>
                        ))}
                    </select>

                    <div className="form-row">
                        {renderFormFields()}
                    </div>

                    <button className="form-button" type="submit" disabled={!selectedType}>
                        {editingId ? "Mettre à jour" : "Ajouter l'élément"}
                    </button>
                </form>
            )}

            <table className="affaires-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>Paramètres</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {elements.map((el, i) => (
                        <tr key={el.id_element}>
                            <td>{i + 1}</td>
                            <td>{ELEMENT_CONFIG[el.type]?.label || el.type}</td>
                            <td>
                                {
                                    (() => {
                                        const params = Object.entries(el).filter(([k]) =>
                                            ['longueur', 'angle', 'orientation', 'materiau', 'distance_r', 'type_vc'].includes(k) && el[k] !== null
                                        );
                                        if (params.length === 0) {
                                            return <em style={{ color: '#999' }}>Aucun paramètre</em>;
                                        }
                                        return params.map(([k, v]) => (
                                            <div key={k}><strong>{k}</strong>: {v}</div>
                                        ));
                                    })()
                                }
                            </td>
                            <td >
                                <div className="actions-cell">
                                    <div className="action-icons">
                                        <FaPencilAlt className="icon-action icon-edit" onClick={() => handleEditClick(el)} />
                                        <FaTrash className="icon-action icon-delete" onClick={() => handleDeleteElement(el.id_element)} />
                                    </div>
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
