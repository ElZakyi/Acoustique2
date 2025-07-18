import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import './AffairesListe.css';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';

//Imports pour React DnD
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import update from 'immutability-helper';

// CONFIGURATIONS 
const ELEMENT_CONFIG = {
    silencieux: { label: 'Silencieux', fields: [] },
    conduit: { label: 'Conduit', fields: [{ name: 'longueur', label: 'Longueur (m)', type: 'number' }, { name: 'materiau', label: 'Matériau', type: 'text' }] },
    coude: { label: 'Coude', fields: [{ name: 'angle', label: 'Angle (°)', type: 'number' }, { name: 'orientation', label: 'Orientation', type: 'text' }, { name: 'materiau', label: 'Matériau', type: 'text' }] },
    piecetransformation: { label: 'Pièce de transformation', fields: [] },
    grillesoufflage: { label: 'Grille de soufflage', fields: [{ name: 'distance_r', label: 'Distance R (m)', type: 'number' }] },
    plenum: { label: 'Plenum', fields: [] },
    vc: { label: 'VC CRSL-ECM 2', fields: [{ name: 'type_vc', label: 'Type VC', type: 'select', options: ['Soufflage', 'Reprise'] },{ name: 'distance_r', label: 'Distance R (m)', type: 'number' } ] }
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

// Type d'élément draggable
const ItemTypes = {
  ELEMENT: 'element',
};

//Composant DraggableElementRow (Keep as is)
const DraggableElementRow = ({
    element,
    index,
    moveElement,
    handleEditClick,
    handleDeleteElement,
    openAttenuationForm,
    openRegenerationForm,
    ELEMENT_CONFIG,
    SPECTRA_CONFIG,
    SPECTRA_LABELS,
    BANDES_FREQUENCE,
    allSpectra,
    calculerGlobalDBA,
}) => {
    const ref = useRef(null);

    //pour rendre la ligne une cible de dépôt
    const [{ handlerId, isOver }, drop] = useDrop({
        accept: ItemTypes.ELEMENT,
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
                isOver: monitor.isOver(),
            };
        },
        hover(item, monitor) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) {
                return;
            }

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            // Glisser vers le bas
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }
            // Glisser vers le haut
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }
            moveElement(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    //rendre la ligne draggable
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.ELEMENT,
        item: () => {
            return { id: element.id_element, index };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    //gestion des classes CSS
    const className = `
        ${isDragging ? 'is-dragging' : ''}
        ${isOver ? 'is-over' : ''}
    `.trim();
    drag(drop(ref));
    const params = Object.entries(element).filter(([k]) => ['longueur', 'angle', 'orientation', 'materiau', 'distance_r', 'type_vc', 'modele'].includes(k) && element[k] != null && element[k] !== '');

    return (
        <tr ref={ref} className={className} style={{ opacity: isDragging ? 0 : 1 }} data-handler-id={handlerId}>
            <td>{index + 1}</td>
            <td>{ELEMENT_CONFIG[element.type]?.label || element.type}</td>
            <td>
                {params.length === 0 ? (
                    <em style={{ color: '#999' }}>Aucun</em>
                ) : (
                    params.map(([k, v]) => (
                        <div key={k}>
                            <strong>{k.charAt(0).toUpperCase() + k.slice(1)}</strong>: {v}
                        </div>
                    ))
                )}
            </td>
            <td>
                <div className="actions-cell">
                    <div className="action-icons">
                        <FaPencilAlt className="icon-action icon-edit" onClick={() => handleEditClick(element)} />
                        <FaTrash className="icon-action icon-delete" onClick={() => handleDeleteElement(element.id_element)} />
                    </div>
                    <button className="btn-small" onClick={() => openAttenuationForm(element, index)}>Atténuation</button>
                    {(element.type === 'grillesoufflage' || element.type === 'vc') && (
                        <button className="btn-small" style={{ marginLeft: '5px' }} onClick={() => openRegenerationForm(element, index)}>
                            Regénération
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};


//Composant principal ElementsReseau
const ElementsReseau = () => {
    const { id_source } = useParams();
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
    const saveOrderDebounceRef = useRef(null);

    // logique de chargement de toutes les données
    const loadAllData = useCallback(async () => {
        if (!localStorage.getItem("utilisateur")) {
            navigate('/connexion');
            return;
        }

        try {
            //console.log("--- DÉBUT DU CHARGEMENT GLOBAL DES DONNÉES ---");
            const [elementsRes,attenuationsRes,regenerationsRes,attTronconRes,ordreTronconRes,lpRes,lwTotalRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/troncons/${id_troncon}/elements`),
                axios.get('http://localhost:5000/api/attenuations'),
                axios.get('http://localhost:5000/api/regenerations'),
                axios.get('http://localhost:5000/api/attenuationtroncons'),
                axios.get(`http://localhost:5000/api/troncons/${id_troncon}/ordre`),
                axios.get('http://localhost:5000/api/niveaux_lp'),
                axios.get('http://localhost:5000/api/lw_total'),
            ]);

            const fetchedElements = elementsRes.data;
            setElements(fetchedElements);
            setOrdreTroncon(ordreTronconRes.data.ordre_troncon);

            let calculsDeChainage = [];
            if (fetchedElements.length > 0) {
                const calculsRes = await axios.get(`http://localhost:5000/api/lwresultants/troncon/${id_troncon}`);
                calculsDeChainage = calculsRes.data;
            }

            // Chargement conditionnel de lw_sortie_air_neuf
            let lwSortieAirNeufData = {};
            if (id_source) {
                try {
                     const lwSortieAirNeufRes = await axios.get(`http://localhost:5000/api/lw_sortie_air_neuf/${id_source}`);
                     lwSortieAirNeufData = lwSortieAirNeufRes.data;
                } catch (error) {
                    console.warn("Impossible de charger le spectre d'air neuf pour cette source.", error);
                    lwSortieAirNeufData = {};
                }
            }


            const finalSpectra = {
                attenuation: attenuationsRes.data,
                regeneration: regenerationsRes.data,
                attenuation_troncon: attTronconRes.data,
                lp: lpRes.data,
                lw_total: lwTotalRes.data,
                lw_sortie_air_neuf: lwSortieAirNeufData,
                lw_resultant: {},
                lw_entrant: {},
                lw_sortie: {}
            };
            calculsDeChainage.forEach(item => {
                if (item.lw_resultant) finalSpectra.lw_resultant[item.id_element] = item.lw_resultant;
                if (item.lwEntrant) finalSpectra.lw_entrant[item.id_element] = item.lwEntrant;
                if (item.lw_sortie) finalSpectra.lw_sortie[item.id_element] = item.lw_sortie;
            });
            console.log(" Spectre lw_sortie_air_neuf chargé :", finalSpectra.lw_sortie_air_neuf);
            setAllSpectra(finalSpectra);
            //console.log("--- CHARGEMENT COMPLET ---", finalSpectra);

        } catch (error) {
            console.error("Une erreur est survenue lors du chargement des données:", error);
            setMessage("Erreur de chargement des données. Vérifiez la console.");
        }
    }, [id_troncon, id_source, navigate]);

    useEffect(() => {
        loadAllData();
        // Nettoyage au démontage du composant pour annuler le dernier debounce si nécessaire
        return () => {
            if (saveOrderDebounceRef.current) {
                clearTimeout(saveOrderDebounceRef.current);
            }
        };
    }, [loadAllData]);

    const enregistrerGlobalDbaLp = async (id_element, global_dba_lp) => {
        try {
            await axios.post('http://localhost:5000/api/lp-dba', { id_element, global_dba_lp });
            console.log(`✅ Global DBA Lp enregistré pour l’élément ${id_element}`);
        } catch (err) {
            console.error('❌ Erreur lors de l’enregistrement du Global DBA Lp', err);
        }
    };

    useEffect(() => {
        elements.forEach((el) => {
            const lpSpectre = allSpectra.lp?.[el.id_element];
            if (lpSpectre) {
                const globalDBA_LP = calculerGlobalDBA(lpSpectre);
                if (globalDBA_LP !== '-' && globalDBA_LP !== null) {
                    enregistrerGlobalDbaLp(el.id_element, globalDBA_LP);
                }
            }
        });
    }, [elements, allSpectra.lp]);


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
            await loadAllData(); 
        } catch (err) { setMessage(err.response?.data?.message || "Une erreur est survenue."); }
    };

    const handleDeleteElement = async (id_element) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/elements/${id_element}`);
            setMessage("Élément supprimé avec succès.");
            await loadAllData(); 
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
            await loadAllData();
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
            await loadAllData();
            setShowRegenerationForm(false);
        } catch (error) {
            console.error("Erreur sauvegarde régénération:", error);
            setMessage("Erreur lors de la sauvegarde de la régénération.");
        }
    };

    const calculerGlobalDBA = (spectre) => {
        const bandes = ['63', '125', '250', '500', '1000', '2000', '4000'];
        const pondA = { 63: -26.2, 125: -16.1, 250: -8.6, 500: -3.2, 1000: 0, 2000: 1.2, 4000: 1 };
        let somme = 0;
        for (const bande of bandes) {
            const val = spectre?.[bande];
            if (val !== undefined && val !== null && !isNaN(val)) {
                somme += Math.pow(10, (val + pondA[bande]) / 10);
            }
        }
        return somme > 0 ? (10 * Math.log10(somme)).toFixed(2) : "-";
    };

    // Fonction pour sauvegarder le nouvel ordre, elle prend les éléments actuels en argument
    const executeSaveOrder = useCallback(async (currentElements) => {
        const newOrder = currentElements.map((element, index) => ({
            id_element: element.id_element,
            ordre: index,
        }));

        try {
            await axios.put(`http://localhost:5000/api/troncons/${id_troncon}/elements/reorder`, newOrder);
            setMessage("Ordre des éléments mis à jour avec succès !");
        } catch (err) {
            console.error("Erreur lors de la sauvegarde du nouvel ordre :", err);
            setMessage("Erreur lors de la sauvegarde du nouvel ordre.");
        }
    }, [id_troncon]); 

    const moveElement = useCallback((dragIndex, hoverIndex) => {
        setElements((prevElements) => {
            const newElements = update(prevElements, {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, prevElements[dragIndex]],
                ],
            });

            if (saveOrderDebounceRef.current) {
                clearTimeout(saveOrderDebounceRef.current);
            }
            saveOrderDebounceRef.current = setTimeout(() => {
                executeSaveOrder(newElements); 
            }, 500);

            return newElements; // Retourne le nouvel état
        });
    }, [executeSaveOrder]); 
    /*
    const debouncedSaveNewOrderRef = useRef();

    useEffect(() => {
        if (debouncedSaveNewOrderRef.current) {
            clearTimeout(debouncedSaveNewOrderRef.current);
        }
        debouncedSaveNewOrderRef.current = setTimeout(() => {
            if (elements.length > 0) {
                saveNewOrder();
            }
        }, 500);

        return () => {
            if (debouncedSaveNewOrderRef.current) {
                clearTimeout(debouncedSaveNewOrderRef.current);
            }
        };
    }, [elements, saveNewOrder]);
    */

    //AFFICHAGE
    return (
        //activer le glisser-déposer
        <DndProvider backend={HTML5Backend}>
            <div className="logout-global"><button className="btn-logout" onClick={handleLogout}>Déconnexion</button></div>
            <div className="container-box">
                <div className="page-header">
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

                {/* Tableau des paramètres des éléments- D&D appliqué */}
                <h3 style={{ marginTop: '20px' }}>Paramètres des éléments</h3>
                <div className="table-wrapper">
                <table className="affaires-table">
                    <thead><tr><th>#</th><th>Type</th><th>Paramètres</th><th>Action</th></tr></thead>
                    <tbody>
                        {elements.map((el, i) => (
                            <DraggableElementRow
                                key={el.id_element}
                                element={el}
                                index={i}
                                moveElement={moveElement}
                                handleEditClick={handleEditClick}
                                handleDeleteElement={handleDeleteElement}
                                openAttenuationForm={openAttenuationForm}
                                openRegenerationForm={openRegenerationForm}
                                ELEMENT_CONFIG={ELEMENT_CONFIG}
                                SPECTRA_CONFIG={SPECTRA_CONFIG}
                                SPECTRA_LABELS={SPECTRA_LABELS}
                                BANDES_FREQUENCE={BANDES_FREQUENCE}
                                allSpectra={allSpectra}
                                calculerGlobalDBA={calculerGlobalDBA}
                            />
                        ))}
                    </tbody>
                </table>
                </div>

                {/*pour l'atténuation et la régénération */}
                {showAttenuationForm && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h3>Saisir les atténuations pour l'élément n°{selectedElementOrder}</h3>
                            {BANDES_FREQUENCE.map(freq => (
                                <div className="modal-field" key={freq}>
                                    <label>{freq}Hz</label>
                                    <input
                                        type="number"
                                        value={attenuationValues[freq]}
                                        onChange={(e) => setAttenuationValues({ ...attenuationValues, [freq]: e.target.value })}
                                        className="form-input" 
                                    />
                                </div>
                            ))}
                            <div className="modal-actions">
                                <button onClick={saveAttenuation} className="btn-primary">Enregistrer</button>
                                <button onClick={() => setShowAttenuationForm(false)} className="btn-secondary">Fermer</button>
                            </div>
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
                                        className="form-input" // 🎯 AJOUTÉ : Pour le style de l'input
                                    />
                                </div>
                            ))}
                            <div className="modal-actions">
                                <button onClick={saveRegeneration} className="btn-primary">Enregistrer</button> {/* 🎯 AJOUTÉ : Pour le style du bouton */}
                                <button onClick={() => setShowRegenerationForm(false)} className="btn-secondary">Fermer</button> {/* 🎯 AJOUTÉ : Pour le style du bouton */}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tableau de synthèse acoustique*/}
                <h3 className="section-heading">Tableau de synthèse acoustique</h3>
                <div className="table-wrapper">
                <table className="affaires-table synthese-table">
                    <thead><tr><th style={{ width: '5%' }}>#</th><th style={{ width: '15%' }}>Type</th><th style={{ width: '20%' }}>Valeurs</th>{BANDES_FREQUENCE.map(freq => <th key={freq}>{freq}Hz</th>)}<th>GLOBAL dBA</th></tr></thead>
                    <tbody>
                    {elements.map((el, i) => {
                        let baseSpectra = SPECTRA_CONFIG[el.type] || [];

                        if (el.type === 'vc' && el.type_vc !== 'Soufflage') {
                        baseSpectra = baseSpectra.filter(
                            key => key !== 'lw_sortie_air_neuf' && key !== 'lw_total'
                        );
                        }

                        const spectraToShow = baseSpectra;
                        const rowSpan = spectraToShow.length > 0 ? spectraToShow.length : 1;

                        return (
                        <React.Fragment key={`synth-${el.id_element}`}>
                            <tr>
                            <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>{i + 1}</td>
                            <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>{ELEMENT_CONFIG[el.type]?.label || el.type}</td>

                            <td>{SPECTRA_LABELS[spectraToShow[0]]}</td>
                            {BANDES_FREQUENCE.map(freq => {
                                const key = spectraToShow[0];
                                const value = allSpectra[key]?.[el.id_element]?.[freq];
                                return <td key={freq}>{value ?? '-'}</td>;
                            })}

                            <td rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>
                                {
                                (() => {
                                    let key = null;
                                    if (el.type === 'piecetransformation') key = 'lw_entrant';
                                    else if (el.type === 'grillesoufflage') key = 'lw_sortie';
                                    else if (el.type === 'vc') key = 'lw_sortie';

                                    if (el.type === 'vc' && el.type_vc === 'Soufflage') {
                                        key = 'lw_total';
                                    } else if (el.type !== 'piecetransformation' && el.type !== 'grillesoufflage' && el.type !== 'vc') {
                                        key = 'lw_resultant';
                                    }

                                    const spectre = allSpectra[key]?.[el.id_element];
                                    return spectre ? calculerGlobalDBA(spectre) : "-";
                                })()
                                }
                            </td>
                            </tr>

                            {spectraToShow.slice(1).map((spectrumKey) => {
                            const data = allSpectra[spectrumKey];
                            const isLp = spectrumKey === 'lp';
                            const spectre = data?.[el.id_element];
                            const globalDBA_LP = isLp ? calculerGlobalDBA(spectre) : null;

                            return (
                                <tr key={`${el.id_element}-${spectrumKey}`}>
                                <td>{SPECTRA_LABELS[spectrumKey]}</td>
                                {BANDES_FREQUENCE.map(freq => {
                                    if (spectrumKey === 'lw_sortie_air_neuf') {
                                    const firstIdElementInAirNeuf = Object.keys(data || {})[0];
                                    return <td key={`${spectrumKey}-${freq}`}>{data?.[firstIdElementInAirNeuf]?.[freq] ?? '-'}</td>;
                                    }
                                    return <td key={`${spectrumKey}-${freq}`}>{spectre?.[freq] ?? '-'}</td>;
                                })}

                                {isLp && <td>{globalDBA_LP}</td>}
                                </tr>
                            );
                            })}
                        </React.Fragment>
                        );
                    })}
                    </tbody>

                </table>
                </div>

                <div className="footer-actions"><button className="btn-secondary" onClick={() => navigate(-1)}>Retour</button></div>
            </div>
        </DndProvider>
    );
};

export default ElementsReseau;