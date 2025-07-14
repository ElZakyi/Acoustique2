import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Connexion from './Connexion';
import Inscription from './Inscription';
import AffairesListe from './AffairesListe';
import SallesListe from './SallesListe';
import SourcesSonoresListe from './SourcesSonoresListe'; 
import TronconsListe from './TronconsListe';
import ElementsReseau from './ElementsReseau';
import ResultatsPage from './ResultatsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to ="/connexion"/>}/>
        <Route path="/connexion" element={<Connexion/>}/>
        <Route path="/inscription" element={<Inscription/>}/>
        <Route path="/affaires" element={<AffairesListe />} />
        <Route path="/affaires/:id_affaire/salles" element={<SallesListe />} />
        <Route path="/salles/:id_salle/sources" element={<SourcesSonoresListe />} />
        <Route path="/sources/:id_source/troncons" element={<TronconsListe />} />
        <Route path="/troncons/:id_troncon/:id_source/elements" element={<ElementsReseau />} />
        <Route path="/salles/:id_salle/resultats" element={<ResultatsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
