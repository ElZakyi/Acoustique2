import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import './AffairesListe.css';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';

// CONFIGURATIONS
const ELEMENT_CONFIG = {
    silencieux: { label: 'Silencieux', fields: [] },
    conduit: { label: 'Conduit', fields: [{ name: 'longueur', label: 'Longueur (m)', type: 'number' }, { name: 'materiau', label: 'Matériau', type: 'text' }] },
    coude: { label: 'Coude', fields: [{ name: 'angle', label: 'Angle (°)', type: 'number' }, { name: 'orientation', label: 'Orientation', type: 'text' }, { name: 'materiau', label: 'Matériau', type: 'text' }] },
    piecetransformation: { label: 'Pièce de transformation', fields: [] },
    grillesoufflage: { label: 'Grille de soufflage', fields: [{ name: 'distance_r', label: 'Distance R (m)', type: 'number' }] },
    plenum: { label: 'Plenum', fields: [] },
    vc: { label: 'VC CRSL-ECM 2', fields: [{ name: 'type_vc', label: 'Type VC', type: 'select', options: ['Soufflage', 'Reprise'] }] }
};


const SPECTRA_CONFIG = {
    silencieux: ['attenuation', 'regeneration', 'lw_resultant'],
    conduit: ['attenuation', 'regeneration', 'lw_resultant'],
    coude: ['attenuation', 'regeneration', 'lw_resultant'],
    piecetransformation: ['lw_entrant', 'attenuation_troncon'],
    grillesoufflage: ['attenuation', 'regeneration', 'lw_sortie', 'lp'],
    plenum: ['attenuation', 'regeneration', 'lw_resultant'],
    vc: ['attenuation', 'regeneration', 'lw_sortie', 'lw_sortie_air_neuf', 'lw_total', 'lp']
};

const SPECTRA_LABELS = {
    attenuation: 'Atténuation', regeneration: 'Régénération', lw_resultant: 'Niveau LW résultant',
    lw_entrant: 'Lw entrant (dB Lin)', attenuation_troncon: 'Atténuation du tronçon', lw_sortie: 'Niveau Lw sortie',
    lp: 'Niveau Lp', lw_sortie_air_neuf: 'Niveau Lw sortie air neuf', lw_total: 'Lw Total Air neuf + soufflage'
};

const BANDES_FREQUENCE = ['63', '125', '250', '500', '1000', '2000', '4000'];


