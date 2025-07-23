import React, { useState,useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Inscription.css";
import logo from './assets/logo.png';

function Connexion() {
    const [email, setEmail] = useState("");
    const [motDePasse, setMotDePasse] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    
    const navigate = useNavigate();
    const [aucunUtilisateur, setAucunUtilisateur] = useState(false);
    //checkc si y'a un utilisateur inscrit dans la base donnée 
    useEffect(() => {
        const verifierUtilisateurs = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/utilisateurs/exist");
                if (!res.data.existe) {
                    setAucunUtilisateur(true);
                }
            } catch (error) {
                console.error("Erreur lors de la vérification des utilisateurs :", error);
            }
        };
        verifierUtilisateurs();
    }, []);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setIsError(false);

        try {
            const res = await axios.post("http://localhost:5000/api/connexion", {
                email,
                mot_de_passe: motDePasse
            });

            if (res.data.utilisateur) {
                localStorage.setItem("utilisateur", JSON.stringify(res.data.utilisateur));
                setMessage(res.data.message);
                setIsError(false);
                
                // Redirige vers la page des affaires après une connexion réussie
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
    

    return (
        <div className="auth-page-wrapper">
            <div className="glassmorphism-card">
                <div className="logo-circle-wrapper">
                    <img src={logo} alt="L.P.E.E Logo" />
                </div>
                <div className="form-panel">
                    <p className="motto">"Simplifiez vos calculs, accélérez vos projets"</p>
                    {aucunUtilisateur && (
                        <p className="info-message">
                            Aucun utilisateur enregistré. Un compte sera créé automatiquement lors de votre connexion.
                        </p>
                    )}
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