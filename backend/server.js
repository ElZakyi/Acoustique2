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

app.post("/api/utilisateurs", (req, res) => {
    const { email, mot_de_passe, role } = req.body;
    if (!email || !mot_de_passe || !role) {
        return res.status(400).json({ message: "Tous les champs (email, mot de passe, rôle) sont requis." });
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

app.post("/api/connexion", (req, res) => {
    const { email, mot_de_passe } = req.body;
    if (!email || !mot_de_passe) {
        return res.status(400).json({ message: "Champs manquants" });
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

app.get("/api/affaires", (req, res) => {
    const { id_utilisateur, role } = req.query;
    if (!id_utilisateur || !role) {
        return res.status(400).json({ message: "ID utilisateur et rôle sont requis pour accéder aux données." });
    }
    let sql;
    let params = [];
    if (role === 'administrateur') {
        sql = "SELECT * FROM affaire";
    } else if (role === 'technicien') {
        sql = "SELECT * FROM affaire WHERE id_utilisateur = ?";
        params.push(id_utilisateur);
    } else {
        return res.status(403).json({ message: "Rôle non autorisé." });
    }
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Erreur lors de la récupération des affaires : ", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        return res.status(200).json(result);
    });
});

app.post('/api/affaires', (req, res) => {
    const { objet, client, responsable, numero_affaire, observation, id_utilisateur } = req.body;
    if (!objet || !client || !numero_affaire || !id_utilisateur) {
        return res.status(400).json({ message: "Les champs 'objet', 'client', 'numero_affaire' et 'id_utilisateur' sont obligatoires." });
    }
    const sql = "INSERT INTO affaire (objet, client, responsable, numero_affaire, observation, id_utilisateur) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [objet, client, responsable, numero_affaire, observation, id_utilisateur];
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur lors de la création de l'affaire :", err);
            return res.status(500).json({ message: "Erreur serveur lors de la création de l'affaire." });
        }
        res.status(201).json({ message: "Affaire créée avec succès !", id_affaire: result.insertId });
    });
});

app.delete('/api/affaires/:id', (req, res) => {
    const { id } = req.params;
    db.beginTransaction(err => {
        if (err) { /* ... */ }
        const deleteSallesSql = "DELETE FROM salle WHERE id_affaire = ?";
        db.query(deleteSallesSql, [id], (errSalles) => {
            if (errSalles) { /* ... */ }
            const deleteAffaireSql = "DELETE FROM affaire WHERE id_affaire = ?";
            db.query(deleteAffaireSql, [id], (errAffaire, resultAffaire) => {
                if (errAffaire) { /* ... */ }
                if (resultAffaire.affectedRows === 0) { /* ... */ }
                db.commit(errCommit => {
                    if (errCommit) { /* ... */ }
                    res.status(200).json({ message: "Affaire et ses salles ont été supprimées." });
                });
            });
        });
    });
});

app.put('/api/affaires/:id', (req, res) => {
    const { id } = req.params;
    const { objet, client, responsable, numero_affaire, observation, id_utilisateur } = req.body;
    if (!objet || !client || !numero_affaire || !id_utilisateur) {
        return res.status(400).json({ message: "Les champs obligatoires ne sont pas fournis." });
    }
    const sql = "UPDATE affaire SET objet = ?, client = ?, responsable = ?, numero_affaire = ?, observation = ?, id_utilisateur = ? WHERE id_affaire = ?";
    const values = [objet, client, responsable, numero_affaire, observation, id_utilisateur, id];
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur lors de la modification de l'affaire : ", err);
            return res.status(500).json({ message: "Erreur serveur lors de la mise à jour" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Aucune affaire trouvée avec cet ID." });
        }
        return res.status(200).json({ message: "Affaire modifiée avec succès !" });
    });
});

// =================================================================
// GESTION DES SALLES
// =================================================================

app.get('/api/affaires/:id_affaire/salles', (req, res) => {
    const { id_affaire } = req.params;
    const sql = "SELECT * FROM salle WHERE id_affaire = ?";
    db.query(sql, [id_affaire], (err, result) => {
        if (err) { /* ... */ }
        return res.status(200).json(result);
    });
});

