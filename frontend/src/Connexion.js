import React,{useState} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Connexion() {
    const [nom,setNom] = useState("");
    const [motDePasse,setMotDePasse] = useState("");
    const [message,setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    
    const navigate = useNavigate();

    const handleSubmit = async(e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/api/connexion",{
                nom,
                mot_de_passe : motDePasse
            });
            setNom("");
            setMotDePasse("");
            setMessage(res.data.message);
            setIsError(false);
 //Updated upstream
            // ✅ Redirection après 500ms si connexion réussie
            setTimeout(() => {
              navigate("/affaires");
            }, 500);

            navigate('/affaires');
// Stashed changes

        }catch(err){
            setIsError(true);
            if(err.response && err.response.data && err.response.data.message){
                setMessage(err.response.data.message);
            }
            else {
                setMessage("Erreur lors de la connexion a l'API ");
            }
            console.error(err);
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
          type="text"
          placeholder="Nom d'utilisateur"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
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