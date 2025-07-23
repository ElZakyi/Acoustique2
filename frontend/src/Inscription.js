import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Inscription.css"; // Utilisez le CSS mis à jour
import logo from './assets/logo.png'; // Importez le logo

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
            setRole("technicien"); // Réinitialise le rôle par défaut
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                setMessage(err.response.data.message);
            } else {
                setMessage("Erreur lors de la création du compte.");
            }
            setIsError(true);
            console.error(err);
        }
    }

    const goToConnexion = () => {
        navigate("/connexion");
    }

    return (
        <div className="auth-page-wrapper"> {/* Conteneur principal avec l'arrière-plan */}
            <div className="glassmorphism-card"> {/* La carte principale avec le flou */}
                <div className="logo-circle-wrapper"> {/* Conteneur circulaire du logo */}
                    <img src={logo} alt="L.P.E.E Logo" />
                </div>
                <div className="form-panel"> {/* Panneau avec le motto et le formulaire */}
                    <p className="motto">"Simplifiez vos calculs, accélérez vos projets"</p>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            placeholder="E-mail"
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
                            <option value="administrateur">Administrateur</option>
                        </select>

                        <div className="buttons-group">
                            <button type="submit" className="btn">S'inscrire</button>
                            <span className="link-text" onClick={goToConnexion}>
                                Retour à la page de connexion
                            </span>
                        </div>
                    </form>
                    
                    {message && (
                        <p className={isError ? "error" : "success"}>{message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Inscription;