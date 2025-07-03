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
    plenum: { label: 'Plenum', fields: [] },

    vc : {
        label : 'VC CRSL-ECM 2',
        fields : [
            {name : 'type_vc' , label : 'Type VC ',type : 'select', options : ['Soufflage','Reprise']}
        ]
    }
};


const SPECTRA_CONFIG = {
    silencieux: ['attenuation', 'regeneration', 'lw_resultant'],
    conduit: ['attenuation', 'regeneration', 'lw_resultant'],
    coude: ['attenuation', 'regeneration', 'lw_resultant'],
    piecetransformation: ['lw_entrant', 'attenuation_troncon'],
    grillesoufflage: ['attenuation', 'regeneration', 'lw_resultant'],
    plenum: ['attenuation', 'lw_resultant'],
    vc: ['attenuation', 'regeneration', 'lw_sortie', 'lw_sortie_air_neuf', 'lw_total', 'lp']
};

const SPECTRA_LABELS = {
    attenuation: 'Atténuation',
    regeneration: 'Régénération',
    lw_resultant: 'Niveau LW résultant',
    lw_entrant: 'Lw entrant (dB Lin)',
    // on peut ajouter selon le besoin
};

const BANDES_FREQUENCE = ['63', '125', '250', '500', '1000', '2000', '4000'];

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
    const [showAttenuationForm, setShowAttenuationForm] = useState(false);
    const [selectedElement, setSelectedElement] = useState(null);

    const [selectedElementOrder, setSelectedElementOrder] = useState(null);

    const [attenuationValues, setAttenuationValues] = useState({
        '63': '', '125': '', '250': '', '500': '', '1000': '', '2000': '', '4000': ''
    });
    const [attenuations, setAttenuations] = useState([]);
    const [regenerations, setRegenerations] = useState({});
    const [lwResultants, setLwResultants] = useState({});
    

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
        const fetchAllData = async () => {
            try {
                // On lance toutes les requêtes en parallèle
                const [
                    elementsRes, 
                    attenuationsRes, 
                    regenerationsRes, 
                    lwResultantsRes, 
                    ordreTronconRes
                ] = await Promise.all([
                    axios.get(`http://localhost:5000/api/troncons/${id_troncon}/elements`),
                    axios.get('http://localhost:5000/api/attenuations'),
                    axios.get('http://localhost:5000/api/regenerations'),
                    axios.get('http://localhost:5000/api/lwresultants'),
                    axios.get(`http://localhost:5000/api/troncons/${id_troncon}/ordre`)
                ]);
                
                // On met à jour tous les états avec les réponses
                setElements(elementsRes.data);
                setAttenuations(attenuationsRes.data);
                setRegenerations(regenerationsRes.data);
                setLwResultants(lwResultantsRes.data);
                setOrdreTroncon(ordreTronconRes.data.ordre_troncon);
            } catch (err) {
                console.error("Erreur lors de la récupération des données de la page :", err);
            }
        };

        const utilisateur = localStorage.getItem("utilisateur");
        if (!utilisateur) {
            navigate('/connexion');
        } else {
            fetchAllData();
        }
    }, [id_troncon, navigate]); 

    const handleTypeChange = (e) => {
        setSelectedType(e.target.value);
        setFormData({});
    };

    const handleFormInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleLogout = () => {
        localStorage.removeItem("utilisateur");
        navigate('/connexion');
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
    //ouvrire le formulaire de l'attenuation


    const openAttenuationForm = (element, index) => {
    setSelectedElement(element);
             // stocker l'ordre index + 1
             setSelectedElementOrder(index + 1); 

        // Charger les valeurs d'atténuation existantes pour cet élément
        const existingValues = attenuations[element.id_element] || {};

        const initialValues = {
            '63': existingValues['63'] != null ? existingValues['63'] : '',
            '125': existingValues['125'] != null ? existingValues['125'] : '',
            '250': existingValues['250'] != null ? existingValues['250'] : '',
            '500': existingValues['500'] != null ? existingValues['500'] : '',
            '1000': existingValues['1000'] != null ? existingValues['1000'] : '',
            '2000': existingValues['2000'] != null ? existingValues['2000'] : '',
            '4000': existingValues['4000'] != null ? existingValues['4000'] : ''
        };
        setAttenuationValues(initialValues);
        setShowAttenuationForm(true);
    };
    const saveAttenuation = async () => {
    if (!selectedElement) return;

    try {
        const payload = {
            id_element: selectedElement.id_element
        };

        // Ajouter chaque bande de fréquence dans le payload
        Object.entries(attenuationValues).forEach(([bande, valeur]) => {
            payload[bande] = parseFloat(valeur) || 0;
        });

        await axios.post('http://localhost:5000/api/attenuations', payload);
        setMessage("Atténuation enregistrée avec succès !");
        fetchAttenuations();
        setShowAttenuationForm(false);
        setAttenuationValues({ '63': '', '125': '', '250': '', '500': '', '1000': '', '2000': '', '4000': '' });
    } catch (error) {
        console.error("Erreur sauvegarde atténuation :", error);
        setMessage("Erreur lors de la sauvegarde de l'atténuation.");
    }
};
    //recupere les attenuations
    const fetchAttenuations = async () => {
    try {
        const res = await axios.get(`http://localhost:5000/api/attenuations`);
        setAttenuations(res.data);
    } catch (error) {
        console.error("Erreur récupération atténuations :", error);
    }
};




    return (
         <>
            <div className="logout-global">
                <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
            </div>
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
                                     <button className="btn-small" onClick={() => openAttenuationForm(el, i)}>Atténuation</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {showAttenuationForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Saisir les atténuations pour l'élément n°{selectedElementOrder}</h3>
                        {Object.keys(attenuationValues).map(freq=>(
                            <div key = {freq}>
                                <label>{freq}Hz</label>
                                <input
                                    type="number"
                                    value = {attenuationValues[freq]}
                                    onChange={(e)=>setAttenuationValues({...attenuationValues,[freq]:e.target.value})}
                                />
                            </div>
                        ))}
                        <button onClick={()=>saveAttenuation()}>Enregistrer</button>
                        <button onClick={()=>setShowAttenuationForm(false)}>Fermer</button>

                    </div>

                </div>
                
            )}
             <h3 style={{ marginTop: '30px' }}>Tableau de synthèse acoustique</h3>
            <table className="affaires-table synthese-table">
                <thead>
                    <tr>
                        <th style={{ width: '5%' }}>#</th>
                        <th style={{ width: '15%' }}>Type</th>
                        <th style={{ width: '20%' }}>Valeurs</th>
                        {BANDES_FREQUENCE.map(freq => <th key={freq}>{freq}Hz</th>)}
                    </tr>
                </thead>
                <tbody>
                    {elements.map((el, i) => {
                        const spectraToShow = SPECTRA_CONFIG[el.type] || [];
                        const rowSpan = spectraToShow.length > 0 ? spectraToShow.length : 1;
                        
                        const elementSpectra = {
                            attenuation: attenuations[el.id_element] || {},
                            regeneration: regenerations[el.id_element] || {},
                            lw_resultant: lwResultants[el.id_element] || {}
                        };

                        return (
                            <React.Fragment key={el.id_element}>
                                <tr>
                                    <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>{i + 1}</td>
                                    <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>{ELEMENT_CONFIG[el.type]?.label || el.type}</td>
                                    
                                    {spectraToShow.length > 0 ? (
                                        <>
                                            <td>{SPECTRA_LABELS[spectraToShow[0]]}</td>
                                            {BANDES_FREQUENCE.map(freq => (
                                                <td key={freq}>
                                                    {elementSpectra[spectraToShow[0]]?.[freq] ?? '-'}
                                                </td>
                                            ))}
                                        </>
                                    ) : (
                                        <td colSpan={BANDES_FREQUENCE.length + 1} style={{ textAlign: 'center', color: '#888' }}>
                                            Aucun spectre applicable
                                        </td>
                                    )}
                                </tr>
                                {spectraToShow.slice(1).map(spectrumKey => (
                                    <tr key={`${el.id_element}-${spectrumKey}`}>
                                        <td>{SPECTRA_LABELS[spectrumKey]}</td>
                                        {BANDES_FREQUENCE.map(freq => {
                                            const value = elementSpectra[spectrumKey]?.[freq] ?? '-';
                                            return <td key={`${spectrumKey}-${freq}`}>{value}</td>;
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>


            <div className="footer-actions">
                <button className="btn-secondary" onClick={() => navigate(-1)}>Retour</button>
            </div>
        </div>
        </>
    );
};

export default ElementsReseau;
