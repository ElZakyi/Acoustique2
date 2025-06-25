const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const port = 5000;

// 🔥 Middleware pour JSON & CORS
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// 🔌 Connexion à MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'acoustique_db'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Erreur de connexion MySQL :', err.message);
    } else {
        console.log('✅ Connecté à la base de données MySQL');
    }
});

// =================================================================
// AUTHENTIFICATION
// =================================================================

// Route POST pour l’inscription (Avec la gestion du rôle)
app.post("/api/utilisateurs", (req, res) => {
    const { email, mot_de_passe, role } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !mot_de_passe || !role) {
        return res.status(400).json({ message: "Tous les champs (email, mot de passe, rôle) sont requis." });
    }
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Format d'adresse e-mail invalide." });
    }
    if (role !== 'technicien' && role !== 'administrateur') {
        return res.status(400).json({ message: "Le rôle fourni est invalide." });
    }
    const checkSql = "SELECT * FROM utilisateur WHERE email = ?";
    db.query(checkSql, [email], (err, results) => {
        if (err) {
            console.error("Erreur lors de la vérification de l'email :", err);
            return res.status(500).json({ message: "Erreur Serveur" });
        }
        if (results.length > 0) {
            return res.status(409).json({ message: "Cet email est déjà utilisé !" });
        }
        const sql = "INSERT INTO utilisateur (email, mot_de_passe, role) VALUES (?, ?, ?)";
        db.query(sql, [email, mot_de_passe, role], (err, result) => {
            if (err) {
                console.error("Erreur lors de l'inscription :", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }
            return res.status(201).json({ message: "Utilisateur créé avec succès !" });
        });
    });
});

// Route POST pour la connexion
app.post("/api/connexion", (req, res) => {
    const { email, mot_de_passe } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !mot_de_passe) {
        return res.status(400).json({ message: "Champs manquants" });
    }
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Format d'adresse e-mail invalide." });
    }
    const sql = "SELECT * FROM utilisateur WHERE email = ? AND mot_de_passe = ? ";
    db.query(sql, [email, mot_de_passe], (err, results) => {
        if (err) {
            console.error("Erreur lors de la connexion : ", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        if (results.length > 0) {
            return res.status(200).json({ message: "Connexion réussie", utilisateur: results[0] });
        } else {
            return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }
    });
});

// =================================================================
// GESTION DES AFFAIRES
// =================================================================

// Récupération de toutes les affaires
app.get("/api/affaires", (req, res) => {
    const sql = "SELECT * FROM affaire";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Erreur lors de la récupération des affaires : ", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        return res.status(200).json(result);
    });
});

// ✅ Créer une nouvelle affaire (Version fusionnée)
app.post('/api/affaires', (req, res) => {
    // On récupère toutes les données, y compris l'id_utilisateur de votre binôme
    const { objet, client, responsable, numero_affaire, observation, id_utilisateur } = req.body;
    
    // On valide les champs importants
    if (!objet || !client || !numero_affaire || !id_utilisateur) {
        return res.status(400).json({ message: "Les champs 'objet', 'client', 'numero_affaire' et 'id_utilisateur' sont obligatoires." });
    }

    // La requête SQL inclut la colonne id_utilisateur
    const sql = "INSERT INTO affaire (objet, client, responsable, numero_affaire, observation, id_utilisateur) VALUES (?, ?, ?, ?, ?, ?)";
    
    const values = [objet, client, responsable, numero_affaire, observation, id_utilisateur];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur lors de la création de l'affaire :", err);
            return res.status(500).json({ message: "Erreur serveur lors de la création de l'affaire." });
        }
        res.status(201).json({
            message: "Affaire créée avec succès !",
            id_affaire: result.insertId,
            ...req.body
        });
    });
});

// ✅ Supprimer une affaire par ID (Votre version avec la cascade manuelle)
app.delete('/api/affaires/:id', (req, res) => {
    const { id } = req.params;
    db.beginTransaction(err => {
        if (err) {
            console.error("Erreur de transaction :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        const deleteSallesSql = "DELETE FROM salle WHERE id_affaire = ?";
        db.query(deleteSallesSql, [id], (errSalles) => {
            if (errSalles) {
                return db.rollback(() => {
                    console.error("Erreur lors de la suppression des salles :", errSalles);
                    res.status(500).json({ message: "Erreur lors de la suppression des salles associées." });
                });
            }
            const deleteAffaireSql = "DELETE FROM affaire WHERE id_affaire = ?";
            db.query(deleteAffaireSql, [id], (errAffaire, resultAffaire) => {
                if (errAffaire) {
                    return db.rollback(() => {
                        console.error("Erreur lors de la suppression de l'affaire :", errAffaire);
                        res.status(500).json({ message: "Erreur lors de la suppression de l'affaire." });
                    });
                }
                if (resultAffaire.affectedRows === 0) {
                    return db.rollback(() => res.status(404).json({ message: "Affaire non trouvée." }));
                }
                db.commit(errCommit => {
                    if (errCommit) {
                        return db.rollback(() => {
                            console.error("Erreur lors du commit :", errCommit);
                            res.status(500).json({ message: "Erreur lors de la validation." });
                        });
                    }
                    res.status(200).json({ message: "Affaire et ses salles ont été supprimées." });
                });
            });
        });
    });
});

// Mettre à jour une affaire par ID
app.put('/api/affaires/:id', (req, res) => {
    const { id } = req.params;
    // On inclut id_utilisateur pour être complet, même si on ne le modifie pas souvent ici
    const { objet, client, responsable, numero_affaire, observation, id_utilisateur } = req.body;
    const sql = "UPDATE affaire SET objet = ?, client = ?, responsable = ?, numero_affaire = ?, observation = ?, id_utilisateur = ? WHERE id_affaire = ?";
    db.query(sql, [objet, client, responsable, numero_affaire, observation, id_utilisateur, id], (err, result) => {
        if (err) {
            console.error("Erreur lors de la modification de l'affaire : ", err);
            return res.status(500).json({ message: "Erreur serveur lors de la mise à jour" });
        }
        return res.status(200).json({ message: "Affaire modifiée avec succès !" });
    });
});

// =================================================================
// GESTION DES SALLES
// =================================================================
// ... (Le reste du fichier est identique et sans conflit)

// Liste des salles d'une affaire spécifique
app.get('/api/affaires/:id_affaire/salles', (req, res) => {
    const { id_affaire } = req.params;
    const sql = "SELECT * FROM salle WHERE id_affaire = ?";
    db.query(sql, [id_affaire], (err, result) => {
        if (err) {
            console.error("Erreur lors de la récupération des salles :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        return res.status(200).json(result);
    });
});

// Insérer une salle dans une affaire
app.post('/api/affaires/:id_affaire/salles', (req, res) => {
    const { id_affaire } = req.params;
    const { longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, surface_totale } = req.body;
    if (!longueur || !largeur || !hauteur || !tr) {
        return res.status(400).json({ message: "Tous les champs dimensionnels et le TR sont obligatoires." });
    }
    const sql = `INSERT INTO salle (longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, id_affaire, surface_totale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, id_affaire, surface_totale];
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur lors de l'insertion de la salle :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        res.status(201).json({ message: "Salle insérée avec succès !", id_salle: result.insertId });
    });
});

// =================================================================
// DÉMARRAGE DU SERVEUR
// =================================================================

app.listen(port, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});