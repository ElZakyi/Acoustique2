import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Connexion from './Connexion';
import Inscription from './Inscription';
import AffairesListe from './AffairesListe';
import SallesListe from './SallesListe';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to ="/connexion"/>}/>
        <Route path="/connexion" element={<Connexion/>}/>
        <Route path="/inscription" element={<Inscription/>}/>
        <Route path="/affaires" element={<AffairesListe />} />
        <Route path="/affaires/:id_affaire/salles" element={<SallesListe />} />
      </Routes>
    </Router>
  );
}

export default App;
