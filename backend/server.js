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

// ==================
// AUTHENTIFICATION
// ==================
//check si un utilsateur est insérér dans la base donnée si la reponse est nom un compte est creer automatique lors de connexion 
app.get('/api/utilisateurs/exist', async (req, res) => {
    try {
        const [rows] = await db.promise().query("SELECT COUNT(*) as total FROM utilisateur");
        const count = rows[0].total;
        res.json({ existe: count > 0 });
    } catch (err) {
        console.error("Erreur lors de la vérification des utilisateurs :", err);
        res.status(500).json({ message: "Erreur serveur" });
    }
});


// Création d'un utilisateur
app.post("/api/connexion", (req, res) => {
    const { email, mot_de_passe } = req.body;
    if (!email || !mot_de_passe) {
        return res.status(400).json({ message: "Champs manquants" });
    }

    //Vérifier si des utilisateurs existent déjà dans la base de données
    const countSql = "SELECT COUNT(*) AS userCount FROM utilisateur";
    db.query(countSql, (countErr, countResults) => {
        if (countErr) {
            console.error("Erreur lors de la vérification du nombre d'utilisateurs :", countErr);
            return res.status(500).json({ message: "Erreur Serveur" });
        }

        const userCount = countResults[0].userCount;

        if (userCount === 0) {
            // S'il n'y a aucun utilisateur, c'est la première connexion.
            // On crée un administrateur avec les informations fournies.
            const insertSql = "INSERT INTO utilisateur (email, mot_de_passe, role) VALUES (?, ?, 'administrateur')";
            db.query(insertSql, [email, mot_de_passe], (insertErr, insertResult) => {
                if (insertErr) {
                    // Gérer les erreurs
                    console.error("Erreur lors de la création du premier administrateur :", insertErr);
                    return res.status(500).json({ message: "Erreur lors de la création du compte administrateur." });
                }
                // Retourner l'utilisateur nouvellement créé
                return res.status(200).json({
                    message: "Premier administrateur créé et connecté avec succès !",
                    utilisateur: { id: insertResult.insertId, email: email, role: 'administrateur' }
                });
            });
        } else {
            // Des utilisateurs existent déjà, procéder à la connexion normale
            const sql = "SELECT * FROM utilisateur WHERE email = ? AND mot_de_passe = ? ";
            db.query(sql, [email, mot_de_passe], (err, results) => {
                if (err) {
                    console.error("Erreur lors de la connexion : ", err);
                    return res.status(500).json({ message: "Erreur serveur" });
                }
                if (results.length > 0) {
                    // Connexion réussie, renvoyer les détails de l'utilisateur
                    return res.status(200).json({ message: "Connexion réussie", utilisateur: results[0] });
                } else {
                    // Email ou mot de passe incorrect pour les utilisateurs existants
                    return res.status(401).json({ message: "Email ou mot de passe incorrect" });
                }
            });
        }
    });
});


app.post("/api/utilisateurs", (req, res) => {
    let { email, mot_de_passe, role } = req.body; 

    if (!email || !mot_de_passe || !role) {
        return res.status(400).json({ message: "Tous les champs (email, mot de passe, rôle) sont requis." });
    }

    // Validation du rôle fourni
    if (role !== 'technicien' && role !== 'administrateur') {
        return res.status(400).json({ message: "Le rôle fourni est invalide." });
    }

    // Vérifier si l'email est déjà utilisé
    const checkSql = "SELECT * FROM utilisateur WHERE email = ?";
    db.query(checkSql, [email], (err, results) => {
        if (err) {
            console.error("Erreur lors de la vérification de l'email :", err);
            return res.status(500).json({ message: "Erreur Serveur" });
        }
        if (results.length > 0) {
            return res.status(409).json({ message: "Cet email est déjà utilisé !" });
        }

        // Insérer le nouvel utilisateur avec le rôle spécifié
        const insertSql = "INSERT INTO utilisateur (email, mot_de_passe, role) VALUES (?, ?, ?)";
        db.query(insertSql, [email, mot_de_passe, role], (insertErr, result) => {
            if (insertErr) {
                console.error("Erreur lors de l'inscription :", insertErr);
                return res.status(500).json({ message: "Erreur serveur" });
            }
            return res.status(201).json({ message: "Utilisateur créé avec succès !" });
        });
    });
});


//Lister tous les utilisateurs
// Accessible uniquement par les administrateurs
app.get("/api/utilisateurs", (req, res) => {
    const { id_utilisateur, role } = req.query; // Récupérer l'ID et le rôle de l'utilisateur connecté
    
    // Vérifier si l'utilisateur est un administrateur
    if (!id_utilisateur || role !== 'administrateur') {
        return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent lister les utilisateurs." });
    }

    // Sélectionner tous les utilisateurs, EXCLURE LE MOT DE PASSE pour la sécurité
    const sql = "SELECT id, email, role FROM utilisateur"; 
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des utilisateurs :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        res.status(200).json(results);
    });
});

//Modifier un utilisateur (PUT /api/utilisateurs/:id)
// Accessible uniquement par les administrateurs
app.put("/api/utilisateurs/:id", (req, res) => {
    const { id } = req.params; // ID de l'utilisateur à modifier
    const { email, mot_de_passe, role, current_user_id, current_user_role } = req.body; // Informations du compte administrateur effectuant l'action

    // Vérifier si l'utilisateur qui fait la requête est un administrateur
    if (!current_user_id || current_user_role !== 'administrateur') {
        return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent modifier les utilisateurs." });
    }
    
    // Validation des champs
    if (!email || !role) {
        return res.status(400).json({ message: "L'email et le rôle sont requis." });
    }
    if (role !== 'technicien' && role !== 'administrateur') {
        return res.status(400).json({ message: "Le rôle fourni est invalide." });
    }

    let sql;
    let values;

    // Si un nouveau mot de passe est fourni, le mettre à jour
    if (mot_de_passe) {
        sql = "UPDATE utilisateur SET email = ?, mot_de_passe = ?, role = ? WHERE id = ?";
        values = [email, mot_de_passe, role, id];
    } else {
        // Sinon, mettre à jour uniquement l'email et le rôle
        sql = "UPDATE utilisateur SET email = ?, role = ? WHERE id = ?";
        values = [email, role, id];
    }
    
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur lors de la mise à jour de l'utilisateur :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }
        res.status(200).json({ message: "Utilisateur mis à jour avec succès." });
    });
});

//Supprimer un utilisateur
// Accessible uniquement par les administrateurs
app.delete("/api/utilisateurs/:id", (req, res) => {
    const { id } = req.params; // ID de l'utilisateur à supprimer
    const { current_user_id, current_user_role } = req.query; // Informations du compte administrateur effectuant l'action

    // Vérifier si l'utilisateur qui fait la requête est un administrateur
    if (!current_user_id || current_user_role !== 'administrateur') {
        return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent supprimer les utilisateurs." });
    }

    // Empêcher un administrateur de supprimer son propre compte
    if (parseInt(id) === parseInt(current_user_id)) {
        return res.status(403).json({ message: "Vous ne pouvez pas supprimer votre propre compte !" });
    }

    const sql = "DELETE FROM utilisateur WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Erreur lors de la suppression de l'utilisateur :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }
        res.status(200).json({ message: "Utilisateur supprimé avec succès." });
    });
});



// ======================
// GESTION DES AFFAIRES
// ======================

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

// ====================
// GESTION DES SALLES
// ====================

app.get('/api/affaires/:id_affaire/salles', (req, res) => {
    const { id_affaire } = req.params;
    const sql = "SELECT * FROM salle WHERE id_affaire = ?";
    db.query(sql, [id_affaire], (err, result) => {
        if (err) { /* ... */ }
        return res.status(200).json(result);
    });
});
app.get('/api/salles/:id', (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM salle WHERE id_salle = ?";
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération de la salle :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Salle non trouvée" });
        }
        return res.status(200).json(results[0]);
    });
});