const ElementsReseau = () => {
    const { id_troncon } = useParams();
    const navigate = useNavigate();

    // states
    const [elements, setElements] = useState([]);
    const [ordreTroncon, setOrdreTroncon] = useState(null);
    const [allSpectra, setAllSpectra] = useState({
        attenuation: {}, regeneration: {}, lw_resultant: {},
        lw_entrant: {}, attenuation_troncon: {}, lw_sortie: {},
        lp: {}, lw_sortie_air_neuf: {}, lw_total: {}
    });
    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [selectedType, setSelectedType] = useState('');
    const [formData, setFormData] = useState({});

    const [showAttenuationForm, setShowAttenuationForm] = useState(false);
    const [selectedElement, setSelectedElement] = useState(null);

    const [selectedElementOrder, setSelectedElementOrder] = useState(null);
    const [attenuationValues, setAttenuationValues] = useState(Object.fromEntries(BANDES_FREQUENCE.map(f => [f, ''])));
    const [showRegenerationForm, setShowRegenerationForm] = useState(false);
    const [regenerationValues, setRegenerationValues] = useState(Object.fromEntries(BANDES_FREQUENCE.map(f => [f, ''])));


    // Logique
    const fetchAllData = useCallback(async () => {
        try {
            const [elementsRes, attenuationsRes, regenerationsRes,attTronconRes, ordreTronconRes,lpRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/troncons/${id_troncon}/elements`),
                axios.get('http://localhost:5000/api/attenuations'),
                axios.get('http://localhost:5000/api/regenerations'),
                axios.get('http://localhost:5000/api/attenuationtroncons'),
                axios.get(`http://localhost:5000/api/troncons/${id_troncon}/ordre`),
                axios.get('http://localhost:5000/api/niveaux_lp') 
            ]);

            setElements(elementsRes.data);
            setOrdreTroncon(ordreTronconRes.data.ordre_troncon);
            setAllSpectra(prev => ({
                ...prev,
                attenuation: attenuationsRes.data,
                regeneration: regenerationsRes.data,
                attenuation_troncon: attTronconRes.data,
                lp: lpRes.data
            }));
        } catch (err) {
            console.error("Erreur de chargement des données:", err);
        }
    }, [id_troncon]);

    useEffect(() => {
        if (!localStorage.getItem("utilisateur")) navigate('/connexion'); else fetchAllData();
    }, [navigate, fetchAllData]);

    useEffect(() => {
        const fetchLwResultants = async () => {
            try {
                const url = `http://localhost:5000/api/lwresultants/troncon/${id_troncon}`;

                const res = await axios.get(url);
                const data = res.data;


                const formatted = {};
                const formattedLwEntrant = {};
                const formattedLwSortie = {}; // nouvelle structure pour niveau lw sortie
                data.forEach(item => {
                    // ➕ Stockage du lw_resultant
                    formatted[item.id_element] = {};
                    Object.entries(item.lw_resultant).forEach(([freq, val]) => {
                        formatted[item.id_element][String(freq)] = val;
                    });
                    // Stockage du lw_entrant
                    formattedLwEntrant[item.id_element] = {}
                    Object.entries(item.lwEntrant || {}).forEach(([freq,value])=>{
                        formattedLwEntrant[item.id_element][String(freq)] = value;
                    });
                    if(item.lw_sortie){
                        formattedLwSortie[item.id_element] = {};
                        Object.entries(item.lw_sortie).forEach(([freq,val])=>{
                            formattedLwSortie[item.id_element][String(freq)] = val;
                        })
                    }
                });

                setAllSpectra(prev => ({ ...prev, lw_resultant: formatted ,lw_entrant : formattedLwEntrant,lw_sortie:formattedLwSortie}));
            } catch (error) {
                console.error("Erreur chargement Lw_resultants :", error);
            }
        };

        if (elements.length > 0) {
            fetchLwResultants();
        }
    }, [elements, id_troncon]);

    useEffect(() => {
    const fetchLwSortieAirNeuf = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/lwsortie/airneuf");
            const data = res.data; // format: { '63': 71.79, '125': 58.873, ... }

            // On va associer ces valeurs à tous les VC de type "Soufflage"
            const newSpectra = {};
            elements.forEach(el => {
                if (el.type === 'vc' && el.type_vc === 'Soufflage') {
                    newSpectra[el.id_element] = data;
                }
            });

            setAllSpectra(prev => ({
                ...prev,
                lw_sortie_air_neuf: newSpectra
            }));
        } catch (err) {
            console.error("Erreur lors du chargement du Lw Sortie air neuf :", err);
        }
    };

    if (elements.length > 0) {
        fetchLwSortieAirNeuf();
    }
}, [elements]);




    const handleLogout = () => { localStorage.removeItem("utilisateur"); navigate('/connexion'); };
    const handleTypeChange = (e) => { setSelectedType(e.target.value); setFormData({}); };
    const handleFormInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedType) return;
        const payload = { type: selectedType, parameters: formData };
        try {
            if (editingId) await axios.put(`http://localhost:5000/api/elements/${editingId}`, payload);
            else await axios.post(`http://localhost:5000/api/troncons/${id_troncon}/elements`, payload);
            setMessage(`Élément ${editingId ? 'mis à jour' : 'ajouté'} !`);
            setShowForm(false); setEditingId(null); setSelectedType(''); setFormData({});
            await fetchAllData();
        } catch (err) { setMessage(err.response?.data?.message || "Une erreur est survenue."); }
    };

    const handleDeleteElement = async (id_element) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/elements/${id_element}`);

            setMessage("Élément supprimé avec succès.");
            await fetchAllData();
        } catch (err) { 
            console.error("Erreur de suppression:", err);
            setMessage(err.response?.data?.message || "Erreur lors de la suppression."); 
        }
    };

    const handleEditClick = async (element) => {
        setShowForm(true); setMessage(''); setEditingId(element.id_element); setSelectedType(element.type);
        try {
            const res = await axios.get(`http://localhost:5000/api/elements/${element.id_element}`);
            const { id_element, id_troncon, type, ...parameters } = res.data;
            setFormData(parameters);
        } catch (error) {
            console.error("Erreur chargement pour modification:", error);
            setMessage("Impossible de charger les détails."); setFormData({});
        }
    };

    const renderFormFields = () => {
        if (!selectedType) return null;
        const config = ELEMENT_CONFIG[selectedType];
        if (!config?.fields?.length) return <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>Aucun paramètre requis.</p>;
        return config.fields.map(field => {
            if (field.type === 'select') return (<select key={field.name} name={field.name} value={formData[field.name] || ''} onChange={handleFormInputChange} className="form-input" required><option value="" disabled>-- {field.label} --</option>{field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
            return (<input key={field.name} type={field.type} name={field.name} placeholder={field.label} value={formData[field.name] || ''} onChange={handleFormInputChange} className="form-input" required />);
        });
    };

    

    const openAttenuationForm = (element, index) => {
        setSelectedElement(element); setSelectedElementOrder(index + 1);
        const existingValues = allSpectra.attenuation[element.id_element] || {};
        setAttenuationValues(Object.fromEntries(BANDES_FREQUENCE.map(f => [f, existingValues[f] ?? ''])));
        setShowAttenuationForm(true);
    };

    const saveAttenuation = async () => {
        if (!selectedElement) return;
        try {
            const payload = { id_element: selectedElement.id_element, ...Object.fromEntries(Object.entries(attenuationValues).map(([k, v]) => [k, parseFloat(v) || 0])) };
            await axios.post('http://localhost:5000/api/attenuations', payload);
            setMessage("Atténuation enregistrée !");
            await fetchAllData();
            setShowAttenuationForm(false);
        } catch (error) { console.error("Erreur sauvegarde atténuation:", error); setMessage("Erreur de sauvegarde."); }
    };

    const openRegenerationForm = (element, index) => {
        setSelectedElement(element);
        setSelectedElementOrder(index + 1);
        const existingValues = allSpectra.regeneration[element.id_element] || {};
        setRegenerationValues(Object.fromEntries(BANDES_FREQUENCE.map(f => [f, existingValues[f] ?? ''])));
        setShowRegenerationForm(true);
    };

    const saveRegeneration = async () => {
        if (!selectedElement) return;
        try {
            const payload = {
                id_element: selectedElement.id_element,
                ...Object.fromEntries(Object.entries(regenerationValues).map(([k, v]) => [k, parseFloat(v) || 0]))
            };
            await axios.post('http://localhost:5000/api/regenerations', payload);
            setMessage("Régénération enregistrée !");
            await fetchAllData(); 
            setShowRegenerationForm(false);
        } catch (error) {
            console.error("Erreur sauvegarde régénération:", error);
            setMessage("Erreur lors de la sauvegarde de la régénération.");
        }
    }; 

    //calcul de GLOBAL dba 
    const calculerGlobalDBA = (spectre) => {
        const bandes = ['63', '125', '250', '500', '1000', '2000', '4000'];
        const pondA = {
            63: -26.2, 125: -16.1, 250: -8.6, 500: -3.2,
            1000: 0, 2000: 1.2, 4000: 1
        };

        let somme = 0;
        for (const bande of bandes) { 
            const val = spectre?.[bande];
            if (val !== undefined && val !== null && !isNaN(val)) {
                somme += Math.pow(10, (val + pondA[bande]) / 10);
            }
        }

        return somme > 0 ? (10 * Math.log10(somme)).toFixed(2) : "-";
    };

    // AFFICHAGE

    return (
        <>
            <div className="logout-global"><button className="btn-logout" onClick={handleLogout}>Déconnexion</button></div>
            <div className="container-box">
                <div className="page-header">
                    {/* CORRECTION: Syntaxe du template literal */}
                    <h2 className="page-title">{`Éléments du tronçon ${ordreTroncon ? `n°${ordreTroncon}` : ''}`}</h2>
                    <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); setSelectedType(''); setMessage(''); }}>{showForm ? "Annuler" : "Ajouter un élément"}</button>
                </div>

                {message && <p className={message.toLowerCase().includes('erreur') ? 'form-error' : 'form-success'}>{message}</p>}

                {showForm && (
                    <form className='affaires-form' onSubmit={handleSubmit}>
                        <h3>{editingId ? "Modifier l'élément" : "Ajouter un nouvel élément"}</h3>
                        <select className="form-input" value={selectedType} onChange={handleTypeChange} required disabled={!!editingId}><option value="" disabled>-- Sélectionnez un type --</option>{Object.keys(ELEMENT_CONFIG).map(key => (<option key={key} value={key}>{ELEMENT_CONFIG[key].label}</option>))}</select>
                        <div className="form-row">{renderFormFields()}</div>
                        <button className="form-button" type="submit" disabled={!selectedType}>{editingId ? "Mettre à jour" : "Ajouter l'élément"}</button>
                    </form>
                )}

                <h3 style={{ marginTop: '20px' }}>Paramètres des éléments</h3>
                <table className="affaires-table">
                    <thead><tr><th>#</th><th>Type</th><th>Paramètres</th><th>Action</th></tr></thead>
                    <tbody>
                        {elements.map((el, i) => (
                            <tr key={el.id_element}>
                                <td>{i + 1}</td>
                                <td>{ELEMENT_CONFIG[el.type]?.label || el.type}</td>
                                <td>{(() => { const params = Object.entries(el).filter(([k]) => ['longueur', 'angle', 'orientation', 'materiau', 'distance_r', 'type_vc', 'modele'].includes(k) && el[k] != null && el[k] !== ''); if (params.length === 0) return <em style={{ color: '#999' }}>Aucun</em>; return params.map(([k, v]) => <div key={k}><strong>{k.charAt(0).toUpperCase() + k.slice(1)}</strong>: {v}</div>); })()}</td>
                                <td><div className="actions-cell"><div className="action-icons"><FaPencilAlt className="icon-action icon-edit" onClick={() => handleEditClick(el)} /><FaTrash className="icon-action icon-delete" onClick={() => handleDeleteElement(el.id_element)} /></div><button className="btn-small" onClick={() => openAttenuationForm(el, i)}>Atténuation</button>
                                {(el.type === 'grillesoufflage' || el.type === 'vc') && (
                            <button className="btn-small" style={{ marginLeft: '5px' }} onClick={() => openRegenerationForm(el, i)}>
                                Regénération
                            </button>
                        )}
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
                            {BANDES_FREQUENCE.map(freq => (<div className="modal-field" key={freq}><label>{freq}Hz</label><input type="number" value={attenuationValues[freq]} onChange={(e) => setAttenuationValues({ ...attenuationValues, [freq]: e.target.value })} /></div>))}
                            <div className="modal-actions"><button onClick={saveAttenuation}>Enregistrer</button><button onClick={() => setShowAttenuationForm(false)}>Fermer</button></div>
                        </div>
                    </div>
                )}

                {showRegenerationForm && (
                <div className="modal-overlay">
                 <div className="modal">
                   <h3>Saisir la régénération pour l'élément n°{selectedElementOrder}</h3>
                    {BANDES_FREQUENCE.map(freq => (
                        <div className="modal-field" key={freq}>
                        <label>{freq}Hz</label>
                        <input 
                        type="number" 
                        value={regenerationValues[freq]} 
                        onChange={(e) => setRegenerationValues({ ...regenerationValues, [freq]: e.target.value })} 
                    />
                </div>
             ))}
                    <div className="modal-actions">
                        <button onClick={saveRegeneration}>Enregistrer</button>
                        <button onClick={() => setShowRegenerationForm(false)}>Fermer</button>
                    </div>
                </div>
            </div>
        )}


                <h3 style={{ marginTop: '30px' }}>Tableau de synthèse acoustique</h3>
                <table className="affaires-table synthese-table">
                    <thead><tr><th style={{ width: '5%' }}>#</th><th style={{ width: '15%' }}>Type</th><th style={{ width: '20%' }}>Valeurs</th>{BANDES_FREQUENCE.map(freq => <th key={freq}>{freq}Hz</th>)}<th>GLOBAL dBA</th></tr></thead>
                    <tbody>
                           {elements.map((el, i) => {
                    let baseSpectra = SPECTRA_CONFIG[el.type] || [];
                    if (el.type === 'vc') {
                        if (el.type_vc !== 'Soufflage') {
                            baseSpectra = baseSpectra.filter(
                                key => key !== 'lw_sortie_air_neuf' && key !== 'lw_total'
                            );
                        }
                    }
                    const spectraToShow = baseSpectra;
                            const rowSpan = spectraToShow.length > 0 ? spectraToShow.length : 1;
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
                                                        {allSpectra[spectraToShow[0]]?.[el.id_element]?.[freq] ?? '-'}
                                                    </td>
                                                ))}
                                                <td rowSpan={rowSpan}>
                                                {
                                                    (() => {
                                                    // ✅ Choisir le bon spectre selon le type
                                                    let key;

                                                    if (el.type === 'piecetransformation') {
                                                        key = 'lw_entrant';
                                                    } else if (el.type === 'grillesoufflage') {
                                                        key = 'lw_sortie'; // ✅ Utilise le niveau Lw Sortie pour la grille
                                                    } else {
                                                        key = 'lw_resultant';
                                                    }

                                                    const spectre = allSpectra[key]?.[el.id_element];
                                                    return spectre ? calculerGlobalDBA(spectre) : "-";
                                                    })()
                                                }
                                                </td>

                                            </>
                                        ) : (<td colSpan={BANDES_FREQUENCE.length + 1} style={{ textAlign: 'center', color: '#888' }}>Aucun spectre applicable</td>)}
                                    </tr>
                                    {spectraToShow.slice(1).map(spectrumKey => (

                                        <tr key={`${el.id_element}-${spectrumKey}`}>
                                            <td>{SPECTRA_LABELS[spectrumKey]}</td>
                                            {BANDES_FREQUENCE.map(freq => (

                                                <td key={`${spectrumKey}-${freq}`}>
                                                    {allSpectra[spectrumKey]?.[el.id_element]?.[freq] ?? '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                <div className="footer-actions"><button className="btn-secondary" onClick={() => navigate(-1)}>Retour</button></div>
            </div>
        </>
    );
};

export default ElementsReseau;