app.post('/api/affaires/:id_affaire/salles', (req, res) => {
    const { id_affaire } = req.params;
    const { longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, surface_totale } = req.body;
    if (!longueur || !largeur || !hauteur || !tr) { /* ... */ }
    const sql = `INSERT INTO salle (longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, id_affaire, surface_totale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, id_affaire, surface_totale];
    db.query(sql, values, (err, result) => {
        if (err) { /* ... */ }
        res.status(201).json({ message: "Salle insérée avec succès !", id_salle: result.insertId });
    });
});

//modifier une salle 
app.put("/api/salles/:id",(req,res)=>{
    const {id} = req.params;
    const {
    longueur, largeur, hauteur, tr,
    surface, volume, surface_totale,
    a_moyenne, r
    } = req.body;
    const sql = "UPDATE salle SET longueur = ?, largeur = ?, hauteur = ?, tr = ?, surface = ?, volume = ?, surface_totale = ?,a_moyenne = ?, r = ? WHERE id_salle = ?";
    db.query(sql,[longueur,largeur,hauteur,tr,surface,volume,surface_totale,a_moyenne,r,id],(err,result)=>{
        if(err){
            console.error("Erreur de mise a jour de la salle : ",err);
            return res.status(500).json({message : "Erreur serveur"});
        }
        return res.status(200).json({message:"mise a jour de la salle avec succes ! "});
    })
});
//supprimer une salle 
app.delete('/api/salles/:id',(req,res)=>{
    const {id} = req.params;
    const sql = "DELETE FROM salle WHERE id_salle = ?";
    db.query(sql,[id],(err,result)=>{
        if(err){
            console.error("Erreur lors de la suppression de la salle ");
            return res.status(500).json({message:"Erreur serveur"});
        }
        if(result.affectedRows === 0){
            return res.status(404).json({message : "Salle non trouvé "});
        }
        return res.status(200).json({message : "Salle supprimé avec succés !!"});
    })
})
// =================================================================
// GESTION DES SOURCES SONORES (AVEC LE NOM DE TABLE CORRIGÉ)
// =================================================================

// GET : Récupérer toutes les sources sonores d'une salle spécifique
app.get('/api/salles/:id_salle/sources', (req, res) => {
    const { id_salle } = req.params;
    // ✅ CORRECTION
    const sql = "SELECT * FROM sourcesonore WHERE id_salle = ?";
    db.query(sql, [id_salle], (err, result) => {
        if (err) {
            console.error("Erreur lors de la récupération des sources :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        res.status(200).json(result);
    });
});

// POST : Ajouter une nouvelle source sonore à une salle
app.post('/api/salles/:id_salle/sources', (req, res) => {
    const { id_salle } = req.params;
    const { nom, type } = req.body;
    if (!nom || !type) {
        return res.status(400).json({ message: "Le nom et le type de la source sont obligatoires." });
    }
    // ✅ CORRECTION
    const sql = "INSERT INTO sourcesonore (nom, type, id_salle) VALUES (?, ?, ?)";
    const values = [nom, type, id_salle];
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur lors de l'ajout de la source :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        res.status(201).json({ message: "Source sonore ajoutée avec succès !", id_source: result.insertId });
    });
});

// DELETE : Supprimer une source sonore par son ID
app.delete('/api/sources/:id_source', (req, res) => {
    const { id_source } = req.params;
    // ✅ CORRECTION
    const sql = "DELETE FROM sourcesonore WHERE id_source = ?";
    db.query(sql, [id_source], (err, result) => {
        if (err) {
            console.error("Erreur lors de la suppression de la source :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Source sonore non trouvée." });
        }
        res.status(200).json({ message: "Source sonore supprimée avec succès." });
    });
});

// Modifier : modifier une source sonor par son ID 
app.put('/api/sources/:id_sonore',(req,res)=>{
    const {id_sonore} = req.params;
    const {nom,type} = req.body;
    if(!nom || !type){
        return res.status(400).json({message : "tous les champs sont requis"});
    }
    const sql = "UPDATE sourcesonore SET nom = ?, type = ? WHERE id_source = ?";
    db.query(sql,[nom,type,id_sonore],(err,result)=>{
        if(err){
            console.error("Erreur lors de la mise a jour de la source : ",err);
            return res.status(500).json({message:"Erreur serveur"});
        }
        if(result.affectedRows === 0){
            return res.status(404).json({message : "Source sonore non trouvé"});
        }
        return res.status(200).json({message : "Source sonore modifié avec succés!" });
    })
})
// =================================================================
// GESTION DU SPECTRE LWSOURCE
// =================================================================

// GET : Récupérer le spectre Lw d'une source sonore
app.get('/api/sources/:id_source/lwsource', (req, res) => {
    const { id_source } = req.params;
    // On récupère les valeurs ordonnées par bande
    const sql = "SELECT * FROM lwsource WHERE id_source = ? ORDER BY bande ASC";
    db.query(sql, [id_source], (err, result) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        res.status(200).json(result);
    });
});
//GET : Recuperer tous le lwsource pour les afficher dans un tableau
app.get('/api/lwsource',(req,res)=>{
    const sql = "SELECT * FROM lwsource ORDER BY id_source,bande";
    db.query(sql,(err,result)=>{
        if(err){
            console.error("Erreur recuperation lwsource : ",err);
            return res.status(500).json({message:"Erreur serveur"});
        }
        return res.json(result);
    })
})
// POST : Mettre à jour ou insérer le spectre Lw d'une source (méthode "upsert")
app.post('/api/sources/:id_source/lwsource', (req, res) => {
    const { id_source } = req.params;
    const spectre = req.body.spectre; // On s'attend à recevoir un tableau d'objets [{bande, valeur_lw}, ...]

    if (!spectre || !Array.isArray(spectre)) {
        return res.status(400).json({ message: "Le spectre doit être un tableau." });
    }

    // On utilise REPLACE INTO qui est une extension MySQL. 
    // Il supprime l'ancienne ligne si elle existe (basé sur la clé primaire/unique) et en insère une nouvelle.
    // Pour que cela fonctionne bien, il faut une clé unique sur (id_source, bande).
    // ALTER TABLE lwsource ADD UNIQUE KEY `unique_source_bande` (`id_source`, `bande`);
    const sql = "REPLACE INTO lwsource (id_source, bande, valeur_lw) VALUES ?";
    const values = spectre.map(item => [id_source, item.bande, item.valeur_lw]);

    db.query(sql, [values], (err, result) => {
        if (err) {
            console.error("Erreur lors de la mise à jour du spectre Lw:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        res.status(200).json({ message: "Spectre Lw mis à jour avec succès." });
    });
});


// =================================================================
// DÉMARRAGE DU SERVEUR
// =================================================================

app.listen(port, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});