app.post('/api/affaires/:id_affaire/salles', (req, res) => {
    const { id_affaire } = req.params;
    const { nom, longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, surface_totale } = req.body;
    if (!longueur || !largeur || !hauteur || !tr) {
        return res.status(400).json({ message: "Les champs longueur, largeur, hauteur et tr sont obligatoires." });
    }

    const sql = `INSERT INTO salle (nom, longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, id_affaire, surface_totale)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [nom, longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, id_affaire, surface_totale];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur lors de l'insertion de la salle :", err);
            return res.status(500).json({ message: "Erreur serveur lors de l'insertion de la salle." });
        }
        if (!result || typeof result.insertId === 'undefined') {
            console.error("Resultat inattendu lors de l'insertion :", result);
            return res.status(500).json({ message: "Salle insérée mais ID introuvable." });
        }

        res.status(201).json({ message: "Salle insérée avec succès !", id_salle: result.insertId });
    });
});


//modifier une salle 
app.put("/api/salles/:id",(req,res)=>{
    const {id} = req.params;
   const {
    nom, longueur, largeur, hauteur, tr,
    surface, volume, surface_totale,
    a_moyenne, r
    } = req.body;

    const sql = "UPDATE salle SET nom = ?, longueur = ?, largeur = ?, hauteur = ?, tr = ?, surface = ?, volume = ?, surface_totale = ?, a_moyenne = ?, r = ? WHERE id_salle = ?";
    const values = [nom, longueur, largeur, hauteur, tr, surface, volume, surface_totale, a_moyenne, r, id];

    db.query(sql,[nom,longueur,largeur,hauteur,tr,surface,volume,surface_totale,a_moyenne,r,id],(err,result)=>{
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
            return res.status(404).json({message : "Salle non trouvée "});
        }
        return res.status(200).json({message : "Salle supprimée avec succès !!"});
    })
})

// ====================================
// GESTION DE LA CORRECTION SPECTRALE
// ====================================

//Récupérer toutes les corrections spectrales et les grouper par id_salle
app.get('/api/correctionspectral', async (req, res) => {
    try {
        await db.promise().query(`SELECT 1 FROM correctionspectral LIMIT 1`);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error("La table 'correctionspectral' n'existe pas. Veuillez la créer.");
            return res.status(200).json({});
        }
        return res.status(500).json({ message: "Erreur serveur" });
    }

    const sql = `SELECT * FROM correctionspectral ORDER BY id_salle, bande`;
    try {
        const [rows] = await db.promise().query(sql);
        const groupedData = rows.reduce((acc, row) => {
            if (!acc[row.id_salle]) {
                acc[row.id_salle] = {};
            }
            acc[row.id_salle][row.bande] = row.valeur;
            return acc;
        }, {});
        res.status(200).json(groupedData);
    } catch (error) {
        console.error("Erreur récupération corrections spectrales:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

//mise à jour pour une salle
app.post('/api/salles/:id_salle/correctionspectral', async (req, res) => {
    const { id_salle } = req.params;
    const { corrections } = req.body;

    if (!Array.isArray(corrections)) {
        return res.status(400).json({ message: "Le format des données est invalide." });
    }
    const values = corrections.map(c => [id_salle, c.bande, c.valeur]);
    const sql = "REPLACE INTO correctionspectral (id_salle, bande, valeur) VALUES ?";

    try {
        await db.promise().query(sql, [values]);
        res.status(200).json({ message: "Corrections spectrales enregistrées avec succès." });
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de la correction spectrale:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// =============================
// GESTION DES SOURCES SONORES 
// =============================

// Récupérer toutes les sources d'une salle
app.get('/api/salles/:id_salle/sources', (req, res) => {
    const { id_salle } = req.params;

    const sql = "SELECT * FROM sourcesonore WHERE id_salle = ?";
    db.query(sql, [id_salle], (err, result) => {
        if (err) {
            console.error("Erreur lors de la récupération des sources :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        res.status(200).json(result);
    });
});

// Récupérer les informations d'une source (nom et ordre dans la salle)
app.get('/api/sources/:id_source', (req, res) => {
    const { id_source } = req.params;

    const sql = `
        SELECT 
            s.nom, 
            s.type,
            s.id_salle,
            (
                SELECT COUNT(*) + 1
                FROM sourcesonore s2
                WHERE s2.id_salle = s.id_salle
                  AND s2.id_source < s.id_source
            ) AS ordre
        FROM sourcesonore s
        WHERE s.id_source = ?`;

    db.query(sql, [id_source], (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération de la source :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Source sonore non trouvée." });
        }

        res.status(200).json(results[0]);
    });
});


// Ajouter une nouvelle source à une salle
app.post('/api/salles/:id_salle/sources', (req, res) => {
    const { id_salle } = req.params;
    const { nom, type } = req.body;
    if (!nom || !type) {
        return res.status(400).json({ message: "Le nom et le type de la source sont obligatoires." });
    }
  
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

//Modifier une source sonore
app.put('/api/sources/:id_source', (req, res) => {
    const { id_source } = req.params;
    const { nom, type } = req.body;

    if (!nom || !type) {
        return res.status(400).json({ message: "Le nom et le type sont obligatoires." });
    }

    const sql = "UPDATE sourcesonore SET nom = ?, type = ? WHERE id_source = ?";
    const values = [nom, type, id_source];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur lors de la mise à jour de la source :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Source sonore non trouvée." });
        }
        res.status(200).json({ message: "Source sonore mise à jour avec succès !" });
    });
});

//Supprimer une source par ID
app.delete('/api/sources/:id_source', (req, res) => {
    const { id_source } = req.params;

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

// ==========================
// GESTION DU SPECTRE LWSOURCE
// ==========================

// Récupérer le Lw d'une source spécifique
app.get('/api/sources/:id_source/lwsource', (req, res) => {
    const { id_source } = req.params;

    const sql = "SELECT * FROM lwsource WHERE id_source = ? ORDER BY bande ASC";
    db.query(sql, [id_source], (err, result) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        res.status(200).json(result);
    });
});

// Récupérer tous les spectres Lw de toutes les sources
app.get('/api/lwsource', (req, res) => {
    const sql = "SELECT * FROM lwsource ORDER BY id_source, bande";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Erreur récupération lwsource :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        res.json(result);
    });
});

// Mettre à jour ou insérer un Lw pour une source
app.post('/api/sources/:id_source/lwsource', (req, res) => {
    const { id_source } = req.params;
    const spectre = req.body.spectre; 

    if (!spectre || !Array.isArray(spectre)) {
        return res.status(400).json({ message: "Le spectre doit être un tableau." });
    }

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



// ====================
// GESTION DES TRONCONS
// ====================

//recuperer les troncons
app.get('/api/sources/:id_source/troncons',(req,res) =>{
    const {id_source} = req.params
    const sql = "SELECT * FROM troncon WHERE id_source = ? ORDER BY ordre ASC";
    db.query(sql,[id_source],(err,result)=>{
        if(err){
            console.error("Erreur lors du recuperation des troncons ");
            return res.status(500).json({message:"Erreur serveur"});
        }
        return res.status(200).json(result);
    })
})

//inserer un troncon 

app.post('/api/sources/:id_source/troncons', async (req, res) => {
    const { id_source } = req.params;
    const { forme, largeur, hauteur, diametre, vitesse, debit } = req.body;

    if (!forme || !vitesse || !debit) {
        return res.status(400).json({ message: "La forme, la vitesse et le débit sont requis." });
    }

    try {
        // 🔢 Étape pour calculer le prochain ordre
        const [rows] = await db.promise().query(
            'SELECT MAX(ordre) AS max_ordre FROM troncon WHERE id_source = ?', 
            [id_source]
        );
        const ordre = (rows[0].max_ordre ?? 0) + 1;

        let sql;
        let values;

        if (forme === 'rectangulaire') {
            if (!largeur || !hauteur) {
                return res.status(400).json({ message: "La largeur et la hauteur sont requises." });
            }
            sql = "INSERT INTO troncon (forme, largeur, hauteur, diametre, vitesse, debit, id_source, ordre) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)";
            values = [forme, largeur, hauteur, vitesse, debit, id_source, ordre];
        } 
        else if (forme === 'circulaire') {
            if (!diametre) {
                return res.status(400).json({ message: "Le diamètre est requis." });
            }
            sql = "INSERT INTO troncon (forme, largeur, hauteur, diametre, vitesse, debit, id_source, ordre) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?)";
            values = [forme, diametre, vitesse, debit, id_source, ordre];
        } 
        else {
            return res.status(400).json({ message: "La forme doit être 'rectangulaire' ou 'circulaire'." });
        }

        const [result] = await db.promise().query(sql, values);
        return res.status(201).json({ message: "Tronçon ajouté avec succès !", id_troncon: result.insertId });

    } catch (error) {
        console.error("Erreur lors de l'ajout du tronçon :", error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
});


// Modifier un tronçon
app.put('/api/troncons/:id_troncon', (req, res) => {
    const { id_troncon } = req.params;
    const { forme, largeur, hauteur, diametre, vitesse, debit } = req.body;

    if (!forme || !vitesse || !debit) {
        return res.status(400).json({ message: "La forme, la vitesse et le débit sont requis." });
    }

    let sql;
    let values;

    if (forme === 'rectangulaire') {
        if (!largeur || !hauteur) {
            return res.status(400).json({ message: "La largeur et la hauteur sont requises." });
        }
        sql = "UPDATE troncon SET forme = ?, largeur = ?, hauteur = ?, diametre = NULL, vitesse = ?, debit = ? WHERE id_troncon = ?";
        values = [forme, largeur, hauteur, vitesse, debit, id_troncon];
    } else if (forme === 'circulaire') {
        if (!diametre) {
            return res.status(400).json({ message: "Le diamètre est requis." });
        }
        sql = "UPDATE troncon SET forme = ?, largeur = NULL, hauteur = NULL, diametre = ?, vitesse = ?, debit = ? WHERE id_troncon = ?";
        values = [forme, diametre, vitesse, debit, id_troncon];
    } else {
        return res.status(400).json({ message: "La forme est invalide." });
    }

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur mise à jour tronçon:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Tronçon non trouvé." });
        }
        res.status(200).json({ message: "Tronçon mis à jour avec succès !" });
    });
});

// Supprimer un tronçon
app.delete('/api/troncons/:id_troncon', (req, res) => {
    const { id_troncon } = req.params;
    const sql = "DELETE FROM troncon WHERE id_troncon = ?";
    db.query(sql, [id_troncon], (err, result) => {
        if (err) {
            console.error("Erreur suppression tronçon:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Tronçon non trouvé." });
        }
        res.status(200).json({ message: "Tronçon supprimé avec succès !" });
    });
});

// Récupérer l'ordre d'un tronçon spécifique
app.get('/api/troncons/:id_troncon/ordre', async (req, res) => {
    const { id_troncon } = req.params;

    const sql = `
        SELECT 
            (SELECT COUNT(*) + 1 FROM troncon t2 WHERE t2.id_source = t.id_source AND t2.id_troncon < t.id_troncon) AS ordre_troncon
        FROM 
            troncon t
        WHERE 
            t.id_troncon = ?
    `;

    try {
        const [results] = await db.promise().query(sql, [id_troncon]);
        if (results.length === 0) {
            return res.status(404).json({ message: "Tronçon non trouvé." });
        }
        res.status(200).json(results[0]);
    } catch (err) {
        console.error("Erreur récupération ordre tronçon:", err);
        res.status(500).json({ message: "Erreur serveur." });
    }
});

// ==========================================================
// GESTION D'ELEMENT RESEAU
// ==========================================================

// Obtenir tous les éléments d’un tronçon, triés par ordre logique
app.get('/api/troncons/:id_troncon/elements', (req, res) => {
    const { id_troncon } = req.params;
    const sql = `
        SELECT er.*, c.longueur, co.angle, co.orientation, gs.distance_r, vc.type_vc,
               COALESCE(c.materiau, co.materiau) AS materiau,
               COALESCE(gs.distance_r, vc.distance_r) AS distance_r
        FROM elementreseau er
        LEFT JOIN conduit c ON er.id_element = c.id_element
        LEFT JOIN coude co ON er.id_element = co.id_element
        LEFT JOIN grillesoufflage gs ON er.id_element = gs.id_element
        LEFT JOIN vc ON er.id_element = vc.id_element
        WHERE er.id_troncon = ? ORDER BY er.ordre ASC`;
    
    db.query(sql, [id_troncon], (err, result) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        return res.status(200).json(result);
    });
});

//Obtenir les détails d’un seul élément
app.get('/api/elements/:id_element', async (req, res) => {
    const { id_element } = req.params;
    const sql = `
        SELECT er.*, c.longueur, co.angle, co.orientation, gs.distance_r, vc.type_vc,
               COALESCE(gs.distance_r, vc.distance_r) AS distance_r,
               COALESCE(c.materiau, co.materiau) AS materiau
        FROM elementreseau er
        LEFT JOIN conduit c ON er.id_element = c.id_element
        LEFT JOIN coude co ON er.id_element = co.id_element
        LEFT JOIN grillesoufflage gs ON er.id_element = gs.id_element
        LEFT JOIN vc ON er.id_element = vc.id_element
        WHERE er.id_element = ?`;
    try {
        const [elements] = await db.promise().query(sql, [id_element]);
        if (elements.length === 0) return res.status(404).json({ message: "Élément non trouvé." });
        res.status(200).json(elements[0]);
    } catch (err) {
        return res.status(500).json({ message: "Erreur serveur" });
    }
});

//Ajouter un élément
// Ajouter un élément avec ordre automatique
app.post('/api/troncons/:id_troncon/elements', (req, res) => {
    const { id_troncon } = req.params;
    const { type, parameters } = req.body;

    if (!type) return res.status(400).json({ message: "Le type est requis." });

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });

        try {
            // 🔢 Récupérer le prochain ordre
            const [[{ max_ordre }]] = await db.promise().query(
                'SELECT IFNULL(MAX(ordre), -1) + 1 AS max_ordre FROM elementreseau WHERE id_troncon = ?',
                [id_troncon]
            );

            // Insérer l’élément avec son ordre
            const [result] = await db.promise().query(
                'INSERT INTO elementreseau (type, id_troncon, ordre) VALUES (?, ?, ?)',
                [type, id_troncon, max_ordre]
            );

            const newElementId = result.insertId;

            // Gérer l’insertion dans les sous-tables
            if (parameters && Object.keys(parameters).length > 0) {
                switch (type) {
                    case 'conduit':
                        await db.promise().query(
                            'INSERT INTO conduit (id_element, longueur, materiau) VALUES (?, ?, ?)',
                            [newElementId, parameters.longueur, parameters.materiau]
                        );
                        break;
                    case 'coude':
                        await db.promise().query(
                            'INSERT INTO coude (id_element, angle, orientation, materiau) VALUES (?, ?, ?, ?)',
                            [newElementId, parameters.angle, parameters.orientation, parameters.materiau]
                        );
                        break;
                    case 'grillesoufflage':
                        await db.promise().query(
                            'INSERT INTO grillesoufflage (id_element, distance_r) VALUES (?, ?)',
                            [newElementId, parameters.distance_r]
                        );
                        break;
                    case 'vc':
                        await db.promise().query(
                        'INSERT INTO vc (id_element, type_vc, distance_r) VALUES (?, ?, ?)',
                        [newElementId, parameters.type_vc, parameters.distance_r] 
                    );
                        break;
                }
            } else {
                switch (type) {
                    case 'silencieux':
                        await db.promise().query('INSERT INTO silencieux (id_element) VALUES (?)', [newElementId]);
                        break;
                    case 'plenum':
                        await db.promise().query('INSERT INTO plenum (id_element) VALUES (?)', [newElementId]);
                        break;
                    case 'piecetransformation':
                        await db.promise().query('INSERT INTO piecetransformation (id_element) VALUES (?)', [newElementId]);
                        break;
                }
            }

            await db.promise().commit();
            res.status(201).json({ message: "Élément ajouté avec succès !" });

        } catch (error) {
            await db.promise().rollback();
            console.error("Erreur ajout élément :", error);
            res.status(500).json({ message: "Erreur serveur" });
        }
    });
});


// PUT : Modifier un élément
app.put('/api/elements/:id_element', (req, res) => {
    const { id_element } = req.params;
    const { type, parameters } = req.body;
    if (!type) return res.status(400).json({ message: "Type requis." });

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        try {
            await db.promise().query('DELETE FROM conduit WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM coude WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM grillesoufflage WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM silencieux WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM vc WHERE id_element = ?', [id_element]);
            if (parameters && Object.keys(parameters).length > 0) {
                switch (type) {
                    case 'conduit': await db.promise().query('INSERT INTO conduit (id_element, longueur, materiau) VALUES (?, ?, ?)', [id_element, parameters.longueur, parameters.materiau]); break;
                    case 'coude': await db.promise().query('INSERT INTO coude (id_element, angle, orientation, materiau) VALUES (?, ?, ?, ?)', [id_element, parameters.angle, parameters.orientation, parameters.materiau]); break;
                    case 'grillesoufflage': await db.promise().query('INSERT INTO grillesoufflage (id_element, distance_r) VALUES (?, ?)', [id_element, parameters.distance_r]); break;
                    case 'vc': await db.promise().query('INSERT INTO vc (id_element, type_vc, distance_r) VALUES (?, ?, ?)',[id_element, parameters.type_vc, parameters.distance_r]
);
                }
            } else {
                 switch(type) {
                    case 'silencieux': await db.promise().query('INSERT INTO silencieux (id_element) VALUES (?)', [id_element]); break;
                    // a continuer plus tard
                }
            }

            await db.promise().commit();
            res.status(200).json({ message: "Élément modifié avec succès !" });
        } catch (error) {
            await db.promise().rollback();
            console.error("Erreur modification élément :", error);
            res.status(500).json({ message: "Erreur serveur" });
        }
    });
});
//Supprimer un élément et ses dépendances
app.delete('/api/elements/:id_element', (req, res) => {
    const { id_element } = req.params;
    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        try {
            await db.promise().query('DELETE FROM conduit WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM coude WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM grillesoufflage WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM plenum WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM silencieux WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM vc WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM piecetransformation WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM attenuation WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM regeneration WHERE id_element = ?', [id_element]);
            await db.promise().query('DELETE FROM lwresultant WHERE id_element = ?', [id_element]);
            
            const [result] = await db.promise().query('DELETE FROM elementreseau WHERE id_element = ?', [id_element]);
            if (result.affectedRows === 0) {
                await db.promise().rollback();
                return res.status(404).json({ message: "Élément non trouvé." });
            }
            await db.promise().commit();
            res.status(200).json({ message: "Élément et toutes ses données associées supprimés !" });
        } catch (error) {
            await db.promise().rollback(); console.error("Erreur suppression élément:", error); res.status(500).json({ message: "Erreur serveur" });
        }
    });
});

// la réorganisation des éléments apres d&d
app.put('/api/troncons/:id_troncon/elements/reorder', async (req, res) => {
    const { id_troncon } = req.params;
    const updates = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: "Payload invalide: un tableau d'objets { id_element, ordre } est requis." });
    }

    try {
        await db.promise().beginTransaction();

        //Vérifier que tous les éléments appartiennent bien à ce tronçon
        const elementIds = updates.map(u => u.id_element);
        const [checkResults] = await db.promise().query(
            'SELECT id_element FROM elementreseau WHERE id_element IN (?) AND id_troncon = ?',
            [elementIds, id_troncon]
        );
        if (checkResults.length !== elementIds.length) {
            await db.promise().rollback();
            return res.status(403).json({ message: "Un ou plusieurs éléments ne sont pas associés à ce tronçon." });
        }

        for (const update of updates) {
            // Mettre à jour l'ordre de chaque élément
            await db.promise().query(
                'UPDATE elementreseau SET ordre = ? WHERE id_element = ? AND id_troncon = ?',
                [update.ordre, update.id_element, id_troncon]
            );
        }

        await db.promise().commit();
        res.status(200).json({ message: "Ordre des éléments mis à jour avec succès." });
    } catch (error) {
        await db.promise().rollback();
        console.error("❌ Erreur lors de la réorganisation des éléments :", error);
        res.status(500).json({ message: "Erreur serveur lors de la réorganisation." });
    }
});


// Nouvelle route pour la réorganisation des tronçons
app.put('/api/sources/:id_source/troncons/reorder', async (req, res) => {
    const { id_source } = req.params;
    const updates = req.body; // Attendu: [{ id_troncon: 1, ordre: 0 }, { id_troncon: 2, ordre: 1 }, ...]

    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: "Payload invalide: un tableau d'objets { id_troncon, ordre } est requis." });
    }

    try {
        await db.promise().beginTransaction();

        // Optionnel mais recommandé: Vérifier que tous les tronçons appartiennent bien à cette source
        const tronconIds = updates.map(u => u.id_troncon);
        const [checkResults] = await db.promise().query(
            'SELECT id_troncon FROM troncon WHERE id_troncon IN (?) AND id_source = ?',
            [tronconIds, id_source]
        );
        if (checkResults.length !== tronconIds.length) {
            await db.promise().rollback();
            return res.status(403).json({ message: "Un ou plusieurs tronçons ne sont pas associés à cette source." });
        }

        for (const update of updates) {
            // Mettre à jour l'ordre de chaque tronçon
            await db.promise().query(
                'UPDATE troncon SET ordre = ? WHERE id_troncon = ? AND id_source = ?',
                [update.ordre, update.id_troncon, id_source]
            );
        }

        await db.promise().commit();
        res.status(200).json({ message: "Ordre des tronçons mis à jour avec succès." });
    } catch (error) {
        await db.promise().rollback();
        console.error("❌ Erreur lors de la réorganisation des tronçons :", error);
        res.status(500).json({ message: "Erreur serveur lors de la réorganisation." });
    }
});

// ===============================
// GESTION DES SPECTRES & CALCULS
// ===============================

// Fonction utilitaire pour récupérer un spectre
const getGroupedSpectrum = async (tableName, res) => {
    try {
        await db.promise().query(`SELECT 1 FROM ${tableName} LIMIT 1`);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') return res.status(200).json({});
        return res.status(500).json({ message: `Erreur serveur: table ${tableName}` });
    }
    const sql = `SELECT * FROM ${tableName} ORDER BY id_element, bande`;
    try {
        const [rows] = await db.promise().query(sql);
        const groupedData = rows.reduce((acc, row) => {
            if (!acc[row.id_element]) acc[row.id_element] = {};
            acc[row.id_element][row.bande] = row.valeur;
            return acc;
        }, {});
        res.status(200).json(groupedData);
    } catch (error) { res.status(500).json({ message: "Erreur serveur" }); }
};

//lecture des spectres
app.get('/api/attenuations', (req, res) => getGroupedSpectrum('attenuation', res));
app.get('/api/lwresultants', (req, res) => getGroupedSpectrum('lwresultant', res));
// on peut ajouter selon base de donnees

//CALCULs
// Calculer et récupérer les régénérations
app.get('/api/regenerations', async (req, res) => {
    try {
        const [savedRegensRows] = await db.promise().query('SELECT * FROM regeneration');
        const finalRegenerations = savedRegensRows.reduce((acc, row) => {
            if (!acc[row.id_element]) {
                acc[row.id_element] = {};
            }
            acc[row.id_element][row.bande] = row.valeur;
            return acc;
        }, {});

        const [calcDataRows] = await db.promise().query(`
            SELECT
                er.id_element, er.type, er.id_troncon,
                t.vitesse, t.forme, t.largeur, t.hauteur, t.diametre,
                cs.bande AS cs_bande,
                cs.valeur AS cs_valeur
            FROM elementreseau er
            JOIN troncon t ON er.id_troncon = t.id_troncon
            JOIN sourcesonore ss ON t.id_source = ss.id_source
            LEFT JOIN correctionspectral cs ON ss.id_salle = cs.id_salle
        `);

        const elementsData = calcDataRows.reduce((acc, row) => {
            if (!acc[row.id_element]) {
                acc[row.id_element] = {
                    ...row,
                    corrections: {}
                };
            }
            if (row.cs_bande !== null) {
                acc[row.id_element].corrections[row.cs_bande] = row.cs_valeur;
            }
            return acc;
        }, {});

        const BANDES_FREQUENCE = [63, 125, 250, 500, 1000, 2000, 4000];
        const elementsToCalculateAndSave = []; 

        for (const id_element_str in elementsData) { 
            const id_element = parseInt(id_element_str);
            const element = elementsData[id_element_str];

            if (element.type !== 'grillesoufflage' && element.type !== 'vc') {
                const calculatedSpectre = {};
                const correctionsMap = element.corrections;

                for (const bande of BANDES_FREQUENCE) {
                    let regenerationValue = 0;
                    const correctionValeur = correctionsMap[bande] ?? 0;

                    if (element.type !== 'silencieux' && element.type !== 'plenum') {
                        const vitesse_ms = parseFloat(element.vitesse);
                        let surface_m2 = 0;
                        if (element.forme === 'rectangulaire') {
                            surface_m2 = (element.largeur / 1000) * (element.hauteur / 1000);
                        } else if (element.forme === 'circulaire') {
                            surface_m2 = Math.PI * Math.pow(element.diametre / 2000, 2);
                        }

                        if (vitesse_ms > 0 && surface_m2 > 0) {
                            regenerationValue = 10 + 50 * Math.log10(vitesse_ms) + 10 * Math.log10(surface_m2) + correctionValeur;
                        }
                    }
                    calculatedSpectre[bande] = parseFloat(regenerationValue.toFixed(3)); 
                }
                finalRegenerations[id_element] = calculatedSpectre;
                elementsToCalculateAndSave.push({ id_element, spectre: calculatedSpectre });
            }
        }

        if (elementsToCalculateAndSave.length > 0) {
            for (const item of elementsToCalculateAndSave) {
                const valuesToSave = Object.entries(item.spectre).map(([b, v]) => [item.id_element, parseInt(b), v]);
                if (valuesToSave.length > 0) {
                    try {
                        await db.promise().query(
                            'REPLACE INTO regeneration (id_element, bande, valeur) VALUES ?', [valuesToSave]
                        );
                    } catch (innerError) {
                        if (innerError.code === 'ER_NO_REFERENCED_ROW_2' || innerError.code === 'ER_ROW_IS_REFERENCED_2') {
                            console.warn(`Backend (Regeneration): Skipping save for element ${item.id_element} because its parent elementreseau is missing or was just deleted.`);
                        } else {
                            throw innerError;
                        }
                    }
                }
            }
        }
        res.status(200).json(finalRegenerations);

    } catch (error) {
        console.error("Erreur calcul et lecture régénération:", error);
        res.status(500).json({ message: "Erreur serveur lors du calcul des régénérations." });
    }
});

app.post('/api/regenerations', async (req, res) => {
    const { id_element, ...spectre } = req.body;

    if (!id_element || !spectre) {
        return res.status(400).json({ message: "ID de l'élément et spectre sont requis." });
    }

    try {
        const values = Object.entries(spectre).map(([bande, valeur]) => {
            return [id_element, parseInt(bande), parseFloat(valeur) || 0];
        });
        
        if (values.length > 0) {
            await db.promise().query(
                'REPLACE INTO regeneration (id_element, bande, valeur) VALUES ?',
                [values]
            );
        }
        
        res.status(200).json({ message: "Régénération sauvegardée avec succès." });
    } catch (error) {
        console.error("Erreur sauvegarde régénération:", error);
        res.status(500).json({ message: "Erreur serveur lors de la sauvegarde." });
    }
});


// Calculer, enregistrer, et récupérer les atténuations de tronçon
app.get('/api/attenuationtroncons', async (req, res) => {

    try {
        //Récupérer les tronçons
        const [allTroncons] = await db.promise().query(
            'SELECT id_troncon, id_source, debit FROM troncon ORDER BY id_source, id_troncon ASC'
        );
        //Récupérer les pièces de transformation
        const [piecesDeTransfo] = await db.promise().query(
            "SELECT id_element, id_troncon FROM elementreseau WHERE type = 'piecetransformation'"
        );

        //Calculer les valeurs
        const allAttenuationsTroncon = {};
        const BANDES = [63, 125, 250, 500, 1000, 2000, 4000];

        for (const piece of piecesDeTransfo) {
            const currentIndex = allTroncons.findIndex(t => t.id_troncon === piece.id_troncon);
            if (currentIndex === -1) continue;

            const tronconActuel = allTroncons[currentIndex];
            const debitActuel = parseFloat(tronconActuel.debit);
            let attenuationValue = 0;

            if (currentIndex + 1 < allTroncons.length && allTroncons[currentIndex + 1].id_source === tronconActuel.id_source) {
                const tronconSuivant = allTroncons[currentIndex + 1];
                const debitSuivant = parseFloat(tronconSuivant.debit);
                if (debitActuel > 0 && debitSuivant >= 0) {
                    attenuationValue = 10 * Math.log10(debitSuivant / debitActuel);
                    if (!isFinite(attenuationValue)) attenuationValue = -99;
                }
            }
            
            const spectrePourCetElement = {};
            BANDES.forEach(bande => {
                spectrePourCetElement[bande] = parseFloat(attenuationValue.toFixed(2));
            });
            allAttenuationsTroncon[piece.id_element] = spectrePourCetElement;
        }

        //Enregistrer les résultats en db
        for (const [id_element, spectre] of Object.entries(allAttenuationsTroncon)) {
             const values = Object.entries(spectre).map(([bande, valeur]) => [id_element, parseInt(bande), valeur]);
             await db.promise().query(
                'REPLACE INTO attenuationtroncon (id_element, bande, valeur) VALUES ?',
                [values]
            );
        }

        //Envoyer les valeurs calculées au front
        res.status(200).json(allAttenuationsTroncon);

    } catch (error) {
        console.error("Erreur calcul/enregistrement attenuationtroncon:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// Calcul et sauvegarde du niveau Lp pour grillesoufflage et vc
app.get('/api/niveaux_lp', async (req, res) => {
    try {
        // Récupération Lw Total
        const [lwTotalRows] = await db.promise().query('SELECT * FROM lwtotal');
        const lwTotalMap = {};
        lwTotalRows.forEach(row => {
            if (!lwTotalMap[row.id_element]) lwTotalMap[row.id_element] = {};
            lwTotalMap[row.id_element][row.bande] = row.valeur;
        });

        // Récupération Lw Sortie pour les grilles et les VC
        const [lwSortieGrilleRows] = await db.promise().query('SELECT * FROM lwsortie'); 
        const lwSortieMap = {}; 
        lwSortieGrilleRows.forEach(row => {
            if (!lwSortieMap[row.id_element]) lwSortieMap[row.id_element] = {};
            lwSortieMap[row.id_element][row.bande] = row.valeur;
        });

        const [lwSortieVcRows_raw] = await db.promise().query('SELECT * FROM lwsortie_vc');
        const lwSortieVcDataMap = {}; 
        lwSortieVcRows_raw.forEach(row => {
            if (!lwSortieVcDataMap[row.id_element]) lwSortieVcDataMap[row.id_element] = {};
            lwSortieVcDataMap[row.id_element][row.bande] = row.valeur;
        });

        //Récupérer les paramètres
        const [elementParamsRows] = await db.promise().query(`
            SELECT 
                er.id_element,
                er.type,
                vc.type_vc,
                COALESCE(gs.distance_r, vc.distance_r) AS distance_r,
                s.r AS constante_salle_R
            FROM elementreseau er
            LEFT JOIN grillesoufflage gs ON er.id_element = gs.id_element
            LEFT JOIN vc ON er.id_element = vc.id_element
            JOIN troncon t ON er.id_troncon = t.id_troncon
            JOIN sourcesonore ss ON t.id_source = ss.id_source
            JOIN salle s ON ss.id_salle = s.id_salle
            WHERE er.type IN ('grillesoufflage', 'vc') 
        `);

        //Calcul de Lp pour chaque élément
        const spectresLp = {};
        for (const element of elementParamsRows) {
            const id_element = element.id_element;
            
            let input_lw_spectre = null;
            if (element.type === 'grillesoufflage') {
                input_lw_spectre = lwSortieMap[id_element]; // Grille: utilise Lw_sortie
                //console.log(`[Backend-Lp] Élément ${id_element} (Grille): utilise Lw_sortie`);
            } else if (element.type === 'vc') {
                if (element.type_vc === 'Soufflage') {
                    input_lw_spectre = lwTotalMap[id_element]; // VC Soufflage: utilise Lw_total
                    //console.log(`[Backend-Lp] Élément ${id_element} (VC Soufflage): utilise Lw_total`);
                    if (!input_lw_spectre) {
                        //console.warn(`[Backend-Lp] Lw Total non trouvé pour VC Soufflage ${id_element}. Tentative d'utiliser Lw Sortie VC.`);
                        input_lw_spectre = lwSortieVcDataMap[id_element];
                    }
                } else if (element.type_vc === 'Reprise') {
                    input_lw_spectre = lwSortieVcDataMap[id_element]; // VC Reprise: utilise Lw_sortie de la VC
                    //console.log(`[Backend-Lp] Élément ${id_element} (VC Reprise): utilise Lw_sortie VC.`);
                } else {
                    continue;
                }
            }

            if (!input_lw_spectre) {
                console.warn(`[Backend-Lp] Aucun spectre Lw d'entrée valide trouvé pour l'élément ${id_element} de type ${element.type} (type_vc: ${element.type_vc}). Ignoré pour le calcul Lp.`);
                continue; 
            }

            const r = parseFloat(element.distance_r);
            const R = parseFloat(element.constante_salle_R);
            spectresLp[id_element] = {};

            for (const bande in input_lw_spectre) { 
                const initial_lw_valeur = parseFloat(input_lw_spectre[bande]); 
                let lp_valeur = 0;

                if (r > 0 && R > 0) {
                    const termeDirectivite = 2 / (4 * Math.PI * Math.pow(r, 2));
                    const termeReverberation = 4 / R;
                    lp_valeur = initial_lw_valeur + 10 * Math.log10(termeDirectivite + termeReverberation);
                }
                
                spectresLp[id_element][bande] = parseFloat(lp_valeur.toFixed(1));
            }
        }

        // Sauvegarde des résultats
        for (const [id_element, spectre] of Object.entries(spectresLp)) {
            const element = elementParamsRows.find(e => e.id_element == id_element);
            if (!element) {
                //console.warn(`Élément avec id ${id_element} non trouvé dans les paramètres lors de la sauvegarde Lp.`);
                continue;
            }
            const elementType = element.type;
            if (elementType === 'grillesoufflage' || elementType === 'vc') {
                for (const [bande, valeur] of Object.entries(spectre)) {
                    await db.promise().query(
                        `REPLACE INTO niveaulp (id_element, bande, type_element, valeur) VALUES (?, ?, ?, ?)`,
                        [id_element, parseInt(bande), elementType, valeur]
                    );
                }
            }
        }

        // Renvoyer les Lp calculés au front 
        res.status(200).json(spectresLp);

    } catch (error) {
        console.error("Erreur lors du calcul du niveau Lp:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});


//CALCUL DU LW TOTAL

app.get('/api/lw_total', async (req, res) => {
    try {
        const [lwSortieVcRows] = await db.promise().query('SELECT * FROM lwsortie_vc');
        const lwSortieVcMap = lwSortieVcRows.reduce((acc, row) => {
            if (!acc[row.id_element]) acc[row.id_element] = {};
            acc[row.id_element][row.bande] = row.valeur;
            return acc;
        }, {});

        const [vcSoufflageElements] = await db.promise().query(`
            SELECT 
                er.id_element, 
                ss.id_salle
            FROM elementreseau er
            JOIN vc ON er.id_element = vc.id_element
            JOIN troncon t ON er.id_troncon = t.id_troncon
            JOIN sourcesonore ss ON t.id_source = ss.id_source
            WHERE er.type = 'vc' AND vc.type_vc = 'Soufflage'
        `);

        const freshAirSpectraPerSalle = {};

        const uniqueSalleIds = [...new Set(vcSoufflageElements.map(el => el.id_salle))];

        for (const salleId of uniqueSalleIds) {
            const [[soufflageSource]] = await db.promise().query(
                `SELECT id_source FROM sourcesonore WHERE id_salle = ? AND type = 'Soufflage' LIMIT 1`,
                [salleId]
            );

            if (soufflageSource) {
                const [[grilleSoufflage]] = await db.promise().query(
                    `SELECT e.id_element FROM elementreseau e JOIN troncon t ON e.id_troncon = t.id_troncon WHERE t.id_source = ? AND e.type = 'grillesoufflage' LIMIT 1`,
                    [soufflageSource.id_source]
                );

                if (grilleSoufflage) {
                    const [valeursAirNeuf] = await db.promise().query(
                        'SELECT bande, valeur FROM lwsortie WHERE id_element = ?',
                        [grilleSoufflage.id_element]
                    );
                    const spectre = {};
                    valeursAirNeuf.forEach(row => spectre[row.bande] = row.valeur);
                    freshAirSpectraPerSalle[salleId] = spectre;
                } else {
                    console.warn(`[Backend-LwTotal] No 'grillesoufflage' found for Soufflage source ${soufflageSource.id_source} in salle ${salleId}.`);
                }
            } else {
                console.warn(`[Backend-LwTotal] No 'Soufflage' type source found in salle ${salleId}.`);
            }
        }
        
        // calcule lwTotalSpectres 
        const lwTotalSpectres = {};
        const BANDES_FREQUENCE = ['63', '125', '250', '500', '1000', '2000', '4000']; 

        for (const element of vcSoufflageElements) {
            const id_element = element.id_element;
            const id_salle = element.id_salle; 

            const spectreLwSortie = lwSortieVcMap[id_element]; 
            const spectreAirNeuf = freshAirSpectraPerSalle[id_salle] || {}; 

            if (!spectreLwSortie) {
                //console.warn(`No 'lw_sortie' data for VC element ${id_element}`);
                continue;
            }

            lwTotalSpectres[id_element] = {};
            for (const bande of BANDES_FREQUENCE) {
                const lw_sortie = parseFloat(spectreLwSortie[bande]) || 0;
                const lw_air_neuf = parseFloat(spectreAirNeuf[bande]) || 0;
                
                let lw_total_valeur;
                if (lw_air_neuf === 0 && lw_sortie === 0) {
                    lw_total_valeur = 0;
                } else {
                    const sommePuissances = Math.pow(10, lw_sortie / 10) + Math.pow(10, lw_air_neuf / 10);
                    lw_total_valeur = 10 * Math.log10(sommePuissances);
                }
                
                lwTotalSpectres[id_element][bande] = parseFloat(lw_total_valeur.toFixed(1));
            }
        }
        
        // sauvegarder Lw Total dans la table 'lwtotal'
        for (const [id_element, spectre] of Object.entries(lwTotalSpectres)) {
            for (const [bande, valeur] of Object.entries(spectre)) {
                await db.promise().query(
                    `INSERT INTO lwtotal (id_element, bande, valeur) VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)`,
                    [id_element, parseInt(bande), valeur]
                );
            }
        }
        
        // envoyer les resultats au front
        res.status(200).json(lwTotalSpectres);

    } catch (error) {
        console.error("Erreur lors du calcul du Lw Total:", error); 
        res.status(500).json({ message: "Erreur serveur lors du calcul de Lw Total" });
    }
});

// SAISIE 
//sauvegarder l'atténuation
app.post('/api/attenuations', async (req, res) => {
    const { id_element, ...spectre } = req.body;
    if (!id_element) return res.status(400).json({ message: "ID de l'élément requis." });
    const values = Object.entries(spectre).map(([bande, valeur]) => [id_element, parseInt(bande), parseFloat(valeur) || 0]);
    const sql = "REPLACE INTO attenuation (id_element, bande, valeur) VALUES ?";
    try {
        await db.promise().query(sql, [values]);
        res.status(200).json({ message: "Atténuation sauvegardée." });
    } catch (error) {
        console.error("Erreur sauvegarde atténuation:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

//implementation de la logique de calcul lw_resultant d'élement reseau 
// Calcul du Lw_resultant pour un tronçon (chaînage entre tronçons)
app.get('/api/lwresultants/troncon/:id_troncon', async (req, res) => {
  const { id_troncon } = req.params;
  let lwSortie = undefined;

  try {
    const [[troncon]] = await db.promise().query(
      'SELECT id_troncon, id_source FROM troncon WHERE id_troncon = ?',
      [id_troncon]
    );
    if (!troncon) return res.status(404).json({ message: "Tronçon introuvable." });

    const { id_source } = troncon;
    let lwInit = {};

    // ===> 2. Chercher le tronçon précédent
    const [[tronconPrecedent]] = await db.promise().query(
      'SELECT id_troncon FROM troncon WHERE id_source = ? AND id_troncon < ? ORDER BY id_troncon DESC LIMIT 1',
      [id_source, id_troncon]
    );

    if (tronconPrecedent) {
      const id_troncon_prec = tronconPrecedent.id_troncon;

      // a. Dernier élément du tronçon précédent
      const [[dernierElement]] = await db.promise().query(
        'SELECT id_element FROM elementreseau WHERE id_troncon = ? ORDER BY ordre DESC LIMIT 1',
        [id_troncon_prec]
      );

      if (dernierElement) {
        const id_element_prec = dernierElement.id_element;

        // b. Vérifier le type de cet élément
        const [[typeElement]] = await db.promise().query(
          'SELECT type FROM elementreseau WHERE id_element = ?',
          [id_element_prec]
        );

        let lwPrecRows;
        if (typeElement.type === 'piecetransformation') {
          // Si c'est une pièce de transformation, on prend lw_entrant
          [lwPrecRows] = await db.promise().query(
            'SELECT bande, valeur FROM lwentrantpiecetransformation WHERE id_element = ?',
            [id_element_prec]
          );
        } else {
          // Sinon on prend lw_resultant
          [lwPrecRows] = await db.promise().query(
            'SELECT bande, valeur FROM lwresultant WHERE id_element = ?',
            [id_element_prec]
          );
        }

        // Charger dans lwInit
        lwPrecRows.forEach(row => lwInit[row.bande] = row.valeur);

        // c. Atténuation du tronçon précédent
        const [attTronconRows] = await db.promise().query(
          `SELECT at.bande, at.valeur 
           FROM attenuationtroncon at
           JOIN elementreseau er ON at.id_element = er.id_element
           WHERE er.id_troncon = ?`,
          [id_troncon_prec]
        );
        attTronconRows.forEach(row => {
          lwInit[row.bande] = lwInit[row.bande] + row.valeur;
        });
      }
    }

    // 3. Si pas de tronçon précédent → lwsource
    if (Object.keys(lwInit).length === 0) {
      const [lwSource] = await db.promise().query(
        'SELECT bande, valeur_lw FROM lwsource WHERE id_source = ?',
        [id_source]
      );
      lwSource.forEach(row => {
        lwInit[row.bande] = row.valeur_lw;
      });
    }

    // 4. Charger les éléments du tronçon courant
    const [elements] = await db.promise().query(
      'SELECT * FROM elementreseau WHERE id_troncon = ? ORDER BY ordre ASC',
      [id_troncon]
    );

    const BANDES = [63, 125, 250, 500, 1000, 2000, 4000];
    const resultats = [];
    let lwPrec = { ...lwInit };

    for (const element of elements) {
      const id_element = element.id_element;

      // a. Atténuation et régénération
      const [attenuations] = await db.promise().query(
        'SELECT bande, valeur FROM attenuation WHERE id_element = ?', [id_element]
      );
      const [regens] = await db.promise().query(
        'SELECT bande, valeur FROM regeneration WHERE id_element = ?', [id_element]
      );

      const attMap = {};
      const regMap = {};
      attenuations.forEach(row => attMap[row.bande] = row.valeur);
      regens.forEach(row => regMap[row.bande] = row.valeur);

      const lwEntrant = { ...lwPrec };
      const lwResultant = {};

      BANDES.forEach(bande => {
        const Lw_prec = lwPrec[bande] ?? 0;
        const regen = regMap[bande] ?? 0;
        const atten = attMap[bande] ?? 0;

        const lw = 10 * Math.log10(
          Math.pow(10, Lw_prec / 10) + Math.pow(10, regen / 10)
        ) - atten;

        lwResultant[bande] = Number(lw.toFixed(3));
      });

      // c. Sauvegarde Lw_resultant
      for (const [bande, valeur] of Object.entries(lwResultant)) {
        await db.promise().query(
          `INSERT INTO lwresultant (id_element, bande, valeur)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)`,
          [id_element, parseInt(bande), valeur]
        );
      }

      // ✅ d. Si pièce de transformation → stocker lwEntrant
      if (element.type === 'piecetransformation') {
        for (const [bande, valeur] of Object.entries(lwEntrant)) {
          await db.promise().query(
            `INSERT INTO lwentrantpiecetransformation (id_element, bande, valeur)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)`,
            [id_element, parseInt(bande), valeur]
          );
        }
      }
        // 🔶 Calculer et stocker Niveau Lw Sortie pour la grille de soufflage
        if (element.type === 'grillesoufflage') {
        lwSortie = {};
        const [attenuations] = await db.promise().query(
            'SELECT bande, valeur FROM attenuation WHERE id_element = ?', [id_element]
        );
        const [regens] = await db.promise().query(
            'SELECT bande, valeur FROM regeneration WHERE id_element = ?', [id_element]
        );

        const attMap = {};
        const regMap = {};
        attenuations.forEach(row => attMap[row.bande] = row.valeur);
        regens.forEach(row => regMap[row.bande] = row.valeur);

        BANDES.forEach(bande => {
            const Lw_prec = lwPrec[bande] ?? 0;
            const regen = regMap[bande] ?? 0;
            const atten = attMap[bande] ?? 0;

            const lw = 10 * Math.log10(
            Math.pow(10, Lw_prec / 10) + Math.pow(10, regen / 10)
            ) - atten;

            lwSortie[bande] = Number(lw.toFixed(3));
        });

        // Sauvegarde dans la table lwsortie
        for (const [bande, valeur] of Object.entries(lwSortie)) {
            await db.promise().query(
            `INSERT INTO lwsortie (id_element, bande, valeur)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)`,
            [id_element, parseInt(bande), valeur]
            );
        }
        }
        // 🔶 Calculer et stocker Niveau Lw Sortie pour les VC
        if (element.type === 'vc') {
        lwSortie = {};
        const [attenuations] = await db.promise().query(
            'SELECT bande, valeur FROM attenuation WHERE id_element = ?', [id_element]
        );
        const [regens] = await db.promise().query(
            'SELECT bande, valeur FROM regeneration WHERE id_element = ?', [id_element]
        );

        const attMap = {};
        const regMap = {};
        attenuations.forEach(row => attMap[row.bande] = row.valeur);
        regens.forEach(row => regMap[row.bande] = row.valeur);

        BANDES.forEach(bande => {
            const Lw_prec = lwPrec[bande] ?? 0;
            const regen = regMap[bande] ?? 0;
            const atten = attMap[bande] ?? 0;

            const lw = 10 * Math.log10(
            Math.pow(10, Lw_prec / 10) + Math.pow(10, regen / 10)
            ) - atten;

            lwSortie[bande] = Number(lw.toFixed(3));
        });

        // ✅ Sauvegarde dans la table lwsortie_vc
        for (const [bande, valeur] of Object.entries(lwSortie)) {
            await db.promise().query(
            `INSERT INTO lwsortie_vc (id_element, bande, valeur)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)`,
            [id_element, parseInt(bande), valeur]
            );
        }
        }

        resultats.push({
        id_element,
        type: element.type,
        ordre: element.ordre,
        lwEntrant,
        lw_resultant: lwResultant,
        lw_sortie:
            element.type === 'grillesoufflage' || element.type === 'vc'
            ? lwSortie
            : undefined
        });


        // Mettre à jour lwPrec uniquement si ce n'est PAS une pièce de transformation
        if (element.type !== 'piecetransformation') {
        lwPrec = lwResultant;
        }

    }

    res.json(resultats);
  } catch (error) {
    console.error("❌ Erreur calcul Lw_resultant :", error);
    res.status(500).json({ message: "Erreur serveur lors du calcul des niveaux Lw." });
  }
});

// Exemple route GET /api/lw_sortie_air_neuf/:id_source
app.get('/api/lw_sortie_air_neuf/:id_source', (req, res) => {
    const { id_source } = req.params;

    const findCorrectSourceSql = `
        SELECT ss2.id_source AS id_cible
        FROM sourcesonore ss1
        JOIN salle s ON ss1.id_salle = s.id_salle
        JOIN sourcesonore ss2 ON ss2.id_salle = s.id_salle
        WHERE ss1.id_source = ? AND ss2.type = 'Soufflage'
        ORDER BY ss2.id_source ASC
        LIMIT 1
    `;

    db.query(findCorrectSourceSql, [id_source], (err, resultSource) => {
        if (err || resultSource.length === 0) {
            console.error("❌ Erreur lors de la récupération de la source correcte :", err?.message);
            return res.status(404).json({});
        }

        const idCorrectSource = resultSource[0].id_cible;

        const sql = `
            SELECT gs.id_element, lws.bande, lws.valeur
            FROM grillesoufflage gs
            JOIN elementreseau er ON gs.id_element = er.id_element
            JOIN troncon t ON er.id_troncon = t.id_troncon
            JOIN sourcesonore ss ON t.id_source = ss.id_source
            JOIN lwsortie lws ON lws.id_element = gs.id_element
            WHERE ss.id_source = ?
        `;

        db.query(sql, [idCorrectSource], (err2, results) => {
            if (err2) {
                console.error("❌ Erreur SQL lw_sortie_air_neuf :", err2.message);
                return res.status(500).json({});
            }

            const structured = {};
            results.forEach(row => {
                if (!structured[row.id_element]) structured[row.id_element] = {};
                structured[row.id_element][row.bande] = row.valeur;
            });

            res.json(structured);
        });
    });
});

//insertion du globaldba en base donné pour les niveau lp disponible
app.post('/api/lp-dba', (req, res) => {
  const { id_element, global_dba_lp } = req.body;

  const getTypeSql = `
    SELECT ss.type FROM sourcesonore ss
    JOIN troncon t ON ss.id_source = t.id_source
    JOIN elementreseau e ON e.id_troncon = t.id_troncon
    WHERE e.id_element = ?
  `;

  db.query(getTypeSql, [id_element], (err, rows) => {
    if (err || rows.length === 0) {
      console.error("Erreur récupération type source:", err || "Aucune correspondance");
      return res.status(500).json({ message: "Erreur récupération type source" });
    }

    const type_source = rows[0].type;

    const insertSql = `
      INSERT INTO lp_dba (id_element, valeur, type_source)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE valeur = VALUES(valeur), type_source = VALUES(type_source)
    `;

    db.query(insertSql, [id_element, global_dba_lp, type_source], (err2, result) => {
      if (err2) {
        console.error("Erreur insertion Global DBA LP:", err2);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      res.status(200).json({ message: "Global DBA LP enregistré avec type source" });
    });
  });
});

//recuperation de niveau lp pour VC/reprise 
app.get('/api/lp-vc-reprise/:id_salle', (req, res) => {
  const id_salle = req.params.id_salle;
  const sql = `
    SELECT nl.bande, nl.valeur
    FROM sourcesonore ss
    JOIN troncon t ON t.id_source = ss.id_source
    JOIN elementreseau er ON er.id_troncon = t.id_troncon
    JOIN vc ON vc.id_element = er.id_element
    JOIN niveaulp nl ON nl.id_element = vc.id_element
    WHERE ss.type = 'VC CRSL-ECM 2 /reprise'
      AND vc.type_vc = 'Reprise'
      AND ss.id_salle = ?
  `;
  db.query(sql, [id_salle], (error, results) => {
    if (error) return res.status(500).json({ error: 'Erreur serveur' });
    res.json(results);
  });
});

//recuperation du niveau lp du source sonore de type extraction 
app.get('/api/lp-extraction/:id_salle', (req, res) => {
  const id_salle = req.params.id_salle;
  const sql = `
    SELECT nl.bande, nl.valeur
    FROM sourcesonore ss
    JOIN troncon t ON t.id_source = ss.id_source
    JOIN elementreseau er ON er.id_troncon = t.id_troncon
    JOIN niveaulp nl ON nl.id_element = er.id_element
    WHERE ss.type = 'Extraction'
      AND ss.id_salle = ?
  `;
  db.query(sql, [id_salle], (error, results) => {
    if (error) return res.status(500).json({ error: 'Erreur serveur' });
    res.json(results);
  });
});

//recuperation du niveau lp du source sonore VC de type soufflage 
app.get('/api/lp-vc-soufflage/:id_salle', (req, res) => {
  const id_salle = req.params.id_salle;
  const sql = `
    SELECT nl.bande, nl.valeur
    FROM sourcesonore ss
    JOIN troncon t ON t.id_source = ss.id_source
    JOIN elementreseau er ON er.id_troncon = t.id_troncon
    JOIN vc ON vc.id_element = er.id_element
    JOIN niveaulp nl ON nl.id_element = vc.id_element
    WHERE ss.type = 'VC CRSL-ECM 2 /soufflage'
      AND vc.type_vc = 'Soufflage'
      AND ss.id_salle = ?
  `;
  db.query(sql, [id_salle], (error, results) => {
    if (error) return res.status(500).json({ error: 'Erreur serveur' });
    res.json(results);
  });
});


// récupération des GLOBAL DBA pour les sources sonores liées à une salle
app.get('/api/lp-dba/:id_salle', (req, res) => {
  const id_salle = req.params.id_salle;

  const sql = `
    SELECT ss.type AS type_source, ld.valeur
    FROM lp_dba ld
    JOIN sourcesonore ss ON ss.type = ld.type_source
    WHERE ss.id_salle = ?
      AND ld.type_source IN ('VC CRSL-ECM 2 /soufflage', 'VC CRSL-ECM 2 /reprise', 'extraction')
  `;

  db.query(sql, [id_salle], (error, results) => {
    if (error) {
      console.error('Erreur récupération LP dBA:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(results);
  });
});


//recuperation des valeurs de courbe nr et les visualisé
app.get('/api/nr-reference', (req, res) => {
  const sql = `SELECT * FROM nr_reference ORDER BY bande ASC`;

  db.query(sql, (error, results) => {
    if (error) {
      console.error("Erreur récupération NR:", error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(results);
  });
});

//ajout de la tracibilité des données 
app.get('/api/tracabilite/:id_salle', (req, res) => {
    const { id_salle } = req.params;

    const sql = `
        SELECT 
            a.id_affaire, a.numero_affaire, a.objet, 
            s.id_salle, s.nom AS nom_salle,
            ss.id_source, ss.nom AS nom_source, ss.type AS type_source,
            t.id_troncon, t.forme,
            er.id_element, er.type AS type_element,
            vc.type_vc
        FROM affaire a
        JOIN salle s ON s.id_affaire = a.id_affaire
        JOIN sourcesonore ss ON ss.id_salle = s.id_salle
        JOIN troncon t ON t.id_source = ss.id_source
        JOIN elementreseau er ON er.id_troncon = t.id_troncon
        LEFT JOIN vc ON vc.id_element = er.id_element 
        WHERE s.id_salle = ?
    `;

    db.query(sql, [id_salle], (err, results) => {
        if (err) {
            console.error("Erreur tracabilité :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }

        res.json(results);
    });
});




// ======================
// DÉMARRAGE DU SERVEUR
// ======================

app.listen(port, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});