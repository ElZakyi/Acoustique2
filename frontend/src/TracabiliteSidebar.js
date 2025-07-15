// frontend/src/TracabiliteSidebar.js

import React, { useState } from 'react';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa'; // Ensure react-icons is installed

const TracabiliteSidebar = ({ data, isVisible, onClose }) => {
  const [expandedSections, setExpandedSections] = useState({});

  if (!data || data.length === 0) {
    return (
      <div className={`tracabilite-sidebar ${isVisible ? 'is-visible' : ''}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">Traçabilité</h3>
          <button className="sidebar-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="tracabilite-content">
          <p className="no-tracabilite-data">Aucune donnée de traçabilité disponible pour cette salle.</p>
        </div>
      </div>
    );
  }

  const toggleExpand = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Process data into a hierarchical structure for easier rendering
  const groupedData = data.reduce((acc, row) => {
    const affaireKey = `affaire-${row.id_affaire}`;
    const salleKey = `${affaireKey}-salle-${row.id_salle}`;
    const sourceKey = `${salleKey}-source-${row.id_source}`;
    const tronconKey = `${sourceKey}-troncon-${row.id_troncon}`;

    if (!acc[affaireKey]) {
      acc[affaireKey] = {
        id: row.id_affaire,
        name: row.numero_affaire,
        obj: row.objet,
        salles: {},
      };
    }
    if (!acc[affaireKey].salles[salleKey]) {
      acc[affaireKey].salles[salleKey] = {
        id: row.id_salle,
        name: row.nom_salle,
        sources: {},
      };
    }
    if (!acc[affaireKey].salles[salleKey].sources[sourceKey]) {
      acc[affaireKey].salles[salleKey].sources[sourceKey] = {
        id: row.id_source,
        name: row.nom_source,
        type: row.type_source,
        troncons: {},
      };
    }
    if (!acc[affaireKey].salles[salleKey].sources[sourceKey].troncons[tronconKey]) {
      acc[affaireKey].salles[salleKey].sources[sourceKey].troncons[tronconKey] = {
        id: row.id_troncon,
        forme: row.forme,
        elements: new Set(),
      };
    }
    // Corrected line: use 'acc' for direct modification during reduction
    acc[affaireKey].salles[salleKey].sources[sourceKey].troncons[tronconKey].elements.add(row.type_element);
    
    return acc;
  }, {});


  // Helper function to render Elements (lowest level)
  const renderElements = (elements, parentKey) => {
    const sortedElements = Array.from(elements).sort(); 
    return (
      <ul className="tracabilite-list">
        {sortedElements.map((el, idx) => (
          <li key={`${parentKey}-el-${idx}`} className="tracabilite-item tracabilite-item-last-level">
            <span className="tracabilite-text-content">
              <span className="tracabilite-item-label">Élément:</span> {el}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  // Helper function to render Tronçons (contain Elements)
  const renderTroncons = (tronconsMap, parentKey) => {
    return (
      <ul className="tracabilite-list">
        {Object.entries(tronconsMap).map(([tronconKey, troncon]) => {
          const isExpanded = !!expandedSections[tronconKey];
          return (
            <li key={tronconKey} className="tracabilite-item tracabilite-level-3" onClick={() => toggleExpand(tronconKey)}>
              <span className="tracabilite-toggle-icon">
                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
              </span>
              <span className="tracabilite-text-content">
                <span className="tracabilite-item-label">Tronçon:</span> {troncon.forme}
              </span>
              {isExpanded && renderElements(troncon.elements, tronconKey)}
            </li>
          );
        })}
      </ul>
    );
  };

  // Helper function to render Sources (contain Tronçons)
  const renderSources = (sourcesMap, parentKey) => {
    return (
      <ul className="tracabilite-list">
        {Object.entries(sourcesMap).map(([sourceKey, source]) => {
          const isExpanded = !!expandedSections[sourceKey];
          return (
            <li key={sourceKey} className="tracabilite-item tracabilite-level-2" onClick={() => toggleExpand(sourceKey)}>
              <span className="tracabilite-toggle-icon">
                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
              </span>
              <span className="tracabilite-text-content">
                <span className="tracabilite-item-label">Source:</span> {source.name} ({source.type})
              </span>
              {isExpanded && renderTroncons(source.troncons, sourceKey)}
            </li>
          );
        })}
      </ul>
    );
  };

  // Helper function to render Salles (contain Sources)
  const renderSalles = (sallesMap, parentKey) => {
    return (
      <ul className="tracabilite-list">
        {Object.entries(sallesMap).map(([salleKey, salle]) => {
          const isExpanded = !!expandedSections[salleKey];
          return (
            <li key={salleKey} className="tracabilite-item tracabilite-level-1" onClick={() => toggleExpand(salleKey)}>
              <span className="tracabilite-toggle-icon">
                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
              </span>
              <span className="tracabilite-text-content">
                <span className="tracabilite-item-label">Salle:</span> {salle.name}
              </span>
              {isExpanded && renderSources(salle.sources, salleKey)}
            </li>
          );
        })}
      </ul>
    );
  };

  // Main rendering of the sidebar
  return (
    <div className={`tracabilite-sidebar ${isVisible ? 'is-visible' : ''}`}>
      <div className="sidebar-header">
        <h3 className="sidebar-title">Traçabilité</h3>
        <button className="sidebar-close-btn" onClick={onClose}>×</button>
      </div>
      <div className="tracabilite-content">
        {Object.entries(groupedData).map(([affaireKey, affaire]) => {
          const isExpanded = !!expandedSections[affaireKey];
          return (
            <div key={affaireKey} className="tracabilite-item tracabilite-level-0" onClick={() => toggleExpand(affaireKey)}>
              <span className="tracabilite-toggle-icon">
                  {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
              </span>
              <span className="tracabilite-text-content">
                <span className="tracabilite-item-label">Affaire:</span> {affaire.name} ({affaire.obj})
              </span>
              {isExpanded && renderSalles(affaire.salles, affaireKey)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TracabiliteSidebar;