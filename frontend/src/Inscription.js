import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Inscription.css";

function Inscription() {
    const [email, setEmail] = useState("");
    const [motDePasse, setMotDePasse] = useState("");
    const [role, setRole] = useState("technicien"); 
    
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const navigate = useNavigate();

    
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            
            const res = await axios.post("http://localhost:5000/api/utilisateurs", {
                email,
                mot_de_passe: motDePasse,
                role: role 
            });
            setMessage(res.data.message);
            setIsError(false);
            
            setEmail("");
            setMotDePasse("");
            setRole("technicien");
        } catch (err) {
            // Gestion des erreurs renvoyées par le backend
            if (err.response && err.response.data && err.response.data.message) {
                setMessage(err.response.data.message);
            } else {
                setMessage("Erreur lors de la création du compte.");
            }
            setIsError(true);
            console.error(err);
        }
    }

    // Fonction pour naviguer vers la page de connexion
    const goToConnexion = () => {
        navigate("/connexion");
    }

    return (
        <div className="box">
            <h2 className="title">Créer un Compte</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Adresse e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                />
                <input
                    type="password"
                    placeholder="Mot de passe"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    className="input"
                />
                
                
                <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="input"
                >
                    <option value="technicien">Technicien</option>
                    <option value="administrateur">Administrateur</option>
                </select>

                <div className="buttons">
                    <button type="submit" className="btn">S'inscrire</button>
                    <button type="button" onClick={goToConnexion} className="btn">Se connecter</button>
                </div>
            </form>
            
            {message && (
                <p className={isError ? "error" : "success"}>{message}</p>
            )}
        </div>
    );
}

export default Inscription;


