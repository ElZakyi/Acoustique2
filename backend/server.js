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
    const sql = "SELECT * FROM troncon WHERE id_source = ?";
    db.query(sql,[id_source],(err,result)=>{
        if(err){
            console.error("Erreur lors du recuperation des troncons ");
            return res.status(500).json({message:"Erreur serveur"});
        }
        return res.status(200).json(result);
    })
})

//inserer un troncon 

app.post('/api/sources/:id_source/troncons', (req, res) => {
    const { id_source } = req.params;
    const { forme, largeur, hauteur, diametre, vitesse, debit } = req.body;

    if (!forme || !vitesse || !debit) {
        return res.status(400).json({ message: "La forme, la vitesse et le débit sont requis." });
    }

    let sql;
    let values;

    if (forme === 'rectangulaire') {
        if (!largeur || !hauteur) {
            return res.status(400).json({ message: "La largeur et la hauteur sont requises pour un tronçon rectangulaire." });
        }
        
        sql = "INSERT INTO troncon (forme, largeur, hauteur, diametre, vitesse, debit, id_source) VALUES (?, ?, ?, NULL, ?, ?, ?)";
        values = [forme, largeur, hauteur, vitesse, debit, id_source];
    } 
    else if (forme === 'circulaire') {
        if (!diametre) {
            return res.status(400).json({ message: "Le diamètre est requis for un tronçon circulaire." });
        }

        sql = "INSERT INTO troncon (forme, largeur, hauteur, diametre, vitesse, debit, id_source) VALUES (?, NULL, NULL, ?, ?, ?, ?)";
        values = [forme, diametre, vitesse, debit, id_source];
    } 
    else {
        return res.status(400).json({ message: "La forme doit être 'rectangulaire' ou 'circulaire'." });
    }

 
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Erreur lors de l'ajout du tronçon :", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        return res.status(201).json({ message: "Tronçon ajouté avec succès !", id_troncon: result.insertId });
    });
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

