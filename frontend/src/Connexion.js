import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Inscription.css"; // Assurez-vous que ce fichier a les styles .box, .input, .btn

function Connexion() {
    const [email, setEmail] = useState("");
    const [motDePasse, setMotDePasse] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    
    const navigate = useNavigate();

    // ✅ Version fusionnée et propre de la fonction
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/api/connexion", {
                email,
                mot_de_passe: motDePasse
            });

            if (res.data.utilisateur) {
                // On stocke l'objet utilisateur entier pour plus de flexibilité
                localStorage.setItem("utilisateur", JSON.stringify(res.data.utilisateur));

                setMessage(res.data.message);
                setIsError(false);
                
                // Redirection après un court délai pour voir le message de succès
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
        <div className="box">
            <h2 className="title">Connexion</h2>
            <form onSubmit={handleSubmit}>
                <input
                    className="input"
                    type="email"
                    placeholder="Adresse e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    className="input"
                    type="password"
                    placeholder="Mot de passe"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    required
                />
                <div className="buttons">
                    <button className="btn" type="submit">Se connecter</button>
                    <button className="btn" type="button" onClick={goToInscription}>
                        Créer un compte
                    </button>
                </div>
            </form>
            {message && (
                <p className={isError ? "error" : "success"}>{message}</p>
            )}
        </div>
    );
}
export default Connexion;