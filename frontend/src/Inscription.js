import React,{useState} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Inscription.css";

function Inscription(){
    const [nom,setNom] = useState("");
    const [motDePasse,setMotDePasse] = useState("");
    const [message,setMessage] = useState("");
    const [isError,setIsError] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async(e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/api/utilisateurs", {
                nom ,
                mot_de_passe : motDePasse
            });
            setMessage(res.data.message);
            setIsError(false);
            setNom("");
            setMotDePasse("");
        }catch(err){
            if(err.response && err.response.data && err.response.data.message){
                setMessage(err.response.data.message);
            }
            else {
                setMessage("erreur lors de la creation du compte");
            }
            setIsError(true);
            console.error(err);
        }
    }

    const goToConnexion = () => {
        navigate("/connexion");
    }

    return (
    <div className="box">
      <h2 className="title">Créer un Compte</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nom Utilisateur"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="input"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="input"
        />
        <div className="buttons">
          <button type="submit" className="btn">S'inscrire</button>
          <button type="button" onClick={goToConnexion} className="btn">Se connecter</button>
        </div>
      </form>
      <p className={isError ? "error" : "success"}>{message}</p>
    </div>
  );
}
export default Inscription;