//Obtenir tous les elements d’un tronçon
app.get('/api/troncons/:id_troncon/elements', (req, res) => {
    const { id_troncon } = req.params;
    const sql = `
        SELECT er.*, c.longueur, co.angle, co.orientation, gs.distance_r, vc.type_vc,
               COALESCE(c.materiau, co.materiau) AS materiau
        FROM elementreseau er
        LEFT JOIN conduit c ON er.id_element = c.id_element
        LEFT JOIN coude co ON er.id_element = co.id_element
        LEFT JOIN grillesoufflage gs ON er.id_element = gs.id_element
        LEFT JOIN vc ON er.id_element = vc.id_element
        WHERE er.id_troncon = ? ORDER BY er.id_element ASC`;
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
app.post('/api/troncons/:id_troncon/elements', (req, res) => {
    const { id_troncon } = req.params;
    const { type, parameters } = req.body;
    if (!type) return res.status(400).json({ message: "Le type est requis." });

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        try {
            const [result] = await db.promise().query('INSERT INTO elementreseau (type, id_troncon) VALUES (?, ?)', [type, id_troncon]);
            const newElementId = result.insertId;
            if (parameters && Object.keys(parameters).length > 0) {
                 switch (type) {
                    case 'conduit': await db.promise().query('INSERT INTO conduit (id_element, longueur, materiau) VALUES (?, ?, ?)', [newElementId, parameters.longueur, parameters.materiau]); break;
                    case 'coude': await db.promise().query('INSERT INTO coude (id_element, angle, orientation, materiau) VALUES (?, ?, ?, ?)', [newElementId, parameters.angle, parameters.orientation, parameters.materiau]); break;
                    case 'grillesoufflage': await db.promise().query('INSERT INTO grillesoufflage (id_element, distance_r) VALUES (?, ?)', [newElementId, parameters.distance_r]); break;
                    case 'vc': await db.promise().query('INSERT INTO vc (id_element, type_vc) VALUES (?, ?)', [newElementId, parameters.type_vc]); break;
                }
            } else {
                switch(type) {
                    case 'silencieux': await db.promise().query('INSERT INTO silencieux (id_element) VALUES (?)', [newElementId]); break;
                    case 'plenum': await db.promise().query('INSERT INTO plenum (id_element) VALUES (?)', [newElementId]); break;
                    case 'piecetransformation': await db.promise().query('INSERT INTO piecetransformation (id_element) VALUES (?)', [newElementId]); break;
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
                    case 'vc': await db.promise().query('INSERT INTO vc (id_element, type_vc) VALUES (?, ?)', [id_element, parameters.type_vc]); break;
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
        const [troncons] = await db.promise().query(`
            SELECT t.id_troncon, t.debit, t.forme, t.largeur, t.hauteur, t.diametre, 
                   cs.bande as cs_bande, cs.valeur as cs_valeur
            FROM troncon t
            LEFT JOIN sourcesonore ss ON t.id_source = ss.id_source
            LEFT JOIN salle s ON ss.id_salle = s.id_salle
            LEFT JOIN correctionspectral cs ON s.id_salle = cs.id_salle 
        `);
        
        const [elements] = await db.promise().query('SELECT id_element, type, id_troncon FROM elementreseau');
        const regenerations = {};

        for (const element of elements) {
            const troncon = troncons.find(t => t.id_troncon === element.id_troncon);
            if (!troncon) continue;
            
            regenerations[element.id_element] = {};
            const correctionsPourCeTroncon = troncons.filter(t => t.id_troncon === element.id_troncon);

            for (const row of correctionsPourCeTroncon) {
                let regenerationValue = 0; // Valeur par défaut

                if (element.type !== 'silencieux' && element.type !== 'plenum') {
                    const debit_m3h = parseFloat(troncon.debit);
                    
                    let surface_m2 = 0;
                    if (troncon.forme === 'rectangulaire' && troncon.largeur && troncon.hauteur) {
                        surface_m2 = (troncon.largeur / 1000) * (troncon.hauteur / 1000);
                    } else if (troncon.forme === 'circulaire' && troncon.diametre) {
                        surface_m2 = Math.PI * Math.pow(troncon.diametre / 2000, 2);
                    }
                    if (debit_m3h > 0 && surface_m2 > 0 && row.cs_valeur != null) {
                        const debit_m3s = debit_m3h / 3600;
                        const vitesse_ms = debit_m3s / surface_m2;
                        if (vitesse_ms > 0) {
                            regenerationValue = 10 + 50 * Math.log10(vitesse_ms) + 10 * Math.log10(surface_m2) + row.cs_valeur;
                        }
                    }
                }
                if (row.cs_bande != null) {
                    regenerations[element.id_element][row.cs_bande] = regenerationValue.toFixed(0);
                }
            }
        }

        //enregistrer en Base de données
        for (const [id_element, bandes] of Object.entries(regenerations)) {
            for (const [bande, valeur] of Object.entries(bandes)) {
                await db.promise().query(
                    'INSERT INTO regeneration (id_element, bande, valeur) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)',
                    [id_element, bande, valeur]
                );
            }
        }

        res.status(200).json(regenerations);
    } catch (error) {
        console.error("Erreur calcul régénération:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});


//Calculer et récupérer les atténuations de tronçon
app.get('/api/attenuationtroncons', async (req, res) => {
    try {

        const [allTroncons] = await db.promise().query(

            'SELECT id_troncon, id_source, debit FROM troncon ORDER BY id_source, id_troncon ASC'
        );


        const [piecesDeTransfo] = await db.promise().query(
            "SELECT id_element, id_troncon FROM elementreseau WHERE type = 'piecetransformation'"
        );

    
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

                    if (!isFinite(attenuationValue)) {
                        attenuationValue = -99; 
                    }
                }
            }
            

            const spectrePourCetElement = {};
            BANDES.forEach(bande => {
                spectrePourCetElement[bande] = parseFloat(attenuationValue.toFixed(2));
            });
            allAttenuationsTroncon[piece.id_element] = spectrePourCetElement;
        }


        res.status(200).json(allAttenuationsTroncon);

    } catch (error) {
        console.error("Erreur calcul attenuationtroncon:", error);
        res.status(500).json({ message: "Erreur serveur" });
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

  try {
    // 1. Récupérer l'id_source du tronçon actuel
    const [[troncon]] = await db.promise().query(
      'SELECT id_source FROM troncon WHERE id_troncon = ?',
      [id_troncon]
    );
    if (!troncon) return res.status(404).json({ message: "Tronçon introuvable." });
    const id_source = troncon.id_source;

    // 2. Récupérer dynamiquement l'ordre du tronçon (basé sur id_troncon croissant)
    const [[{ ordre_troncon }]] = await db.promise().query(
      `SELECT 
          (SELECT COUNT(*) + 1 
           FROM troncon t2 
           WHERE t2.id_source = t.id_source AND t2.id_troncon < t.id_troncon) 
          AS ordre_troncon
       FROM troncon t
       WHERE t.id_troncon = ?`,
      [id_troncon]
    );

    // 3. Initialisation de lwPrec
    let lwPrec = {};

    if (ordre_troncon > 1) {
      // Récupérer le dernier élément du tronçon précédent
      const [[tronconPrecedent]] = await db.promise().query(
        `SELECT id_troncon FROM troncon 
         WHERE id_source = ? AND id_troncon < ? 
         ORDER BY id_troncon DESC LIMIT 1`,
        [id_source, id_troncon]
      );

      const [[lastElement]] = await db.promise().query(
        'SELECT id_element FROM elementreseau WHERE id_troncon = ? ORDER BY id_element DESC LIMIT 1',
        [tronconPrecedent.id_troncon]
      );

      const [lwLast] = await db.promise().query(
        'SELECT bande, valeur FROM lwresultant WHERE id_element = ?',
        [lastElement.id_element]
      );

      lwLast.forEach(row => {
        lwPrec[row.bande] = row.valeur;
      });

    } else {
      // Premier tronçon → se base sur la source sonore
      const [lwSource] = await db.promise().query(
        'SELECT bande, valeur_lw FROM lwsource WHERE id_source = ?', [id_source]
      );
      lwSource.forEach(row => {
        lwPrec[row.bande] = row.valeur_lw;
      });
    }

    // 4. Charger les éléments du tronçon en cours
    const [elements] = await db.promise().query(
      'SELECT * FROM elementreseau WHERE id_troncon = ? ORDER BY id_element ASC',
      [id_troncon]
    );

    const BANDES = [63, 125, 250, 500, 1000, 2000, 4000];
    const resultats = [];

    for (const element of elements) {
      const id_element = element.id_element;

      const [attenuations] = await db.promise().query(
        'SELECT bande, valeur FROM attenuation WHERE id_element = ?', [id_element]
      );
      const attMap = {};
      attenuations.forEach(row => { attMap[row.bande] = row.valeur; });

      const [regens] = await db.promise().query(
        'SELECT bande, valeur FROM regeneration WHERE id_element = ?', [id_element]
      );
      const regMap = {};
      regens.forEach(row => { regMap[row.bande] = row.valeur; });

      // Copie du Lw entrant
      const lwEntrant = { ...lwPrec };

      // Calcul Lw_resultant
      const lwResultant = {};
      BANDES.forEach(bande => {
        const Lw_prec = lwPrec[bande] ?? 0;
        const regen = regMap[bande] ?? 0;
        const atten = attMap[bande] ?? 0;
        const lw = 10 * Math.log10(Math.pow(10, Lw_prec / 10) + Math.pow(10, regen / 10)) - atten;
        lwResultant[bande] = Number(lw.toFixed(3));
      });

      // Insertion en base
      for (const [bande, valeur] of Object.entries(lwResultant)) {
        await db.promise().query(
          `INSERT INTO lwresultant (id_element, bande, valeur) 
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)`,
          [id_element, parseInt(bande), valeur]
        );
      }

      resultats.push({
        id_element,
        type: element.type,
        ordre: element.ordre,
        lwEntrant,
        lw_resultant: lwResultant
      });

      // Mise à jour pour le prochain élément
      lwPrec = lwResultant;
    }

    res.json(resultats);

  } catch (error) {
    console.error("Erreur calcul Lw_resultant :", error);
    res.status(500).json({ message: "Erreur serveur lors du calcul des niveaux Lw." });
  }
});




// ======================
// DÉMARRAGE DU SERVEUR
// ======================

app.listen(port, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});