import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Inscription.css"; // Utilisez le CSS mis à jour
import logo from './assets/logo.png'; // Importez le logo

function Connexion() {
    const [email, setEmail] = useState("");
    const [motDePasse, setMotDePasse] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/api/connexion", {
                email,
                mot_de_passe: motDePasse
            });

            if (res.data.utilisateur) {
                localStorage.setItem("utilisateur", JSON.stringify(res.data.utilisateur));
                setMessage(res.data.message);
                setIsError(false);
                
                setTimeout(() => {
                  navigate("/affaires");
                }, 500);
            } else {
                setMessage("Réponse inattendue du serveur.");
                setIsError(true);
            }

        } catch (err) {
            setIsError(true);
            if (err.response && err.response.data && err.response.data.message) {
                setMessage(err.response.data.message);
            } else {
                setMessage("Erreur de communication avec le serveur.");
            }
            console.error("Erreur de connexion :", err);
        }
    }
    
    const goToInscription = () => {
        navigate("/inscription");
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
                            className="input"
                            type="email"
                            placeholder="E-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            className="input"
                            type="password"
                            placeholder="Mot de passe"
                            value={motDePasse}
                            onChange={(e) => setMotDePasse(e.target.value)}
                        />
                        <div className="buttons-group">
                            <button className="btn" type="submit">Se connecter</button>
                            <span className="link-text" onClick={goToInscription}>
                                Créer un compte
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

export default Connexion;